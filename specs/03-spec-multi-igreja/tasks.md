# Plano Técnico - Multi-Igreja (Multi-Tenancy)

> [!IMPORTANT]
> Traduz [spec.md](./spec.md) em etapas concretas. Preencher **antes** de codificar.

## 🛠️ Arquitetura & Modelo de Dados

### Princípio que guia tudo

Hoje, autorização tem uma dimensão: **papel**. Admin não filtra nada (`undefined` como `where`), líder filtra por `leaderId`, coordenador por `sectorId`.

Depois desta feature são duas dimensões: **igreja** (barreira dura, vale para todo mundo) e **papel** (barreira interna, vale dentro da igreja). A regra prática:

> Onde o código hoje escreve `scope.role === "admin" ? undefined : <filtro>`, ele passa a escrever `scope.role === "admin" ? <filtro de igreja> : <filtro de igreja E filtro de papel>`.

**O `undefined` tem que sumir de toda cláusula de escopo.** São 7 pontos, listados na Fase 3.

### Onde `churchId` mora — e onde não mora

`churchId` fica **só** em `users` e `ministries`. As outras tabelas herdam por join:

```text
churches
 ├─ users        (church_id)  ← coluna real
 └─ ministries   (church_id)  ← coluna real
     └─ sectors            → igreja via ministry_id
         ├─ servants       → igreja via sector_id (e o user já tem church_id)
         └─ schedules      → igreja via ministry_id
             └─ schedule_dates
                 ├─ schedule_availability
                 ├─ schedule_assignments
                 └─ swap_requests
```

Espalhar `church_id` por todas as tabelas parece mais rápido de consultar, mas cria N fontes de verdade que podem divergir num update malfeito. Um join a mais é mais barato que um dado inconsistente. **Não denormalizar** (RNF01).

O ponto delicado é `servants`: é a única tabela que junta duas raízes — um `user` (que tem igreja) e um `sector` (que tem igreja por join). Nada no banco impede ligar um user da Igreja A a um setor da Igreja B. A checagem é obrigatória em código, em `addServantToSector` e `getOrCreateUser` (Fase 3).

### Alterações de Banco de Dados (Drizzle Schemas)

```typescript
// src/db/schema.ts

export const churches = pgTable("churches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // O "username da igreja": digitado no login, antes do usuário da pessoa.
  username: text("username").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// users: +church_id, e username deixa de ser único global
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  username: text("username"),                       // ← REMOVER .unique()
  email: text("email").unique(),                    // ← continua global (RNF04)
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "leader", "servant"] }).default("servant").notNull(),
  color: text("color"),
  churchId: integer("church_id").references(() => churches.id).notNull(),  // ← NOVO
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("users_church_username_idx").on(t.churchId, t.username),     // ← NOVO
]);

// ministries: +church_id
churchId: integer("church_id").references(() => churches.id).notNull(),

// relations: churches → users, churches → ministries; e a inversa nos dois.
```

> [!WARNING]
> `uniqueIndex` sobre `(church_id, username)` **não** impede vários `username = NULL` na mesma igreja — no Postgres, `NULL` nunca é igual a `NULL`. Isso é o comportamento desejado: admins e líderes têm `username` nulo e são identificados por e-mail.

### Novas Rotas & Endpoints

- **Frontend Routes:** nenhuma rota nova. `/admin/settings` ganha uma seção; `/login` ganha um campo.
- **Server Actions:** `src/lib/actions/church.ts` (novo) — `getMyChurch()` e `renameChurch(name)`. **Não** existe action pública listando igrejas: o username é digitado, não escolhido (RNF07).
- **Script de operação:** `src/db/create-church.ts` — cria igreja + primeiro admin. Único caminho para nascer uma igreja (RNF03).

---

## 📋 Lista de Tarefas (Checklist de Implementação)

