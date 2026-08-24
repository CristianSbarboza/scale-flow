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

/**
 * Nome e descrição do ministério. **Não toca no líder.**
 *
 * Antes existia uma `updateMinistry` que recebia os quatro campos e, de
 * caminho, chamava `getOrCreateUser` com o e-mail do líder — então corrigir
 * uma letra do nome do ministério reexecutava a resolução de liderança, e
 * editar o campo de e-mail transferia o ministério para outra pessoa (ou
 * criava uma conta nova) sem avisar. Separar as duas é o ponto desta mudança.
 */
export async function updateMinistryDetails(id: number, name: string, description: string) {
  const scope = await requireAdmin();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("O nome do ministério não pode ficar vazio");

  // O `where` carrega a igreja junto: um id de outra igreja não casa com
  // nenhuma linha e o update não altera nada, em vez de alterar o alheio.
  const alterados = await db.update(ministries).set({
    name: trimmed,
    description: description.trim() || null,
  }).where(and(eq(ministries.id, id), eq(ministries.churchId, scope.churchId))).returning({ id: ministries.id });

  if (alterados.length === 0) throw new Error("Ministério não encontrado");

  revalidatePath("/admin/ministries");
  revalidatePath(`/admin/ministries/${id}`);
}

/**
 * Transfere a liderança do ministério.
 *
 * É operação de peso e tem action própria por isso. Se o e-mail já pertence a
 * alguém, o ministério passa para essa pessoa; se não, uma conta nova é criada
 * e a senha volta **uma única vez**, para o admin repassar.
 *
 * Devolve também quem saiu e quem entrou, para a tela poder dizer o que
 * aconteceu em vez de só recarregar.
 */
export async function transferMinistryLeader(id: number, leaderName: string, leaderEmail: string) {
  const scope = await requireAdmin();

  const nome = leaderName.trim();
  const email = leaderEmail.trim().toLowerCase();
  if (!nome) throw new Error("Informe o nome do novo líder");
  if (!email) throw new Error("Informe o e-mail do novo líder");

  const [atual] = await db.select({ leaderId: ministries.leaderId })
    .from(ministries)
    .where(and(eq(ministries.id, id), eq(ministries.churchId, scope.churchId)));
  if (!atual) throw new Error("Ministério não encontrado");

  const { user, generatedPassword } = await getOrCreateUser(nome, "leader", { email }, scope.churchId);

  if (user.id === atual.leaderId) {
    // Mesmo líder: só corrigiu a grafia do nome. Não é transferência.
    revalidatePath(`/admin/ministries/${id}`);
    return { password: null, unchanged: true };
  }

  await db.update(ministries).set({ leaderId: user.id })
    .where(and(eq(ministries.id, id), eq(ministries.churchId, scope.churchId)));

  revalidatePath("/admin/ministries");
  revalidatePath(`/admin/ministries/${id}`);
  return { password: generatedPassword, unchanged: false };
}

/**
 * Apaga o ministério. Em cascata leva setores, vínculos de servo, escalas,
 * datas, disponibilidades e escalações.
 *
 * **As contas das pessoas ficam.** O que morre é o vínculo delas com este
 * ministério — quem servia aqui continua existindo, e continua nos outros
 * ministérios em que estiver.
 */
export async function deleteMinistry(id: number) {
  const scope = await requireAdmin();

  const apagados = await db.delete(ministries)
    .where(and(eq(ministries.id, id), eq(ministries.churchId, scope.churchId)))
    .returning({ id: ministries.id });

  // Sem linha apagada significa id de outra igreja (ou inexistente). Falhar
  // aqui é melhor que responder "pronto" para quem não tinha o que apagar.
  if (apagados.length === 0) throw new Error("Ministério não encontrado");

  revalidatePath("/admin/ministries");
  revalidatePath("/admin");
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
