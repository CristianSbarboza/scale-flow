import "server-only";

import { db } from "@/db";
import {
  users,
  servants,
  schedules,
  scheduleDates,
  scheduleAssignments,
  googleCalendarEvents,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

/**
 * Soma 2 horas ao horário de início do culto para definir o fim do evento no
 * Google Agenda (tratando virada de dia às 22h/23h).
 */
function buildStartAndEndIso(dateIso: string, startTime: string): {
  startDateTime: string;
  endDateTime: string;
} {
  const cleanDate = dateIso.slice(0, 10);
  const cleanTime = startTime.slice(0, 5);
  const [year, month, day] = cleanDate.split("-").map(Number);
  const [hour, minute] = cleanTime.split(":").map(Number);

  const startUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const endUtc = new Date(startUtc.getTime() + 2 * 60 * 60 * 1000);

  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;

  return {
    startDateTime: fmt(startUtc),
    endDateTime: fmt(endUtc),
  };
}

/**
 * Obtém um `access_token` válido para a API do Google, renovando via
 * `refresh_token` caso esteja expirado ou prestes a expirar.
 */
async function getValidGoogleAccessToken(userId: string): Promise<string | null> {
  const [user] = await db
    .select({
      accessToken: users.googleAccessToken,
      refreshToken: users.googleRefreshToken,
      expiresAt: users.googleTokenExpiresAt,
      syncEnabled: users.googleCalendarSync,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user || !user.isActive || !user.syncEnabled) return null;
  if (!user.accessToken && !user.refreshToken) return null;

  const nowPlusBuffer = new Date(Date.now() + 60_000);
  if (
    user.accessToken &&
    user.expiresAt &&
    user.expiresAt.getTime() > nowPlusBuffer.getTime()
  ) {
    return user.accessToken;
  }

  if (!user.refreshToken || !isGoogleOAuthConfigured()) {
    return user.accessToken;
  }

  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
        client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
        refresh_token: user.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
    };

    if (!data.access_token) return null;

    const nextExpiresAt = new Date(
      Date.now() + (data.expires_in ?? 3500) * 1000,
    );

    await db
      .update(users)
      .set({
        googleAccessToken: data.access_token,
        googleTokenExpiresAt: nextExpiresAt,
        ...(data.refresh_token ? { googleRefreshToken: data.refresh_token } : {}),
      })
      .where(eq(users.id, userId));

    return data.access_token;
  } catch (error) {
    console.error("Erro ao renovar token do Google:", error);
    return null;
  }
}

export interface GoogleCalendarSyncResult {
  synced: number;
  removed: number;
}

/**
 * Sincroniza todas as datas em que o usuário está confirmado (`schedule_assignments`)
 * com a agenda principal (`primary`) do Google Agenda dele.
 *
 * - Cria eventos novos para escalações recém-confirmadas.
 * - Atualiza eventos já existentes se horário/título mudarem.
 * - Remove do Google Agenda eventos de escalações que foram desmarcadas/trocadas.
 */
