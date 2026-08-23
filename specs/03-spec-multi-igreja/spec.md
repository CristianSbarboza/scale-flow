# 03 - Multi-Igreja (Multi-Tenancy)

> [!NOTE]
> Este arquivo define o "O Quê" e o "Por Quê". O plano técnico está em [tasks.md](./tasks.md).

## 📝 Descrição Geral

Hoje o ScaleFlow é **single-tenant**: uma instalação atende uma igreja, e essa igreja não existe como dado. A palavra "igreja" aparece só como texto fixo nos subtítulos ("os voluntários da sua igreja") e como o ícone `Church` do lucide, que na verdade representa *Ministérios*. Não há tabela, campo nem tela.

Esta feature introduz a entidade **Igreja** como o topo da hierarquia (`igreja → ministérios → setores → servos`) e transforma o app em **multi-tenant**: várias igrejas convivem no mesmo banco, sem nunca enxergar os dados uma da outra.

O impacto principal não é a tela nova — é a **mudança no modelo de autorização**. Hoje `role === "admin"` significa "vê tudo, sem filtro" (7 pontos no código usam literalmente `undefined` como cláusula `where`). Depois desta feature, admin passa a significar "vê tudo **da própria igreja**". Nenhum papel dentro do app enxerga mais de uma igreja.

## 👥 Personas Envolvidas

- **Operador da plataforma** (fora do app): provisiona igrejas por script. Não tem tela nem login especial — ver RNF03.
- **Administrador**: manda em tudo dentro da própria igreja. Renomeia a igreja, cria ministérios, admins, líderes e servos.
- **Líder**: continua restrito ao próprio ministério, agora necessariamente dentro da própria igreja.
- **Servo / Coordenador**: sem mudança de comportamento, exceto no login (ver RF04).
- **Visitante** (link público de escala): sem login; vê o nome da igreja dona da escala.

## 🎯 Requisitos Funcionais (User Stories)

- [ ] **RF01 - Igreja como entidade:** Como operador, eu quero cadastrar uma igreja com nome e username para que ela seja o contêiner de todos os dados daquela comunidade.
- [ ] **RF02 - Isolamento total:** Como administrador da Igreja A, eu quero que seja **impossível** ler ou alterar qualquer dado da Igreja B — ministério, setor, servo, escala, disponibilidade ou troca — mesmo forçando IDs na mão numa server action.
- [ ] **RF03 - Nome visível:** Como administrador, eu quero ver o nome da minha igreja na interface (sidebar e cabeçalho do painel) e poder editá-lo em `/admin/settings`, para confirmar em qual igreja estou operando.
- [ ] **RF04 - Login de servo com o username da igreja:** Como servo, eu quero informar o username da minha igreja no login para que o meu usuário não precise ser único no mundo inteiro — só dentro da minha igreja.
- [ ] **RF05 - Vínculo de usuário travado:** Como administrador, ao cadastrar um servo cujo e-mail/usuário já existe em outra igreja, eu quero receber um erro claro em vez de sequestrar a conta alheia.
- [ ] **RF06 - Link público identificado:** Como visitante de `/escala/[link]`, eu quero ver de qual igreja é a escala que estou respondendo.

## 🚫 Requisitos Não-Funcionais & Restrições

- [ ] **RNF01 - `churchId` NOT NULL:** Toda linha de `users` e `ministries` pertence a exatamente uma igreja. Sem nulo, sem "sem igreja", sem registro órfão. As demais tabelas herdam a igreja por join (`sectors → ministries`, `schedules → ministries`, `servants → sectors`) — não duplicar `churchId` nelas, para não existirem duas fontes de verdade que possam divergir.
- [ ] **RNF02 - Migração sem perder dados:** O banco de produção (Neon) já tem dados reais. A migração cria uma igreja padrão, faz backfill de todas as linhas existentes e só então aplica o `NOT NULL`. Ver a advertência sobre `drizzle-kit push` em [tasks.md](./tasks.md).
- [ ] **RNF03 - Sem "superadmin" no app:** Não haverá papel que enxergue várias igrejas. Criar igreja é ato de operação, feito por script (`npx tsx src/db/create-church.ts`), não por tela. Motivo: um papel god-mode seria o único caminho capaz de vazar dados entre igrejas, e não construí-lo elimina a classe inteira de falha. Se um dia houver painel de plataforma, ele será uma spec própria, com seu próprio modelo de acesso.
- [ ] **RNF04 - Unicidade por igreja:** `users.username` deixa de ser único globalmente e passa a ser único **por igreja** (`UNIQUE (church_id, username)`). `users.email` **continua único globalmente** — é o identificador de admin/líder e, sendo e-mail real, já é único por natureza. Consequência aceita: uma mesma pessoa não pode ser líder em duas igrejas com o mesmo e-mail.

  A igreja é o namespace, e é isso que preserva a intuição de que username é identidade, não apelido descartável: com `batista-central` na frente, a Maria continua sendo `maria` — não precisa virar `maria47` porque outra igreja, que ela nem sabe que existe, chegou primeiro. Quem se repete entre igrejas é o texto; a pessoa continua tendo um `churchId` só.

