import 'server-only';

import { db } from "@/db";
import { ministries, sectors, users, servants, schedules, scheduleDates, scheduleAssignments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash } from "bcryptjs";
import type { Scope } from "@/types/scope";

/**
 * Monta o escopo da sessão atual. Duas consultas, sempre as mesmas,
 * independente do papel — assim o custo é previsível e o resultado
 * não depende de qual ramo do código chamou.
 */
export async function getScope(): Promise<Scope> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const led = await db.select({ id: ministries.id }).from(ministries)
    .where(eq(ministries.leaderId, session.user.id));

  const coordinated = await db.select({ sectorId: servants.sectorId }).from(servants)
    .where(and(eq(servants.userId, session.user.id), eq(servants.isCoordinator, true)));

  return {
    userId: session.user.id,
    role: session.user.role,
    ledMinistryIds: led.map((m) => m.id),
    coordinatedSectorIds: coordinated.map((c) => c.sectorId),
  };
}

/**
 * Projeção segura de `users` para uso dentro de `with: { ... }`.
 *
 * Consultas relacionais do Drizzle trazem a linha inteira por padrão, o que
 * inclui `users.password` (hash bcrypt) — e esse resultado acaba serializado
 * para o navegador. SEMPRE use isto ao incluir `user`/`leader` numa query
 * cujo retorno vá para o cliente.
 */
export const publicUser = { columns: { password: false } } as const;

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    throw new Error("Apenas administradores podem executar esta ação");
  }
}

// Admin, o líder do ministério dono do setor, ou um servo marcado como
// coordenador daquele setor podem gerenciar as escalas do setor.
export async function requireScheduleSectorAccess(sectorId: number) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  if (session.user.role === "admin") return;

  if (session.user.role === "leader") {
    const [sector] = await db.select().from(sectors)
      .innerJoin(ministries, eq(sectors.ministryId, ministries.id))
      .where(and(eq(sectors.id, sectorId), eq(ministries.leaderId, session.user.id)));
    if (sector) return;
  }

  const [coordination] = await db.select().from(servants).where(
    and(eq(servants.userId, session.user.id), eq(servants.sectorId, sectorId), eq(servants.isCoordinator, true))
  );
  if (coordination) return;

  throw new Error("Não autorizado a gerenciar a escala deste setor");
}

// Admin, ou o líder do ministério. Para gestão de estrutura (setores, membros).
export async function requireMinistryAccess(ministryId: number) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "admin" && session.user.role !== "leader")) {
    throw new Error("Não autorizado");
  }
  if (session.user.role === "admin") return;

  const [ministry] = await db.select().from(ministries)
    .where(and(eq(ministries.id, ministryId), eq(ministries.leaderId, session.user.id)));

  if (!ministry) throw new Error("Não autorizado a gerenciar este ministério");
}

// Admin, ou o líder do ministério dono do setor. Diferente de
// requireScheduleSectorAccess: aqui coordenador NÃO tem acesso, pois isto
// guarda gestão de estrutura/membros, não a escala do setor.
export async function requireSectorAccess(sectorId: number) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "admin" && session.user.role !== "leader")) {
    throw new Error("Não autorizado");
  }
  if (session.user.role === "admin") return;

  const [sector] = await db.select().from(sectors)
    .innerJoin(ministries, eq(sectors.ministryId, ministries.id))
    .where(and(eq(sectors.id, sectorId), eq(ministries.leaderId, session.user.id)));

  if (!sector) throw new Error("Não autorizado a gerenciar este setor");
}

export async function requireServantAccess(userId: string) {
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

export async function getSectorIdForScheduleId(scheduleId: number) {
  const [schedule] = await db.select({ sectorId: schedules.sectorId }).from(schedules).where(eq(schedules.id, scheduleId));
  if (!schedule) throw new Error("Escala não encontrada");
  return schedule.sectorId;
}

export async function getSectorIdForDateId(dateId: number) {
  const [row] = await db.select({ sectorId: schedules.sectorId })
    .from(scheduleDates)
    .innerJoin(schedules, eq(scheduleDates.scheduleId, schedules.id))
    .where(eq(scheduleDates.id, dateId));
  if (!row) throw new Error("Data não encontrada");
  return row.sectorId;
}

export async function getSectorIdForAssignmentId(assignmentId: number) {
  const [row] = await db.select({ sectorId: schedules.sectorId })
    .from(scheduleAssignments)
    .innerJoin(scheduleDates, eq(scheduleAssignments.dateId, scheduleDates.id))
    .innerJoin(schedules, eq(scheduleDates.scheduleId, schedules.id))
    .where(eq(scheduleAssignments.id, assignmentId));
  if (!row) throw new Error("Escalação não encontrada");
  return row.sectorId;
}

/**
 * Lógica de Upsert de Usuário
 * Líderes e admins se identificam por e-mail; servos por usuário (e-mail é opcional para eles).
 * Se o identificador não existe, cria com senha aleatória.
 * Se existe, apenas garante que o cargo (role) seja compatível.
 */
export async function getOrCreateUser(
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
