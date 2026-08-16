"use server";

import { db } from "@/db";
import { ministries, users, servants, schedules, scheduleDates, scheduleAvailability, scheduleAssignments, swapRequests } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq, and, inArray } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash, compare } from "bcryptjs";
import type {
  ServantOverviewSchedule,
  CoordinatorSector,
  CoordinatorSchedule,
  CalendarSchedule,
  PendingSwapRequest,
} from "@/types/domain";
import {
  publicUser,
  getAuthFilter,
  requireAdmin,
  requireScheduleSectorAccess,
  getSectorIdForScheduleId,
  getSectorIdForDateId,
  getSectorIdForAssignmentId,
} from "@/lib/scope";

// Returns every schedule for the logged-in servant's sector, with each date
// flagged for whether THIS servant is confirmed/has sent availability on it,
// plus the full list of confirmed assignees (for the day-swap feature).
export async function getServantOverview(): Promise<ServantOverviewSchedule[]> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const memberships = await db.query.servants.findMany({
    where: eq(servants.userId, session.user.id),
  });
  if (memberships.length === 0) return [];

  const results: ServantOverviewSchedule[] = [];
  for (const servant of memberships) {
    const sectorSchedules = await db.query.schedules.findMany({
      where: eq(schedules.sectorId, servant.sectorId),
      with: {
        ministry: true,
        sector: true,
        dates: {
          with: {
            assignments: { with: { servant: { with: { user: publicUser } } } },
            availabilities: { where: eq(scheduleAvailability.servantId, servant.id) },
          },
        },
      },
    });

    for (const s of sectorSchedules) {
      results.push({
        id: s.id,
        name: s.name,
        ministryName: s.ministry.name,
        sectorName: s.sector.name,
        shareLink: s.shareLink,
        servantId: servant.id,
        dates: s.dates.map((d) => ({
          id: d.id,
          date: d.date,
          startTime: d.startTime,
          confirmed: d.assignments.some((a) => a.servantId === servant.id),
          available: d.availabilities.length > 0,
          assignees: d.assignments.map((a) => ({
            servantId: a.servantId,
            userId: a.servant.userId,
            name: a.servant.user.name,
            isSelf: a.servantId === servant.id,
            color: a.servant.user.color,
          })),
        })),
      });
    }
  }
  return results;
}

// Schedules
export async function createSchedule(
  name: string,
  ministryId: number,
  sectorId: number,
  dates: { date: string, startTime: string }[],
  visibility: "public" | "private" = "public",
) {
  await requireScheduleSectorAccess(sectorId);

  const shareLink = nanoid(10);
  const [schedule] = await db.insert(schedules).values({
    name,
    ministryId,
    sectorId,
    visibility,
    shareLink,
  }).returning();

  for (const d of dates) {
    await db.insert(scheduleDates).values({
      scheduleId: schedule.id,
      date: d.date,
      startTime: d.startTime,
    });
  }

  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
  return { shareLink };
}

export async function deleteSchedule(id: number) {
  await requireScheduleSectorAccess(await getSectorIdForScheduleId(id));

  await db.delete(schedules).where(eq(schedules.id, id));
  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}

export async function updateSchedule(
  id: number,
  name: string,
  dates: { date: string, startTime: string }[],
  visibility?: "public" | "private",
) {
  await requireScheduleSectorAccess(await getSectorIdForScheduleId(id));

  await db.update(schedules)
    .set(visibility ? { name, visibility } : { name })
    .where(eq(schedules.id, id));

  await db.delete(scheduleDates).where(eq(scheduleDates.scheduleId, id));

  for (const d of dates) {
    await db.insert(scheduleDates).values({
      scheduleId: id,
      date: d.date,
      startTime: d.startTime,
    });
  }

  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}

export async function getSchedules() {
  const leaderId = await getAuthFilter();
  if (leaderId) {
    return await db.query.schedules.findMany({
      where: (schedules, { exists }) => exists(
        db.select().from(ministries).where(
          and(
            eq(ministries.id, schedules.ministryId),
            eq(ministries.leaderId, leaderId)
          )
        )
      ),
      with: {
        ministry: true,
        sector: true,
        dates: true
      }
    });
  }
  return await db.query.schedules.findMany({
    with: {
      ministry: true,
      sector: true,
      dates: true
    }
  });
}

// Setores onde o servo logado foi marcado como coordenador.
export async function getCoordinatorSectors(): Promise<CoordinatorSector[]> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const rows = await db.query.servants.findMany({
    where: and(eq(servants.userId, session.user.id), eq(servants.isCoordinator, true)),
    with: { sector: { with: { ministry: true } } },
  });

  return rows.map((r) => ({
    id: r.sector.id,
    name: r.sector.name,
    ministryId: r.sector.ministry.id,
    ministryName: r.sector.ministry.name,
  }));
}

