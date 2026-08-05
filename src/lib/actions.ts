"use server";

import { db } from "@/db";
import { ministries, sectors, users, servants, schedules, scheduleDates, scheduleAvailability, scheduleAssignments, swapRequests } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq, and, inArray } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash, compare } from "bcryptjs";

// Helper to check role and filter
async function getAuthFilter() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  if (session.user.role === "admin") return null;
  return session.user.id;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    throw new Error("Apenas administradores podem executar esta ação");
  }
}

/**
 * Lógica de Upsert de Usuário
 * Líderes e admins se identificam por e-mail; servos por usuário (e-mail é opcional para eles).
 * Se o identificador não existe, cria com senha aleatória.
 * Se existe, apenas garante que o cargo (role) seja compatível.
 */
async function getOrCreateUser(
  name: string,
  targetRole: "leader" | "servant",
  identifier: { email?: string | null; username?: string | null }
) {
  const email = identifier.email?.trim() || null;
  const username = identifier.username?.trim() || null;

  const whereCondition = username ? eq(users.username, username) : eq(users.email, email!);
  let [user] = await db.select().from(users).where(whereCondition);
  let generatedPassword = null;

  if (!user) {
    generatedPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await hash(generatedPassword, 10);
    [user] = await db.insert(users).values({
      name,
      email,
      username,
      password: hashedPassword,
      role: targetRole,
    }).returning();
  } else {
    // Se o usuário existe e o novo cargo é mais "alto" (leader > servant), atualiza
    if (targetRole === "leader" && user.role === "servant") {
      await db.update(users).set({ role: "leader" }).where(eq(users.id, user.id));
    }
  }

  return { user, generatedPassword };
}

// Ministries
export async function createMinistry(name: string, description: string, leaderName: string, leaderEmail: string) {
  await requireAdmin();
  const { user, generatedPassword } = await getOrCreateUser(leaderName, "leader", { email: leaderEmail });

  await db.insert(ministries).values({ 
    name, 
    description, 
    leaderId: user.id 
  });
  
  revalidatePath("/admin/ministries");
  return { password: generatedPassword };
}

export async function updateMinistry(id: number, name: string, description: string, leaderName: string, leaderEmail: string) {
  await requireAdmin();
  const { user, generatedPassword } = await getOrCreateUser(leaderName, "leader", { email: leaderEmail });

  await db.update(ministries).set({
    name,
    description,
    leaderId: user.id
  }).where(eq(ministries.id, id));

  revalidatePath("/admin/ministries");
  return { password: generatedPassword };
}

export async function getMinistries() {
  const leaderId = await getAuthFilter();
  return await db.query.ministries.findMany({
    where: leaderId ? eq(ministries.leaderId, leaderId) : undefined,
    with: {
      sectors: {
        with: {
          servants: {
            with: { user: true }
          }
        }
      },
      leader: true
    }
  });
}

export async function getMinistryById(id: number) {
  const leaderId = await getAuthFilter();
  const ministry = await db.query.ministries.findFirst({
    where: eq(ministries.id, id),
    with: {
      sectors: {
        with: {
          servants: {
            with: { user: true }
          }
        }
      },
      leader: true
    }
  });
  if (!ministry) return null;
  if (leaderId && ministry.leaderId !== leaderId) return null;
  return ministry;
}

// Sectors
export async function createSector(name: string, ministryId: number) {
  await db.insert(sectors).values({
    name,
    ministryId,
  });
  revalidatePath("/admin/sectors");
  revalidatePath("/admin/ministries");
}

export async function getSectors() {
  const leaderId = await getAuthFilter();
  
  const allSectors = await db.select({
    id: sectors.id,
    name: sectors.name,
    ministryId: sectors.ministryId,
    ministry: {
      id: ministries.id,
      name: ministries.name
    }
  })
  .from(sectors)
  .leftJoin(ministries, eq(sectors.ministryId, ministries.id))
  .where(leaderId ? eq(ministries.leaderId, leaderId) : undefined);

  const sectorsWithServants = await Promise.all(allSectors.map(async (s) => {
    const srvs = await db.query.servants.findMany({
      where: eq(servants.sectorId, s.id),
      with: { user: true }
    });
    return {
      ...s,
      servants: srvs
    };
  }));

  return sectorsWithServants;
}

