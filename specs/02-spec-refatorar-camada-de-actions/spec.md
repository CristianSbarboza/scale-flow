# 02 - Refatorar a Camada de Server Actions

## 📝 Descrição Geral

`src/lib/actions.ts` tem 1046 linhas, 33 server actions exportadas, 11 interfaces e 11 helpers internos num arquivo único. Ele concentra autorização, consulta, mutação e definição de tipos de todos os domínios do produto.

O problema não é estético. Segundo a documentação do Next.js 16 (`node_modules/next/dist/docs/01-app/02-guides/data-security.md:272`), toda server action exportada é alcançável por requisição POST direta, mesmo que nenhum componente a importe. O arquivo não é um módulo de funções auxiliares — são **33 endpoints públicos**, e a autorização de cada um está espalhada por três mecanismos diferentes e inconsistentes:

1. **Filtro de leitura** — `getAuthFilter()` (`actions.ts:23`) conhece dois papéis: `admin` e "resto". Devolve `null` para admin, e `null` significa "sem filtro".
2. **Guards de escrita** — `requireScheduleSectorAccess()` (`actions.ts:40`) conhece três: admin, líder do ministério e coordenador do setor.
3. **Caminhos de leitura dedicados** — `getCoordinatorSectors` / `getCoordinatorSchedules` (`actions.ts:617-643`) existem porque o mecanismo 1 não consegue expressar "coordenador".

A consequência mais grave está no mecanismo 1: o valor que representa "acesso irrestrito" é o mesmo que uma função esqueceria de tratar. **O default é falhar aberto.**

Esta refatoração reorganiza a camada em três responsabilidades separadas e unifica a autorização num único módulo, **sem alterar comportamento observável**. Ela é pré-requisito da spec seguinte (multi-tenancy e painel de super admin): escopar 33 actions à mão é 33 oportunidades de vazar dados entre igrejas; escopar um `scope.ts` centralizado é uma.

## 👥 Personas Envolvidas

Nenhuma persona de usuário final é afetada. Esta é uma refatoração interna, e ausência de mudança perceptível é o critério de sucesso. As personas técnicas envolvidas são quem mantém o código — pessoa desenvolvedora e agentes de IA.

## 🎯 Requisitos Funcionais

- [ ] **RF01 - Tipos fora das actions:** As 11 interfaces exportadas de `actions.ts` movem para `src/types/domain.ts`, conforme a [Constituição](../constitution.md) (`/src/types/` para tipos globais).
- [ ] **RF02 - Autorização centralizada:** Um módulo `src/lib/scope.ts` marcado com `import 'server-only'` passa a ser a fonte única de "o que esta sessão alcança". Absorve `getAuthFilter`, os cinco guards `require*`, os três resolvedores `getSectorIdFor*` e a projeção `publicUser`.
- [ ] **RF03 - Actions por domínio:** `actions.ts` é substituído por `src/lib/actions/`, um arquivo `"use server"` por domínio, nenhum passando de ~200 linhas.
- [ ] **RF04 - Falhar fechado:** `getAuthFilter()` deixa de existir na forma atual. O escopo passa a ser um objeto explícito, sem valor que signifique "irrestrito por omissão". Um papel não previsto resulta em erro, não em acesso total.
- [ ] **RF05 - Coordenador deixa de ser exceção:** A regra de coordenação de setor passa a viver em `scope.ts`, consumida tanto por leitura quanto por escrita. `getCoordinatorSectors` e `getCoordinatorSchedules` permanecem exportadas — são usadas por `CoordinatorSchedulePanel` — mas param de ser um caminho de autorização paralelo.
- [ ] **RF06 - Imports explícitos:** Os 22 arquivos que importam de `@/lib/actions` passam a importar do módulo de domínio correspondente. Nenhum arquivo barrel é criado.

## 🚫 Requisitos Não-Funcionais & Restrições

- [ ] **RNF01 - Comportamento preservado:** Nenhuma mudança observável de comportamento. Mesmas assinaturas públicas, mesmos retornos, mesmas mensagens de erro, mesmas chamadas de `revalidatePath`. Toda diferença observada é bug de refatoração.
- [ ] **RNF02 - Sem mistura de movimentação e lógica:** Mover código e alterar lógica não acontecem no mesmo commit. Consolidar autorização em `scope.ts` é um passo separado e revisável dos passos de movimentação.
- [ ] **RNF03 - Sem novas features:** Multi-tenancy, super admin, mudanças de política de autorização e qualquer campo novo ficam fora. Vão para a spec 03.
- [ ] **RNF04 - Segurança preservada:** As proteções atuais permanecem intactas — projeção `publicUser` omitindo o hash de senha em toda query cujo resultado chega ao cliente, validações de `saveAvailability`, guards de ministério/setor/escala, e `requireAdmin` em `registerUser`.
- [ ] **RNF05 - `server-only` no módulo de escopo:** `src/lib/scope.ts` importa `server-only`, para que importá-lo do cliente falhe no build em vez de silenciosamente vazar lógica de autorização.
- [ ] **RNF06 - Sem ciclos de import:** Módulos de action não importam uns dos outros. Lógica compartilhada entre domínios desce para `scope.ts` ou para um helper não-action.
- [ ] **RNF07 - Action não chama action:** Hoje `getCoordinatorSchedules` chama `getCoordinatorSectors` (`actions.ts:636`), que é um endpoint público. Após a refatoração, chamadas internas passam por helper compartilhado, não pelo endpoint.

## 🏗️ Estrutura Alvo