// Escalas dos setores que o servo logado coordena.
export async function getCoordinatorSchedules(): Promise<CoordinatorSchedule[]> {
  const sectorIds = (await getCoordinatorSectors()).map((s) => s.id);
  if (sectorIds.length === 0) return [];

  const rows = await db.query.schedules.findMany({
    where: inArray(schedules.sectorId, sectorIds),
    with: { ministry: true, sector: true, dates: true },
  });

  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    visibility: s.visibility,
    shareLink: s.shareLink,
    ministry: { name: s.ministry.name },
    sector: { name: s.sector.name },
    dates: s.dates.map((d) => ({ id: d.id, date: d.date, startTime: d.startTime })),
  }));
}

// Visão de calendário para admin/líder: todas as escalas (com quem está escalado
// em cada dia), escopadas por ministério do líder quando aplicável.
export async function getCalendarSchedules(): Promise<CalendarSchedule[]> {
  const leaderId = await getAuthFilter();
  const withClause = {
    ministry: true,
    sector: true,
    dates: {
      with: {
        assignments: { with: { servant: { with: { user: publicUser } } } },
      },
    },
  } as const;

  const rows = leaderId
    ? await db.query.schedules.findMany({
        where: (schedules, { exists }) => exists(
          db.select().from(ministries).where(
            and(
              eq(ministries.id, schedules.ministryId),
              eq(ministries.leaderId, leaderId)
            )
          )
        ),
        with: withClause,
      })
    : await db.query.schedules.findMany({ with: withClause });

  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    ministryId: s.ministry.id,
    ministryName: s.ministry.name,
    sectorId: s.sector.id,
    sectorName: s.sector.name,
    dates: s.dates.map((d) => ({
      id: d.id,
      date: d.date,
      startTime: d.startTime,
      assignees: d.assignments.map((a) => ({ servantId: a.servantId, name: a.servant.user.name })),
    })),
  }));
}

export async function getScheduleResponses(scheduleId: number) {
  await requireScheduleSectorAccess(await getSectorIdForScheduleId(scheduleId));

  return await db.query.scheduleDates.findMany({
    where: eq(scheduleDates.scheduleId, scheduleId),
    orderBy: (dates, { asc }) => [asc(dates.date), asc(dates.startTime)],
    with: {
      availabilities: {
        with: {
          servant: { with: { user: publicUser } }
        }
      },
      assignments: {
        with: {
          servant: { with: { user: publicUser } }
        }
      }
    }
  });
}

export async function assignServant(dateId: number, servantId: number) {
  await requireScheduleSectorAccess(await getSectorIdForDateId(dateId));

  await db.insert(scheduleAssignments).values({
    dateId,
    servantId,
  });
  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}

export async function removeAssignment(assignmentId: number) {
  await requireScheduleSectorAccess(await getSectorIdForAssignmentId(assignmentId));

  await db.delete(scheduleAssignments).where(eq(scheduleAssignments.id, assignmentId));
  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}

export async function saveAvailability(servantId: number, dateIds: number[]) {
  const uniqueDateIds = [...new Set(dateIds)];
  if (uniqueDateIds.length === 0) return;

  const [servant] = await db.select().from(servants).where(eq(servants.id, servantId));
  if (!servant) throw new Error("Servo não encontrado");

  // Todas as datas precisam ser da mesma escala, e essa escala precisa ser do
  // setor do servo — impede gravar cruzando setores/escalas adivinhando IDs.
  const dateRows = await db.select({
    scheduleId: schedules.id,
    sectorId: schedules.sectorId,
    visibility: schedules.visibility,
  })
    .from(scheduleDates)
    .innerJoin(schedules, eq(scheduleDates.scheduleId, schedules.id))
    .where(inArray(scheduleDates.id, uniqueDateIds));

  if (dateRows.length !== uniqueDateIds.length) throw new Error("Data inválida");

  const [schedule] = dateRows;
  if (dateRows.some((r) => r.scheduleId !== schedule.scheduleId)) {
    throw new Error("As datas precisam ser da mesma escala");
  }
  if (schedule.sectorId !== servant.sectorId) {
    throw new Error("Este servo não pertence ao setor desta escala");
  }

  // Escala privada: exige login e que o servo informado seja o próprio usuário.
  // Escala pública: sem login segue aberta (por design), mas se houver sessão
  // ainda assim impede responder no lugar de outra pessoa.
  const session = await getServerSession(authOptions);
  if (schedule.visibility === "private" && !session) {
    throw new Error("Faça login para responder a esta escala");
  }
  if (session && servant.userId !== session.user.id) {
    throw new Error("Não autorizado a responder por outro servo");
  }

  for (const dateId of uniqueDateIds) {
    const [existing] = await db.select().from(scheduleAvailability).where(
      and(eq(scheduleAvailability.dateId, dateId), eq(scheduleAvailability.servantId, servantId))
    );
    if (existing) continue;

    await db.insert(scheduleAvailability).values({
      servantId,
      dateId,
    });
  }
  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}