- [ ] **RNF07 - Login não revela quais igrejas existem:** o username da igreja é **digitado**, não escolhido numa lista — uma lista pública entregaria a relação de todos os clientes a qualquer visitante do `/login`, e ficaria inusável passando de algumas dezenas de igrejas. Pelo mesmo motivo, o erro é único ("Igreja, usuário ou senha inválidos"): distinguir "igreja não encontrada" de "senha errada" transformaria a tela de login num verificador de quais igrejas existem. Para não custar memorização, `/login?igreja=<username>` pré-preenche o campo, e é esse link que o admin distribui.
- [ ] **RNF05 - Falha fechada:** Onde hoje o código faz `scope.role === "admin" ? undefined : <filtro>`, o `undefined` deve sumir. Consulta sem cláusula de igreja é bug de segurança, não otimização.
- [ ] **RNF06 - Design System:** A seção de igreja em `/admin/settings` usa `SettingsSection` e os componentes de `src/components/ui/`, conforme a [Constituição](../constitution.md). Nada de utilitário de cor cru.

## 🏆 Critérios de Aceitação (Definition of Done)

1. [ ] Existe a tabela `churches`, e `users.church_id` / `ministries.church_id` são `NOT NULL` com FK.
2. [ ] O banco local tem **duas** igrejas semeadas com dados distintos, e logar como admin da Igreja A não revela nenhum registro da Igreja B em nenhuma das 4 listas do admin, no calendário nem no dashboard.
3. [ ] Chamar uma server action da Igreja A passando na mão um ID pertencente à Igreja B retorna erro de autorização — testado explicitamente para ministério, setor, servo e escala.
4. [ ] `grep -rn "? undefined" src/lib/actions/` não retorna nenhuma cláusula `where` de escopo.
5. [ ] O nome da igreja aparece na sidebar do admin, no cabeçalho do painel e na página pública `/escala/[link]`.
6. [ ] Admin renomeia a própria igreja em `/admin/settings` e o novo nome aparece nas telas após revalidação.
7. [ ] Dois servos em igrejas diferentes com o **mesmo** usuário conseguem logar, cada um caindo na própria igreja.
8. [ ] Cadastrar servo com usuário já existente **na mesma igreja** dá erro claro; o mesmo usuário em **outra** igreja é permitido.
9. [ ] `npx tsc --noEmit` limpo e `npm run lint` no baseline de 3 warnings.
10. [ ] A migração roda sobre uma cópia do dump de produção sem perder linha nem quebrar FK.

## 🎨 Interface & UX

- **Nome da igreja (admin):** linha discreta acima do bloco de navegação na `AdminSidebar`, em `text-muted-foreground`, tamanho menor que o logo. Não compete com a marca ScaleFlow.
- **Cabeçalho do painel:** o `PageHeader` de `/admin` já monta `Painel Administrativo — {ministério}` para líder. O nome da igreja entra no **subtítulo**, não no título, para não criar um título de três níveis.
- **Campo de igreja no login:** campo de **texto** (não lista), visível **somente** quando o `SegmentedControl` está em "Servo" — admin/líder logam por e-mail e não informam igreja. Ordem: Igreja → Usuário → Senha. Rótulo "Igreja", placeholder com um exemplo de username. Aceita espaço em volta e maiúscula, normalizando na entrada.
- **Página pública:** nome da igreja acima do nome da escala, como sobrelinha (`text-sm text-muted-foreground`).
- **Link de convite:** `/login?igreja=<username>` chega com o campo preenchido, para o servo não precisar decorar nada. É o link que o admin distribui; quem cai no `/login` seco digita.

## ⚠️ Riscos Conhecidos

| Risco | Mitigação |
| :--- | :--- |
| Um filtro esquecido vaza dados entre igrejas, silenciosamente e sem erro. | Critério de aceitação 2 e 3 testam isso de fora; critério 4 varre o padrão no código. O isolamento é verificado com **duas** igrejas semeadas, nunca com uma. |
| `drizzle-kit push` tenta aplicar `NOT NULL` sobre linhas existentes e falha (ou pior, num banco vazio passa e só quebra em produção). | Usar `drizzle-kit generate` e editar o SQL à mão para intercalar o backfill. Ver Fase 1 de [tasks.md](./tasks.md). |
| `.env` aponta para o Neon de **produção**. Rodar a migração sem querer contra ele. | Toda a Fase 1 é feita contra o Postgres local do `docker-compose`. Conferir `echo $DATABASE_URL` antes de cada comando de banco. |
| Troca de escala (`swapRequests`) liga dois servos sem passar por ministério; um pedido entre igrejas passaria despercebido. | `createSwapRequest` valida que os dois servos caem na mesma igreja, além do mesmo setor. |
| O link público é um nanoid global — não filtra por igreja. | Isso é **correto** e intencional: o link é a própria credencial. Só não pode vazar o nome de outra igreja junto. |
