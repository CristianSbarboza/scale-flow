import 'server-only';

import { db } from "@/db";
import { ministries, sectors, users, servants, schedules, scheduleDates, scheduleAssignments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash } from "bcryptjs";
import type { Scope } from "@/types/scope";
import type { CoordinatorSector } from "@/types/domain";
import { normalizeStoredPhone } from "@/lib/phone";

/**
 * Converte vínculos de servo (com setor e ministério carregados) na forma
 * `CoordinatorSector`. Pura de propósito: `src/app/servant/page.tsx` já
 * carregou esses vínculos e não deve consultar o banco de novo.
 */
export function mapCoordinatorSectors(
  rows: Array<{
    isCoordinator: boolean;
    sector: { id: number; name: string; ministry: { id: number; name: string } };
  }>
): CoordinatorSector[] {
  return rows
    .filter((r) => r.isCoordinator)
    .map((r) => ({
      id: r.sector.id,
      name: r.sector.name,
      ministryId: r.sector.ministry.id,
      ministryName: r.sector.ministry.name,
    }));
}

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
    churchId: session.user.churchId,
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

/**
 * Exige admin e **devolve o escopo**.
 *
 * O retorno não é conveniência: sem ele, quem chama precisa buscar o
 * `churchId` por conta própria, e o caminho mais curto passa a ser não
 * filtrar por igreja nenhuma. Devolvendo o escopo, o dado certo já está na
 * mão de quem vai escrever a query.
 */
export async function requireAdmin(): Promise<Scope> {
  const scope = await getScope();
  if (scope.role !== "admin") {
    throw new Error("Apenas administradores podem executar esta ação");
  }
  return scope;
}

/** A igreja de um ministério. `null` se o ministério não existe. */
async function churchOfMinistry(ministryId: number) {
  const [row] = await db.select({ churchId: ministries.churchId })
    .from(ministries).where(eq(ministries.id, ministryId));
  return row?.churchId ?? null;
}

/** A igreja dona de um setor, alcançada pelo ministério. */
async function churchOfSector(sectorId: number) {
  const [row] = await db.select({ churchId: ministries.churchId })
    .from(sectors)
    .innerJoin(ministries, eq(sectors.ministryId, ministries.id))
    .where(eq(sectors.id, sectorId));
  return row?.churchId ?? null;
}

// Admin, o líder do ministério dono do setor, ou um servo marcado como
// coordenador daquele setor podem gerenciar as escalas do setor.
// Em todos os casos, dentro da própria igreja.
export async function requireScheduleSectorAccess(sectorId: number) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  // Barreira dura, antes de qualquer papel: o setor é desta igreja?
  const churchId = await churchOfSector(sectorId);
  if (churchId === null || churchId !== session.user.churchId) {
    throw new Error("Não autorizado a gerenciar a escala deste setor");
  }

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
// Sempre dentro da própria igreja.
export async function requireMinistryAccess(ministryId: number) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "admin" && session.user.role !== "leader")) {
    throw new Error("Não autorizado");
  }

  const churchId = await churchOfMinistry(ministryId);
  if (churchId === null || churchId !== session.user.churchId) {
    throw new Error("Não autorizado a gerenciar este ministério");
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

  const churchId = await churchOfSector(sectorId);
  if (churchId === null || churchId !== session.user.churchId) {
    throw new Error("Não autorizado a gerenciar este setor");
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

  // A igreja vem do próprio usuário-alvo, não do vínculo: alguém recém-criado
  // ainda não tem setor, e nem por isso pode ser mexido de fora da igreja.
  const [target] = await db.select({ churchId: users.churchId })
    .from(users).where(eq(users.id, userId));
  if (!target || target.churchId !== session.user.churchId) {
    throw new Error("Não autorizado a gerenciar este membro");
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
 *
 * A busca segue a mesma regra de unicidade do banco: `username` só colide
 * dentro da igreja, `email` colide no mundo inteiro. É por isso que o e-mail
 * de outra igreja precisa de tratamento explícito — reaproveitar aquela linha
 * seria sequestrar a conta de alguém que o admin daqui nem deveria enxergar.
 */
export async function getOrCreateUser(
  name: string,
  targetRole: "leader" | "servant",
  identifier: { email?: string | null; username?: string | null; phone?: string | null },
  churchId: number
) {
  const email = identifier.email?.trim() || null;
  const username = identifier.username?.trim() || null;
  // Normaliza no servidor: a máscara do cliente é conforto, não garantia.
  // Sem isto, o mesmo número gravado por caminhos diferentes vira valores
  // diferentes, e ninguém percebe até a primeira busca — ou a primeira
  // mensagem que não chega.
  const phone = normalizeStoredPhone(identifier.phone);

  const whereCondition = username
    ? and(eq(users.username, username), eq(users.churchId, churchId))
    : eq(users.email, email!);
  let [user] = await db.select().from(users).where(whereCondition);
  let generatedPassword = null;

  if (!user) {
    // A busca acima foi por username dentro da igreja; o e-mail é único no
    // mundo. Sem esta checagem, cadastrar um username novo com um e-mail já
    // usado estoura na constraint e o admin recebe o texto cru do Postgres.
    if (email) {
      const [emailOwner] = await db.select().from(users).where(eq(users.email, email));
      if (emailOwner) {
        throw new Error(
          emailOwner.churchId === churchId
            ? `O e-mail ${email} já está em uso por ${emailOwner.name}.`
            : `O e-mail ${email} já pertence a um usuário de outra igreja. ` +
              `Cada pessoa existe em uma igreja só — use outro e-mail.`
        );
      }
    }

    generatedPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await hash(generatedPassword, 10);
    [user] = await db.insert(users).values({
      name,
      email,
      username,
      phone,
      password: hashedPassword,
      role: targetRole,
      churchId,
    }).returning();
  } else {
    if (user.churchId !== churchId) {
      throw new Error(
        `O e-mail ${email} já pertence a um usuário de outra igreja. ` +
        `Cada pessoa existe em uma igreja só — use outro e-mail.`
      );
    }
    // Se o usuário existe e o novo cargo é mais "alto" (leader > servant), atualiza
    if (targetRole === "leader" && user.role === "servant") {
      await db.update(users).set({ role: "leader" }).where(eq(users.id, user.id));
    }
    // Preenche o telefone se a pessoa ainda não tinha um. Não sobrescreve:
    // quem já informou o próprio número sabe melhor que o formulário de
    // cadastro de quem está adicionando essa pessoa a mais um setor.
    if (phone && !user.phone) {
      await db.update(users).set({ phone }).where(eq(users.id, user.id));
      user = { ...user, phone };
    }
  }

  return { user, generatedPassword };
}