export async function registerUser(name: string, email: string, password: string) {
  // Cria uma conta de ADMIN — só um admin já autenticado pode fazer isso.
  // O primeiro admin do sistema é criado pelo script src/db/seed.ts.
  await requireAdmin();

  const [existingUser] = await db.select().from(users).where(eq(users.email, email));
  if (existingUser) {
    throw new Error("E-mail já cadastrado");
  }

  const hashedPassword = await hash(password, 10);
  await db.insert(users).values({
    name,
    email,
    password: hashedPassword,
    role: "admin",
  });

  return { success: true };
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
  if (!user) throw new Error("Usuário não encontrado");

  const valid = await compare(currentPassword, user.password);
  if (!valid) throw new Error("Senha atual incorreta");

  const hashedPassword = await hash(newPassword, 10);
  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, session.user.id));
}

export async function updateOwnColor(color: string | null) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  await db.update(users).set({ color }).where(eq(users.id, session.user.id));
  revalidatePath("/servant");
}

// Troca de dia de escala (swap requests)

export async function createSwapRequest(dateId: number, targetServantId: number, requesterServantId: number) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const [requester] = await db.select().from(servants).where(
    and(eq(servants.id, requesterServantId), eq(servants.userId, session.user.id))
  );
  if (!requester) throw new Error("Não autorizado");

  if (requesterServantId === targetServantId) {
    throw new Error("Não é possível negociar com você mesmo");
  }

  const [existing] = await db.select().from(swapRequests).where(
    and(
      eq(swapRequests.dateId, dateId),
      eq(swapRequests.targetServantId, targetServantId),
      eq(swapRequests.requesterServantId, requesterServantId),
      eq(swapRequests.status, "pending")
    )
  );
  if (existing) throw new Error("Você já enviou um pedido para esse dia");

  await db.insert(swapRequests).values({ dateId, requesterServantId, targetServantId });
  revalidatePath("/servant");
}

export async function getPendingSwapRequests(): Promise<PendingSwapRequest[]> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const myServants = await db.query.servants.findMany({ where: eq(servants.userId, session.user.id) });
  if (myServants.length === 0) return [];
  const myServantIds = myServants.map((s) => s.id);

  const rows = await db.query.swapRequests.findMany({
    where: and(inArray(swapRequests.targetServantId, myServantIds), eq(swapRequests.status, "pending")),
    with: {
      date: { with: { schedule: { with: { sector: true, ministry: true } } } },
      requester: { with: { user: publicUser } },
    },
    orderBy: (sr, { desc }) => desc(sr.createdAt),
  });

  return rows.map((r) => ({
    id: r.id,
    dateId: r.dateId,
    date: r.date.date,
    startTime: r.date.startTime,
    scheduleName: r.date.schedule.name,
    sectorName: r.date.schedule.sector.name,
    ministryName: r.date.schedule.ministry.name,
    requesterName: r.requester.user.name,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function respondToSwapRequest(id: number, accept: boolean) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const request = await db.query.swapRequests.findFirst({
    where: eq(swapRequests.id, id),
    with: { target: true },
  });
  if (!request) throw new Error("Pedido não encontrado");
  if (request.status !== "pending") throw new Error("Pedido já respondido");
  if (request.target.userId !== session.user.id) throw new Error("Não autorizado");

  if (accept) {
    await db.delete(scheduleAssignments).where(
      and(eq(scheduleAssignments.dateId, request.dateId), eq(scheduleAssignments.servantId, request.targetServantId))
    );
    const [existingAssignment] = await db.select().from(scheduleAssignments).where(
      and(eq(scheduleAssignments.dateId, request.dateId), eq(scheduleAssignments.servantId, request.requesterServantId))
    );
    if (!existingAssignment) {
      await db.insert(scheduleAssignments).values({ dateId: request.dateId, servantId: request.requesterServantId });
    }
    await db.update(swapRequests).set({ status: "accepted", respondedAt: new Date() }).where(eq(swapRequests.id, id));
    await db.update(swapRequests).set({ status: "rejected", respondedAt: new Date() }).where(
      and(
        eq(swapRequests.dateId, request.dateId),
        eq(swapRequests.targetServantId, request.targetServantId),
        eq(swapRequests.status, "pending")
      )
    );
  } else {
    await db.update(swapRequests).set({ status: "rejected", respondedAt: new Date() }).where(eq(swapRequests.id, id));
  }

  revalidatePath("/servant");
  revalidatePath("/admin/schedules");
}
