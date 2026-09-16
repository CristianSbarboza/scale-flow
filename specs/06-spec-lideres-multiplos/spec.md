# Especificação Funcional - Líderes Múltiplos por Ministério

> **Status:** implementado (16/09/2026). Falta aplicar a migração na produção — **antes** do deploy, ver `tasks.md`.
> **Depende de:** [03-spec-multi-igreja](../03-spec-multi-igreja/spec.md) — a barreira de igreja continua valendo em cada consulta de liderança.

## 🎯 Objetivo

Um ministério passa a ter **quantos líderes precisar**, em vez de exatamente um.

Hoje `ministries.leader_id` guarda uma pessoa só. Na prática, ministério grande tem dois ou três líderes dividindo a carga, e o sistema obrigava a escolher um — os outros ficavam de fora, sem acesso, ou entravam como "servo coordenador" de cada setor, um a um, que é outra coisa.

## 👤 Requisitos Funcionais

- **RF01** — Um ministério tem uma lista de líderes, sem limite. Todos têm o mesmo acesso: o que um líder pode hoje, cada um da lista pode.
- **RF02** — **Admin** adiciona e remove líderes de qualquer ministério da igreja.
- **RF03** — **Líder** adiciona e remove líderes **do próprio ministério**. Não alcança os outros.
- **RF04** — Um ministério nunca fica sem líder: remover o último é recusado.
- **RF05** — Adicionar alguém por e-mail segue o que o cadastro de líder já fazia: conta existente entra (e sobe de servo para líder, se for o caso); e-mail novo cria a conta com senha gerada, exibida uma única vez.
- **RF06** — Quem já era líder continua sendo. A migração copia o `leader_id` de cada ministério para a lista.

## 🚫 Não Faz Parte

- **Hierarquia entre líderes.** Não há "líder principal" nem "vice". Todos iguais. Um campo de ordem ou de papel entre líderes criaria uma segunda dimensão de autorização que nenhuma tela pede.
- **Rebaixar quem sai.** Tirar alguém da liderança não muda o `role` da conta — como já era na troca de líder. Líder entra por e-mail, servo por usuário, e uma conta criada como líder não tem usuário: rebaixar trancaria a pessoa para fora.
- **Líder de mais de uma igreja.** Continua: cada conta existe numa igreja só.

## ✅ Critérios de Aceitação

1. Admin abre um ministério, adiciona um segundo líder por e-mail; a lista mostra os dois.
2. O segundo líder entra com a própria conta e vê o ministério, os setores, os servos e as escalas — igual ao primeiro.
3. Líder abre o próprio ministério e consegue adicionar um terceiro. Tentar pelo id de outro ministério é recusado pela action.
4. Com um líder só, o botão de remover não aparece; forçar a action devolve "precisa ter ao menos um líder".
5. Depois da migração, todo ministério existente aparece com o líder que tinha antes.

## ✅ Decisões resolvidas

**Tabela de junção, e não coluna extra.** `ministry_leaders (ministry_id, user_id)`, com índice único no par. A alternativa — manter `leader_id` e somar uma tabela para "os outros" — deixaria duas fontes de verdade, e cada predicado de autorização passaria a precisar de um `OR`. É exatamente o tipo de duplicação que vaza no primeiro esquecimento.

**A coluna antiga é derrubada na mesma migração.** Ficar com `leader_id` nulo e ignorado seria um campo morto que a próxima pessoa leria como fonte de verdade. O backfill roda antes do `DROP`, dentro do mesmo `BEGIN/COMMIT`, e um bloco `DO` aborta se algum ministério não tiver chegado ao outro lado.

**`user_id` sem `ON DELETE CASCADE`.** Igual à coluna antiga: apagar a conta de quem lidera falha. Com cascade, apagar o único líder deixaria um ministério órfão sem ninguém perceber, e o RF04 seria verdade só pela tela.

**Um predicado, `ledBy(userId)`.** Havia `eq(ministries.leaderId, userId)` em seis arquivos. Virou uma função em `scope.ts` que devolve um `EXISTS` sobre `ministry_leaders`, e é a única forma de perguntar "lidera?". A próxima mudança nessa regra é em um lugar.

**Mesmo acesso para adicionar e remover.** Quem pode trazer alguém pode desfazer. Restringir a remoção ao admin deixaria um líder sem como corrigir o próprio engano; permitir só "sair" (remover a si mesmo) seria uma terceira regra para explicar.

## ⚠️ Migração

`drizzle/manual/006_lideres_multiplos.sql`. **Aplicar antes do deploy**: o código novo lê `ministry_leaders`, o antigo lê `leader_id`, e nenhum funciona com o banco no estado do outro. Idempotente.
