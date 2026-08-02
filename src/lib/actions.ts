"use server";

import { db } from "@/db";
import { ministries, sectors, users, servants, schedules, scheduleDates, scheduleAvailability, scheduleAssignments } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash } from "bcryptjs";

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

export async function getServants() {
  const leaderId = await getAuthFilter();
  if (leaderId) {
    return await db.query.servants.findMany({
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
    });
  }
  return await db.query.servants.findMany({
    with: {
      user: true,
      sector: { with: { ministry: true } }
    }
  });
}

export interface ServantOverviewDate {
  id: number;
  date: string;
  startTime: string;
  confirmed: boolean;
  available: boolean;
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
// flagged for whether THIS servant is confirmed/has sent availability on it.
export async function getServantOverview(): Promise<ServantOverviewSchedule[]> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const servant = await db.query.servants.findFirst({
    where: eq(servants.userId, session.user.id),
  });
  if (!servant) return [];

  const sectorSchedules = await db.query.schedules.findMany({
    where: eq(schedules.sectorId, servant.sectorId),
    with: {
      ministry: true,
      sector: true,
      dates: {
        with: {
          assignments: { where: eq(scheduleAssignments.servantId, servant.id) },
          availabilities: { where: eq(scheduleAvailability.servantId, servant.id) },
        },
      },
    },
  });

  return sectorSchedules.map((s) => ({
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
      confirmed: d.assignments.length > 0,
      available: d.availabilities.length > 0,
    })),
  }));
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
