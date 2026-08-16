"use server";

import { db } from "@/db";
import { ministries } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { publicUser, getScope, requireAdmin, getOrCreateUser } from "@/lib/scope";

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
  const scope = await getScope();
  return await db.query.ministries.findMany({
    where: scope.role === "admin" ? undefined : eq(ministries.leaderId, scope.userId),
    with: {
      sectors: {
        with: {
          servants: {
            with: { user: publicUser }
          }
        }
      },
      leader: publicUser
    }
  });
}

export async function getMinistryById(id: number) {
  const scope = await getScope();
  const ministry = await db.query.ministries.findFirst({
    where: eq(ministries.id, id),
    with: {
      sectors: {
        with: {
          servants: {
            with: { user: publicUser }
          }
        }
      },
      leader: publicUser
    }
  });
  if (!ministry) return null;
  if (scope.role !== "admin" && ministry.leaderId !== scope.userId) return null;
  return ministry;
}
