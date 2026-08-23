# Plano de Validação & Testes - Multi-Igreja (Multi-Tenancy)

> [!NOTE]
> Preencher **durante** a implementação. Os checkboxes abaixo são o roteiro; os resultados reais vão nos campos de resultado.

> [!IMPORTANT]
> Todo teste de isolamento exige **duas igrejas semeadas com dados distintos**. Validar multi-tenancy com uma igreja só no banco não prova nada — é o erro mais fácil de cometer aqui.

## 🧪 Testes Automatizados

O repositório não tem framework de teste configurado (sem `test` script, sem arquivos de teste). O que existe:

- **Comando:** `npx tsc --noEmit`
  - **Resultado esperado:** limpo.
  - **Resultado obtido (fim da Fase 5):** ✅ limpo.
- **Comando:** `npm run lint`
  - **Resultado esperado:** 3 warnings, o baseline pré-existente (`drizzle/schema.ts` `sql` não usado; `types/next-auth.d.ts` `NextAuth` e `JWT` não usados). Qualquer coisa além disso é regressão.
  - **Resultado obtido (fim da Fase 5):** ✅ 3 warnings, sem novidade.
- **Comando:** `DATABASE_URL="postgresql://postgres:password@localhost:5432/scaleflow" npx tsx src/db/check-isolation.ts`
  - **O que faz:** criado na Fase 2, ampliado na Fase 3. Exercita o `authorize()` real de `src/lib/auth.ts` contra o fixture de duas igrejas — não reimplementa a regra, chama a que está em produção — e verifica 11 invariantes de banco (nulos, FK órfã, unicidade global vs. por igreja, vínculo de servo cruzando igrejas, escala cruzando igrejas). Sai com código 1 se algum caso falhar.
  - **Resultado obtido (fim da Fase 3):** ✅ 20/20 casos.
- **Comando:** `grep -rn "? undefined" src/lib/actions/ src/app/admin/ src/lib/scope.ts`
  - **Resultado esperado:** nenhuma cláusula `where` de escopo (critério de aceitação 4).
  - **Resultado obtido (fim da Fase 3):** ✅ nenhuma ocorrência.

> [!CAUTION]
> **O que continua sem automação.** Os testes de isolamento de leitura e escrita abaixo **não** são cobertos pelo `check-isolation.ts`: as server actions chamam `getServerSession()`, que precisa de contexto de requisição. Rodar o harness e ver 20/20 **não** significa que os critérios 2 e 3 passaram. Eles exigem dois logins reais no navegador, contra o banco local.

> [!CAUTION]
> **Estado no fechamento da Fase 5.** Tudo abaixo desta linha que não tem resultado preenchido **não foi executado**. O código compila, o lint está no baseline e os 20 casos do `check-isolation.ts` passam — nada disso é a mesma coisa que ter aberto a tela. Nenhum item das seções "Isolamento", "Validação Manual" e "Evidências" foi verificado no navegador, porque o `next dev` da máquina aponta para a produção e subir um segundo servidor no mesmo diretório corromperia o cache do Turbopack. Ler esta página e ver caixas vazias é o comportamento correto: elas estão vazias porque não foram feitas, não porque ninguém preencheu.

> [!WARNING]
> Armadilha encontrada ao escrever `check-isolation.ts`: no next-auth v4 o `authorize` de topo do provider é um stub que devolve `null`; o real mora em `provider.options.authorize`. Chamar o de topo faz **todo** teste de recusa "passar" e todo teste de sucesso falhar — um harness que parece funcionar e não verifica nada. Se os resultados vierem assim divididos, é este o motivo.

---

## 🔒 Testes de Isolamento (o coração desta spec)

Cenário base: **Igreja A** (admin `admin.a@teste.com`, ministério "Louvor A", setor "Voz A", servo `joao`) e **Igreja B** (admin `admin.b@teste.com`, ministério "Louvor B", setor "Voz B", servo `joao` — mesmo usuário de propósito).

### Isolamento de leitura — logado como admin da Igreja A

- [ ] `/admin/ministries` não lista "Louvor B". Resultado: `[preencher]`
- [ ] `/admin/sectors` não lista "Voz B". Resultado: `[preencher]`
- [ ] `/admin/servants` não lista o `joao` da Igreja B. Resultado: `[preencher]`
- [ ] `/admin/schedules` não lista escala da Igreja B. Resultado: `[preencher]`
- [ ] `/admin/calendar` não mostra data alguma da Igreja B. Resultado: `[preencher]`
- [ ] `/admin` (dashboard): os contadores de Ministérios / Setores / Servos / Escalas somam **só** a Igreja A, e as listas de "últimos" não vazam nada de B. Resultado: `[preencher]`

