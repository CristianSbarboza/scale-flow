# Plano Técnico - Desativação de Servos, Setores e Ministérios

> [!IMPORTANT]
> Este documento traduz a especificação funcional `08-spec-desativar-entidades` em etapas técnicas concretas seguindo a Constituição do Projeto.

## 🛠️ Arquitetura & Modelo de Dados

### Alterações de Banco de Dados (`web/src/db/schema.ts` + `web/drizzle/manual/009_desativar_entidades.sql`)

Adição da coluna `is_active boolean not null default true` nas tabelas:
- `ministries.is_active`
- `sectors.is_active`
- `users.is_active`
- `servants.is_active`

```typescript
// Em ministries, sectors, users e servants:
isActive: boolean("is_active").default(true).notNull(),
```

### Server Actions & Regras de Domínio
- `web/src/lib/actions/ministries.ts`: `setMinistryActive(id: number, isActive: boolean)`
- `web/src/lib/actions/sectors.ts`: `setSectorActive(id: number, isActive: boolean)` + validação em `createSector`
- `web/src/lib/actions/servants.ts`: `setServantActive(userId: string, isActive: boolean)` e `setServantSectorActive(servantId: number, isActive: boolean)` + validação em `createServant` e `addServantToSector`
- `web/src/lib/actions/schedules.ts`: bloqueio de criação/publicação em setor ou ministério desativado; filtro de servos ativos em `getScheduleSectorServants`
- `web/src/lib/actions/availability.ts`: bloqueio em `saveAvailability` e `assignServant`; filtro de vínculos/setores/ministérios ativos em `getServantOverview`
- `web/src/lib/actions/swaps.ts`: bloqueio em `createSwapRequest`, `getPendingSwapRequests` e `respondToSwapRequest`
- `web/src/app/escala/[link]/page.tsx`: `BlockedNotice` para ministério, setor ou servo desativado e filtro de servos ativos no seletor público
- `whatsapp/src/reminders/ReminderRepository.ts`: filtro `is_active = true` em `ministries`, `sectors`, `servants` e `users`

---

## 📋 Lista de Tarefas (Checklist de Implementação)

### Fase 1: Fundação & Banco de Dados
- [x] Criar migração manual `web/drizzle/manual/009_desativar_entidades.sql`.
- [x] Aplicar migração com `npx tsx src/db/apply-migration.ts drizzle/manual/009_desativar_entidades.sql`.
- [x] Atualizar `web/src/db/schema.ts` e `web/src/types/domain.ts`.

### Fase 2: Lógica de Negócio, Escopo & Worker WhatsApp
- [x] Atualizar `web/src/lib/scope.ts` (`getScope` e `mapCoordinatorSectors` considerando apenas vínculos, setores e ministérios ativos).
- [x] Implementar actions `setMinistryActive`, `setSectorActive`, `setServantActive` e `setServantSectorActive`.
- [x] Aplicar travas de entidade ativa em `schedules.ts`, `availability.ts`, `swaps.ts` e `app/escala/[link]/page.tsx`.
- [x] Atualizar `whatsapp/src/reminders/ReminderRepository.ts` para não enviar notificações a servos, setores ou ministérios desativados.
- [x] Atualizar ferramentas da assistente em `web/src/lib/ai/tools.ts`.

### Fase 3: Componentes de UI (Frontend)
- [x] Ajustar `web/src/components/ui/Switch.tsx` com `e.stopPropagation()` para uso seguro dentro de linhas clicáveis de `DataPanel`.
- [x] Adicionar coluna e controle `"Situação"` (`Ativo` / `Desativado`) em `/admin/ministries` e `/admin/ministries/[id]`.
- [x] Adicionar coluna e controle `"Situação"` (`Ativo` / `Desativado`) em `/admin/sectors` e `/admin/sectors/[id]`.
- [x] Adicionar coluna e controle `"Situação"` (`Ativo` / `Desativado`) em `/admin/servants` e `/admin/servants/[userId]`.
- [x] Filtrar setores/ministérios desativados nos seletores de criação de escalas, setores e servos.
- [x] Exibir aviso adequado em `/servant` quando o servo estiver desativado.

### Fase 4: Validação
- [x] Verificar tipagem TypeScript (`npx tsc --noEmit`) e lint (`npm run lint`).