export async function syncUserScheduleToGoogleCalendar(
  userId: string,
): Promise<GoogleCalendarSyncResult> {
  const accessToken = await getValidGoogleAccessToken(userId);
  if (!accessToken) {
    return { synced: 0, removed: 0 };
  }

  // 1. Busca todos os vínculos ativos de servo deste usuário
  const memberships = await db.query.servants.findMany({
    where: and(eq(servants.userId, userId), eq(servants.isActive, true)),
    with: {
      sector: {
        with: {
          ministry: {
            with: { church: { columns: { name: true } } },
          },
        },
      },
    },
  });

  const activeMemberships = memberships.filter(
    (m) => m.sector.isActive && m.sector.ministry.isActive,
  );
  const servantMap = new Map(activeMemberships.map((m) => [m.id, m]));
  const servantIds = activeMemberships.map((m) => m.id);

  // 2. Busca todas as escalações confirmadas deste usuário
  const currentAssignments =
    servantIds.length > 0
      ? await db
          .select({
            assignmentId: scheduleAssignments.id,
            servantId: scheduleAssignments.servantId,
            dateId: scheduleDates.id,
            date: scheduleDates.date,
            startTime: scheduleDates.startTime,
            dateTitle: scheduleDates.title,
            scheduleName: schedules.name,
            scheduleStatus: schedules.status,
          })
          .from(scheduleAssignments)
          .innerJoin(
            scheduleDates,
            eq(scheduleAssignments.dateId, scheduleDates.id),
          )
          .innerJoin(schedules, eq(scheduleDates.scheduleId, schedules.id))
          .where(inArray(scheduleAssignments.servantId, servantIds))
      : [];

  const validAssignments = currentAssignments.filter((a) =>
    servantMap.has(a.servantId),
  );
  const validAssignmentIds = new Set(validAssignments.map((a) => a.assignmentId));

  // 3. Busca os eventos já sincronizados anteriormente no Google Agenda
  const existingEvents = await db
    .select()
    .from(googleCalendarEvents)
    .where(eq(googleCalendarEvents.userId, userId));

  let removed = 0;
  let synced = 0;

  // 4. Remove do Google Agenda eventos cuja escalação foi removida (assignmentId null ou fora de validAssignmentIds)
  const toRemove = existingEvents.filter(
    (ev) => ev.assignmentId === null || !validAssignmentIds.has(ev.assignmentId),
  );

  for (const ev of toRemove) {
    try {
      await fetch(
        `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(ev.googleEventId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
    } catch {
      // Ignora erro de rede; se já foi apagado no Google, limpamos localmente
    }
    await db
      .delete(googleCalendarEvents)
      .where(eq(googleCalendarEvents.id, ev.id));
    removed++;
  }

  const existingByAssignmentId = new Map<
    number,
    typeof existingEvents[number]
  >();
  for (const ev of existingEvents) {
    if (ev.assignmentId !== null && validAssignmentIds.has(ev.assignmentId)) {
      existingByAssignmentId.set(ev.assignmentId, ev);
    }
  }

  // 5. Cria ou atualiza cada escalação ativa no Google Agenda
  for (const item of validAssignments) {
    const membership = servantMap.get(item.servantId);
    if (!membership) continue;

    const ministryName = membership.sector.ministry.name;
    const sectorName = membership.sector.name;
    const churchName = membership.sector.ministry.church.name;
    const { startDateTime, endDateTime } = buildStartAndEndIso(
      item.date,
      item.startTime,
    );

    const summary = `⛪ Escala: ${ministryName} · ${sectorName}${item.dateTitle ? ` (${item.dateTitle})` : ""}`;
    const description = [
      `Escala: ${item.scheduleName}`,
      `Ministério: ${ministryName}`,
      `Setor: ${sectorName}`,
      ...(item.dateTitle ? [`Evento: ${item.dateTitle}`] : []),
      `Igreja: ${churchName}`,
      ``,
      `Sincronizado automaticamente pelo ScaleFlow.`,
    ].join("\n");

    const eventBody = {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: endDateTime,
        timeZone: "America/Sao_Paulo",
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 1440 },
          { method: "popup", minutes: 120 },
        ],
      },
    };

    const existing = existingByAssignmentId.get(item.assignmentId);

    if (existing) {
      const updateRes = await fetch(
        `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(existing.googleEventId)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventBody),
        },
      );

      if (updateRes.ok) {
        await db
          .update(googleCalendarEvents)
          .set({ updatedAt: new Date() })
          .where(eq(googleCalendarEvents.id, existing.id));
        synced++;
        continue;
      }

      // Se o usuário apagou manualmente lá no Google Agenda (404/410), recriamos abaixo
      if (updateRes.status !== 404 && updateRes.status !== 410) {
        continue;
      }
      await db
        .delete(googleCalendarEvents)
        .where(eq(googleCalendarEvents.id, existing.id));
    }

    const createRes = await fetch(GOOGLE_CALENDAR_EVENTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    });

    if (createRes.ok) {
      const created = (await createRes.json()) as { id?: string };
      if (created.id) {
        await db
          .insert(googleCalendarEvents)
          .values({
            userId,
            assignmentId: item.assignmentId,
            googleEventId: created.id,
          })
          .onConflictDoNothing();
        synced++;
      }
    }
  }

  return { synced, removed };
}

/**
 * Auxiliar para disparar sincronização a partir de um `servantId` (quando o
 * líder escala ou remove um servo, ou quando há troca de dia).
 */
export async function syncServantScheduleToGoogleCalendar(
  servantId: number,
): Promise<void> {
  try {
    const [row] = await db
      .select({ userId: servants.userId })
      .from(servants)
      .where(eq(servants.id, servantId));
    if (!row) return;
    await syncUserScheduleToGoogleCalendar(row.userId);
  } catch (error) {
    console.error("Erro ao sincronizar Google Agenda do servo:", error);
  }
}

/**
 * Remove todos os eventos criados pelo ScaleFlow no Google Agenda do usuário
 * antes de desvincular a conta Google.
 */
export async function clearUserGoogleCalendarEvents(userId: string): Promise<void> {
  const accessToken = await getValidGoogleAccessToken(userId);
  const existingEvents = await db
    .select()
    .from(googleCalendarEvents)
    .where(eq(googleCalendarEvents.userId, userId));

  if (accessToken && existingEvents.length > 0) {
    await Promise.all(
      existingEvents.map(async (ev) => {
        try {
          await fetch(
            `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(ev.googleEventId)}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${accessToken}` },
            },
          );
        } catch {
          // ignora falha individual
        }
      }),
    );
  }

  await db
    .delete(googleCalendarEvents)
    .where(eq(googleCalendarEvents.userId, userId));
}