export async function getSectorById(id: number) {
  const leaderId = await getAuthFilter();

  const [sector] = await db.select({
    id: sectors.id,
    name: sectors.name,
    ministryId: sectors.ministryId,
    ministry: {
      id: ministries.id,
      name: ministries.name,
      leaderId: ministries.leaderId,
    }
  })
  .from(sectors)
  .leftJoin(ministries, eq(sectors.ministryId, ministries.id))
  .where(eq(sectors.id, id));

  if (!sector) return null;
  if (leaderId && sector.ministry?.leaderId !== leaderId) return null;

  const srvs = await db.query.servants.findMany({
    where: eq(servants.sectorId, id),
    with: { user: true }
  });

  return { ...sector, servants: srvs };
}

// Servants
export async function createServant(name: string, username: string, email: string | null, sectorId: number) {
  const { user, generatedPassword } = await getOrCreateUser(name, "servant", { username, email });

  // Verifica se o usuário já é um servo neste setor para evitar duplicidade
  const [existingServant] = await db.select().from(servants).where(
    and(
      eq(servants.userId, user.id),
      eq(servants.sectorId, sectorId)
    )
  );

  if (!existingServant) {
    await db.insert(servants).values({
      userId: user.id,
      sectorId,
    });
  }

  revalidatePath("/admin/servants");
  revalidatePath("/admin/sectors");
  revalidatePath("/admin/ministries");
  
  return { password: generatedPassword };
}

export interface ServantMembership {
  servantId: number;
  sectorId: number;
  sectorName: string;
  ministryId: number;
  ministryName: string;
}

export interface ServantSummary {
  userId: string;
  name: string;
  username: string | null;
  email: string | null;
  memberships: ServantMembership[];
}

export async function getServants(): Promise<ServantSummary[]> {
  const leaderId = await getAuthFilter();
  const rows = leaderId
    ? await db.query.servants.findMany({
        where: (servants, { exists }) => exists(
          db.select().from(sectors).where(
            and(
              eq(sectors.id, servants.sectorId),
              exists(
                db.select().from(ministries).where(
                  and(
                    eq(ministries.id, sectors.ministryId),
                    eq(ministries.leaderId, leaderId)
                  )
                )
              )
            )
          )
        ),
        with: {
          user: true,
          sector: { with: { ministry: true } }
        }
      })
    : await db.query.servants.findMany({
        with: {
          user: true,
          sector: { with: { ministry: true } }
        }
      });

  const byUser = new Map<string, ServantSummary>();
  for (const row of rows) {
    const membership: ServantMembership = {
      servantId: row.id,
      sectorId: row.sector.id,
      sectorName: row.sector.name,
      ministryId: row.sector.ministry.id,
      ministryName: row.sector.ministry.name,
    };
    const existing = byUser.get(row.userId);
    if (existing) {
      existing.memberships.push(membership);
    } else {
      byUser.set(row.userId, {
        userId: row.userId,
        name: row.user.name,
        username: row.user.username,
        email: row.user.email,
        memberships: [membership],
      });
    }
  }
  return Array.from(byUser.values());
}

export async function getServantMember(userId: string): Promise<ServantSummary | null> {
  await requireServantAccess(userId);

  const rows = await db.query.servants.findMany({
    where: eq(servants.userId, userId),
    with: {
      user: true,
      sector: { with: { ministry: true } }
    }
  });
  if (rows.length === 0) return null;

  return {
    userId,
    name: rows[0].user.name,
    username: rows[0].user.username,
    email: rows[0].user.email,
    memberships: rows.map((row) => ({
      servantId: row.id,
      sectorId: row.sector.id,
      sectorName: row.sector.name,
      ministryId: row.sector.ministry.id,
      ministryName: row.sector.ministry.name,
    })),
  };
}

export interface ServantOverviewAssignee {
  servantId: number;
  userId: string;
  name: string;
  isSelf: boolean;
}

export interface ServantOverviewDate {
  id: number;
  date: string;
  startTime: string;
  confirmed: boolean;
  available: boolean;
  assignees: ServantOverviewAssignee[];
}

export interface ServantOverviewSchedule {
  id: number;
  name: string;
  ministryName: string;
  sectorName: string;
  shareLink: string;
  servantId: number;
  dates: ServantOverviewDate[];
}

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
            assignments: { with: { servant: { with: { user: true } } } },
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
          })),
        })),
      });
    }
  }
  return results;
}