```
src/types/domain.ts               11 interfaces: ServantMembership, ServantSummary,
                                  ServantOverviewAssignee, ServantOverviewDate,
                                  ServantOverviewSchedule, CoordinatorSector,
                                  CoordinatorSchedule, CalendarAssignee, CalendarDate,
                                  CalendarSchedule, PendingSwapRequest

src/lib/scope.ts                  'server-only'. Fonte única de autorização:
                                  escopo da sessão, guards de papel/recurso,
                                  resolvedores de setor, projeção publicUser,
                                  e o upsert getOrCreateUser

src/lib/actions/
  ministries.ts     (4 actions)   createMinistry, updateMinistry, getMinistries,
                                  getMinistryById
  sectors.ts        (3)           createSector, getSectors, getSectorById
  servants.ts       (8)           createServant, getServants, getServantMember,
                                  addServantToSector, removeServantFromSector,
                                  setServantCoordinator, deleteServantAccount,
                                  resetServantPassword
  schedules.ts      (6)           createSchedule, updateSchedule, deleteSchedule,
                                  getSchedules, getScheduleResponses,
                                  getCalendarSchedules
  availability.ts   (4)           saveAvailability, assignServant, removeAssignment,
                                  getServantOverview
  swaps.ts          (3)           createSwapRequest, getPendingSwapRequests,
                                  respondToSwapRequest
  account.ts        (3)           registerUser, changeOwnPassword, updateOwnColor
  coordinator.ts    (2)           getCoordinatorSectors, getCoordinatorSchedules
```

Total: 33 actions, igual a hoje. `src/lib/actions.ts` é removido ao final.

### O contrato de escopo

`getAuthFilter()` devolve hoje `string | null`, onde `null` quer dizer irrestrito. O substituto é explícito:

```typescript
type Scope = {
  userId: string;
  role: "admin" | "leader" | "servant";
  /** Ministérios que o usuário lidera. Vazio se não lidera nenhum. */
  ledMinistryIds: number[];
  /** Setores onde o usuário é coordenador. Vazio se não coordena nenhum. */
  coordinatedSectorIds: number[];
};
```

As três dimensões de acesso são **independentes, não alternativas** — e é isso que o código atual não expressa. Em `actions.ts:53`, a checagem de coordenação roda para qualquer papel não-admin: um líder pode coordenar um setor de outro ministério, e um servo coordena alguns setores enquanto apenas serve em outros. Modelar isso como variantes mutuamente exclusivas reintroduziria o mesmo problema por outro caminho.

Não há campo que signifique "veja tudo por omissão". O acesso total de admin passa a ser uma checagem deliberada de `role === "admin"` no ponto de uso, não a ausência de filtro. Na spec 03, `tenantId` entra como campo obrigatório desse objeto, e é isso que torna a tenancy uma mudança local em vez de 33 edições.

## 🏆 Critérios de Aceitação (Definition of Done)

1. [ ] `src/lib/actions.ts` não existe mais; `src/lib/actions/` tem os 8 módulos, nenhum acima de ~200 linhas.
2. [ ] As 33 actions continuam exportadas, com as mesmas assinaturas de hoje.
3. [ ] As 11 interfaces vivem em `src/types/domain.ts` e nenhum módulo `"use server"` exporta tipo.
4. [ ] `src/lib/scope.ts` começa com `import 'server-only'` e é o único lugar que decide autorização.
5. [ ] Nenhuma função devolve valor que signifique "acesso irrestrito por omissão".
6. [ ] Nenhum módulo de action importa outro módulo de action.
7. [ ] Os 22 arquivos consumidores importam do módulo de domínio; nenhum barrel existe.
8. [ ] `npx tsc --noEmit` limpo.
9. [ ] `npm run lint` sem erros novos (a base tem 3 warnings pré-existentes em `drizzle/schema.ts` e `src/types/next-auth.d.ts`).
10. [ ] `npm run build` conclui e gera as mesmas rotas de antes.
11. [ ] **Verificação manual por papel** — cada papel executa seu fluxo principal e o resultado é idêntico ao de antes: admin (ministérios, setores, servos, escalas, calendário, settings), líder (escopo restrito aos próprios ministérios), coordenador (escalas dos setores que coordena), servo (painel, disponibilidade, troca).
12. [ ] O link público de escala continua funcionando nos dois modos, `public` e `private`.
13. [ ] Nenhuma resposta de action carrega `users.password`.

## 🎨 Interface & UX

Nenhuma alteração visual. Nenhum componente sob `src/components/` muda, exceto as linhas de `import`.

## ⚠️ Riscos

- **Refatoração sem rede de testes.** O repositório não tem suíte de testes, então a verificação é `tsc` + `lint` + `build` + o checklist manual do critério 11. Mitigação: manter movimentação e lógica em commits separados (RNF02), de forma que um commit de movimentação puro possa ser conferido por diff — se o conteúdo de uma função mudou num commit de movimentação, é erro.
- **Consolidar autorização é a parte que pode mudar comportamento.** Unificar três mecanismos num só pode inadvertidamente conceder ou negar acesso que hoje existe — particularmente ao coordenador, cujas regras hoje diferem entre leitura e escrita. Mitigação: esse passo vai isolado, e o critério 11 exercita explicitamente o papel de coordenador.
- **Escopo crescer para dentro da spec 03.** Ao tocar todas as actions, a tentação de "já escopar por tenant enquanto estou aqui" é alta. RNF03 existe para barrar isso: a tenancy tem spec própria e verificação própria com dois assinantes povoados.
