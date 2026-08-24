"use server";

import { db } from "@/db";
import { ministries, sectors, schedules, scheduleDates } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq, and, exists, sql } from "drizzle-orm";
import { publicUser, getScope, requireScheduleSectorAccess, getSectorIdForScheduleId } from "@/lib/scope";
import type { CalendarSchedule } from "@/types/domain";
import type { Scope } from "@/types/scope";

/**
 * Quais escalas o escopo atual alcança: sempre dentro da igreja, e ainda
 * restritas ao ministério do líder quando não for admin.
 *
 * Um predicado só, e não um ramo por papel, de propósito. Com dois ramos, o
 * do admin era literalmente `findMany()` sem `where` — e a versão "sem filtro"
 * é justamente a que vaza tudo se alguém esquecer de atualizá-la.
 */
function schedulesVisibleTo(scope: Scope) {
  const conditions = [
    eq(ministries.id, schedules.ministryId),
    eq(ministries.churchId, scope.churchId),
  ];
  if (scope.role !== "admin") {
    conditions.push(eq(ministries.leaderId, scope.userId));
  }
  return exists(db.select().from(ministries).where(and(...conditions)));
}

export async function createSchedule(
  name: string,
  ministryId: number,
  sectorId: number,
  dates: { date: string, startTime: string }[],
  visibility: "public" | "private" = "public",
) {
  await requireScheduleSectorAccess(sectorId);

  // `requireScheduleSectorAccess` valida o setor, mas `ministryId` chega solto:
  // sem esta checagem dá para casar um setor da própria igreja com o
  // ministério de outra, e a escala nasceria contando para as duas.
  const [sector] = await db.select({ ministryId: sectors.ministryId })
    .from(sectors).where(eq(sectors.id, sectorId));
  if (!sector || sector.ministryId !== ministryId) {
    throw new Error("O setor informado não pertence a este ministério");
  }

  const shareLink = nanoid(10);
  const [schedule] = await db.insert(schedules).values({
    name,
    ministryId,
    sectorId,
    visibility,
    shareLink,
  }).returning();

  for (const d of dates) {
    await db.insert(scheduleDates).values({
      scheduleId: schedule.id,
      date: d.date,
      startTime: d.startTime,
    });
  }

  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
  return { shareLink };
}

export async function deleteSchedule(id: number) {
  await requireScheduleSectorAccess(await getSectorIdForScheduleId(id));

  await db.delete(schedules).where(eq(schedules.id, id));
  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}

export async function updateSchedule(
  id: number,
  name: string,
  dates: { date: string, startTime: string }[],
  visibility?: "public" | "private",
) {
  await requireScheduleSectorAccess(await getSectorIdForScheduleId(id));

  await db.update(schedules)
    .set(visibility ? { name, visibility } : { name })
    .where(eq(schedules.id, id));

  await db.delete(scheduleDates).where(eq(scheduleDates.scheduleId, id));

  for (const d of dates) {
    await db.insert(scheduleDates).values({
      scheduleId: id,
      date: d.date,
      startTime: d.startTime,
    });
  }

  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}

/**
 * Publica a escala: abre para os servos do setor preencherem disponibilidade.
 *
 * Nada no app fazia isso — a coluna `status` existia, o tipo existia, a tela
 * mostrava o rótulo, e não havia caminho de `draft` para `published`. Como o
 * serviço de lembretes só considera escala publicada, ele nunca teve o que
 * enviar.
 *
 * `publishedAt` só é gravado na primeira vez. Republicar depois de despublicar
 * não deve reenviar o aviso para quem já recebeu — e é o `notification_log`
 * que garante isso, mas manter a data original evita que o cron reavalie a
 * escala como novidade.
 */
export async function publishSchedule(id: number) {
  await requireScheduleSectorAccess(await getSectorIdForScheduleId(id));

  await db.update(schedules)
    .set({ status: "published", publishedAt: sql`coalesce(${schedules.publishedAt}, now())` })
    .where(eq(schedules.id, id));

  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}

/** Volta para rascunho. Não apaga `publishedAt` — ver `publishSchedule`. */
export async function unpublishSchedule(id: number) {
  await requireScheduleSectorAccess(await getSectorIdForScheduleId(id));

  await db.update(schedules).set({ status: "draft" }).where(eq(schedules.id, id));

  revalidatePath("/admin/schedules");
  revalidatePath("/servant");
}

export async function getSchedules() {
  const scope = await getScope();
  return await db.query.schedules.findMany({
    where: schedulesVisibleTo(scope),
    with: {
      ministry: true,
      sector: true,
      dates: true
    }
  });
}

// Visão de calendário para admin/líder: todas as escalas (com quem está escalado
// em cada dia), escopadas por ministério do líder quando aplicável.
export async function getCalendarSchedules(): Promise<CalendarSchedule[]> {
  const scope = await getScope();
  const withClause = {
    ministry: true,
    sector: true,
    dates: {
      with: {
        assignments: { with: { servant: { with: { user: publicUser } } } },
      },
    },
  } as const;

  const rows = await db.query.schedules.findMany({
    where: schedulesVisibleTo(scope),
    with: withClause,
  });

  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    ministryId: s.ministry.id,
    ministryName: s.ministry.name,
    sectorId: s.sector.id,
    sectorName: s.sector.name,
    dates: s.dates.map((d) => ({
      id: d.id,
      date: d.date,
      startTime: d.startTime,
      assignees: d.assignments.map((a) => ({ servantId: a.servantId, name: a.servant.user.name })),
    })),
  }));
}

export async function getScheduleResponses(scheduleId: number) {
  await requireScheduleSectorAccess(await getSectorIdForScheduleId(scheduleId));

  return await db.query.scheduleDates.findMany({
    where: eq(scheduleDates.scheduleId, scheduleId),
    orderBy: (dates, { asc }) => [asc(dates.date), asc(dates.startTime)],
    with: {
      availabilities: {
        with: {
          servant: { with: { user: publicUser } }
        }
      },
      assignments: {
        with: {
          servant: { with: { user: publicUser } }
        }
      }
    }
  });
}
