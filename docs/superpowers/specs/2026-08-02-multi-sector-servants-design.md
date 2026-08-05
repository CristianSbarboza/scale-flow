# Servos em múltiplos setores + gestão de membro

Data: 2026-08-02
Status: Aprovado

## Contexto

Hoje a experiência de gestão de servos trata "servo" como um vínculo único a um setor: a lista "Servos Cadastrados" (`/admin/servants`) mostra uma linha por vínculo servo↔setor, `getServantOverview()` (painel do servo) busca só o primeiro vínculo do usuário (`findFirst`), e não existe uma tela de detalhe de membro — só o formulário de cadastro inicial. O objetivo é permitir que um servo pertença a N setores (e por extensão N ministérios), e dar a admin/líder uma tela de gestão por pessoa: ver, adicionar/remover setores, trocar senha e excluir a conta.

## Descoberta: o schema já suporta N setores

`servants` (`src/db/schema.ts`) tem `id, userId, sectorId, createdAt` — sem constraint de unicidade em `userId` sozinho, só a checagem de aplicação em `createServant()` que evita duplicar o mesmo par `(userId, sectorId)`. Ou seja, um usuário já pode ter múltiplas linhas em `servants`, uma por setor. O que falta é a camada de leitura assumir isso: hoje três lugares usam `findFirst`/agrupamento single-sector e precisam virar `findMany`/agregação:

1. `getServants()` — retorna uma linha por vínculo, não por pessoa.
2. `getServantOverview()` — usa `db.query.servants.findFirst({ where: eq(servants.userId, ...) })`, ignorando vínculos além do primeiro.
3. `src/app/servant/page.tsx` — mesma limitação, usada pra header (nome do setor) e checagem de "perfil de servo não encontrado".

## Escopo

**Dentro do escopo:** tornar a leitura de servos agregada por pessoa (múltiplos setores); tela de detalhe de membro (painel deslizante) com adicionar/remover setor, trocar senha, excluir conta; liberar essas 4 ações novas para `admin` e `leader` (escopado); atualizar a lista "Servos Cadastrados" pra uma linha por pessoa.

**Fora do escopo:** mudança de schema (não é necessária — ver descoberta acima); alterar o formulário de cadastro inicial de servo (continua criando com 1 setor; setores adicionais se adicionam depois, pelo painel de detalhe); qualquer coisa em `/escala/[link]` (o link público já lista servos por setor específico da escala, não muda).

## Mudanças em `src/lib/actions.ts`

- `getServants()`: passa a agrupar os resultados por `userId`, retornando um objeto por pessoa com um array de `{ servantId, sector, ministry }` (um item por vínculo). Mantém o escopo por líder já existente (`getAuthFilter()`), mas agora um líder só vê os *vínculos* dentro de seus ministérios — se um servo também pertence a um setor de outro ministério, esse vínculo específico não aparece pra esse líder, mas a pessoa aparece (com os vínculos visíveis a ele).
- `getServantOverview()` e a query em `servant/page.tsx`: trocam `findFirst` por `findMany` sobre `servants` filtrando por `userId`, e agregam schedules de todos os `sectorId` encontrados. O header do painel do servo (`servant.sector.name`) passa a listar todos os setores (ex: "Transmissão, Fotografia") em vez de assumir um único.
- Novas actions, liberadas para `admin` e `leader` (checagem de escopo: leader só age sobre servos com pelo menos um vínculo em um setor que ele lidera; para `addServantToSector`, o setor de destino também precisa ser de um ministério que ele lidera):
  - `addServantToSector(userId: string, sectorId: number)` — insere uma nova linha em `servants` (idempotente: não duplica se já existir o vínculo).
  - `removeServantFromSector(servantId: number)` — apaga a linha específica de `servants` (cascade já existente cuida de `scheduleAssignments`/`scheduleAvailability` daquele vínculo).
  - `resetServantPassword(userId: string, newPassword: string)` — hash da nova senha (bcrypt, mesmo padrão do resto do app) e `UPDATE users`.
  - `deleteServantAccount(userId: string)` — apaga a linha de `users` (cascade existente remove `servants`; não há necessidade de tratar `ministries.leaderId` pois um servo nunca é `leaderId`).
  - Uma nova função auxiliar `requireServantAccess(userId)` (mirror de `getAuthFilter`) centraliza a checagem de escopo pras 4 actions acima.

## UI — `ServantMemberDetails` (novo componente)

Painel deslizante lateral, mesmo padrão visual de `MinistryDetails.tsx`/`SectorDetails.tsx` (`fixed inset-0 z-60 flex justify-end`, painel `w-full max-w-4xl h-full` entrando da direita). Conteúdo:

- **Cabeçalho**: nome do membro, botão fechar.
- **Dados**: usuário, e-mail (com fallback "-").
- **Setores**: lista dos vínculos atuais (nome do setor + ministério), cada um com botão "Remover" (via `ConfirmDialog` já existente); abaixo, um `<select>` com os setores disponíveis (que o admin/líder pode gerenciar, excluindo os que o membro já tem) + botão "Adicionar".
- **Zona de risco**: campo de senha nova + botão "Alterar Senha" (toast de sucesso via `useToast()` já existente); botão "Excluir Membro" (via `ConfirmDialog`, texto deixando claro que apaga a conta e todo o histórico — ação irreversível).

## `admin/servants/page.tsx`

A tabela "Servos Cadastrados" passa a ter uma linha por pessoa: Nome | Usuário/E-mail | Setores (chips, um por vínculo) — substitui as colunas atuais "Setor"/"Ministério"/"E-mail" isoladas. Clicar na linha abre `ServantMemberDetails`. O formulário de cadastro (`Cadastrar Novo Servo`) não muda.

## Validação

Sem suíte automatizada — validação manual: cadastrar um servo, adicionar um segundo setor pelo painel de detalhe, conferir que a "Servos Cadastrados" mostra os 2 setores na mesma linha; logar como esse servo e confirmar que `/servant` agrega escalas dos 2 setores; remover um dos setores pelo painel e confirmar que o vínculo (e disponibilidade/confirmação associada) some; trocar a senha e logar com a nova; excluir o membro e confirmar que o login para de funcionar. Repetir o teste de escopo como `leader` (só enxerga/gerencia vínculos dos próprios ministérios).
