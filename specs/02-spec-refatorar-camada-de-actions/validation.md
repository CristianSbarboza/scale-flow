# Plano de Validação & Testes - Refatorar a Camada de Server Actions

> [!NOTE]
> Refatoração sem rede de testes: o repositório não tem framework de teste, e a
> spec proíbe introduzir um (RNF03). A verificação foi montada com três provas
> mecânicas que cobrem os modos de falha reais de um refactor de movimentação,
> mais um harness de comportamento por papel que roda os dois mundos — antes e
> depois — contra o mesmo banco.

## 🧪 Testes Automatizados

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | Passou, sem saída, ao fim de cada tarefa |
| `npm run lint` | Passou — 3 warnings, os mesmos pré-existentes em `drizzle/schema.ts` e `src/types/next-auth.d.ts` |
| `npm run build` | Passou — as mesmas 17 rotas do baseline |

### Prova 1 — Superfície pública inalterada

Script `check-surface.sh`, criado na Tarefa 1 e executado ao fim de cada tarefa
seguinte. Compara os nomes das actions exportadas com um baseline de 33 nomes
capturado antes da primeira linha ser movida.

```
OK: superficie identica (33 actions)
```

### Prova 2 — Movimentação byte a byte (RNF02)

Comparação automática de cada função top-level entre `src/lib/actions.ts` no
commit `1d5d640` e sua nova casa em `src/lib/actions/*.ts` / `src/lib/scope.ts`:

```
funcoes no original: 43
identicas apos mover: 43
ausentes: []
ALTERADAS: []
publicUser identico: True
```

As 43 são as 33 actions mais os 10 helpers. A única diferença aceita pelo
comparador é o prefixo `export ` adicionado aos helpers ao saírem do escopo do
módulo. Nenhum corpo mudou.

### Prova 3 — Comportamento idêntico por papel (RNF01)

Harness montado contra o Postgres **local** (`docker-compose`), nunca contra o
Neon de produção apontado pelo `.env`. Fixture com dois ministérios de líderes
diferentes, para que escopo vazado apareça como dado do outro líder:

- `admin@verify.test` — admin
- `alfa@verify.test` — líder do Ministério ALFA (setores A-UM, A-DOIS)
- `beta@verify.test` — líder do Ministério BETA (setor B-UM) **e** coordenador
  de A-DOIS, que é de ALFA — o caso cruzado que o `Scope` precisa expressar
- `coord` — servo, coordenador de A-UM e servo comum em A-DOIS
- `servo` — servo comum em A-UM, com um pedido de troca pendente
- anônimo

O `actions.ts` original (`c9e1343`) foi restaurado lado a lado com os módulos
novos, e as 17 leituras mais 4 guards foram executadas nos dois mundos, na mesma
requisição HTTP e com a mesma sessão, para cada papel:

```
admin: IDENTICO
alfa:  IDENTICO
beta:  IDENTICO
coord: IDENTICO
servo: IDENTICO
anon:  IDENTICO
=> RNF01 confirmado: comportamento observavel identico nos 6 papeis
```

O mesmo diff foi repetido depois da Tarefa 10 (que substituiu `getAuthFilter`
pelo `Scope`) e depois da Tarefa 11 (que reescreveu `coordinator.ts`), sempre
contra o mesmo baseline pré-refatoração: **idêntico nas três rodadas**. Além
disso, o HTML renderizado das 26 páginas server-side — incluindo `/servant`, que
a Tarefa 11 alterou, e o link público nos dois modos — saiu byte a byte igual
antes e depois das duas tarefas que mudam lógica.

> [!IMPORTANT]
> As duas tarefas que mudam lógica são exatamente onde o risco mora, e os pontos
> abaixo foram conferidos no diff:
> - **Tarefa 10** — o escopo do líder Alfa continua restrito a ALFA e o do Beta a
>   BETA; `getMinistryById`/`getSectorById` de recurso alheio continuam devolvendo
>   `null` (filtro pós-consulta preservado, não virou filtro na query).
> - **Tarefa 11** — `loadCoordinatedSectors` passou a filtrar em memória em vez de
>   na query. O conjunto e a ordem do resultado saíram iguais para a Carla
>   (coordena A-UM, só serve em A-DOIS) e para o líder Beta (coordena A-DOIS, de
>   outro ministério).

