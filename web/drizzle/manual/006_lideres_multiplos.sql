-- 006_lideres_multiplos.sql — specs/06-spec-lideres-multiplos
--
-- Um ministério passa a ter vários líderes. A coluna `ministries.leader_id`
-- (um líder só) vira a tabela `ministry_leaders` (N por ministério).
--
-- Ordem: cria a tabela → copia cada leader_id para uma linha → só então
-- derruba a coluna. Assim a cópia acontece com a coluna ainda existindo, e
-- se qualquer passo falhar o BEGIN/COMMIT desfaz tudo — inclusive o DROP.
--
-- `user_id` sem ON DELETE, igual à coluna antiga: apagar a conta de quem
-- lidera continua falhando, em vez de deixar um ministério sem líder.
--
-- ORDEM DE DEPLOY: aplicar ESTE ARQUIVO ANTES de subir o código. O código
-- novo lê `ministry_leaders`; o antigo lê `leader_id`. Nenhum dos dois
-- funciona com o banco no estado do outro.
--
-- COMO APLICAR (de dentro de web/):
--   npx tsx src/db/apply-migration.ts drizzle/manual/006_lideres_multiplos.sql
--
-- Idempotente: a segunda execução não encontra `leader_id` e pula o backfill.

BEGIN;

CREATE TABLE IF NOT EXISTS "ministry_leaders" (
  "id"          serial PRIMARY KEY,
  "ministry_id" integer NOT NULL REFERENCES "ministries"("id") ON DELETE CASCADE,
  "user_id"     uuid    NOT NULL REFERENCES "users"("id"),
  "created_at"  timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "ministry_leaders_unique"
  ON "ministry_leaders" ("ministry_id", "user_id");

-- Backfill: o líder de hoje vira a primeira linha de cada ministério.
-- Dentro de um DO porque, na segunda execução, `leader_id` já não existe e
-- um INSERT ... SELECT leader_id solto quebraria o arquivo inteiro.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'ministries' AND column_name = 'leader_id'
  ) THEN
    INSERT INTO "ministry_leaders" ("ministry_id", "user_id")
    SELECT "id", "leader_id" FROM "ministries"
    ON CONFLICT ("ministry_id", "user_id") DO NOTHING;
  END IF;
END $$;

-- Prova antes de derrubar: todo ministério precisa ter chegado ao outro lado.
DO $$
DECLARE orfaos integer;
BEGIN
  SELECT count(*) INTO orfaos FROM "ministries" m
   WHERE NOT EXISTS (SELECT 1 FROM "ministry_leaders" l WHERE l."ministry_id" = m."id");
  IF orfaos > 0 THEN
    RAISE EXCEPTION '% ministério(s) sem líder em ministry_leaders — backfill incompleto, abortando', orfaos;
  END IF;
END $$;

ALTER TABLE "ministries" DROP COLUMN IF EXISTS "leader_id";

COMMIT;
