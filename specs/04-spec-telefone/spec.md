# Especificação Funcional - Telefone de Contato

> **Status:** implementado (23/08/2026). Falta aplicar a migração na produção.
> **Depende de:** [03-spec-multi-igreja](../03-spec-multi-igreja/spec.md) — o campo entra em `users`, que ganhou `church_id` naquela spec.

## 🎯 Objetivo

Guardar um telefone de contato para qualquer pessoa cadastrada — admin, líder ou servo — de forma **opcional**.

Hoje o único contato de um servo é o e-mail, e servo não é obrigado a ter e-mail: pode se cadastrar só com usuário. Na prática isso significa que existe gente no sistema sem nenhuma forma de ser contatada fora dele, e o líder acaba mantendo os números numa lista à parte.

## 👤 Requisitos Funcionais

- **RF01** — `users` ganha um campo de telefone, **opcional para todos os papéis**. Ninguém é impedido de se cadastrar por não informar.
- **RF02** — O campo aparece no cadastro e na edição de servo, no cadastro de líder (formulário de ministério) e nas configurações da própria conta, para a pessoa preencher ou corrigir o seu.
- **RF03** — Quem já está cadastrado continua válido com telefone vazio. Não há migração de dados, não há tela pedindo o preenchimento retroativo.
- **RF04** — O telefone é exibido na tela de detalhe do servo, para o líder conseguir ligar ou mandar mensagem.
- **RF05** — Entrada com máscara brasileira: `(11) 98765-4321`. O que é digitado é aceito com ou sem máscara.
- **RF06** — Ao lado do campo, um **seletor de país** marcado como Brasil (+55) por padrão, trocável quando necessário. A máscara é aplicada só ao Brasil.

## 🚫 Não Faz Parte

- **Não é identificador de login.** Continuam sendo e-mail (admin/líder) e igreja+usuário (servo). Telefone como terceira forma de entrar criaria mais um eixo de unicidade para conciliar com o namespace de igreja — e telefone é justamente o dado que mais muda de dono.
- **Não é único.** Marido e esposa podem informar o mesmo número; um telefone fixo de família é um caso normal numa igreja.
- **Não é verificado.** Sem SMS, sem confirmação. É uma agenda de contatos, não um fator de autenticação.
- **Sem envio de mensagem pelo sistema.** Botão de WhatsApp/SMS fica para uma spec própria, se fizer sentido.

## ✅ Critérios de Aceitação

1. Cadastrar servo **sem** telefone funciona exatamente como hoje.
2. Cadastrar servo **com** telefone grava o número e ele aparece na tela de detalhe.
3. Um telefone digitado com máscara e o mesmo número digitado sem máscara resultam no mesmo valor gravado.
4. Usuários criados antes da mudança continuam abrindo e editando normalmente, com o campo vazio.
5. Um número inválido (curto demais) é recusado com mensagem clara, não gravado pela metade.

## ✅ Decisões resolvidas

**Formato de armazenamento: E.164 sem o `+`** (`5511987654321`). O plano original era guardar só os dígitos nacionais, porque "todos os números serão brasileiros". O seletor de país (RF06) mudou isso: com país escolhível, guardar só o nacional obrigaria cada consumidor a lembrar de prefixar o código — e o primeiro que esquecesse mandaria mensagem para o número errado.

O ganho de lado: **E.164 é exatamente o que o WhatsApp consome** (`5511987654321@s.whatsapp.net`). A pendência "conversão do número" da [spec 05](../05-spec-whatsapp-lembretes/spec.md) deixou de existir antes de ser aberta.

**País em coluna separada: não.** Uma coluna só, com `splitPhone()` remontando o seletor por prefixo mais longo. Duas colunas evitariam o parsing, mas criariam uma forma não-padrão que todo consumidor teria que lembrar de juntar.

**Onde exibir:** tela de detalhe do servo (com link `tel:`) e configurações da própria conta. Fora da listagem de servos por enquanto — a lista já tem nome, usuário, e-mail e filtros; telefone ali seria ruído.

## ❓ Continua em aberto

- **Busca por telefone** na listagem de servos. Exige normalizar o termo digitado, senão procurar `(11) 98765` não acha `5511987654321`.

## ⚠️ Migração

A coluna entrou em `drizzle/manual/002_telefone.sql`, separada da 001, porque a migração da spec 03 já tinha ido para a produção quando esta começou. `ALTER TABLE ... ADD COLUMN IF NOT EXISTS phone text` — anulável, sem backfill, sem reescrita de tabela.