Marque o progresso usando:
- `[ ]` para tarefas pendentes.
- `[/]` para tarefas em andamento.
- `[x]` para tarefas concluídas.

### Fase 0: Rede de proteção (fazer primeiro)

> [!CAUTION]
> `.env` aponta para o **Neon de produção**. Rodar `drizzle-kit push` distraído aqui é perda de dados real.

- [x] Confirmado: `.env` **aponta para o Neon de produção**. Nenhum comando de banco rodou sem `DATABASE_URL` explícito na linha de comando.
- [x] Postgres local já no ar (`scaleflow-db`, porta 5432).
- [x] **Desvio:** o `.env` **não** foi alterado. Há um `next dev` rodando contra produção; mexer no `.env` trocaria o banco do app do usuário embaixo dele. Em vez disso, todo comando passa `DATABASE_URL=postgresql://postgres:password@localhost:5432/scaleflow` inline, e `src/db/seed.ts` agora imprime o alvo (redigido) antes da primeira escrita.
- [x] **Desvio:** dump de produção **não** foi necessário. Uma inspeção só de leitura mostrou que o schema de produção é idêntico ao local, e o local já tinha fixture (6 users / 2 ministérios). Rodar a migração contra ele é ensaio válido. Estado de produção no momento da spec: 11 users (3 admin com e-mail e sem username, 8 servos todos com username), 1 ministério, 2 setores, 11 vínculos, 2 escalas, 24 datas, 35 disponibilidades, 22 escalações, 0 trocas.
- [x] `next dev` **está rodando** (PID 64131). Nenhum `npm run build` nem `rm -rf .next` foi executado.

### Fase 1: Fundação & Banco de Dados

- [x] Declarar `churches` em `src/db/schema.ts`, com as `relations` nos dois sentidos.
- [x] Adicionar `churchId` a `users` e `ministries`; remover o `.unique()` de `username` e criar o índice composto.
- [x] ~~Gerar a migração com `npx drizzle-kit generate`~~ — **desvio, e o mais importante da fase.** O `generate` seria pior que inútil aqui: os dois bancos vieram de `push`, não existe `drizzle.__drizzle_migrations`, e o snapshot em `drizzle/meta/` é anterior a `servants.is_coordinator` e `schedules.visibility`. Diffar contra esse snapshot emitiria `ADD COLUMN` para colunas que já existem, quebrando na aplicação. A migração foi **escrita à mão** em `drizzle/manual/001_multi_igreja.sql`, versionada e idempotente. O journal em `drizzle/` continua sendo ficção — corrigi-lo é assunto de outra spec.
- [x] SQL com o backfill intercalado na ordem certa:
  ```sql
  -- 1. tabela nova
  CREATE TABLE "churches" (...);

  -- 2. a igreja que herda tudo que já existe
  INSERT INTO "churches" ("name", "username") VALUES ('Igreja Padrão', 'padrao');

  -- 3. colunas NULLABLE por enquanto
  ALTER TABLE "users"      ADD COLUMN "church_id" integer;
  ALTER TABLE "ministries" ADD COLUMN "church_id" integer;

  -- 4. backfill
  UPDATE "users"      SET "church_id" = (SELECT id FROM churches WHERE username = 'padrao');
  UPDATE "ministries" SET "church_id" = (SELECT id FROM churches WHERE username = 'padrao');

  -- 5. só agora trancar
  ALTER TABLE "users"      ALTER COLUMN "church_id" SET NOT NULL;
  ALTER TABLE "ministries" ALTER COLUMN "church_id" SET NOT NULL;
  ALTER TABLE "users"      ADD CONSTRAINT "users_church_id_fk"      FOREIGN KEY ("church_id") REFERENCES "churches"("id");
  ALTER TABLE "ministries" ADD CONSTRAINT "ministries_church_id_fk" FOREIGN KEY ("church_id") REFERENCES "churches"("id");

  -- 6. trocar a unicidade de username
  ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_username_unique";
  CREATE UNIQUE INDEX "users_church_username_idx" ON "users" ("church_id", "username");
  ```
