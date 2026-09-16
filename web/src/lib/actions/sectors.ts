"use server";

import { db } from "@/db";
import { ministries, ministryLeaders, sectors, servants, users } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { publicUser, getScope, requireMinistryAccess, requireSectorAccess, ledBy } from "@/lib/scope";

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
    : and(eq(ministries.churchId, scope.churchId), ledBy(scope.userId)));

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

/**
 * Apaga o setor. Em cascata leva os vínculos de servo, as escalas do setor,
 * suas datas, disponibilidades e escalações.
 *
 * **As contas das pessoas ficam.** Some o vínculo com este setor, não o
 * cadastro de quem servia nele.
 */
export async function deleteSector(id: number) {
  // Mesma guarda de quem edita: admin, ou o líder do ministério dono. Já
  // confere a igreja antes de qualquer papel.
  await requireSectorAccess(id);

  await db.delete(sectors).where(eq(sectors.id, id));

  revalidatePath("/admin/sectors");
  revalidatePath("/admin/ministries");
  revalidatePath("/admin");
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
      churchId: ministries.churchId,
    },
  })
  .from(sectors)
  .innerJoin(ministries, eq(sectors.ministryId, ministries.id))
  .where(and(eq(sectors.id, id), eq(ministries.churchId, scope.churchId)));

  if (!sector) return null;

  // Os líderes vêm à parte porque são N: no join de antes, um por linha
  // duplicaria o setor. A lista também responde "quem consulta lidera?".
  const leaders = await db.select({ userId: users.id, name: users.name, email: users.email })
    .from(ministryLeaders)
    .innerJoin(users, eq(ministryLeaders.userId, users.id))
    .where(eq(ministryLeaders.ministryId, sector.ministryId))
    .orderBy(users.name);

  if (scope.role !== "admin" && !leaders.some((l) => l.userId === scope.userId)) return null;

  const srvs = await db.query.servants.findMany({
    where: eq(servants.sectorId, id),
    with: { user: publicUser }
  });

  return { ...sector, leaders, servants: srvs };
}
