# 08 - Desativação de Servos, Setores e Ministérios

> **Status:** em implementação (31/10/2026).
> **Depende de:** [03-spec-multi-igreja](../03-spec-multi-igreja/spec.md), [05-spec-whatsapp-lembretes](../05-spec-whatsapp-lembretes/spec.md), [06-spec-lideres-multiplos](../06-spec-lideres-multiplos/spec.md).

## 📝 Descrição Geral

Permite **desativar e reativar** ministérios, setores e servos sem excluir nenhum registro nem histórico do banco de dados. Enquanto uma entidade estiver desativada, suas funcionalidades operacionais ficam suspensas: servos desativados (ou vinculados a setores/ministérios desativados) não recebem notificações pelo WhatsApp, não aparecem para escalação e não conseguem preencher disponibilidade nas escalas.

## 👥 Personas Envolvidas

- **Administrador:** Ativa e desativa qualquer ministério, setor ou servo da própria igreja.
- **Líder de Ministério:** Ativa e desativa o próprio ministério, seus setores e os servos vinculados a eles.
- **Coordenador de Setor:** Gerencia apenas setores ativos em que seu vínculo de coordenação também esteja ativo.
- **Servo / Voluntário:** Quando ativo em setor e ministério ativos, preenche disponibilidade, solicita trocas e recebe lembretes no WhatsApp. Quando desativado, não recebe notificações e não preenche escalas.

## 🎯 Requisitos Funcionais (User Stories)

- [x] **RF01 - Desativar/Ativar Ministério:** Como Administrador ou Líder do ministério, quero desativar ou reativar um ministério sem apagar seus setores, escalas ou histórico, suspendendo novas escalas, respostas de disponibilidade e notificações de WhatsApp daquele ministério enquanto estiver desativado.
- [x] **RF02 - Desativar/Ativar Setor:** Como Administrador ou Líder do ministério, quero desativar ou reativar um setor sem apagar seus vínculos ou escalas, suspendendo novas escalas, respostas de disponibilidade e notificações de WhatsApp daquele setor enquanto estiver desativado.
- [x] **RF03 - Desativar/Ativar Servo (Global e por Setor):** Como Administrador ou Líder, quero desativar ou reativar o cadastro de um servo (ou seu vínculo em um setor específico) sem excluir seu histórico.
- [x] **RF04 - Bloqueio de Preenchimento de Escala:** Um servo desativado (ou cujo setor/ministério da escala esteja desativado) não aparece na seleção pública de `/escala/[link]`, vê um aviso claro (`BlockedNotice`) se tentar acessar logado, e é bloqueado na Server Action `saveAvailability`.
- [x] **RF05 - Bloqueio de Escalação e Trocas:** Um servo desativado não aparece na lista de servos disponíveis para escalar manualmente (`getScheduleSectorServants`), não pode ser escalado (`assignServant`) e não pode enviar ou aceitar pedidos de troca (`swapRequests`).
- [x] **RF06 - Silenciamento no WhatsApp:** O serviço `whatsapp/` ignora servos, setores e ministérios desativados tanto nos avisos de escala publicada (`findPublishedNotices`) quanto nos lembretes de culto (`findCandidates`).

## 🚫 Requisitos Não-Funcionais & Restrições

- [x] **RNF01 - Preservação Total de Dados:** Desativar nunca executa `DELETE` em tabelas de domínio ou histórico (`schedules`, `schedule_dates`, `schedule_availability`, `schedule_assignments`, `notification_log`).
- [x] **RNF02 - Isolamento Multi-Igreja:** Todas as Server Actions de ativação/desativação validam a barreira de igreja (`requireMinistryAccess`, `requireSectorAccess`, `requireServantAccess`) antes de qualquer alteração.
- [x] **RNF03 - Consistência Visual (Design System):** Uso do componente `<Switch>` existente e tokens semânticos (`var(--muted-foreground)`, `var(--primary)`) nas tabelas (`DataPanel`) e páginas de detalhe, seguindo exatamente o padrão da coluna `"Situação"` de `/admin/schedules`.

## 🏆 Critérios de Aceitação (Definition of Done)

1. [x] Admin ou Líder alterna a chave `"Situação"` (`Ativo` / `Desativado`) na listagem e na página de detalhe de Ministérios, Setores e Servos sem navegar acidentalmente ao clicar no interruptor.
2. [x] Servo desativado não aparece no seletor de `/escala/[link]` e, se tentar gravar disponibilidade via `saveAvailability`, a action recusa com mensagem clara.
3. [x] Escala pertencente a setor ou ministério desativado exibe `BlockedNotice` em `/escala/[link]` e recusa `saveAvailability`, `publishSchedule` e `assignServant`.
4. [x] As queries de `ReminderRepository` no worker `whatsapp/` filtram `m.is_active = true`, `s.is_active = true`, `sv.is_active = true` e `u.is_active = true`.
5. [x] Migração manual `008_desativar_entidades.sql` aplicada sem alterar contagem de linhas existentes.