- [x] Migração aplicada no local. Contagens preservadas: 6 users e 2 ministérios antes e depois, 0 linhas com `church_id IS NULL`. Rodada duas vezes seguidas sem erro (idempotente).
- [x] Verificado no banco: `users_username_unique` (global) removida, `users_church_username_idx` `(church_id, username)` criada, `users_email_unique` mantida, FK para `churches` nas duas tabelas.
- [x] Criar `src/db/create-church.ts` — valida formato do username, exige senha de 8+ caracteres e recusa e-mail que já exista em outra igreja (RF05).
- [x] Atualizar `src/db/seed.ts`: igreja criada antes do admin e do ministério. `seedUser` passou a buscar username **escopado por igreja** e `seedSector` **escopado por ministério** — sem isso, o seed da segunda igreja encontraria os registros da primeira e não criaria nada.
- [x] Segunda igreja semeada ("Igreja Teste B"), com o **mesmo username** do servo da primeira, de propósito. Só roda em banco local: o seed detecta `neon.tech` e pula, porque as credenciais são fixas.
- [x] **Comportamento do índice validado no banco:** `cristian.barboza` existe nas duas igrejas ao mesmo tempo; inserir o mesmo username duas vezes na **mesma** igreja é rejeitado com `duplicate key value violates unique constraint "users_church_username_idx"`.

> [!NOTE]
> **Estado ao fim da Fase 1: o projeto não compila — e isso é o esperado.**
> `churchId` é `NOT NULL` sem default, então o TypeScript passa a recusar
> qualquer `insert` de usuário ou ministério que não diga a que igreja pertence.
> São exatamente 3 erros, e eles são a lista de trabalho das Fases 2 e 3:
>
> - `src/lib/scope.ts:190` — `getOrCreateUser`
> - `src/lib/actions/ministries.ts:13` — `createMinistry`
> - `src/lib/actions/account.ts:23` — `registerUser`
>
> Não silenciar com `as any` nem com default: é o compilador apontando os três
> lugares onde a decisão "de qual igreja é isto?" precisa ser tomada.

### Fase 2: Sessão & Escopo

- [x] `src/types/scope.ts`: `churchId: number` em `Scope`, documentado como barreira dura (vale inclusive para admin).
- [x] `src/types/next-auth.d.ts`: `churchId` no `Session["user"]`, no `User` e no `JWT`.
- [x] `src/lib/auth.ts`:
  - [x] `credentials` ganha o campo `church` (o username da igreja, digitado).
  - [x] `authorize`: e-mail continua global; usuário passa a resolver a igreja pelo username informado e depois buscar `and(username, churchId)`. Normaliza `trim().toLowerCase()`. Todos os fracassos devolvem `null` sem distinguir o motivo (RNF07).
  - [x] Callbacks `jwt` e `session` carimbam `churchId`.
- [x] `src/lib/scope.ts` — `getScope()` devolve `churchId` da sessão.
- [x] `src/lib/scope.ts` — `requireAdmin()` agora **retorna o `Scope`**.
- [x] `src/lib/scope.ts` — nos quatro `requireXAccess`, o bypass `if (role === "admin") return;` passou a ser precedido por uma checagem de igreja que vale para **todos** os papéis. Dois helpers privados novos, `churchOfMinistry()` e `churchOfSector()`, para a checagem não ser reescrita em cada função.
  - [x] `requireMinistryAccess`
  - [x] `requireSectorAccess`
  - [x] `requireScheduleSectorAccess`
  - [x] `requireServantAccess` — a igreja vem do **usuário-alvo**, não do vínculo de servo: quem foi criado e ainda não tem setor também precisa estar protegido.