---

## 🙋 Validação Manual (Checklist)

### Fluxo por papel (critério de aceitação 11)

Verificado pela Prova 3 acima, que exercita as leituras de cada tela:

- [x] **Admin** — `getMinistries`, `getSectors`, `getServants`, `getSchedules`,
      `getCalendarSchedules`, `getScheduleResponses` retornam os dois ministérios.
- [x] **Líder** — Alfa enxerga apenas ALFA (1 ministério, 2 setores, 3 escalas,
      3 servos); Beta apenas BETA. `getMinistryById` do ministério alheio devolve
      `null`; `getScheduleResponses` de escala alheia lança "Não autorizado a
      gerenciar a escala deste setor".
- [x] **Coordenador** — Carla: `getCoordinatorSectors` devolve só A-UM (não
      A-DOIS, onde ela apenas serve); `getCoordinatorSchedules` devolve as 2
      escalas de A-UM. Beta, líder de BETA, aparece como coordenador de A-DOIS —
      as três dimensões de acesso continuam independentes.
- [x] **Servo** — Sam vê as 2 escalas de A-UM em `getServantOverview`, com
      `confirmed`/`available` por data; o pedido de troca pendente aparece em
      `getPendingSwapRequests` para a Carla (alvo), não para o Sam (solicitante).

### Link público de escala (critério de aceitação 12)

- [x] **`public` sem sessão** — formulário renderiza com a lista de servos do
      setor ("Coord Carla", "Servo Sam") e as duas datas.
- [x] **`private` sem sessão** — card "Escala privada" com o texto
      "Esta escala é restrita aos servos do setor…" e botão "Fazer login".
      Nenhum formulário é oferecido.
- [x] **`private` com sessão de servo do setor** — formulário renderiza com o
      nome travado em "Servo Sam", sem seletor de outros servos.
- [x] `saveAvailability` de um servo de outro setor continua recusada com
      "Este servo não pertence ao setor desta escala".

### Segurança (critério de aceitação 13)

- [x] Nenhuma resposta de action carrega `users.password`: as saídas das 17
      leituras, nos 6 papéis, foram varridas e não contêm o campo.
- [x] Toda inclusão de `user`/`leader` nos módulos novos usa a projeção
      `publicUser`.

---

### Critérios de aceitação da spec

| # | Critério | Estado |
|---|---|---|
| 1 | `src/lib/actions.ts` não existe; 8 módulos, nenhum acima de ~200 linhas | ✅ maior é `servants.ts`, 186 |
| 2 | 33 actions exportadas, mesmas assinaturas | ✅ `check-surface.sh` |
| 3 | 11 interfaces em `src/types/domain.ts`; nenhum tipo exportado de `"use server"` | ✅ |
| 4 | `src/lib/scope.ts` começa com `import 'server-only'` | ✅ |
| 5 | Nada devolve "acesso irrestrito por omissão" | ✅ `getAuthFilter` não existe mais |
| 6 | Nenhum módulo de action importa outro | ✅ |
| 7 | Consumidores importam do módulo de domínio; nenhum barrel | ✅ zero imports de `@/lib/actions` |
| 8 | `npx tsc --noEmit` limpo | ✅ |
| 9 | `npm run lint` sem erros novos | ✅ os mesmos 3 warnings pré-existentes |
| 10 | `npm run build` gera as mesmas rotas | ✅ 17 rotas, idênticas ao baseline |
| 11 | Verificação por papel | ✅ Prova 3 |
| 12 | Link público nos modos `public` e `private` | ✅ |
| 13 | Nenhuma resposta carrega `users.password` | ✅ |

---

## 📸 Evidências

Os artefatos do harness (fixture, script de probe, JSONs por papel dos dois
mundos, snapshots de HTML) ficam fora do repositório, no scratchpad da sessão —
são descartáveis e não fazem parte da entrega. A rota temporária de verificação
`src/app/api/zzverify/route.ts` e a cópia `src/lib/actions-pre.ts` foram
removidas ao fim da validação; nenhuma das duas foi commitada.
