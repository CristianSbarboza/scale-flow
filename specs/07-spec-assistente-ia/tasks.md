# Plano Técnico - Assistente Conversacional de IA

> [!IMPORTANT]
> Este documento detalha a arquitetura, migração manual e tarefas para implementação da Spec 07.

## 🛠️ Arquitetura & Modelo de Dados

### Alterações de Banco de Dados (`web/src/db/schema.ts` & `web/drizzle/manual/008_assistente_ia.sql`)

Adição de colunas de configuração de IA na tabela `churches` (nível da igreja, gerenciado pelo Admin) e preferências individuais na tabela `users` (nível do usuário):

```sql
ALTER TABLE "churches"
  ADD COLUMN IF NOT EXISTS "ai_provider" text NOT NULL DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS "ai_model" text,
  ADD COLUMN IF NOT EXISTS "ai_api_key" text,
  ADD COLUMN IF NOT EXISTS "ai_default_name" text NOT NULL DEFAULT 'Graça',
  ADD COLUMN IF NOT EXISTS "ai_default_style" text NOT NULL DEFAULT 'warm';

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "ai_name" text,
  ADD COLUMN IF NOT EXISTS "ai_style" text;
```

### Novas Rotas & Módulos
- **Rota Admin/Líder:** `web/src/app/admin/assistant/page.tsx` (`/admin/assistant`)
- **Aba Servo/Coordenador:** `tab === "assistant"` em `web/src/components/ServantHome.tsx` (`/servant?aba=assistant`)
- **Motor Multi-Provedor LLM:** `web/src/lib/ai/providers.ts` (suporte nativo via `fetch` com Tool Calling para `gemini`, `claude`, `openai`, `grok`, `groq`, `openrouter`)
- **Guardrails & Catálogo de Ferramentas por Escopo:** `web/src/lib/ai/tools.ts`
- **Server Actions de IA & Configurações:** `web/src/lib/actions/ai.ts`
- **Componentes de UI:**
  - `web/src/components/AssistantChat.tsx` (interface conversacional glassmórfica com sugestões rápidas por papel, contador de caracteres e confirmação em 2 etapas para exclusão)
  - `web/src/components/settings/AiAssistantSection.tsx` (personalização de nome e personalidade para todos os usuários + configuração de provedor e API key exclusiva para Admin)

---

## 📋 Lista de Tarefas (Checklist de Implementação)

### Fase 1: Fundação & Banco de Dados
- [x] Criar migração manual idempotente `web/drizzle/manual/008_assistente_ia.sql`.
- [x] Atualizar `web/src/db/schema.ts` e `web/src/types/domain.ts` com os tipos de configuração de IA.

### Fase 2: Motor de IA, Guardrails e Ferramentas Escopadas
- [x] Criar `web/src/lib/ai/providers.ts` com adaptadores unificados de Tool Calling para Gemini, Claude, OpenAI, Grok (xAI), Groq e OpenRouter.
- [x] Criar `web/src/lib/ai/tools.ts` mapeando as ferramentas disponíveis estritamente de acordo com `Scope` (`admin`, `leader`, `coordinator`, `servant`), reusando as actions de `ministries`, `sectors`, `servants`, `schedules`, `availability` e `swaps`.
- [x] Implementar `web/src/lib/actions/ai.ts` com leitura/gravação das configurações de IA (mascarando a API key), validação contra prompt injection, limite rígido de 480 caracteres na resposta e fluxo `confirmAiAction` para exclusões.

### Fase 3: Componentes de UI & Navegação
- [x] Criar `web/src/components/settings/AiAssistantSection.tsx` e integrá-lo em `web/src/app/admin/settings/page.tsx` e `web/src/components/SettingsModal.tsx`.
- [x] Criar `web/src/components/AssistantChat.tsx` seguindo os tokens semânticos de `design-system.css`.
- [x] Criar a página `web/src/app/admin/assistant/page.tsx` e adicionar o item no `AdminSidebar.tsx`.
- [x] Adicionar a aba `"assistant"` em `ServantHome.tsx` e `web/src/app/servant/page.tsx`.

### Fase 4: Verificação & Validação
- [x] Aplicar migração no banco local se ativo e validar `npm run lint` e `npm run build`.
- [x] Preencher `specs/07-spec-assistente-ia/validation.md`.

