-- 012_notificacoes_padrao_false.sql
-- Faz `notifications_enabled` iniciar em `false` por padrão para que o modal
-- de aceite apareça ao entrar no app e o clique do servo dispare também a
-- permissão nativa de Web Push do navegador/celular.
-- Idempotente.

BEGIN;

ALTER TABLE "users"
  ALTER COLUMN "notifications_enabled" SET DEFAULT false;

-- Quem ainda não registrou nenhuma inscrição de Web Push volta para `false`
-- para receber o convite de aceite ao entrar no app.
UPDATE "users"
   SET "notifications_enabled" = false
 WHERE NOT EXISTS (
   SELECT 1
     FROM "push_subscriptions"
    WHERE "push_subscriptions"."user_id" = "users"."id"
 );

COMMIT;
