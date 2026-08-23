-- 003_notification_log.sql — specs/05-spec-whatsapp-lembretes
--
-- Registro dos lembretes de WhatsApp já processados. Escrita pelo serviço
-- `whatsapp/`; o app Next não toca nesta tabela hoje.
--
-- O índice único é o coração da spec: é ELE que garante envio único, não a
-- lógica do serviço. Se o processo morrer entre enviar e registrar, a
-- tentativa seguinte esbarra na constraint.
--
-- COMO APLICAR (de dentro de web/):
--   npx tsx src/db/apply-migration.ts drizzle/manual/003_notification_log.sql
--
-- Idempotente: pode rodar duas vezes sem erro.

BEGIN;

CREATE TABLE IF NOT EXISTS "notification_log" (
  "id"         serial PRIMARY KEY,
  "date_id"    integer NOT NULL REFERENCES "schedule_dates"("id") ON DELETE CASCADE,
  "servant_id" integer NOT NULL REFERENCES "servants"("id") ON DELETE CASCADE,
  -- day_before | two_hours
  "kind"       text NOT NULL,
  -- pending | sent | failed | skipped
  -- `pending` e a reserva: o servico insere antes de enviar, para que duas
  -- instancias no ar nao mandem a mesma mensagem duas vezes.
  "status"     text NOT NULL,
  "detail"     text,
  "sent_at"    timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_log_unique"
  ON "notification_log" ("date_id", "servant_id", "kind");

-- A busca do cron filtra por data e junta com esta tabela para excluir quem já
-- recebeu. Sem este índice, a consulta varre tudo a cada minuto.
CREATE INDEX IF NOT EXISTS "notification_log_sent_at_idx"
  ON "notification_log" ("sent_at");

COMMIT;
