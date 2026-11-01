# Plano de Validação & Testes - Assistente Conversacional de IA

## 🧪 Testes Automatizados & Verificação Estática
- **Comandos executados:** `npx tsc --noEmit` e `npm run lint` (em `web/`)
- **Resultado:** Passou sem erros de tipagem ou lint.

---

## 🙋 Validação de Segurança & Escopo (Checklist)
- [x] **Isolamento de Chave de API:** `getMyChurch()` e `getUserAiSettings()` nunca retornam `aiApiKey` em texto plano para o navegador; `getChurchAiAdminSettings()` exige `requireAdmin()` e retorna apenas `hasApiKey` e `maskedApiKey`.
- [x] **Escopo por Papel (`getToolsForScope` + `executeScopedTool`):**
  - [x] Servo comum só recebe ferramentas de consulta das próprias escalas (`list_my_schedules`), disponibilidade própria (`save_my_availability`) e trocas próprias (`list_my_pending_swaps`, `request_swap`, `respond_swap`).
  - [x] Coordenador recebe ferramentas de gestão de escalas apenas dos setores que coordena (`requireScheduleSectorAccess`).
  - [x] Líder recebe ferramentas de setores, servos e escalas apenas dos ministérios que lidera (`requireMinistryAccess`, `requireSectorAccess`, `requireServantAccess`).
  - [x] Admin recebe ferramentas completas dentro da própria igreja (`churchId`).
- [x] **Confirmação de Exclusão:** Qualquer tentativa de apagar ministério, setor, servo ou escala retorna `pendingConfirmation` na interface e só apaga quando o usuário aciona `confirmAiPendingAction` clicando em "Confirmar Exclusão".
- [x] **Limite de Caracteres e Tom Ministerial:** Respostas truncadas de forma limpa em no máximo 480 caracteres (`enforceReplyCharacterLimit`), e desvios de assunto / prompt injections bloqueados por heurística (`detectPromptInjection`) e instruções de sistema.