> O dashboard é o ponto mais provável de vazar: ele consulta o banco direto, sem passar pelas actions.

### Isolamento de escrita — forçando IDs na mão

Chamar a server action com um ID que existe, mas pertence à outra igreja. Todos devem retornar erro de autorização, **não** dados nem sucesso silencioso.

- [ ] `getMinistryById(<id de B>)` como admin de A → erro/`null`. Resultado: `[preencher]`
- [ ] `updateMinistry(<id de B>, ...)` como admin de A → erro. Resultado: `[preencher]`
- [ ] `getSectorById(<id de B>)` como admin de A → erro/`null`. Resultado: `[preencher]`
- [ ] `createSector(nome, <ministryId de B>)` como admin de A → erro. Resultado: `[preencher]`
- [ ] `addServantToSector(<userId de A>, <sectorId de B>)` → erro. Resultado: `[preencher]`
- [ ] `addServantToSector(<userId de B>, <sectorId de A>)` → erro. Resultado: `[preencher]`
- [ ] `createSchedule(..., <sectorId de B>)` como admin de A → erro. Resultado: `[preencher]`
- [ ] `resetServantPassword(<userId de B>)` como admin de A → erro. Resultado: `[preencher]`
- [ ] `deleteServantAccount(<userId de B>)` como admin de A → erro. Resultado: `[preencher]`
- [ ] `createSwapRequest` entre um servo de A e um de B → erro. Resultado: `[preencher]`

### Login e unicidade

- [ ] Os dois `joao` (um em cada igreja) logam, cada um caindo na própria igreja. Resultado: `[preencher]`
- [ ] `joao` da Igreja A, digitando a igreja B e usando a senha certa dele, **não** entra. Resultado: `[preencher]`
- [ ] Admin/líder loga por e-mail sem escolher igreja. Resultado: `[preencher]`
- [ ] Cadastrar um segundo `joao` **na mesma** igreja dá erro claro. Resultado: `[preencher]`
- [ ] Cadastrar servo com e-mail que já existe em outra igreja dá erro claro, sem sequestrar a conta (RF05). Resultado: `[preencher]`
- [ ] `/login?igreja=teste-b` chega com o campo já preenchido. Resultado: `[preencher]`

---

## 🗃️ Validação da Migração

**Aplicada na produção (Neon) em 23/08/2026.** O plano original dizia "rodar sobre uma cópia restaurada, nunca direto no Neon"; foi aplicada direto, com backup completo tirado antes (`pg_dump` 17, 9 tabelas com dados, fora do git) e pré-voo somente-leitura confirmando que não havia bloqueio. Comandos: `npx tsx src/db/preflight-multi-igreja.ts` (antes e depois) e `npx tsx src/db/apply-migration.ts drizzle/manual/001_multi_igreja.sql`.

- [x] Contagens antes e depois — idênticas: `users: 11, ministries: 1, sectors: 2, servants: 11, schedules: 2`. O `apply-migration.ts` aborta sozinho se alguma mudar.
- [x] Nenhuma linha com `church_id IS NULL`: `is_nullable = 'NO'` em `users` e `ministries`, o que só é possível se o backfill rodou antes do lock.
- [x] Todos apontam para a mesma igreja: 11 `users` e 1 `ministries` em `padrao` (id 1, "Igreja Padrão").
- [x] Nenhuma FK órfã: a consulta de `left join churches ... where c.id is null` voltou vazia nas duas tabelas.
- [ ] Login de um usuário pré-existente continua funcionando depois da migração. Resultado: `[preencher]`
- [ ] Escalas antigas continuam abrindo pelo `shareLink` de sempre. Resultado: `[preencher]`
- [x] `users_username_unique` saiu (sobrou só `users_email_unique`) e `users_church_username_idx` existe.
- [x] **Idempotência provada:** o mesmo arquivo rodou duas vezes no banco local, sem erro e sem mudar contagem.

> [!WARNING]
> **Efeito colateral no login dos servos.** Dos 11 usuários da produção, **8 são servos que entram por username** e agora precisam digitar `padrao` no campo "Igreja". Os 3 admins entram por e-mail e não foram afetados. O link `/login?igreja=padrao` preenche o campo sozinho — é ele que deve ser distribuído, não o `/login` seco. Isto não é bug: é a consequência esperada de RNF04, e está anotado aqui porque é a única parte da migração que aparece para o usuário final.

---

## 🙋 Validação Manual (Checklist)

### 🖥️ Desktop

