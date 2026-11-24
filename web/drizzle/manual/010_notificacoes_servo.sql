-- 010_notificacoes_servo.sql
-- Sistema de notificações do servo: preferência de aceite (padrão true),
-- controle de leitura das notificações no aplicativo e Web Push (PWA) para
-- entrega mesmo com a tela do celular desligada.
-- Idempotente.

BEGIN;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "notifications_enabled" boolean DEFAULT true NOT NULL;

CREATE TABLE IF NOT EXISTS "servant_notification_reads" (
  "id" serial PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "notification_key" text NOT NULL,
  "read_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "servant_notification_reads_unique"
  ON "servant_notification_reads" ("user_id", "notification_key");

CREATE TABLE IF NOT EXISTS "push_vapid_keys" (
  "id" integer PRIMARY KEY DEFAULT 1,
  "public_key" text NOT NULL,
  "private_key" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" serial PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_unique"
  ON "push_subscriptions" ("endpoint");

COMMIT;
