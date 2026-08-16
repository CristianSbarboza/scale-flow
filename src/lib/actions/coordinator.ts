"use server";

import { db } from "@/db";
import { servants, schedules } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { CoordinatorSector, CoordinatorSchedule } from "@/types/domain";

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