- [x] `getOrCreateUser()`: recebe `churchId`, busca username escopado por igreja, e lança erro explícito ao encontrar um e-mail que pertence a outra igreja (RF05).
- [x] **Antecipado da Fase 3** para o projeto voltar a compilar: `registerUser`, `createMinistry`, `updateMinistry` e `createServant` passaram a propagar `churchId`. O `updateMinistry` já leva `churchId` no `where`. A blindagem restante dessas actions continua na Fase 3.
- [x] **Verificação:** `src/db/check-isolation.ts` (novo) exercita o `authorize()` real contra as duas igrejas — 9/9 casos, incluindo os dois cruzamentos de senha entre igrejas. `tsc` limpo, lint no baseline.

### Fase 3: Filtros nas Actions

Os 7 pontos onde o `undefined` precisa sumir (RNF05):

- [x] `getMinistries` — igreja nos dois ramos.
- [x] `getMinistryById` — checa `churchId` antes da checagem de papel.
- [x] `getSectors` — e o `leftJoin` virou `innerJoin`: com left, um setor órfão de ministério traria `church_id` nulo e escaparia do filtro.
- [x] `getSectorById` — igreja entrou no `where`, não numa checagem depois.
- [x] `getSchedules` e `getCalendarSchedules` — os dois ramos colapsados no predicado único `schedulesVisibleTo(scope)`.
- [x] `getServants` — idem, via `servantsVisibleTo(scope)`.

> **Por que colapsar os ramos em vez de consertar cada um.** Nesses três casos o ramo de admin era um `findMany()` **sem `where` nenhum**. Consertar os dois lados deixa a versão "sem filtro" viva no arquivo, esperando a próxima edição distraída. Com um predicado só, não existe caminho que não passe pela igreja.

E as mutações:

- [x] `createMinistry` / `updateMinistry` — gravam `churchId`; o update leva a igreja no `where`, então um id de outra igreja não casa com linha nenhuma.
- [x] `createSector` — coberto por `requireMinistryAccess`, reforçado na Fase 2. Confirmado lendo.
- [x] `createServant` / `addServantToSector` — cobertos: `requireServantAccess` valida a igreja do usuário e `requireSectorAccess` a do setor, **ambos contra a sessão**. Se os dois passam, é a mesma igreja. Confirmado lendo, sem código novo.
- [x] `createSchedule` — **furo real encontrado**: `ministryId` e `sectorId` chegam soltos, dava para casar um setor da própria igreja com o ministério de outra. Passou a exigir que o setor pertença ao ministério informado.
- [x] `resetServantPassword` / `deleteServantAccount` / `setServantCoordinator` / `removeServantFromSector` — todos por `requireServantAccess`. Confirmado lendo.
- [x] `registerUser` — o novo admin nasce na igreja de quem o criou.
- [x] `createSwapRequest` — **segundo furo**: `targetServantId` vinha do cliente sem checagem alguma. Agora exige que requester e target sirvam no setor da escala daquela data, o que cobre de uma vez o caso absurdo (trocar com outro setor) e o perigoso (trocar com outra igreja).
- [x] `assignServant` (`availability.ts`) — **terceiro furo**, do mesmo formato: `requireScheduleSectorAccess` cobria a data, mas `servantId` passava livre. Mesma regra que `saveAvailability` já aplicava.
- [x] `saveAvailability` — já exigia `schedule.sectorId === servant.sectorId`, que implica mesma igreja. Nada a fazer; é o caminho público e já estava certo.
- [x] `getServantOverview`, `getCoordinatorSectors`, `getCoordinatorSchedules` — partem do `userId` da sessão e herdam o isolamento. Confirmado lendo.
- [x] `src/app/admin/page.tsx` — as 7 consultas ganharam `innerJoin ministries` e filtro de igreja, via um helper `scoped()` local. O `session` agora é validado com `redirect()` em vez de `session?.`/`session!`.
- [x] **Critério 4 verificado:** `grep -rn "? undefined" src/lib/actions/ src/app/admin/ src/lib/scope.ts` → nenhuma ocorrência.
- [x] `check-isolation.ts` ganhou 11 invariantes de banco (FK, nulos, unicidade, vínculos e escalas cruzando igrejas). **20/20 casos.** `tsc` limpo, lint no baseline.

