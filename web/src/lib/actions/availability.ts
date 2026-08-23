"use server";

import { db } from "@/db";
import { servants, schedules, scheduleDates, scheduleAvailability, scheduleAssignments } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, inArray } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publicUser, requireScheduleSectorAccess, getSectorIdForDateId, getSectorIdForAssignmentId } from "@/lib/scope";
import type { ServantOverviewSchedule } from "@/types/domain";

// Returns every schedule for the logged-in servant's sector, with each date
// flagged for whether THIS servant is confirmed/has sent availability on it,
// plus the full list of confirmed assignees (for the day-swap feature).
export async function getServantOverview(): Promise<ServantOverviewSchedule[]> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const memberships = await db.query.servants.findMany({
    where: eq(servants.userId, session.user.id),
  });
  if (memberships.length === 0) return [];

  const results: ServantOverviewSchedule[] = [];
  for (const servant of memberships) {
    const sectorSchedules = await db.query.schedules.findMany({
      where: eq(schedules.sectorId, servant.sectorId),
      with: {
        ministry: true,
        sector: true,
        dates: {
          with: {
            assignments: { with: { servant: { with: { user: publicUser } } } },
            availabilities: { where: eq(scheduleAvailability.servantId, servant.id) },
          },
        },
      },
    });

    for (const s of sectorSchedules) {
      results.push({
        id: s.id,
        name: s.name,
        ministryName: s.ministry.name,
        sectorName: s.sector.name,
        shareLink: s.shareLink,
        servantId: servant.id,
        dates: s.dates.map((d) => ({
          id: d.id,
          date: d.date,
          startTime: d.startTime,
          confirmed: d.assignments.some((a) => a.servantId === servant.id),
          available: d.availabilities.length > 0,
          assignees: d.assignments.map((a) => ({
            servantId: a.servantId,
            userId: a.servant.userId,
            name: a.servant.user.name,
            isSelf: a.servantId === servant.id,
            color: a.servant.user.color,
          })),
        })),
      });
    }
  }
  return results;
}

export async function assignServant(dateId: number, servantId: number) {
  const sectorId = await getSectorIdForDateId(dateId);
  await requireScheduleSectorAccess(sectorId);

  // O acesso acima cobre a data; `servantId` chegava sem nenhuma checagem.
  // Exigir que o servo sirva no setor da escala é a mesma regra que
  // `saveAvailability` já aplica — e, de quebra, garante a mesma igreja.
  const [servant] = await db.select().from(servants).where(
    and(eq(servants.id, servantId), eq(servants.sectorId, sectorId))
  );
  if (!servant) throw new Error("Este servo não pertence ao setor desta escala");

  await db.insert(scheduleAssignments).values({
    dateId,
    servantId,
  });
  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}

export async function removeAssignment(assignmentId: number) {
  await requireScheduleSectorAccess(await getSectorIdForAssignmentId(assignmentId));

  await db.delete(scheduleAssignments).where(eq(scheduleAssignments.id, assignmentId));
  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}

export async function saveAvailability(servantId: number, dateIds: number[]) {
  const uniqueDateIds = [...new Set(dateIds)];
  if (uniqueDateIds.length === 0) return;

  const [servant] = await db.select().from(servants).where(eq(servants.id, servantId));
  if (!servant) throw new Error("Servo não encontrado");

  // Todas as datas precisam ser da mesma escala, e essa escala precisa ser do
  // setor do servo — impede gravar cruzando setores/escalas adivinhando IDs.
  const dateRows = await db.select({
    scheduleId: schedules.id,
    sectorId: schedules.sectorId,
    visibility: schedules.visibility,
  })
    .from(scheduleDates)
    .innerJoin(schedules, eq(scheduleDates.scheduleId, schedules.id))
    .where(inArray(scheduleDates.id, uniqueDateIds));

  if (dateRows.length !== uniqueDateIds.length) throw new Error("Data inválida");

  const [schedule] = dateRows;
  if (dateRows.some((r) => r.scheduleId !== schedule.scheduleId)) {
    throw new Error("As datas precisam ser da mesma escala");
  }
  if (schedule.sectorId !== servant.sectorId) {
    throw new Error("Este servo não pertence ao setor desta escala");
  }

  // Escala privada: exige login e que o servo informado seja o próprio usuário.
  // Escala pública: sem login segue aberta (por design), mas se houver sessão
  // ainda assim impede responder no lugar de outra pessoa.
  const session = await getServerSession(authOptions);
  if (schedule.visibility === "private" && !session) {
    throw new Error("Faça login para responder a esta escala");
  }
  if (session && servant.userId !== session.user.id) {
    throw new Error("Não autorizado a responder por outro servo");
  }

  for (const dateId of uniqueDateIds) {
    const [existing] = await db.select().from(scheduleAvailability).where(
      and(eq(scheduleAvailability.dateId, dateId), eq(scheduleAvailability.servantId, servantId))
    );
    if (existing) continue;

    await db.insert(scheduleAvailability).values({
      servantId,
      dateId,
    });
  }
  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}
