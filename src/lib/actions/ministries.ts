"use server";

import { db } from "@/db";
import { ministries } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { publicUser, getScope, requireAdmin, getOrCreateUser } from "@/lib/scope";

export async function createMinistry(
  name: string,
  description: string,
  leaderName: string,
  leaderEmail: string,
  leaderPhone: string | null = null,
) {
  const scope = await requireAdmin();
  const { user, generatedPassword } = await getOrCreateUser(
    leaderName, "leader", { email: leaderEmail, phone: leaderPhone }, scope.churchId
  );

  await db.insert(ministries).values({
    name,
    description,
    leaderId: user.id,
    churchId: scope.churchId,
  });

  revalidatePath("/admin/ministries");
  return { password: generatedPassword };
}

export async function updateMinistry(id: number, name: string, description: string, leaderName: string, leaderEmail: string) {
  const scope = await requireAdmin();
  const { user, generatedPassword } = await getOrCreateUser(leaderName, "leader", { email: leaderEmail }, scope.churchId);

  // O `where` carrega a igreja junto: um id de outra igreja não casa com
  // nenhuma linha e o update não altera nada, em vez de alterar o alheio.
  await db.update(ministries).set({
    name,
    description,
    leaderId: user.id
  }).where(and(eq(ministries.id, id), eq(ministries.churchId, scope.churchId)));

  revalidatePath("/admin/ministries");
  return { password: generatedPassword };
}

export async function getMinistries() {
  const scope = await getScope();
  // A igreja entra nos dois ramos. O do admin não é "sem filtro": é "sem
  // filtro de papel", que é coisa diferente.
  return await db.query.ministries.findMany({
    where: scope.role === "admin"
      ? eq(ministries.churchId, scope.churchId)
      : and(eq(ministries.churchId, scope.churchId), eq(ministries.leaderId, scope.userId)),
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
  if (ministry.churchId !== scope.churchId) return null;
  if (scope.role !== "admin" && ministry.leaderId !== scope.userId) return null;
  return ministry;
}
