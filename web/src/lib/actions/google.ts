"use server";

import { db } from "@/db";
import { googleCalendarEvents, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import {
  clearUserGoogleCalendarEvents,
  isGoogleOAuthConfigured,
  syncUserScheduleToGoogleCalendar,
  type GoogleCalendarSyncResult,
} from "@/lib/google-calendar";

export interface OwnGoogleAccountStatus {
  isConfiguredOnServer: boolean;
  connected: boolean;
  googleEmail: string | null;
  calendarSyncEnabled: boolean;
  syncedEventsCount: number;
}

export async function getOwnGoogleAccountStatus(): Promise<OwnGoogleAccountStatus> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const [[user], syncedEvents] = await Promise.all([
    db
      .select({
        googleId: users.googleId,
        googleEmail: users.googleEmail,
        googleCalendarSync: users.googleCalendarSync,
      })
      .from(users)
      .where(eq(users.id, session.user.id)),
    db
      .select({ id: googleCalendarEvents.id })
      .from(googleCalendarEvents)
      .where(eq(googleCalendarEvents.userId, session.user.id)),
  ]);

  return {
    isConfiguredOnServer: isGoogleOAuthConfigured(),
    connected: Boolean(user?.googleId),
    googleEmail: user?.googleEmail ?? null,
    calendarSyncEnabled: user?.googleCalendarSync ?? true,
    syncedEventsCount: syncedEvents.length,
  };
}

export async function toggleOwnGoogleCalendarSync(
  enabled: boolean,
): Promise<GoogleCalendarSyncResult> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  await db
    .update(users)
    .set({ googleCalendarSync: Boolean(enabled) })
    .where(eq(users.id, session.user.id));

  let result: GoogleCalendarSyncResult = { synced: 0, removed: 0 };
  if (enabled) {
    result = await syncUserScheduleToGoogleCalendar(session.user.id);
  }

  revalidatePath("/servant");
  revalidatePath("/admin/settings");
  return result;
}

export async function syncOwnGoogleCalendarNow(): Promise<GoogleCalendarSyncResult> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const result = await syncUserScheduleToGoogleCalendar(session.user.id);
  revalidatePath("/servant");
  revalidatePath("/admin/settings");
  return result;
}

export async function disconnectOwnGoogleAccount(): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  await clearUserGoogleCalendarEvents(session.user.id);

  await db
    .update(users)
    .set({
      googleId: null,
      googleEmail: null,
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiresAt: null,
    })
    .where(eq(users.id, session.user.id));

  revalidatePath("/servant");
  revalidatePath("/admin/settings");
}
