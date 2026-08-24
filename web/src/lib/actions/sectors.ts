"use server";

import { db } from "@/db";
import { ministries, sectors, servants, users } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { publicUser, getScope, requireMinistryAccess, requireSectorAccess } from "@/lib/scope";

export async function createSector(name: string, ministryId: number) {
  await requireMinistryAccess(ministryId);

  await db.insert(sectors).values({
    name,
    ministryId,
  });
  revalidatePath("/admin/sectors");
  revalidatePath("/admin/ministries");
}

export async function getSectors() {
  const scope = await getScope();
  
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
  // innerJoin, não leftJoin: com left, um setor órfão de ministério traria
  // `ministries.church_id` nulo e escaparia do filtro de igreja.
  .innerJoin(ministries, eq(sectors.ministryId, ministries.id))
  .where(scope.role === "admin"
    ? eq(ministries.churchId, scope.churchId)
    : and(eq(ministries.churchId, scope.churchId), eq(ministries.leaderId, scope.userId)));

  const sectorsWithServants = await Promise.all(allSectors.map(async (s) => {
    const srvs = await db.query.servants.findMany({
      where: eq(servants.sectorId, s.id),
      with: { user: publicUser }
    });
    return {
      ...s,
      servants: srvs
    };
  }));

  return sectorsWithServants;
}

/**
 * Renomeia o setor. Só o nome — mudar de ministério seria mover o setor
 * inteiro com seus servos, e isso não é edição de campo.
 */
export async function updateSector(id: number, name: string) {
  await requireSectorAccess(id);

  const trimmed = name.trim();
  if (!trimmed) throw new Error("O nome do setor não pode ficar vazio");
  if (trimmed.length > 80) throw new Error("Nome muito longo (máximo 80 caracteres)");

  await db.update(sectors).set({ name: trimmed }).where(eq(sectors.id, id));

  revalidatePath("/admin/sectors");
  revalidatePath(`/admin/sectors/${id}`);
  revalidatePath("/admin/ministries");
}

export async function getSectorById(id: number) {
  const scope = await getScope();

  // O líder vem junto: a tela do setor mostra quem lidera o ministério, e
  // buscar em separado seria uma ida a mais ao banco para um dado que esta
  // consulta já alcança pelo join.
  const [sector] = await db.select({
    id: sectors.id,
    name: sectors.name,
    ministryId: sectors.ministryId,
    ministry: {
      id: ministries.id,
      name: ministries.name,
      leaderId: ministries.leaderId,
      churchId: ministries.churchId,
    },
    leader: {
      name: users.name,
      email: users.email,
    },
  })
  .from(sectors)
  .innerJoin(ministries, eq(sectors.ministryId, ministries.id))
  .innerJoin(users, eq(ministries.leaderId, users.id))
  .where(and(eq(sectors.id, id), eq(ministries.churchId, scope.churchId)));

  if (!sector) return null;
  if (scope.role !== "admin" && sector.ministry?.leaderId !== scope.userId) return null;

  const srvs = await db.query.servants.findMany({
    where: eq(servants.sectorId, id),
    with: { user: publicUser }
  });

  return { ...sector, servants: srvs };
}
