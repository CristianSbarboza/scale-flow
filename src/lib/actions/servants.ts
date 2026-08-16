"use server";

import { db } from "@/db";
import { ministries, sectors, users, servants } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { hash, compare } from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publicUser, getAuthFilter, requireSectorAccess, requireServantAccess, getOrCreateUser } from "@/lib/scope";
import type { ServantMembership, ServantSummary } from "@/types/domain";

export async function createServant(name: string, username: string, email: string | null, sectorId: number) {
  await requireSectorAccess(sectorId);

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
          user: publicUser,
          sector: { with: { ministry: true } }
        }
      })
    : await db.query.servants.findMany({
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
