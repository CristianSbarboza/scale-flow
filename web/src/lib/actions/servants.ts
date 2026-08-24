"use server";

import { db } from "@/db";
import { ministries, sectors, users, servants } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, exists, inArray } from "drizzle-orm";
import type { Scope } from "@/types/scope";
import { hash, compare } from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publicUser, getScope, requireSectorAccess, requireServantAccess, getOrCreateUser } from "@/lib/scope";
import { normalizeStoredPhone } from "@/lib/phone";
import type { ServantMembership, ServantSummary } from "@/types/domain";

export async function createServant(
  name: string,
  username: string,
  email: string | null,
  sectorId: number,
  phone: string | null = null,
) {
  // `requireSectorAccess` já garantiu que o setor é desta igreja, então o
  // `churchId` do escopo é o do setor — não há como criar o servo num lugar
  // e vinculá-lo em outro.
  const scope = await getScope();
  await requireSectorAccess(sectorId);

  const { user, generatedPassword } = await getOrCreateUser(name, "servant", { username, email, phone }, scope.churchId);

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

/**
 * Vínculos de servo que o escopo atual alcança: o setor precisa pertencer a um
 * ministério da igreja e, quando não for admin, liderado por quem consulta.
 *
 * Predicado único pelo mesmo motivo de `schedulesVisibleTo` em schedules.ts:
 * o ramo de admin era um `findMany()` cru, e ramo sem filtro é o que vaza.
 */
function servantsVisibleTo(scope: Scope) {
  const ministryConditions = [
    eq(ministries.id, sectors.ministryId),
    eq(ministries.churchId, scope.churchId),
  ];
  if (scope.role !== "admin") {
    ministryConditions.push(eq(ministries.leaderId, scope.userId));
  }
  return exists(
    db.select().from(sectors).where(
      and(
        eq(sectors.id, servants.sectorId),
        exists(db.select().from(ministries).where(and(...ministryConditions)))
      )
    )
  );
}

export async function getServants(): Promise<ServantSummary[]> {
  const scope = await getScope();
  const rows = await db.query.servants.findMany({
    where: servantsVisibleTo(scope),
    with: {
      user: publicUser,
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
      isCoordinator: row.isCoordinator,
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
        phone: row.user.phone,
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
      user: publicUser,
      sector: { with: { ministry: true } }
    }
  });
  if (rows.length === 0) return null;

  return {
    userId,
    name: rows[0].user.name,
    username: rows[0].user.username,
    email: rows[0].user.email,
    phone: rows[0].user.phone,
    memberships: rows.map((row) => ({
      servantId: row.id,
      sectorId: row.sector.id,
      sectorName: row.sector.name,
      ministryId: row.sector.ministry.id,
      ministryName: row.sector.ministry.name,
      isCoordinator: row.isCoordinator,
    })),
  };
}

/**
 * Nome e telefone de um membro, editados pelo admin ou pelo líder.
 *
 * `requireServantAccess` é a mesma guarda de `resetServantPassword` e
 * `deleteServantAccount`: confere a igreja antes de qualquer papel, então nem
 * admin alcança membro de outra igreja.
 *
 * Não mexe em `username` nem em `email`. Os dois são identificadores de login:
 * trocá-los por esta tela derrubaria o acesso da pessoa sem ela saber por quê.
 */
export async function updateServantProfile(userId: string, name: string, phone: string | null) {
  await requireServantAccess(userId);

  const trimmed = name.trim();
  if (!trimmed) throw new Error("O nome não pode ficar vazio");
  if (trimmed.length > 120) throw new Error("Nome muito longo (máximo 120 caracteres)");

  await db.update(users)
    .set({ name: trimmed, phone: normalizeStoredPhone(phone) })
    .where(eq(users.id, userId));

  revalidatePath("/admin/servants");
  revalidatePath(`/admin/servants/${userId}`);
  revalidatePath("/servant");
}

export async function addServantToSector(userId: string, sectorId: number) {
  await requireServantAccess(userId);
  await requireSectorAccess(sectorId);

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

/**
 * Desliga o servo de um ministério inteiro, apagando todos os vínculos de
 * setor dele naquele ministério.
 *
 * Ninguém "pertence" a um ministério direto no banco — a ligação existe pelos
 * setores. Então isto é um `delete` em N linhas, e por isso devolve quantas
 * foram: a tela precisa poder dizer o que aconteceu, e a confirmação precisa
 * poder listar antes.
 */
export async function removeServantFromMinistry(userId: string, ministryId: number) {
  const scope = await getScope();
  await requireServantAccess(userId);

  // O ministério tem que ser desta igreja. `requireServantAccess` garante o
  // usuário, não o ministério — os dois ids chegam do cliente, e validar um
  // não valida o outro.
  const [ministry] = await db.select({ id: ministries.id }).from(ministries)
    .where(and(eq(ministries.id, ministryId), eq(ministries.churchId, scope.churchId)));
  if (!ministry) throw new Error("Ministério não encontrado");

  const alvos = await db.select({ id: servants.id })
    .from(servants)
    .innerJoin(sectors, eq(servants.sectorId, sectors.id))
    .where(and(eq(servants.userId, userId), eq(sectors.ministryId, ministryId)));

  if (alvos.length === 0) return { removed: 0 };

  await db.delete(servants).where(inArray(servants.id, alvos.map((a) => a.id)));

  revalidatePath("/admin/servants");
  revalidatePath(`/admin/servants/${userId}`);
  revalidatePath("/servant");
  return { removed: alvos.length };
}

export async function setServantCoordinator(servantId: number, isCoordinator: boolean) {
  const [membership] = await db.select().from(servants).where(eq(servants.id, servantId));
  if (!membership) throw new Error("Vínculo não encontrado");
  await requireServantAccess(membership.userId);

  await db.update(servants).set({ isCoordinator }).where(eq(servants.id, servantId));

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

export async function deleteServantAccount(userId: string) {
  await requireServantAccess(userId);

  await db.delete(users).where(eq(users.id, userId));

  revalidatePath("/admin/servants");
  revalidatePath("/admin/sectors");
  revalidatePath("/admin/ministries");
}
