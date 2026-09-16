"use server";

import { db } from "@/db";
import { ministries, ministryLeaders } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { publicUser, getScope, requireAdmin, requireMinistryAccess, getOrCreateUser, ledBy } from "@/lib/scope";

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

  const [ministry] = await db.insert(ministries).values({
    name,
    description,
    churchId: scope.churchId,
  }).returning({ id: ministries.id });

  await db.insert(ministryLeaders).values({ ministryId: ministry.id, userId: user.id });

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
 * Soma um líder ao ministério. Vários por ministério, sem limite.
 *
 * `requireMinistryAccess`, e não `requireAdmin`: um líder pode trazer outro
 * para o próprio ministério — é o pedido da spec 06. Admin alcança qualquer
 * ministério da igreja pelo mesmo caminho. A barreira de igreja está lá
 * dentro, antes do ramo de papel.
 *
 * Se o e-mail já pertence a alguém, essa pessoa entra (e sobe para `leader`
 * se era servo); se não, uma conta nova é criada e a senha volta **uma única
 * vez**, para quem adicionou repassar.
 */
export async function addMinistryLeader(
  id: number,
  leaderName: string,
  leaderEmail: string,
  leaderPhone: string | null = null,
) {
  await requireMinistryAccess(id);
  const scope = await getScope();

  const nome = leaderName.trim();
  const email = leaderEmail.trim().toLowerCase();
  if (!nome) throw new Error("Informe o nome do líder");
  if (!email) throw new Error("Informe o e-mail do líder");

  const { user, generatedPassword } = await getOrCreateUser(
    nome, "leader", { email, phone: leaderPhone }, scope.churchId
  );

  // Já lidera: não é erro, é clique repetido ou grafia corrigida. O índice
  // único barraria de qualquer forma; aqui só se evita o texto cru do Postgres.
  const [existente] = await db.select().from(ministryLeaders)
    .where(and(eq(ministryLeaders.ministryId, id), eq(ministryLeaders.userId, user.id)));
  if (existente) {
    return { password: null, unchanged: true };
  }

  await db.insert(ministryLeaders).values({ ministryId: id, userId: user.id });

  revalidatePath("/admin/ministries");
  revalidatePath(`/admin/ministries/${id}`);
  revalidatePath("/admin");
  return { password: generatedPassword, unchanged: false };
}

/**
 * Tira alguém da liderança do ministério. Nunca o último: ministério sem
 * líder não tem quem cuide dele, e a tela não teria nem para quem mostrar o
 * botão de adicionar.
 *
 * A conta continua existindo, com o papel `leader` — como sempre foi na troca
 * de líder. Rebaixar para servo trancaria a pessoa para fora: líder entra por
 * e-mail e servo por usuário, e uma conta criada como líder não tem usuário.
 */
export async function removeMinistryLeader(id: number, userId: string) {
  await requireMinistryAccess(id);

  const atuais = await db.select({ userId: ministryLeaders.userId }).from(ministryLeaders)
    .where(eq(ministryLeaders.ministryId, id));

  if (!atuais.some((l) => l.userId === userId)) throw new Error("Esta pessoa não lidera este ministério");
  if (atuais.length === 1) throw new Error("O ministério precisa ter ao menos um líder");

  await db.delete(ministryLeaders)
    .where(and(eq(ministryLeaders.ministryId, id), eq(ministryLeaders.userId, userId)));

  revalidatePath("/admin/ministries");
  revalidatePath(`/admin/ministries/${id}`);
  revalidatePath("/admin");
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
      : and(eq(ministries.churchId, scope.churchId), ledBy(scope.userId)),
    with: {
      sectors: {
        with: {
          servants: {
            with: { user: publicUser }
          }
        }
      },
      leaders: { with: { user: publicUser } },
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
      leaders: { with: { user: publicUser } },
    }
  });
  if (!ministry) return null;
  if (ministry.churchId !== scope.churchId) return null;
  if (scope.role !== "admin" && !ministry.leaders.some((l) => l.userId === scope.userId)) return null;
  return ministry;
}