> [!IMPORTANT]
> **O que a Fase 3 NÃO verificou.** Os critérios 2 e 3 (admin da Igreja A não enxerga dados de B nas listagens, e actions recusam IDs de outra igreja) continuam sem cobertura automatizada: as server actions chamam `getServerSession()`, que exige contexto de requisição e não existe num script. O código está escrito para isolar, e o `check-isolation.ts` prova que o banco sustenta a separação — mas a prova de ponta a ponta é manual, com dois logins no navegador, e ainda não foi feita.

### Fase 4: Interface

- [x] `src/lib/actions/church.ts`: `getMyChurch()` e `renameChurch(name)`. **Nenhuma das duas recebe id** — a igreja sai sempre da sessão. O que não é parâmetro não pode ser forjado, e isso dispensa a checagem de dono que um `getChurchById` exigiria.
- [x] `src/components/settings/ChurchSection.tsx`: nome editável + o username exibido como leitura. `renameChurch` altera só o `name`: o username é o que os servos digitam no login, e trocá-lo derrubaria o acesso de todos de uma vez.
- [x] Encaixa em `/admin/settings` sob `role === "admin"`. **Não entra no `SettingsModal` do servo** — o servo não edita a igreja, e o modal vive fora do layout do admin, então nem alcançaria o contexto.
- [x] `AdminSidebar`: nome discreto abaixo da marca. O respiro de 2.5rem do bloco do logo passou para depois do nome (o nome pertence ao bloco de identidade); recolhido, o nome some e o valor antigo continua valendo.
- [x] `/admin` (`page.tsx`): nome da igreja no subtítulo. Substituiu o "Bem-vindo de volta!" — o subtítulo passa a dizer de quem são os números, em vez de nada.
- [x] `/login`: campo de texto "Igreja", só no modo Servo, `autoCapitalize="none"`/`autoCorrect="off"`/`spellCheck={false}`, `trim().toLowerCase()` no envio (o servidor normaliza de novo). Lê `?igreja=`. Erro único "Igreja, usuário ou senha inválidos."
- [x] `/escala/[link]`: sobrelinha em maiúsculas acima do nome da escala, via `ministry.church` com `columns: { name: true }` — a página é pública, então só o nome atravessa.
- [x] Textos fixos "da sua igreja" trocados pelo nome real em `admin/ministries` e `admin/servants`.

**Desvio do plano:** o nome da igreja aparece em quatro componentes de cliente. Em vez de cada um chamar `getMyChurch()` — quatro consultas para exibir a mesma palavra, e quatro chances de ficarem dessincronizadas após um rename — o layout do admin lê uma vez e distribui por `src/components/ChurchContext.tsx`. Não é cache: o valor vem do servidor a cada render do layout, então `router.refresh()` depois de salvar já traz o nome novo. `useChurch()` lança fora do provider, para que um consumidor montado no lugar errado falhe na hora em vez de renderizar vazio.

> [!IMPORTANT]
> **O que a Fase 4 NÃO verificou.** Nada da interface foi aberto no navegador. Há um `next dev` rodando contra a produção, e subir um segundo servidor no mesmo diretório escreveria no mesmo `.next` — a corrupção de cache do Turbopack que já derrubou o app antes. `tsc` limpo e lint no baseline provam que compila, não que a tela renderiza: o rename, o `router.refresh()` da barra lateral, o campo de igreja no login e a sobrelinha em `/escala/[link]` continuam por conferir a olho.

### Fase 5: Polimento & Fechamento

