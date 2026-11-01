-- 007_assistente_ia.sql — specs/07-spec-assistente-ia
--
-- Configuração da Assistente de IA no nível da igreja (`churches`: provedor,
-- modelo opcional, chave de API e identidade padrão) e personalização
-- individual por conta (`users`: nome e estilo/objetividade preferidos).
--
-- `ai_api_key` mora em `churches` e nunca sai em `getMyChurch()`: só o motor
-- no servidor lê a chave inteira, e a tela do Admin recebe apenas se há chave
-- configurada e os últimos caracteres mascarados.
--
-- COMO APLICAR (de dentro de web/):
--   npx tsx src/db/apply-migration.ts drizzle/manual/007_assistente_ia.sql
--
-- Idempotente.

BEGIN;

ALTER TABLE "churches"
  ADD COLUMN IF NOT EXISTS "ai_provider" text NOT NULL DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS "ai_model" text,
  ADD COLUMN IF NOT EXISTS "ai_api_key" text,
  ADD COLUMN IF NOT EXISTS "ai_default_name" text NOT NULL DEFAULT 'Cale',
  ADD COLUMN IF NOT EXISTS "ai_default_style" text NOT NULL DEFAULT 'warm';

ALTER TABLE "churches" ALTER COLUMN "ai_default_name" SET DEFAULT 'Cale';
UPDATE "churches" SET "ai_default_name" = 'Cale' WHERE "ai_default_name" = 'Graça';

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "ai_name" text,
  ADD COLUMN IF NOT EXISTS "ai_style" text;

COMMIT;

