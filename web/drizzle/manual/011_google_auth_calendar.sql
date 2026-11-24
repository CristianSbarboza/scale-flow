-- 011_google_auth_calendar.sql
-- Login com Google, vínculo de conta Google nas configurações e sincronização
-- automática de datas escaladas com o Google Agenda.
-- Idempotente.

BEGIN;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "google_id" text,
  ADD COLUMN IF NOT EXISTS "google_email" text,
  ADD COLUMN IF NOT EXISTS "google_access_token" text,
  ADD COLUMN IF NOT EXISTS "google_refresh_token" text,
  ADD COLUMN IF NOT EXISTS "google_token_expires_at" timestamp,
  ADD COLUMN IF NOT EXISTS "google_calendar_sync" boolean DEFAULT true NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_idx"
  ON "users" ("google_id");

CREATE TABLE IF NOT EXISTS "google_calendar_events" (
  "id" serial PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "assignment_id" integer REFERENCES "schedule_assignments"("id") ON DELETE SET NULL,
  "google_event_id" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "google_calendar_events_user_assignment_unique"
  ON "google_calendar_events" ("user_id", "assignment_id")
  WHERE "assignment_id" IS NOT NULL;

COMMIT;
