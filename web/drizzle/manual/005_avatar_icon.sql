-- 005_avatar_icon.sql — ícone de perfil do servo
--
-- Servo ainda não tem upload de foto de perfil. Enquanto isso não existe, o
-- círculo de perfil aceita um ícone entre um conjunto fixo (ver
-- src/lib/avatarIcons.tsx) em vez de ficar só com a inicial do nome.
--
-- COMO APLICAR (de dentro de web/):
--   npx tsx src/db/apply-migration.ts drizzle/manual/005_avatar_icon.sql
--
-- Idempotente.

BEGIN;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_icon" text;

COMMIT;
