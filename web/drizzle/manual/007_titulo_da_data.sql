-- 007_titulo_da_data.sql — título opcional de cada data da escala
--
-- Além de dia e horário, a data pode dizer o que acontece nela: "Culto de
-- Santa Ceia", "Conferência de Jovens". Anulável: a maioria das datas é um
-- culto comum e não precisa de nome.
--
-- Aplicar ANTES de subir o código: o Drizzle lista a coluna em todo SELECT de
-- `schedule_dates`, e sem ela toda tela com escala quebra.
--
-- COMO APLICAR (de dentro de web/):
--   npx tsx src/db/apply-migration.ts drizzle/manual/007_titulo_da_data.sql
--
-- Idempotente.

BEGIN;

ALTER TABLE "schedule_dates" ADD COLUMN IF NOT EXISTS "title" text;

COMMIT;
