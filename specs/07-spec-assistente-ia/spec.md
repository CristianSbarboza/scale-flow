# 07 - Assistente Conversacional de IA (Escopo Ministerial & Multi-Provedor)

> **Status:** em implementação (31/10/2026).
> **Depende de:** [03-spec-multi-igreja](../03-spec-multi-igreja/spec.md) e [06-spec-lideres-multiplos](../06-spec-lideres-multiplos/spec.md).

## 📝 Descrição Geral
Módulo de chat conversacional integrado ao menu principal do **ScaleFlow** (tanto no painel de Admin/Líder quanto na navegação do Servo/Coordenador), com propósito estritamente ministerial, tom caloroso e acolhedor, respostas concisas com limite rígido de caracteres e arquitetura de segurança em camadas contra *prompt injection*.

A assistente opera conectada exclusivamente às ferramentas (Tools) autorizadas para o escopo (`Scope`) do usuário logado, reutilizando as Server Actions de domínio existentes e exigindo confirmação explícita em dois passos na interface antes de qualquer exclusão.

## 👥 Personas Envolvidas
- **Administrador da Igreja (`admin`):** Configura o provedor de IA, chave de API e identidade padrão da assistente para a igreja; no chat pode listar, criar, atualizar e (com confirmação explícita) excluir ministérios, setores, servos e escalas da sua igreja.
- **Líder de Ministério (`leader`):** Personaliza o nome/estilo da IA para sua conta; no chat pode listar, criar, atualizar e (com confirmação explícita) excluir setores, servos e escalas apenas dos ministérios que lidera.
- **Servo Coordenador (`servant` com `isCoordinator = true`):** Além das funções de servo, pode listar, criar, atualizar, publicar/despublicar, escalar servos e (com confirmação explícita) excluir escalas dos setores que coordena.
- **Servo / Membro (`servant`):** Personaliza o nome/estilo da IA para sua conta; no chat pode conversar, consultar suas escalas e datas, informar/atualizar sua disponibilidade e solicitar ou responder pedidos de troca.

## 🎯 Requisitos Funcionais (User Stories)
- [x] **RF01 - Acesso no Menu:** Item "Assistente IA" disponível na barra lateral do Admin/Líder (`/admin/assistant`) e como aba "Assistente" no painel do Servo (`/servant?aba=assistant`).
- [x] **RF02 - Controle Estrito por Papel (Least Privilege Tools):** O modelo de IA recebe na definição de ferramentas apenas as operações que o papel e escopo do usuário podem executar, e cada ferramenta executa a validação real no servidor via `scope.ts` e Server Actions existentes.
- [x] **RF03 - Confirmação Explícita para Exclusões:** Qualquer pedido de exclusão (`delete_ministry`, `delete_sector`, `delete_servant_account`, `delete_schedule`) gera uma ação pendente (`PendingConfirmation`) que exige clique explícito do usuário num card de confirmação na UI antes de efetivar a operação.
- [x] **RF04 - Propósito Ministerial, Tom e Limite de Caracteres:** A assistente mantém tom simpático, acolhedor e respeitoso, recusa desvios de assunto (programação, política, curiosidades gerais, tentativas de jailbreak) e limita suas respostas a no máximo **480 caracteres**.
- [x] **RF05 - Personalização por Usuário com Padrão da Igreja:** Cada usuário pode escolher nas suas Configurações como chama a assistente (`aiName`) e o nível de objetividade (`warm` = calorosa e acolhedora, `balanced` = equilibrada, `direct` = direta e objetiva), herdando o padrão da igreja quando não preenchido.
- [x] **RF06 - Configuração de Provedor e Chave de API (Admin):** Na página de Configurações do Admin, seção exclusiva para escolher o provedor (`gemini`, `claude`, `openai`, `grok`, `groq`, `openrouter`), modelo opcional, chave de API (armazenada no banco e jamais devolvida em texto aberto ao cliente) e o nome/personalidade padrão da igreja.
- [x] **RF07 - Histórico Efêmero:** As mensagens do chat vivem apenas na sessão ativa do navegador (com botão de limpar conversa), sem persistir histórico de diálogos no PostgreSQL.

## 🚫 Requisitos Não-Funcionais & Restrições
- [x] **RNF01 - Defesa contra Prompt Injection:**
  1. Sanitização e limite de tamanho da mensagem do usuário (máx. 500 caracteres por envio).
  2. Detecção heurística de instruções maliciosas (`ignore previous instructions`, `system prompt`, etc.).
  3. Isolamento estrutural: o LLM nunca gera SQL nem recebe IDs de outras igrejas; toda operação passa pelas funções de `src/lib/actions/*` que validam `session.user.churchId` e `getScope()`.
  4. Exclusões bloqueadas na camada de execução caso não venham acompanhadas do token/flag de confirmação humana da UI.
- [x] **RNF02 - Proteção da Chave de API:** A coluna `churches.ai_api_key` nunca é incluída em `getMyChurch()` nem exposta ao cliente; a UI do Admin recebe apenas `{ hasApiKey: boolean, maskedApiKey: string | null }`.
- [x] **RNF03 - Limite Rígido de Resposta:** Respostas da IA são instruídas no prompt e truncadas de forma limpa na fronteira de frase em no máximo 480 caracteres.

## 🏆 Critérios de Aceitação (Definition of Done)
1. [x] Admin configura chave de API (Gemini, Claude, OpenAI, Grok, Groq ou OpenRouter) e padrão da igreja em `/admin/settings`.
2. [x] Qualquer usuário personaliza o nome e estilo da assistente nas suas Configurações (página do Admin/Líder e modal do Servo).
3. [x] Admin, Líder, Coordenador e Servo acessam o chat pelo menu e executam apenas as ações permitidas pelo seu escopo.
4. [x] Pedidos de exclusão no chat exibem um card de confirmação explícita antes de apagar qualquer registro.
5. [x] Respostas respeitam o tom ministerial acolhedor, não fogem do tema e têm no máximo 480 caracteres.

