"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { hash, compare } from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAdmin } from "@/lib/scope";
import { normalizeStoredPhone } from "@/lib/phone";

export async function registerUser(name: string, email: string, password: string) {
  // Cria uma conta de ADMIN — só um admin já autenticado pode fazer isso, e o
  // novo admin nasce na igreja de quem o criou. O primeiro admin de cada
  // igreja vem do script src/db/create-church.ts.
  const scope = await requireAdmin();

  const [existingUser] = await db.select().from(users).where(eq(users.email, email));
  if (existingUser) {
    throw new Error("E-mail já cadastrado");
  }

  const hashedPassword = await hash(password, 10);
  await db.insert(users).values({
    name,
    email,
    password: hashedPassword,
    role: "admin",
    churchId: scope.churchId,
  });

  return { success: true };
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
  if (!user) throw new Error("Usuário não encontrado");

  const valid = await compare(currentPassword, user.password);
  if (!valid) throw new Error("Senha atual incorreta");

  const hashedPassword = await hash(newPassword, 10);
  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, session.user.id));
}

export interface OwnProfile {
  name: string;
  phone: string | null;
  email: string | null;
  /** Sem username, o e-mail é a única forma de entrar — a tela impede apagá-lo. */
  hasUsername: boolean;
}

/** Dados da própria conta, para a tela de configurações preencher. */
export async function getOwnProfile(): Promise<OwnProfile> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const [user] = await db.select({
    name: users.name, phone: users.phone, email: users.email, username: users.username,
  }).from(users).where(eq(users.id, session.user.id));
  if (!user) throw new Error("Usuário não encontrado");

  return {
    name: user.name,
    phone: user.phone,
    email: user.email,
    hasUsername: user.username !== null,
  };
}

/**
 * Nome e telefone da própria conta. Vale para qualquer papel — admin, líder e
 * servo usam a mesma seção de configurações.
 *
 * Não recebe id: o alvo é sempre a sessão. O que não é parâmetro não pode ser
 * forjado, e todo export de um módulo `"use server"` é um endpoint POST.
 *
 * Não mexe em `username` nem em `email`: são identificadores de login, e
 * trocá-los aqui derrubaria o próprio acesso da pessoa.
 */
export async function updateOwnProfile(name: string, phone: string | null, email: string | null = null) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("O nome não pode ficar vazio");
  if (trimmed.length > 120) throw new Error("Nome muito longo (máximo 120 caracteres)");

  const novoEmail = email?.trim().toLowerCase() || null;

  const [atual] = await db.select({ email: users.email, username: users.username })
    .from(users).where(eq(users.id, session.user.id));
  if (!atual) throw new Error("Usuário não encontrado");

  if (novoEmail !== atual.email) {
    // Admin e líder entram só por e-mail. Apagá-lo seria trancar-se do lado
    // de fora — e a action é um endpoint POST, então a tela não basta.
    if (!novoEmail && !atual.username) {
      throw new Error("Você entra pelo e-mail. Ele não pode ficar em branco.");
    }
    if (novoEmail) {
      const [dono] = await db.select({ id: users.id })
        .from(users).where(eq(users.email, novoEmail));
      // Mensagem sem dono e sem igreja, ao contrário da tela do admin: quem
      // edita a própria conta não tem por que saber de quem é o e-mail, nem
      // que existe alguém em outra igreja.
      if (dono && dono.id !== session.user.id) {
        throw new Error("Este e-mail já está em uso.");
      }
    }
  }

  await db.update(users)
    .set({ name: trimmed, phone: normalizeStoredPhone(phone), email: novoEmail })
    .where(eq(users.id, session.user.id));

  revalidatePath("/servant");
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
}

export async function updateOwnColor(color: string | null) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  await db.update(users).set({ color }).where(eq(users.id, session.user.id));
  revalidatePath("/servant");
}
