# Plano de Validação & Testes - Desativação de Servos, Setores e Ministérios

## 🧪 Verificações Automatizadas

- **Migração de Banco (`apply-migration.ts`):** Executada sem alteração na contagem de linhas das tabelas existentes.
- **Typecheck (`npx tsc --noEmit`):** Passou sem erros em `web/`.
- **Linter (`npm run lint`):** Passou sem erros nos arquivos alterados.

---

## 🙋 Validação Funcional (Checklist)

### 🖥️ Desktop & 📱 Mobile
- [x] **Desativar/Reativar Ministério:** Interruptor `"Situação"` em `/admin/ministries` e `/admin/ministries/[id]` alterna entre `Ativo` e `Desativado` sem apagar dados e impede criação/publicação de escalas e respostas em `/escala/[link]`.
- [x] **Desativar/Reativar Setor:** Interruptor `"Situação"` em `/admin/sectors` e `/admin/sectors/[id]` alterna entre `Ativo` e `Desativado`, ocultando o setor nos formulários de nova escala/servo e bloqueando respostas nas escalas do setor.
- [x] **Desativar/Reativar Servo:** Interruptor `"Situação"` em `/admin/servants` e `/admin/servants/[userId]` desativa o servo globalmente ou por setor, impedindo que preencha disponibilidade, seja escalado ou receba notificações no WhatsApp.

