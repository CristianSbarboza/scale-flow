"use server";

import { db } from "@/db";
import { users, servants, schedules } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, inArray } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash, compare } from "bcryptjs";
import type {
  CoordinatorSector,
  CoordinatorSchedule,
} from "@/types/domain";
import { requireAdmin } from "@/lib/scope";

// Setores onde o servo logado foi marcado como coordenador.
export async function getCoordinatorSectors(): Promise<CoordinatorSector[]> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const rows = await db.query.servants.findMany({
    where: and(eq(servants.userId, session.user.id), eq(servants.isCoordinator, true)),
    with: { sector: { with: { ministry: true } } },
  });

  return rows.map((r) => ({
    id: r.sector.id,
    name: r.sector.name,
    ministryId: r.sector.ministry.id,
    ministryName: r.sector.ministry.name,
  }));
}

// Escalas dos setores que o servo logado coordena.
export async function getCoordinatorSchedules(): Promise<CoordinatorSchedule[]> {
  const sectorIds = (await getCoordinatorSectors()).map((s) => s.id);
  if (sectorIds.length === 0) return [];

  const rows = await db.query.schedules.findMany({
    where: inArray(schedules.sectorId, sectorIds),
    with: { ministry: true, sector: true, dates: true },
  });

  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    visibility: s.visibility,
    shareLink: s.shareLink,
    ministry: { name: s.ministry.name },
    sector: { name: s.sector.name },
    dates: s.dates.map((d) => ({ id: d.id, date: d.date, startTime: d.startTime })),
  }));
}

export async function registerUser(name: string, email: string, password: string) {
  // Cria uma conta de ADMIN — só um admin já autenticado pode fazer isso.
  // O primeiro admin do sistema é criado pelo script src/db/seed.ts.
  await requireAdmin();

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

export async function updateOwnColor(color: string | null) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  await db.update(users).set({ color }).where(eq(users.id, session.user.id));
  revalidatePath("/servant");
}
