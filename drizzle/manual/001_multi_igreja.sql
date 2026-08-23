-- 001_multi_igreja.sql — specs/03-spec-multi-igreja
--
-- POR QUE ESTE ARQUIVO É ESCRITO À MÃO, e não gerado por `drizzle-kit generate`:
-- os bancos deste projeto (local e Neon) foram construídos com `drizzle-kit
-- push`. Não existe a tabela `drizzle.__drizzle_migrations`, e o snapshot em
-- drizzle/meta/ é anterior a `servants.is_coordinator` e `schedules.visibility`.
-- Um `generate` diffaria contra esse snapshot defasado e emitiria ADD COLUMN
-- para colunas que já existem, quebrando na aplicação.
--
-- POR QUE NÃO `push`: a coluna church_id é NOT NULL e as tabelas têm dados.
-- O push aplicaria a restrição antes de existir valor para preencher. A ordem
-- abaixo — coluna nula → backfill → NOT NULL — é o ponto inteiro deste arquivo.
--
-- COMO APLICAR (local):
--   docker exec -i scaleflow-db psql -U postgres -d scaleflow -v ON_ERROR_STOP=1 \
--     < drizzle/manual/001_multi_igreja.sql
--
-- Idempotente: pode rodar duas vezes sem erro.

BEGIN;

-- 1. A entidade nova -------------------------------------------------------
CREATE TABLE IF NOT EXISTS "churches" (
  "id"         serial PRIMARY KEY,
  "name"       text NOT NULL,
  -- O "username da igreja": digitado no login, antes do usuário da pessoa.
  "username"   text NOT NULL UNIQUE,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- 2. A igreja que herda tudo que já existe ---------------------------------
-- Tudo que está no banco hoje foi criado quando o app era de uma igreja só.
-- Essa igreja passa a ter nome. O admin renomeia depois, pela tela.
INSERT INTO "churches" ("name", "username")
VALUES ('Igreja Padrão', 'padrao')
ON CONFLICT ("username") DO NOTHING;

-- 3. Colunas ainda NULLABLE ------------------------------------------------
ALTER TABLE "users"      ADD COLUMN IF NOT EXISTS "church_id" integer;
ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "church_id" integer;

-- 4. Backfill --------------------------------------------------------------
UPDATE "users"
   SET "church_id" = (SELECT "id" FROM "churches" WHERE "username" = 'padrao')
 WHERE "church_id" IS NULL;

UPDATE "ministries"
   SET "church_id" = (SELECT "id" FROM "churches" WHERE "username" = 'padrao')
 WHERE "church_id" IS NULL;

-- 5. Só agora trancar ------------------------------------------------------
-- Se alguma linha tivesse escapado do backfill, é aqui que a transação aborta,
-- em vez de deixar dado órfão passar.
ALTER TABLE "users"      ALTER COLUMN "church_id" SET NOT NULL;
ALTER TABLE "ministries" ALTER COLUMN "church_id" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "users"
    ADD CONSTRAINT "users_church_id_churches_id_fk"
    FOREIGN KEY ("church_id") REFERENCES "churches"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ministries"
    ADD CONSTRAINT "ministries_church_id_churches_id_fk"
    FOREIGN KEY ("church_id") REFERENCES "churches"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Unicidade de username passa a ser por igreja --------------------------
-- Antes: "davi" só podia existir uma vez no mundo. Depois: uma vez por igreja.
-- Admin e líder têm username NULL e não são afetados — no Postgres NULL não
-- colide com NULL num índice único.
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_username_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "users_church_username_idx"
  ON "users" ("church_id", "username");

COMMIT;
