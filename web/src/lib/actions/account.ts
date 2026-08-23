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

/** Telefone da própria conta, para a tela de configurações preencher o campo. */
export async function getOwnPhone(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const [user] = await db.select({ phone: users.phone })
    .from(users).where(eq(users.id, session.user.id));
  return user?.phone ?? null;
}

/**
 * Telefone da própria conta. Vale para qualquer papel — admin, líder e servo
 * usam a mesma seção de configurações.
 *
 * Não recebe id: o alvo é sempre a sessão. O que não é parâmetro não pode ser
 * forjado, e todo export de um módulo `"use server"` é um endpoint POST.
 */
export async function updateOwnPhone(phone: string | null) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  await db.update(users)
    .set({ phone: normalizeStoredPhone(phone) })
    .where(eq(users.id, session.user.id));

  revalidatePath("/servant");
  revalidatePath("/admin/settings");
}

export async function updateOwnColor(color: string | null) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  await db.update(users).set({ color }).where(eq(users.id, session.user.id));
  revalidatePath("/servant");
}
