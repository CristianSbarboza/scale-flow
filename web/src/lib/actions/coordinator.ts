"use server";

import { db } from "@/db";
import { servants, schedules } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getScope, mapCoordinatorSectors } from "@/lib/scope";
import type { CoordinatorSector, CoordinatorSchedule } from "@/types/domain";

/** Carrega os vínculos de coordenação do usuário logado. Helper interno. */
async function loadCoordinatedSectors(): Promise<CoordinatorSector[]> {
  const scope = await getScope();
  const rows = await db.query.servants.findMany({
    where: eq(servants.userId, scope.userId),
    with: { sector: { with: { ministry: true } } },
  });
  return mapCoordinatorSectors(rows);
}

// Setores onde o servo logado foi marcado como coordenador.
export async function getCoordinatorSectors(): Promise<CoordinatorSector[]> {
  return loadCoordinatedSectors();
}

// Escalas dos setores que o servo logado coordena.
export async function getCoordinatorSchedules(): Promise<CoordinatorSchedule[]> {
  const sectorIds = (await loadCoordinatedSectors()).map((s) => s.id);
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
