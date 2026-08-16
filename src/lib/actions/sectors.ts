"use server";

import { db } from "@/db";
import { ministries, sectors, servants } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { publicUser, getScope, requireMinistryAccess } from "@/lib/scope";

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
  .leftJoin(ministries, eq(sectors.ministryId, ministries.id))
  .where(scope.role === "admin" ? undefined : eq(ministries.leaderId, scope.userId));

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

export async function getSectorById(id: number) {
  const scope = await getScope();

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
  if (scope.role !== "admin" && sector.ministry?.leaderId !== scope.userId) return null;

  const srvs = await db.query.servants.findMany({
    where: eq(servants.sectorId, id),
    with: { user: publicUser }
  });

  return { ...sector, servants: srvs };
}
