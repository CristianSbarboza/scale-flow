"use server";

import { db } from "@/db";
import { churches } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAdmin } from "@/lib/scope";
import type { Church } from "@/types/domain";

/**
 * A igreja do usuário logado.
 *
 * Repare que não existe `getChurchById`: nenhuma tela precisa alcançar outra
 * igreja, então a função não recebe id nenhum. O que não é parâmetro não pode
 * ser forjado pelo cliente — é a defesa mais barata que existe para esta spec.
 *
 * Lê a sessão direto em vez de `getScope()`: o `churchId` já vem no token, e
 * o escopo completo faria duas consultas a mais que ninguém aqui usa. Esta
 * função roda no layout do admin, em toda navegação.
 */
export async function getMyChurch(): Promise<Church> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const [church] = await db
    .select({ id: churches.id, name: churches.name, username: churches.username })
    .from(churches)
    .where(eq(churches.id, session.user.churchId));

  if (!church) throw new Error("Igreja não encontrada");
  return church;
}

/**
 * Renomeia a própria igreja. Só admin.
 *
 * Muda apenas `name`, nunca `username`: o username é o que os servos digitam
 * no login e o que vai no link `/login?igreja=`. Trocá-lo derrubaria o acesso
 * de todo mundo de uma vez, sem aviso. Se um dia precisar mudar, é operação
 * de script, com quem opera sabendo o que está fazendo.
 */
export async function renameChurch(name: string): Promise<Church> {
  const scope = await requireAdmin();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("O nome da igreja não pode ficar vazio");
  if (trimmed.length > 80) throw new Error("O nome da igreja é muito longo (máximo 80 caracteres)");

  const [church] = await db
    .update(churches)
    .set({ name: trimmed })
    .where(eq(churches.id, scope.churchId))
    .returning({ id: churches.id, name: churches.name, username: churches.username });

  // O nome aparece na barra lateral e no painel, ambos renderizados no
  // servidor — sem isto o admin salva e continua vendo o nome antigo.
  revalidatePath("/admin", "layout");
  return church;
}
