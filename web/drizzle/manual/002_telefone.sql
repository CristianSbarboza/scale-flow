-- 002_telefone.sql — specs/04-spec-telefone
--
-- Uma coluna anulável. Sem backfill, sem NOT NULL, sem lock relevante:
-- ADD COLUMN com default nulo não reescreve a tabela no Postgres.
--
-- Guarda E.164 sem o `+` (`5511987654321`). Sem índice único: um número pode
-- pertencer a mais de uma pessoa.
--
-- COMO APLICAR:
--   npx tsx src/db/apply-migration.ts drizzle/manual/002_telefone.sql
--
-- Idempotente: pode rodar duas vezes sem erro.

BEGIN;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" text;

COMMIT;