- [ ] **Fluxo principal:** admin renomeia a igreja em `/admin/settings`; o nome novo aparece na sidebar e no subtítulo do dashboard. Resultado: `[preencher]`
- [ ] **Validação de campos:** salvar nome de igreja vazio mostra erro, não grava string vazia. Resultado: `[preencher]`
- [ ] **Permissão:** líder e servo **não** veem a seção de igreja em configurações. Resultado: `[preencher]`
- [ ] **Página pública:** `/escala/[link]` mostra o nome da igreja dona da escala — e só o dela. Resultado: `[preencher]`
- [ ] **Tema claro e escuro:** seção nova e nome na sidebar legíveis nos dois (Constituição, item 4). Resultado: `[preencher]`

### 📱 Mobile

- [ ] **Layout:** campo de igreja no login não quebra em tela estreita. Resultado: `[preencher]`
- [ ] **Layout:** nome da igreja na sidebar não estoura nem empurra a navegação. Resultado: `[preencher]`
- [ ] **Toque:** o campo de igreja aceita digitação no celular sem autocorreção atrapalhar (sem capitalização automática). Resultado: `[preencher]`

---

## 📸 Evidências

Substituir pelos prints reais na hora da validação.

- **Isolamento (A não vê B):** `[colar print]`
- **Dois `joao` logando em igrejas diferentes:** `[colar print]`
- **Migração (contagens antes/depois):** `[colar saída do psql]`

---

## ✍️ Notas da implementação

**O harness que não verificava nada.** No next-auth v4 o `authorize` de topo do provider é um stub que devolve `null`; o real mora em `provider.options.authorize`. A primeira versão do `check-isolation.ts` chamava o de topo: todos os casos de recusa "passaram" e todos os de sucesso falharam. Um harness que recusa tudo parece verde se você só ler as linhas negativas. Se algum dia os resultados vierem divididos exatamente assim, é isto.

**`drizzle-kit generate` teria feito estrago.** O journal nunca foi aplicado (não existe `__drizzle_migrations` no banco) e o snapshot `0000` é anterior a `is_coordinator` e `visibility` — `generate` emitiria `ADD COLUMN` para colunas que já existem. E `push` não serve para adicionar `NOT NULL` em tabela populada. Por isso a migração é SQL escrito à mão em `drizzle/manual/001_multi_igreja.sql`, idempotente e dentro de uma transação.

**Três furos de autorização que não estavam no plano.** A Fase 3 procurava cláusulas `where` ausentes e achou outra coisa: funções que validam o objeto principal e deixam um segundo id passar direto do cliente. `createSchedule` validava o setor mas não o ministério; `createSwapRequest` não checava o `targetServantId`; `assignServant` validava a data mas não o `servantId`. Nos três, a correção foi a mesma regra que `saveAvailability` já usava — o servo tem que servir no setor daquela escala. A lição vale para a próxima spec: **cada id na assinatura veio do cliente, e validar um não valida os outros.**

**`leftJoin` que virou `innerJoin`.** Em `getSectors`, um setor órfão de ministério traria `church_id` nulo e escaparia do filtro de igreja. Com `innerJoin` ele simplesmente não aparece.

**Um predicado em vez de dois ramos.** Em `getSchedules`/`getCalendarSchedules`/`getServants` o ramo de admin era um `findMany()` sem `where` nenhum. Consertar os dois lados deixaria a versão sem filtro viva no arquivo, esperando a próxima edição distraída — daí `schedulesVisibleTo(scope)` e `servantsVisibleTo(scope)`, um predicado só que sempre inclui a igreja.

**O nome da igreja não virou quatro consultas.** Ele aparece em quatro componentes de cliente. Em vez de cada um chamar `getMyChurch()`, o layout do admin lê uma vez e distribui por `ChurchContext`. Não é cache: vem do servidor a cada render do layout, então `router.refresh()` depois do rename já traz o nome novo.

**Nenhuma action de igreja recebe id.** Não existe `getChurchById`. Como todo export de um módulo `"use server"` vira endpoint POST, um parâmetro de id ali seria mais uma superfície precisando de checagem de dono. Sem o parâmetro, não há o que checar.

**Quatro `handleCreate` sem `try/catch`.** Descoberto na Fase 5: em `ministries`, `sectors`, `servants` e `schedules`, um erro da action deixava o botão preso em "Cadastrando..." e não dizia nada. Ficou pior com esta spec, que introduziu o erro de e-mail pertencente a outra igreja. E `getOrCreateUser` podia estourar na constraint `users_email_unique` e entregar o texto cru do Postgres — agora checa antes e explica.
