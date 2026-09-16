# Plano Técnico - Líderes Múltiplos por Ministério

> Implementado em 16/09/2026. Este arquivo registra o que foi feito e a ordem de deploy.

## 🛠️ Arquitetura & Modelo de Dados

### Alterações de Banco de Dados (Drizzle Schemas)

- **Nova tabela `ministry_leaders`**: `id`, `ministry_id` (FK cascade), `user_id` (FK **sem** cascade), `created_at`. Índice único em `(ministry_id, user_id)`.
- **`ministries.leader_id` removida.**
- Relations: `ministries.leaders → many(ministryLeaders)`; `ministryLeaders.{ministry,user}`; `users.ministriesLed → many(ministryLeaders)`.
- Migração: `web/drizzle/manual/006_lideres_multiplos.sql` — cria a tabela, copia cada `leader_id`, prova que nenhum ministério ficou sem líder, derruba a coluna. Tudo num `BEGIN/COMMIT`.

### Novas Rotas & Endpoints

Nenhuma rota. Server actions em `src/lib/actions/ministries.ts`:

- `addMinistryLeader(id, nome, email, telefone?)` — `requireMinistryAccess` (admin da igreja ou líder do ministério). Reaproveita `getOrCreateUser`. Idempotente: já lidera → `{ unchanged: true }`.
- `removeMinistryLeader(id, userId)` — mesmo acesso. Recusa o último líder.
- `transferMinistryLeader` **removida** — "transferir" não existe quando são vários. Trocar = adicionar o novo, remover o antigo.
- `createMinistry` grava o líder na tabela nova; `getMinistries` / `getMinistryById` devolvem `leaders: [{ userId, user }]`.

### Autorização

`ledBy(userId)` em `src/lib/scope.ts` substitui `eq(ministries.leaderId, ...)` em: `getScope`, `requireScheduleSectorAccess`, `requireMinistryAccess`, `requireSectorAccess`, `requireServantAccess`, `schedulesVisibleTo`, `servantsVisibleTo`, `getSectors`, `getSectorById`, `getMinistries`, `getMinistryById` e o painel `/admin`.

## 📋 Lista de Tarefas

### Fase 1: Fundação & Banco de Dados
- [x] Schema: tabela, relations, remoção da coluna.
- [x] Migração 006.
- [x] `seed.ts` grava em `ministry_leaders`.

### Fase 2: Lógica de Negócio
- [x] `ledBy` em `scope.ts` e troca em todos os pontos.
- [x] Actions `addMinistryLeader` / `removeMinistryLeader`.
- [x] `getSectorById` devolve `leaders[]` (consulta à parte — join com `users` duplicaria o setor).

### Fase 3: UI
- [x] `/admin/ministries/[id]`: card "Líderes" com lista, X para remover (oculto quando há um só), formulário inline de adicionar com nome, e-mail e telefone opcional.
- [x] `/admin/ministries`: coluna "Líderes" com os nomes; busca cobre todos.
- [x] `/admin/sectors/[id]`: "Líderes do ministério" em lista.
- [x] `/admin` (painel): "Líderes: A, B".

## 🚀 Ordem de deploy

1. `cd web && npx tsx src/db/apply-migration.ts drizzle/manual/006_lideres_multiplos.sql` — contra o Neon (o `.env` já aponta para lá).
2. Conferir a saída: "SQL aplicado sem erro" e "nenhuma linha perdida".
3. Só então `git push` — o Vercel sobe o código que lê a tabela nova.

Invertida, a ordem derruba a tela de ministérios até a migração rodar.