- [x] Mensagens de erro legíveis. **O item era maior do que parecia:** os quatro `handleCreate` do admin (`ministries`, `sectors`, `servants`, `schedules`) não tinham `try/catch` nenhum — um erro da action deixava o botão preso em "Cadastrando..." sem dizer nada, e esta spec acabou de introduzir um erro novo (e-mail de outra igreja) que cairia exatamente ali. Todos ganharam `try/catch/finally` com `showToast`. Além disso, `getOrCreateUser` podia estourar na constraint `users_email_unique` e entregar texto cru do Postgres; agora checa antes e explica.
- [x] As mensagens de cruzamento existentes ("Não autorizado a gerenciar este ministério" etc.) ficaram como estão, de propósito: dizer "isso é de outra igreja" confirmaria a existência do recurso a quem chutou um id.
- [x] Responsividade: o campo de igreja usa o mesmo `Field`/`.input` dos demais, sem largura própria; o identificador em `/admin/settings` ganhou `break-all`. **Conferido no código, não no navegador** — ver a ressalva abaixo.
- [x] `npx tsc --noEmit` limpo (exit 0) e `npm run lint` nos 3 warnings de baseline.
- [x] [validation.md](./validation.md) preenchido: resultados automatizados reais, notas de implementação, e um bloco marcando explicitamente que as seções manuais **não** foram executadas.
- [x] `CLAUDE.md` atualizado: `getAuthFilter()`/`src/lib/actions.ts` não existem mais desde a spec 02. A seção agora descreve `src/lib/actions/` por domínio e as duas dimensões de autorização (igreja como barreira dura, papel por cima), o login por igreja+usuário, e o aviso de que todo id da assinatura vem do cliente.
- [x] **Migração aplicada no Neon de produção em 23/08/2026.** Backup completo antes (`pg_dump` 17 — o local é 15 e o Neon roda 17; `backups/` entrou no `.gitignore` porque o dump tem hashes de senha e e-mails reais). Pré-voo somente-leitura confirmou zero usernames duplicados, o único bloqueio possível: o índice novo é `(church_id, username)` e o backfill põe todo mundo na mesma igreja, então dois usernames iguais hoje virariam colisão. Contagens preservadas, `church_id NOT NULL` nas duas tabelas, sem FK órfã, constraint global removida, índice por igreja no lugar.
- [x] Dois scripts novos, que sobrevivem à spec: `src/db/preflight-multi-igreja.ts` (somente leitura; serve antes e depois, detecta sozinho em que estado o banco está) e `src/db/apply-migration.ts` (aplica qualquer `.sql` de `drizzle/manual/` e **falha se alguma contagem mudar** — uma migração sobre dado precisa provar que não perdeu linha, não só que não deu erro).

---

## 📊 Superfície da mudança

| Área | Arquivos | Observação |
| :--- | :--- | :--- |
| Banco | `schema.ts`, `seed.ts`, `create-church.ts`, `/drizzle/*.sql` | SQL de migração editado à mão |
| Sessão | `auth.ts`, `scope.ts`, `types/scope.ts`, `types/next-auth.d.ts` | Onde mora o risco de segurança |
| Actions | os 8 de `src/lib/actions/` + o novo `church.ts` | 7 filtros + as mutações |
| Telas | `admin/page.tsx`, `admin/settings`, `AdminSidebar`, `login`, `escala/[link]` | A parte visível é a menor |

**~22 arquivos.** A tela nova é o pedaço pequeno; o volume está em Sessão + Actions, e é lá que um filtro esquecido vira vazamento silencioso entre igrejas.

## 🔭 Fora de escopo (fica para depois)

- Painel de plataforma para gerenciar igrejas por tela (RNF03 — hoje é script).
- Logo, endereço, telefone e fuso horário da igreja — decidido "só o nome" nesta rodada.
- Uma mesma pessoa participar de duas igrejas com o mesmo e-mail (RNF04 impede).
- Subdomínio por igreja (`igreja.scaleflow.app`) em vez do campo no login.
