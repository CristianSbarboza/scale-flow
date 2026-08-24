-- 004_publicacao_e_aviso.sql — aviso de escala publicada
--
-- Duas mudanças:
--
-- 1. `schedules.published_at` — hoje nada no app muda `status` para
--    'published', e mesmo que mudasse não haveria como saber QUANDO. Sem essa
--    marca, o cron não distingue "acabou de sair" de "está publicada há um
--    mês", e o primeiro ciclo dispararia aviso de tudo que já existe.
--
-- 2. `notification_log.schedule_id` — os dois avisos atuais são por DATA; este
--    é por ESCALA. O `date_id` passa a ser anulável e ganha um irmão. No
--    Postgres NULL nunca colide com NULL num índice único, então o índice
--    antigo continua valendo para os avisos por data sem nenhum ajuste.
--
-- COMO APLICAR (de dentro de web/):
--   npx tsx src/db/apply-migration.ts drizzle/manual/004_publicacao_e_aviso.sql
--
-- Idempotente.

BEGIN;

ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "published_at" timestamp;

-- Escalas já publicadas antes desta coluna existir recebem a marca de agora.
-- Sem isso ficariam com published_at nulo e o cron as trataria como nunca
-- publicadas — mas a janela de lookback impede que virem aviso retroativo.
UPDATE "schedules" SET "published_at" = now()
 WHERE "status" = 'published' AND "published_at" IS NULL;

ALTER TABLE "notification_log" ALTER COLUMN "date_id" DROP NOT NULL;

ALTER TABLE "notification_log"
  ADD COLUMN IF NOT EXISTS "schedule_id" integer;

DO $$ BEGIN
  ALTER TABLE "notification_log"
    ADD CONSTRAINT "notification_log_schedule_id_fkey"
    FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Parcial: só as linhas de aviso por escala entram. As por data têm
-- schedule_id nulo e continuam sob o índice antigo.
CREATE UNIQUE INDEX IF NOT EXISTS "notification_log_schedule_unique"
  ON "notification_log" ("schedule_id", "servant_id", "kind")
  WHERE "schedule_id" IS NOT NULL;

COMMIT;
