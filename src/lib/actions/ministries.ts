"use server";

import { db } from "@/db";
import { ministries } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { publicUser, getAuthFilter, requireAdmin, getOrCreateUser } from "@/lib/scope";

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
            with: { user: publicUser }
          }
        }
      },
      leader: publicUser
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
            with: { user: publicUser }
          }
        }
      },
      leader: publicUser
    }
  });
  if (!ministry) return null;
  if (leaderId && ministry.leaderId !== leaderId) return null;
  return ministry;
}
