-- 008_desativar_entidades.sql
-- Spec 08 — Desativação de Servos, Setores e Ministérios sem exclusão de dados.
-- Idempotente. `apply-migration.ts` envolve este arquivo em BEGIN/COMMIT e
-- garante que nenhuma linha seja perdida.

ALTER TABLE "ministries"
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;

ALTER TABLE "sectors"
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;

ALTER TABLE "servants"
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;