// Schedules
export async function createSchedule(name: string, ministryId: number, sectorId: number, dates: { date: string, startTime: string }[]) {
  const shareLink = nanoid(10);
  const [schedule] = await db.insert(schedules).values({
    name,
    ministryId,
    sectorId,
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
  await db.delete(schedules).where(eq(schedules.id, id));
  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}

export async function updateSchedule(id: number, name: string, dates: { date: string, startTime: string }[]) {
  await db.update(schedules).set({ name }).where(eq(schedules.id, id));

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

export async function getScheduleResponses(scheduleId: number) {
  return await db.query.scheduleDates.findMany({
    where: eq(scheduleDates.scheduleId, scheduleId),
    with: {
      availabilities: {
        with: {
          servant: { with: { user: true } }
        }
      },
      assignments: {
        with: {
          servant: { with: { user: true } }
        }
      }
    }
  });
}

export async function assignServant(dateId: number, servantId: number) {
  await db.insert(scheduleAssignments).values({
    dateId,
    servantId,
  });
  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}

export async function removeAssignment(assignmentId: number) {
  await db.delete(scheduleAssignments).where(eq(scheduleAssignments.id, assignmentId));
  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}

export async function saveAvailability(servantId: number, dateIds: number[]) {
  for (const dateId of dateIds) {
    await db.insert(scheduleAvailability).values({
      servantId,
      dateId,
    });
  }
  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}

export async function registerUser(name: string, email: string, password: string) {
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

async function requireServantAccess(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "admin" && session.user.role !== "leader")) {
    throw new Error("Não autorizado");
  }
  if (session.user.role === "admin") return;

  const [membership] = await db.select().from(servants)
    .innerJoin(sectors, eq(servants.sectorId, sectors.id))
    .innerJoin(ministries, eq(sectors.ministryId, ministries.id))
    .where(and(eq(servants.userId, userId), eq(ministries.leaderId, session.user.id)));

  if (!membership) {
    throw new Error("Não autorizado a gerenciar este membro");
  }
}

export async function addServantToSector(userId: string, sectorId: number) {
  await requireServantAccess(userId);

  const session = await getServerSession(authOptions);
  if (session!.user.role === "leader") {
    const [sector] = await db.select().from(sectors)
      .innerJoin(ministries, eq(sectors.ministryId, ministries.id))
      .where(and(eq(sectors.id, sectorId), eq(ministries.leaderId, session!.user.id)));
    if (!sector) throw new Error("Não autorizado a adicionar este setor");
  }

  const [existing] = await db.select().from(servants).where(
    and(eq(servants.userId, userId), eq(servants.sectorId, sectorId))
  );
  if (!existing) {
    await db.insert(servants).values({ userId, sectorId });
  }

  revalidatePath("/admin/servants");
  revalidatePath("/servant");
}

export async function removeServantFromSector(servantId: number) {
  const [membership] = await db.select().from(servants).where(eq(servants.id, servantId));
  if (!membership) throw new Error("Vínculo não encontrado");
  await requireServantAccess(membership.userId);

  await db.delete(servants).where(eq(servants.id, servantId));

  revalidatePath("/admin/servants");
  revalidatePath("/servant");
}

export async function resetServantPassword(userId: string, newPassword: string, actingUserPassword: string) {
  await requireServantAccess(userId);

  const session = await getServerSession(authOptions);
  const [actingUser] = await db.select().from(users).where(eq(users.id, session!.user.id));
  if (!actingUser) throw new Error("Usuário não encontrado");

  const valid = await compare(actingUserPassword, actingUser.password);
  if (!valid) throw new Error("Sua senha atual está incorreta");

  const hashedPassword = await hash(newPassword, 10);
  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));

  revalidatePath("/admin/servants");
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

export async function deleteServantAccount(userId: string) {
  await requireServantAccess(userId);

  await db.delete(users).where(eq(users.id, userId));

  revalidatePath("/admin/servants");
  revalidatePath("/admin/sectors");
  revalidatePath("/admin/ministries");
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

export interface PendingSwapRequest {
  id: number;
  dateId: number;
  date: string;
  startTime: string;
  scheduleName: string;
  sectorName: string;
  ministryName: string;
  requesterName: string;
  createdAt: string;
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
      requester: { with: { user: true } },
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
