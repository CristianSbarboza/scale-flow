"use server";

import { db } from "@/db";
import { ministries, schedules, scheduleDates } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { publicUser, getAuthFilter, requireScheduleSectorAccess, getSectorIdForScheduleId } from "@/lib/scope";
import type { CalendarSchedule } from "@/types/domain";

export async function createSchedule(
  name: string,
  ministryId: number,
  sectorId: number,
  dates: { date: string, startTime: string }[],
  visibility: "public" | "private" = "public",
) {
  await requireScheduleSectorAccess(sectorId);

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

export async function getSchedules() {
  const leaderId = await getAuthFilter();
  if (leaderId) {
    return await db.query.schedules.findMany({
      where: (schedules, { exists }) => exists(
        db.select().from(ministries).where(
          and(
            eq(ministries.id, schedules.ministryId),
            eq(ministries.leaderId, leaderId)
          )
        )
      ),
      with: {
        ministry: true,
        sector: true,
        dates: true
      }
    });
  }
  return await db.query.schedules.findMany({
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
  const leaderId = await getAuthFilter();
  const withClause = {
    ministry: true,
    sector: true,
    dates: {
      with: {
        assignments: { with: { servant: { with: { user: publicUser } } } },
      },
    },
  } as const;

  const rows = leaderId
    ? await db.query.schedules.findMany({
        where: (schedules, { exists }) => exists(
          db.select().from(ministries).where(
            and(
              eq(ministries.id, schedules.ministryId),
              eq(ministries.leaderId, leaderId)
            )
          )
        ),
        with: withClause,
      })
    : await db.query.schedules.findMany({ with: withClause });

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
