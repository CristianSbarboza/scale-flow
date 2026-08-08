# Plano Técnico - Refatorar a Camada de Server Actions

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para rastreio.

**Goal:** Quebrar `src/lib/actions.ts` (1046 linhas, 33 endpoints públicos) em tipos, um módulo de escopo `server-only` e actions por domínio, sem alterar comportamento observável.

**Architecture:** Três camadas. `src/types/domain.ts` guarda as 11 interfaces. `src/lib/scope.ts` (com `import 'server-only'`) concentra toda decisão de autorização e os helpers de resolução. `src/lib/actions/*.ts` tem um arquivo `"use server"` por domínio, cada um consumindo `scope.ts`. As oito primeiras tarefas são movimentação pura; só as duas últimas alteram lógica.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Drizzle ORM sobre PostgreSQL, Auth.js (NextAuth v4, JWT).

## Global Constraints

- **Comportamento preservado (RNF01):** mesmas assinaturas públicas, mesmos retornos, mesmas mensagens de erro em português, mesmas chamadas de `revalidatePath` com os mesmos caminhos. Qualquer diferença observada é bug.
- **Movimentação e lógica nunca no mesmo commit (RNF02):** nas Tarefas 2–9, o corpo de cada função move byte a byte. Mudança de lógica só nas Tarefas 10 e 11.
- **Sem features novas (RNF03):** multi-tenancy, super admin e mudança de política de autorização são da spec 03. Não implemente nada disso aqui.
- **Segurança preservada (RNF04):** a projeção `publicUser` continua em toda query cujo retorno vá ao cliente; as validações de `saveAvailability` permanecem; `registerUser` continua com `requireAdmin()`.
- **`server-only` no escopo (RNF05):** `src/lib/scope.ts` começa com `import 'server-only'`.
- **Sem ciclos (RNF06):** nenhum módulo de `src/lib/actions/` importa outro módulo de `src/lib/actions/`.
- **Action não chama action (RNF07):** chamadas internas passam por helper em `scope.ts`.
- **Sem barrel:** `src/lib/actions.ts` é deletado, não convertido em re-export.
- **Não existe suíte de testes neste repo.** A verificação de cada tarefa é `npx tsc --noEmit`, o script de diff de superfície da Tarefa 1, e `npm run build`. Não introduza framework de teste — está fora do escopo desta spec.
- **`npm run lint` tem 3 warnings pré-existentes** em `drizzle/schema.ts` e `src/types/next-auth.d.ts`. Eles devem continuar sendo os únicos.
- **Diretório de trabalho temporário:** use `C:\Users\crist\AppData\Local\Temp\claude\F--Developer-Area-f-me-projects-ScaleFlow\8532f597-d11b-4ef1-a051-08d80488a4fd\scratchpad` para arquivos auxiliares. Referido abaixo como `$SCRATCH`.

---

### Task 1: Baseline verificável da superfície pública

Sem testes, a rede de segurança é provar que o conjunto de actions exportadas não muda. Esta tarefa cria essa prova antes de mover qualquer linha.

**Files:**
- Create: `$SCRATCH/surface-before.txt`
- Create: `$SCRATCH/check-surface.sh`

**Interfaces:**
- Consumes: nada.
- Produces: `$SCRATCH/surface-before.txt` com os 33 nomes ordenados; `check-surface.sh`, usado ao fim de cada tarefa seguinte.

- [ ] **Step 1: Capturar a superfície atual**

```bash
cd "F:/Developer_Area_f/me/projects/ScaleFlow"
SCRATCH="C:/Users/crist/AppData/Local/Temp/claude/F--Developer-Area-f-me-projects-ScaleFlow/8532f597-d11b-4ef1-a051-08d80488a4fd/scratchpad"
grep -oE "^export async function [a-zA-Z]+" src/lib/actions.ts \
  | sed 's/export async function //' | sort > "$SCRATCH/surface-before.txt"
wc -l < "$SCRATCH/surface-before.txt"
```

Esperado: `33`.

- [ ] **Step 2: Escrever o script de verificação**

```bash
cat > "$SCRATCH/check-surface.sh" <<'EOF'
#!/bin/sh
# Compara as actions exportadas hoje com o baseline de 33 nomes.
# Procura em src/lib/actions.ts (antes do split) e src/lib/actions/ (depois).
set -e
SCRATCH="C:/Users/crist/AppData/Local/Temp/claude/F--Developer-Area-f-me-projects-ScaleFlow/8532f597-d11b-4ef1-a051-08d80488a4fd/scratchpad"
cd "F:/Developer_Area_f/me/projects/ScaleFlow"
{
  [ -f src/lib/actions.ts ] && grep -hoE "^export async function [a-zA-Z]+" src/lib/actions.ts || true
  [ -d src/lib/actions ] && grep -rhoE "^export async function [a-zA-Z]+" src/lib/actions/ || true
} | sed 's/export async function //' | sort > "$SCRATCH/surface-after.txt"

if diff -u "$SCRATCH/surface-before.txt" "$SCRATCH/surface-after.txt"; then
  echo "OK: superficie identica ($(wc -l < "$SCRATCH/surface-after.txt") actions)"
else
  echo "FALHOU: a superficie mudou"
  exit 1
fi
EOF
chmod +x "$SCRATCH/check-surface.sh"
```

- [ ] **Step 3: Rodar o script contra o código intacto para provar que ele passa**

```bash
sh "$SCRATCH/check-surface.sh"
```

Esperado: `OK: superficie identica (33 actions)`. Se falhar agora, o script está errado — conserte antes de seguir.

- [ ] **Step 4: Registrar o baseline de build**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -25
```

Esperado: `tsc` sem saída; build concluindo e listando 17 rotas (`/`, `/_not-found`, `/admin`, `/admin/calendar`, `/admin/ministries`, `/admin/ministries/[id]`, `/admin/schedules`, `/admin/sectors`, `/admin/sectors/[id]`, `/admin/servants`, `/admin/servants/[userId]`, `/admin/settings`, `/api/auth/[...nextauth]`, `/escala/[link]`, `/login`, `/register`, `/servant`). Anote a lista — as tarefas seguintes comparam com ela.

- [ ] **Step 5: Commit**

Nada a commitar: os artefatos vivem no scratchpad, fora do repositório. Siga para a Tarefa 2.

---

### Task 2: Mover as 11 interfaces para `src/types/domain.ts`

Tipos são apagados na compilação, então movê-los não pode alterar runtime. É a tarefa mais segura e desbloqueia as seguintes.

**Files:**
- Create: `src/types/domain.ts`
- Modify: `src/lib/actions.ts` (remover as 11 interfaces, importar do novo módulo)
- Modify: 10 arquivos consumidores (lista no Step 3)

**Interfaces:**
- Consumes: nada.
- Produces: `src/types/domain.ts` exportando `ServantMembership`, `ServantSummary`, `ServantOverviewAssignee`, `ServantOverviewDate`, `ServantOverviewSchedule`, `CoordinatorSector`, `CoordinatorSchedule`, `CalendarAssignee`, `CalendarDate`, `CalendarSchedule`, `PendingSwapRequest`.

- [ ] **Step 1: Criar `src/types/domain.ts`**

Copie as 11 interfaces de `src/lib/actions.ts` **sem alterar um caractere** dos corpos. Elas estão nas linhas 319-334, 421-446, 598-615, 656-676 e 968-978. O arquivo novo não tem `"use server"` nem `server-only` — é só tipo.

```typescript
/**
 * Tipos de domínio compartilhados entre server actions e componentes.
 *
 * Vivem fora de `src/lib/actions/` porque módulos `"use server"` devem
 * exportar apenas funções assíncronas: cada export lá vira um endpoint POST.
 */

export interface ServantMembership {
  servantId: number;
  sectorId: number;
  sectorName: string;
  ministryId: number;
  ministryName: string;
  isCoordinator: boolean;
}

export interface ServantSummary {
  userId: string;
  name: string;
  username: string | null;
  email: string | null;
  memberships: ServantMembership[];
}

export interface ServantOverviewAssignee {
  servantId: number;
  userId: string;
  name: string;
  isSelf: boolean;
  color: string | null;
}

export interface ServantOverviewDate {
  id: number;
  date: string;
  startTime: string;
  confirmed: boolean;
  available: boolean;
  assignees: ServantOverviewAssignee[];
}

export interface ServantOverviewSchedule {
  id: number;
  name: string;
  ministryName: string;
  sectorName: string;
  shareLink: string;
  servantId: number;
  dates: ServantOverviewDate[];
}

export interface CoordinatorSector {
  id: number;
  name: string;
  ministryId: number;
  ministryName: string;
}

export interface CoordinatorSchedule {
  id: number;
  name: string;
  status: "draft" | "published";
  visibility: "public" | "private";
  shareLink: string;
  ministry: { name: string };
  sector: { name: string };
  dates: { id: number; date: string; startTime: string }[];
}

export interface CalendarAssignee {
  servantId: number;
  name: string;
}

export interface CalendarDate {
  id: number;
  date: string;
  startTime: string;
  assignees: CalendarAssignee[];
}

export interface CalendarSchedule {
  id: number;
  name: string;
  ministryId: number;
  ministryName: string;
  sectorId: number;
  sectorName: string;
  dates: CalendarDate[];
}

export interface PendingSwapRequest {
  id: number;
  dateId: number;
  date: string;
  startTime: string;
  scheduleName: string;
  sectorName: string;
  ministryName: string;
  requesterName: string;
  createdAt: string;
}
```

Confira `CoordinatorSchedule` contra `src/lib/actions.ts:605-615` antes de seguir: ele tem `visibility`, adicionado recentemente.

- [ ] **Step 2: Remover as interfaces de `actions.ts` e importar do novo módulo**

Apague os 11 blocos `export interface` de `src/lib/actions.ts` e adicione, junto aos outros imports do topo:

```typescript
import type {
  ServantMembership,
  ServantSummary,
  ServantOverviewSchedule,
  CoordinatorSector,
  CoordinatorSchedule,
  CalendarSchedule,
  PendingSwapRequest,
} from "@/types/domain";
```

Importe apenas os nomes que o corpo de `actions.ts` referencia. `ServantOverviewAssignee`, `ServantOverviewDate`, `CalendarAssignee` e `CalendarDate` são usados só como tipos aninhados dentro dos outros e não aparecem em anotação direta — se `tsc` reclamar de algum, adicione.

- [ ] **Step 3: Atualizar os 10 consumidores de tipo**

Troque `@/lib/actions` por `@/types/domain` **apenas nas linhas `import type`**. As linhas que importam funções ficam como estão nesta tarefa.

| Arquivo | Linha | Tipos |
|---|---|---|
| `src/app/admin/calendar/page.tsx` | 7 | `CalendarSchedule` |
| `src/app/admin/servants/[userId]/page.tsx` | 8 | `ServantSummary` |
| `src/components/CoordinatorSchedulePanel.tsx` | 6 | `CoordinatorSchedule`, `CoordinatorSector` |
| `src/components/NotificationBell.tsx` | 6 | `PendingSwapRequest` |
| `src/components/ServantCalendar.tsx` | 6 | `ServantOverviewSchedule`, `ServantOverviewAssignee` |
| `src/components/ServantHome.tsx` | 4 | `ServantOverviewSchedule`, `CoordinatorSector` |
| `src/components/ServantScheduleDetailModal.tsx` | 4 | `ServantOverviewSchedule` |
| `src/components/ServantScheduleList.tsx` | 6 | `ServantOverviewSchedule` |
| `src/components/ServantShell.tsx` | 4 | `ServantOverviewSchedule`, `CoordinatorSector` |

Exemplo, em `src/components/NotificationBell.tsx:6`:

```typescript
// antes
import type { PendingSwapRequest } from "@/lib/actions";
// depois
import type { PendingSwapRequest } from "@/types/domain";
```

- [ ] **Step 4: Verificar**

```bash
cd "F:/Developer_Area_f/me/projects/ScaleFlow"
SCRATCH="C:/Users/crist/AppData/Local/Temp/claude/F--Developer-Area-f-me-projects-ScaleFlow/8532f597-d11b-4ef1-a051-08d80488a4fd/scratchpad"
npx tsc --noEmit && sh "$SCRATCH/check-surface.sh" && grep -c "export interface" src/lib/actions.ts || echo "0 interfaces restantes"
```

Esperado: `tsc` sem saída; `OK: superficie identica (33 actions)`; nenhuma `export interface` em `actions.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/types/domain.ts src/lib/actions.ts src/app src/components
git commit -m "refactor: mover tipos de dominio de actions.ts para src/types/domain.ts"
```

---

### Task 3: Criar `src/lib/scope.ts` com os helpers movidos

Movimentação pura dos 11 helpers internos. `actions.ts` passa a importar deles e continua com as 33 actions.

**Files:**
- Create: `src/lib/scope.ts`
- Modify: `src/lib/actions.ts` (remover linhas 12-153 e 837-852; importar de `scope.ts`)

**Interfaces:**
- Consumes: `src/types/domain.ts` (Tarefa 2).
- Produces: `src/lib/scope.ts` exportando `publicUser`, `getAuthFilter()`, `requireAdmin()`, `requireScheduleSectorAccess(sectorId: number)`, `requireMinistryAccess(ministryId: number)`, `requireSectorAccess(sectorId: number)`, `requireServantAccess(userId: string)`, `getSectorIdForScheduleId(scheduleId: number)`, `getSectorIdForDateId(dateId: number)`, `getSectorIdForAssignmentId(assignmentId: number)`, `getOrCreateUser(name, targetRole, identifier)`.

- [ ] **Step 1: Criar `src/lib/scope.ts`**

Cabeçalho, e então **cole os 11 helpers exatamente como estão** em `actions.ts` — linhas 12-153 (de `publicUser` até o fim de `getOrCreateUser`) e 837-852 (`requireServantAccess`) — trocando `async function` por `export async function` e `const publicUser` por `export const publicUser`. Não reescreva corpo, não reordene condição, não mude mensagem de erro.

```typescript
import 'server-only';

import { db } from "@/db";
import { ministries, sectors, users, servants, schedules, scheduleDates, scheduleAssignments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash } from "bcryptjs";

// ... os 11 helpers, colados sem alteração de corpo ...
```

Atenção a dois detalhes:

- `requireServantAccess` está definido em `actions.ts:837`, **depois** de funções que o usam. Em `scope.ts` a ordem não importa (hoisting de `function`), mas coloque-o junto dos outros `require*` para leitura.
- Importe de `@/db/schema` só as tabelas que os helpers usam: `ministries`, `sectors`, `users`, `servants`, `schedules`, `scheduleDates`, `scheduleAssignments`. `scheduleAvailability` e `swapRequests` não são usados aqui. De `bcryptjs`, só `hash` (o `compare` fica nas actions).

- [ ] **Step 2: Remover os helpers de `actions.ts` e importar de `scope.ts`**

Apague de `actions.ts` as linhas 12-153 e o bloco `requireServantAccess` (837-852). Adicione:

```typescript
import {
  publicUser,
  getAuthFilter,
  requireAdmin,
  requireScheduleSectorAccess,
  requireMinistryAccess,
  requireSectorAccess,
  requireServantAccess,
  getSectorIdForScheduleId,
  getSectorIdForDateId,
  getSectorIdForAssignmentId,
  getOrCreateUser,
} from "@/lib/scope";
```

Ajuste os imports que sobraram no topo de `actions.ts`: `hash` continua necessário (`registerUser` usa), `compare` também (`resetServantPassword`, `changeOwnPassword`).

- [ ] **Step 3: Verificar**

```bash
cd "F:/Developer_Area_f/me/projects/ScaleFlow"
SCRATCH="C:/Users/crist/AppData/Local/Temp/claude/F--Developer-Area-f-me-projects-ScaleFlow/8532f597-d11b-4ef1-a051-08d80488a4fd/scratchpad"
npx tsc --noEmit && sh "$SCRATCH/check-surface.sh" && head -1 src/lib/scope.ts
```

Esperado: `tsc` limpo; superfície idêntica; primeira linha de `scope.ts` é `import 'server-only';`.

- [ ] **Step 4: Confirmar que `server-only` protege de verdade**

```bash
npm run build 2>&1 | tail -20
```

Esperado: build conclui. Se algum componente `"use client"` importasse `scope.ts`, o build falharia aqui — é o efeito desejado do `server-only`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scope.ts src/lib/actions.ts
git commit -m "refactor: extrair helpers de autorizacao para src/lib/scope.ts"
```

---

### Task 4: Extrair `ministries.ts` e `sectors.ts`

Sete actions, agrupadas por compartilharem `requireMinistryAccess`.

**Files:**
- Create: `src/lib/actions/ministries.ts` — `createMinistry`, `updateMinistry`, `getMinistries`, `getMinistryById`
- Create: `src/lib/actions/sectors.ts` — `createSector`, `getSectors`, `getSectorById`
- Modify: `src/lib/actions.ts` (remover as 7)
- Modify: `src/app/admin/ministries/page.tsx:6`, `src/app/admin/ministries/[id]/page.tsx:7`, `src/app/admin/sectors/page.tsx:6`, `src/app/admin/sectors/[id]/page.tsx:7`, `src/app/admin/calendar/page.tsx:6`, `src/app/admin/schedules/page.tsx:4`, `src/app/admin/servants/page.tsx:6`, `src/app/admin/servants/[userId]/page.tsx:7`

**Interfaces:**
- Consumes: `publicUser`, `getAuthFilter`, `requireAdmin`, `requireMinistryAccess`, `getOrCreateUser` de `@/lib/scope`.
- Produces: `createMinistry(name: string, description: string, leaderName: string, leaderEmail: string): Promise<{ password: string | null }>`; `updateMinistry(id: number, name: string, description: string, leaderName: string, leaderEmail: string): Promise<{ password: string | null }>`; `getMinistries()`; `getMinistryById(id: number)`; `createSector(name: string, ministryId: number): Promise<void>`; `getSectors()`; `getSectorById(id: number)`.

- [ ] **Step 1: Criar `src/lib/actions/ministries.ts`**

```typescript
"use server";

import { db } from "@/db";
import { ministries } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { publicUser, getAuthFilter, requireAdmin, getOrCreateUser } from "@/lib/scope";
```

Cole as 4 actions de `actions.ts:156-219` sem alterar corpo.

- [ ] **Step 2: Criar `src/lib/actions/sectors.ts`**

```typescript
"use server";

import { db } from "@/db";
import { ministries, sectors, servants } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { publicUser, getAuthFilter, requireMinistryAccess } from "@/lib/scope";
```

Cole as 3 actions de `actions.ts:222-289` sem alterar corpo. `getSectors` usa `.where(leaderId ? eq(...) : undefined)` — preserve exatamente, incluindo o `undefined`.

- [ ] **Step 3: Remover as 7 de `actions.ts`**

Apague os blocos das linhas 156-289. Remova de `actions.ts` os imports que ficaram sem uso — rode `npx tsc --noEmit` e siga o que ele apontar; `npm run lint` também acusa via `@typescript-eslint/no-unused-vars`.

- [ ] **Step 4: Atualizar os 8 consumidores**

`getMinistries` e `getSectors` são importados por vários arquivos junto de actions de outros domínios. Divida a linha de import:

```typescript
// src/app/admin/schedules/page.tsx:4 — antes
import { createSchedule, getSchedules, getSectors, getMinistries, deleteSchedule } from "@/lib/actions";
// depois
import { createSchedule, getSchedules, deleteSchedule } from "@/lib/actions";
import { getSectors } from "@/lib/actions/sectors";
import { getMinistries } from "@/lib/actions/ministries";
```

Aplique o mesmo em: `admin/ministries/page.tsx:6` (`createMinistry`, `getMinistries`); `admin/ministries/[id]/page.tsx:7` (`getMinistryById`, `updateMinistry`); `admin/sectors/page.tsx:6` (`createSector`, `getSectors` → sectors; `getMinistries` → ministries); `admin/sectors/[id]/page.tsx:7` (`getSectorById`); `admin/calendar/page.tsx:6` (`getMinistries`, `getSectors` saem; `getCalendarSchedules` fica); `admin/servants/page.tsx:6` (`getSectors`, `getMinistries` saem; `createServant`, `getServants` ficam); `admin/servants/[userId]/page.tsx:7` (`getSectors` sai; o resto fica).

- [ ] **Step 5: Verificar**

```bash
cd "F:/Developer_Area_f/me/projects/ScaleFlow"
SCRATCH="C:/Users/crist/AppData/Local/Temp/claude/F--Developer-Area-f-me-projects-ScaleFlow/8532f597-d11b-4ef1-a051-08d80488a4fd/scratchpad"
npx tsc --noEmit && sh "$SCRATCH/check-surface.sh" && npm run lint 2>&1 | tail -8
```

Esperado: `tsc` limpo; 33 actions; lint com os 3 warnings pré-existentes e nada mais.

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions src/lib/actions.ts src/app
git commit -m "refactor: extrair actions de ministerios e setores"
```

---

### Task 5: Extrair `servants.ts`

Oito actions. É o maior grupo e o que mais depende de `requireServantAccess`.

**Files:**
- Create: `src/lib/actions/servants.ts` — `createServant`, `getServants`, `getServantMember`, `addServantToSector`, `removeServantFromSector`, `setServantCoordinator`, `resetServantPassword`, `deleteServantAccount`
- Modify: `src/lib/actions.ts`
- Modify: `src/app/admin/servants/page.tsx:6`, `src/app/admin/servants/[userId]/page.tsx:7`

**Interfaces:**
- Consumes: `publicUser`, `getAuthFilter`, `requireSectorAccess`, `requireServantAccess`, `getOrCreateUser` de `@/lib/scope`; `ServantMembership`, `ServantSummary` de `@/types/domain`.
- Produces: `createServant(name: string, username: string, email: string | null, sectorId: number): Promise<{ password: string | null }>`; `getServants(): Promise<ServantSummary[]>`; `getServantMember(userId: string): Promise<ServantSummary | null>`; `addServantToSector(userId: string, sectorId: number): Promise<void>`; `removeServantFromSector(servantId: number): Promise<void>`; `setServantCoordinator(servantId: number, isCoordinator: boolean): Promise<void>`; `resetServantPassword(userId: string, newPassword: string, actingUserPassword: string): Promise<void>`; `deleteServantAccount(userId: string): Promise<void>`.

- [ ] **Step 1: Criar `src/lib/actions/servants.ts`**

```typescript
"use server";

import { db } from "@/db";
import { ministries, sectors, users, servants } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { hash, compare } from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publicUser, getAuthFilter, requireSectorAccess, requireServantAccess, getOrCreateUser } from "@/lib/scope";
import type { ServantMembership, ServantSummary } from "@/types/domain";
```

Cole, sem alterar corpo: `createServant` (`actions.ts:292-317`), `getServants` (336-391), `getServantMember` (393-419), `addServantToSector` (854-867), `removeServantFromSector` (869-878), `setServantCoordinator` (880-889), `resetServantPassword` (891-905), `deleteServantAccount` (929-937).

`getServants` tem uma subquery `exists` aninhada em duas camadas (`actions.ts:340-354`) e um `Map` de agrupamento por usuário. Copie o bloco inteiro literalmente — reescrever essa query é a forma mais fácil de mudar comportamento sem perceber.

`resetServantPassword` usa `session!.user.id` com asserção não-nula, porque `requireServantAccess` já garantiu a sessão. Preserve a asserção; trocá-la por outra checagem muda a mensagem de erro.

- [ ] **Step 2: Remover as 8 de `actions.ts`**

Apague os blocos listados no Step 1 e limpe imports órfãos.

- [ ] **Step 3: Atualizar os 2 consumidores**

```typescript
// src/app/admin/servants/page.tsx:6 — depois da Tarefa 4 restou:
import { createServant, getServants } from "@/lib/actions";
// vira:
import { createServant, getServants } from "@/lib/actions/servants";
```

```typescript
// src/app/admin/servants/[userId]/page.tsx:7 — depois da Tarefa 4 restou:
import { getServantMember, addServantToSector, removeServantFromSector, setServantCoordinator, resetServantPassword, deleteServantAccount } from "@/lib/actions";
// vira:
import { getServantMember, addServantToSector, removeServantFromSector, setServantCoordinator, resetServantPassword, deleteServantAccount } from "@/lib/actions/servants";
```

- [ ] **Step 4: Verificar**

```bash
cd "F:/Developer_Area_f/me/projects/ScaleFlow"
SCRATCH="C:/Users/crist/AppData/Local/Temp/claude/F--Developer-Area-f-me-projects-ScaleFlow/8532f597-d11b-4ef1-a051-08d80488a4fd/scratchpad"
npx tsc --noEmit && sh "$SCRATCH/check-surface.sh"
```

Esperado: `tsc` limpo; 33 actions.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions src/lib/actions.ts src/app
git commit -m "refactor: extrair actions de servos"
```

---

### Task 6: Extrair `schedules.ts`

**Files:**
- Create: `src/lib/actions/schedules.ts` — `createSchedule`, `updateSchedule`, `deleteSchedule`, `getSchedules`, `getScheduleResponses`, `getCalendarSchedules`
- Modify: `src/lib/actions.ts`
- Modify: `src/app/admin/schedules/page.tsx:4`, `src/app/admin/calendar/page.tsx:6`, `src/components/ScheduleEditor.tsx:6`, `src/components/ScheduleManager.tsx:6`, `src/components/CoordinatorSchedulePanel.tsx:5`

**Interfaces:**
- Consumes: `publicUser`, `getAuthFilter`, `requireScheduleSectorAccess`, `getSectorIdForScheduleId` de `@/lib/scope`; `CalendarSchedule` de `@/types/domain`.
- Produces: `createSchedule(name: string, ministryId: number, sectorId: number, dates: { date: string, startTime: string }[], visibility?: "public" | "private"): Promise<{ shareLink: string }>`; `updateSchedule(id: number, name: string, dates: { date: string, startTime: string }[], visibility?: "public" | "private"): Promise<void>`; `deleteSchedule(id: number): Promise<void>`; `getSchedules()`; `getScheduleResponses(scheduleId: number)`; `getCalendarSchedules(): Promise<CalendarSchedule[]>`.

- [ ] **Step 1: Criar `src/lib/actions/schedules.ts`**

```typescript
"use server";

import { db } from "@/db";
import { ministries, schedules, scheduleDates } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { publicUser, getAuthFilter, requireScheduleSectorAccess, getSectorIdForScheduleId } from "@/lib/scope";
import type { CalendarSchedule } from "@/types/domain";
```

Cole sem alterar corpo: `createSchedule` (`actions.ts:505-534`), `deleteSchedule` (536-542), `updateSchedule` (544-568), `getSchedules` (570-596), `getCalendarSchedules` (680-720), `getScheduleResponses` (722-741).

`createSchedule` e `updateSchedule` têm o parâmetro `visibility` com default `"public"` no primeiro e opcional no segundo, e `updateSchedule` faz `.set(visibility ? { name, visibility } : { name })`. Preserve essa assimetria — ela é intencional.

- [ ] **Step 2: Remover as 6 de `actions.ts`** e limpar imports órfãos (`nanoid` sai de `actions.ts`).

- [ ] **Step 3: Atualizar os 5 consumidores**

```typescript
// src/app/admin/schedules/page.tsx — restou de Tarefa 4:
import { createSchedule, getSchedules, deleteSchedule } from "@/lib/actions";
// vira:
import { createSchedule, getSchedules, deleteSchedule } from "@/lib/actions/schedules";

// src/app/admin/calendar/page.tsx — restou:
import { getCalendarSchedules } from "@/lib/actions";
// vira:
import { getCalendarSchedules } from "@/lib/actions/schedules";

// src/components/ScheduleEditor.tsx:6
import { updateSchedule } from "@/lib/actions/schedules";

// src/components/ScheduleManager.tsx:6 — só getScheduleResponses muda de módulo:
import { getScheduleResponses } from "@/lib/actions/schedules";
import { assignServant, removeAssignment } from "@/lib/actions";

// src/components/CoordinatorSchedulePanel.tsx:5
import { getCoordinatorSchedules } from "@/lib/actions";
import { createSchedule, deleteSchedule } from "@/lib/actions/schedules";
```

- [ ] **Step 4: Verificar**

```bash
cd "F:/Developer_Area_f/me/projects/ScaleFlow"
SCRATCH="C:/Users/crist/AppData/Local/Temp/claude/F--Developer-Area-f-me-projects-ScaleFlow/8532f597-d11b-4ef1-a051-08d80488a4fd/scratchpad"
npx tsc --noEmit && sh "$SCRATCH/check-surface.sh"
```

Esperado: `tsc` limpo; 33 actions.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions src/lib/actions.ts src/app src/components
git commit -m "refactor: extrair actions de escalas"
```

---

### Task 7: Extrair `availability.ts` e `swaps.ts`

**Files:**
- Create: `src/lib/actions/availability.ts` — `saveAvailability`, `assignServant`, `removeAssignment`, `getServantOverview`
- Create: `src/lib/actions/swaps.ts` — `createSwapRequest`, `getPendingSwapRequests`, `respondToSwapRequest`
- Modify: `src/lib/actions.ts`
- Modify: `src/app/escala/[link]/AvailabilityForm.tsx:6`, `src/app/servant/page.tsx:7`, `src/components/ScheduleManager.tsx:6`, `src/components/NotificationBell.tsx:5`, `src/components/ServantCalendar.tsx:7`

**Interfaces:**
- Consumes: `publicUser`, `requireScheduleSectorAccess`, `getSectorIdForDateId`, `getSectorIdForAssignmentId` de `@/lib/scope`; `ServantOverviewSchedule`, `PendingSwapRequest` de `@/types/domain`.
- Produces: `saveAvailability(servantId: number, dateIds: number[]): Promise<void>`; `assignServant(dateId: number, servantId: number): Promise<void>`; `removeAssignment(assignmentId: number): Promise<void>`; `getServantOverview(): Promise<ServantOverviewSchedule[]>`; `createSwapRequest(dateId: number, targetServantId: number, requesterServantId: number): Promise<void>`; `getPendingSwapRequests(): Promise<PendingSwapRequest[]>`; `respondToSwapRequest(id: number, accept: boolean): Promise<void>`.

- [ ] **Step 1: Criar `src/lib/actions/availability.ts`**

```typescript
"use server";

import { db } from "@/db";
import { servants, schedules, scheduleDates, scheduleAvailability, scheduleAssignments } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, inArray } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publicUser, requireScheduleSectorAccess, getSectorIdForDateId, getSectorIdForAssignmentId } from "@/lib/scope";
import type { ServantOverviewSchedule } from "@/types/domain";
```

Cole sem alterar corpo: `getServantOverview` (`actions.ts:451-503`), `assignServant` (743-752), `removeAssignment` (754-760), `saveAvailability` (762-814).

`saveAvailability` é a única action alcançável sem sessão (link público de escala). Suas seis validações — dedup, `dateRows.length !== uniqueDateIds.length`, mesma escala, setor do servo, `visibility === "private" && !session`, e `session && servant.userId !== session.user.id` — são o resultado de um hardening anterior. Copie o bloco literalmente e não "simplifique" nada.

- [ ] **Step 2: Criar `src/lib/actions/swaps.ts`**

```typescript
"use server";

import { db } from "@/db";
import { servants, scheduleAssignments, swapRequests } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, inArray } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publicUser } from "@/lib/scope";
import type { PendingSwapRequest } from "@/types/domain";
```

Cole sem alterar corpo: `createSwapRequest` (`actions.ts:941-966`), `getPendingSwapRequests` (980-1008), `respondToSwapRequest` (1010-1046).

Em `respondToSwapRequest`, o caminho `accept` faz quatro operações em sequência: deleta a escalação do alvo, insere a do solicitante se não existir, marca este pedido como `accepted`, e rejeita os outros pendentes daquela data e alvo. Preserve a ordem — ela importa.

- [ ] **Step 3: Remover as 7 de `actions.ts`** e limpar imports órfãos.

- [ ] **Step 4: Atualizar os 5 consumidores**

```typescript
// src/app/escala/[link]/AvailabilityForm.tsx:6
import { saveAvailability } from "@/lib/actions/availability";

// src/app/servant/page.tsx:7
import { getServantOverview } from "@/lib/actions/availability";

// src/components/ScheduleManager.tsx — restou de Tarefa 6:
import { assignServant, removeAssignment } from "@/lib/actions/availability";

// src/components/NotificationBell.tsx:5
import { getPendingSwapRequests, respondToSwapRequest } from "@/lib/actions/swaps";

// src/components/ServantCalendar.tsx:7
import { createSwapRequest } from "@/lib/actions/swaps";
```

- [ ] **Step 5: Verificar**

```bash
cd "F:/Developer_Area_f/me/projects/ScaleFlow"
SCRATCH="C:/Users/crist/AppData/Local/Temp/claude/F--Developer-Area-f-me-projects-ScaleFlow/8532f597-d11b-4ef1-a051-08d80488a4fd/scratchpad"
npx tsc --noEmit && sh "$SCRATCH/check-surface.sh"
```

Esperado: `tsc` limpo; 33 actions.

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions src/lib/actions.ts src/app src/components
git commit -m "refactor: extrair actions de disponibilidade e trocas"
```

---

### Task 8: Extrair `account.ts` e `coordinator.ts`, e deletar `actions.ts`

As últimas 5 actions. Ao fim, `src/lib/actions.ts` deve estar vazio e ser removido.

**Files:**
- Create: `src/lib/actions/account.ts` — `registerUser`, `changeOwnPassword`, `updateOwnColor`
- Create: `src/lib/actions/coordinator.ts` — `getCoordinatorSectors`, `getCoordinatorSchedules`
- Delete: `src/lib/actions.ts`
- Modify: `src/app/register/page.tsx:7`, `src/app/admin/settings/page.tsx:7`, `src/components/SettingsModal.tsx:8`, `src/components/CoordinatorSchedulePanel.tsx:5`

**Interfaces:**
- Consumes: `requireAdmin` de `@/lib/scope`; `CoordinatorSector`, `CoordinatorSchedule` de `@/types/domain`.
- Produces: `registerUser(name: string, email: string, password: string): Promise<{ success: boolean }>`; `changeOwnPassword(currentPassword: string, newPassword: string): Promise<void>`; `updateOwnColor(color: string | null): Promise<void>`; `getCoordinatorSectors(): Promise<CoordinatorSector[]>`; `getCoordinatorSchedules(): Promise<CoordinatorSchedule[]>`.

- [ ] **Step 1: Criar `src/lib/actions/account.ts`**

```typescript
"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { hash, compare } from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAdmin } from "@/lib/scope";
```

Cole sem alterar corpo: `registerUser` (`actions.ts:816-835`), `changeOwnPassword` (907-919), `updateOwnColor` (921-927). Mantenha o comentário de `registerUser` sobre criar conta de admin e sobre o `seed.ts` — a spec 03 vai trocar esse guard por `requireSuperAdmin`, e o comentário é o marcador.

- [ ] **Step 2: Criar `src/lib/actions/coordinator.ts`**

```typescript
"use server";

import { db } from "@/db";
import { servants, schedules } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { CoordinatorSector, CoordinatorSchedule } from "@/types/domain";
```

Cole sem alterar corpo: `getCoordinatorSectors` (`actions.ts:617-632`) e `getCoordinatorSchedules` (635-654).

Nesta tarefa `getCoordinatorSchedules` **continua** chamando `getCoordinatorSectors` diretamente, mantendo o comportamento atual. A Tarefa 11 corrige isso — não antecipe.

- [ ] **Step 3: Confirmar que `actions.ts` está vazio e deletar**

```bash
cd "F:/Developer_Area_f/me/projects/ScaleFlow"
grep -c "^export async function" src/lib/actions.ts
```

Esperado: `0`. Se der outro número, alguma action ficou para trás — mova antes de continuar.

```bash
git rm src/lib/actions.ts
```

- [ ] **Step 4: Atualizar os 4 consumidores**

```typescript
// src/app/register/page.tsx:7
import { registerUser } from "@/lib/actions/account";

// src/app/admin/settings/page.tsx:7
import { changeOwnPassword } from "@/lib/actions/account";

// src/components/SettingsModal.tsx:8
import { changeOwnPassword, updateOwnColor } from "@/lib/actions/account";

// src/components/CoordinatorSchedulePanel.tsx — restou de Tarefa 6:
import { getCoordinatorSchedules } from "@/lib/actions/coordinator";
```

- [ ] **Step 5: Verificar que nada mais aponta para o módulo velho**

```bash
cd "F:/Developer_Area_f/me/projects/ScaleFlow"
SCRATCH="C:/Users/crist/AppData/Local/Temp/claude/F--Developer-Area-f-me-projects-ScaleFlow/8532f597-d11b-4ef1-a051-08d80488a4fd/scratchpad"
grep -rn "@/lib/actions\"" src/ && echo "AINDA HA IMPORTS DO MODULO VELHO" || echo "OK: nenhum import de @/lib/actions"
npx tsc --noEmit && sh "$SCRATCH/check-surface.sh"
```

Esperado: `OK: nenhum import de @/lib/actions`; `tsc` limpo; `OK: superficie identica (33 actions)`.

- [ ] **Step 6: Conferir o tamanho dos módulos**

```bash
wc -l src/lib/actions/*.ts src/lib/scope.ts src/types/domain.ts
```

Esperado: nenhum arquivo em `src/lib/actions/` acima de ~200 linhas (critério de aceitação 1).

- [ ] **Step 7: Build completo**

```bash
npm run build 2>&1 | tail -25
```

Esperado: build conclui com as mesmas 17 rotas anotadas na Tarefa 1.

- [ ] **Step 8: Commit**

```bash
git add -A src/lib src/app src/components
git commit -m "refactor: extrair actions de conta e coordenador; remover src/lib/actions.ts"
```

---

### Task 9: Verificação manual por papel (portão antes de mudar lógica)

As Tarefas 2–8 não mudaram lógica. Este é o momento de provar isso na aplicação rodando, **antes** das duas tarefas que mudam comportamento. Se algo aqui falhar, o bug está na movimentação e é mais fácil achar agora.

**Files:** nenhum. Tarefa de verificação.

**Interfaces:**
- Consumes: aplicação completa após a Tarefa 8.
- Produces: confirmação de que os quatro fluxos por papel funcionam, registrada em `validation.md`.

- [ ] **Step 1: Subir o servidor**

```bash
cd "F:/Developer_Area_f/me/projects/ScaleFlow"
npm run dev
```

- [ ] **Step 2: Fluxo de admin**

Entre como admin e confirme, em cada tela, que a listagem carrega e uma escrita funciona: `/admin` (visão geral), `/admin/ministries` (listar + criar), `/admin/sectors` (listar + criar), `/admin/servants` (listar + criar; abrir um servo e alternar coordenador), `/admin/schedules` (listar + criar com o toggle de visibilidade + editar), `/admin/calendar` (carrega com escalados), `/admin/settings` (trocar senha).

- [ ] **Step 3: Fluxo de líder**

Entre como líder e confirme que `/admin/ministries`, `/admin/sectors`, `/admin/servants` e `/admin/calendar` mostram **apenas** os dados dos ministérios que ele lidera — nada de outro líder. Esse é o comportamento de `getAuthFilter()` e é o que a Tarefa 10 vai reescrever, então registre o que você viu.

- [ ] **Step 4: Fluxo de coordenador**

Entre como servo marcado como coordenador. Confirme que `/servant` mostra a aba de coordenação, que `CoordinatorSchedulePanel` lista as escalas dos setores coordenados, e que criar e excluir escala por ali funciona.

- [ ] **Step 5: Fluxo de servo**

Entre como servo comum: `/servant` carrega, o calendário abre o modal de detalhe do dia, enviar disponibilidade funciona, e pedir troca de dia gera notificação para o alvo (confira com o outro usuário em `NotificationBell`).

- [ ] **Step 6: Link público de escala nos dois modos**

Abra `/escala/<shareLink>` de uma escala `public` sem sessão e envie disponibilidade. Depois, de uma escala `private`: sem sessão deve aparecer o card "Escala privada" com botão de login; logado como servo do setor, o nome vem travado e o envio funciona.

- [ ] **Step 7: Registrar em `validation.md`**

Crie `specs/02-spec-refatorar-camada-de-actions/validation.md` a partir de `specs/templates/validation-template.md`, preenchendo o checklist com o que foi verificado nos passos 2–6. Em "Testes Automatizados", registre: comando `npx tsc --noEmit && npm run lint && npm run build`, resultado observado, e a nota de que o repositório não tem suíte de testes.

- [ ] **Step 8: Commit**

```bash
git add specs/02-spec-refatorar-camada-de-actions/validation.md
git commit -m "docs: validacao manual da refatoracao de actions por papel"
```

---

### Task 10: Unificar autorização no objeto `Scope`

Primeira tarefa que **muda lógica**. Substitui `getAuthFilter()` por um escopo explícito, eliminando o retorno que hoje significa "irrestrito por omissão" (RF04).

**Files:**
- Modify: `src/lib/scope.ts` (adicionar `Scope` e `getScope()`; remover `getAuthFilter`)
- Modify: `src/lib/actions/ministries.ts`, `src/lib/actions/sectors.ts`, `src/lib/actions/servants.ts`, `src/lib/actions/schedules.ts`
- Create: `src/types/scope.ts`

**Interfaces:**
- Consumes: os 8 módulos das Tarefas 3–8.
- Produces: `Scope` em `src/types/scope.ts`; `getScope(): Promise<Scope>` em `@/lib/scope`. `getAuthFilter` deixa de existir.

- [ ] **Step 1: Definir o tipo `Scope`**

Em `src/types/scope.ts`:

```typescript
/**
 * O que a sessão atual alcança.
 *
 * As três dimensões são independentes, não alternativas: um líder pode
 * coordenar um setor de outro ministério, e um servo coordena alguns
 * setores enquanto apenas serve em outros. Modelar isso como variantes
 * mutuamente exclusivas reintroduziria o problema que este tipo resolve.
 *
 * Não existe campo que signifique "veja tudo por omissão". O acesso total
 * do admin é uma checagem deliberada de `role === "admin"` no ponto de uso.
 */
export type Scope = {
  userId: string;
  role: "admin" | "leader" | "servant";
  /** Ministérios que o usuário lidera. Vazio se não lidera nenhum. */
  ledMinistryIds: number[];
  /** Setores onde o usuário é coordenador. Vazio se não coordena nenhum. */
  coordinatedSectorIds: number[];
};
```

- [ ] **Step 2: Implementar `getScope()` em `src/lib/scope.ts`**

```typescript
import type { Scope } from "@/types/scope";

/**
 * Monta o escopo da sessão atual. Duas consultas, sempre as mesmas,
 * independente do papel — assim o custo é previsível e o resultado
 * não depende de qual ramo do código chamou.
 */
export async function getScope(): Promise<Scope> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const led = await db.select({ id: ministries.id }).from(ministries)
    .where(eq(ministries.leaderId, session.user.id));

  const coordinated = await db.select({ sectorId: servants.sectorId }).from(servants)
    .where(and(eq(servants.userId, session.user.id), eq(servants.isCoordinator, true)));

  return {
    userId: session.user.id,
    role: session.user.role,
    ledMinistryIds: led.map((m) => m.id),
    coordinatedSectorIds: coordinated.map((c) => c.sectorId),
  };
}
```

- [ ] **Step 3: Migrar os 7 consumidores de `getAuthFilter`**

Cada um segue o mesmo padrão. Antes, em `getMinistries`:

```typescript
const leaderId = await getAuthFilter();
return await db.query.ministries.findMany({
  where: leaderId ? eq(ministries.leaderId, leaderId) : undefined,
  // ...
});
```

Depois:

```typescript
const scope = await getScope();
return await db.query.ministries.findMany({
  where: scope.role === "admin" ? undefined : eq(ministries.leaderId, scope.userId),
  // ...
});
```

A diferença é que `undefined` agora aparece só quando `role === "admin"` foi checado de propósito, em vez de vir do `null` de uma função que não disse por quê.

Aplique em: `getMinistries` e `getMinistryById` (ministries.ts), `getSectors` e `getSectorById` (sectors.ts), `getServants` (servants.ts), `getSchedules` e `getCalendarSchedules` (schedules.ts).

Em `getMinistryById` e `getSectorById`, o filtro hoje é pós-consulta (`if (leaderId && ministry.leaderId !== leaderId) return null`). Mantenha pós-consulta, só trocando a condição para `scope.role !== "admin" && ministry.leaderId !== scope.userId`. Mudar para filtro na query alteraria o comportamento em caso de ID inexistente.

- [ ] **Step 4: Remover `getAuthFilter`**

```bash
cd "F:/Developer_Area_f/me/projects/ScaleFlow"
grep -rn "getAuthFilter" src/ && echo "AINDA EM USO" || echo "OK: sem referencias"
```

Só apague a função de `scope.ts` depois de ver `OK: sem referencias`.

- [ ] **Step 5: Verificar**

```bash
SCRATCH="C:/Users/crist/AppData/Local/Temp/claude/F--Developer-Area-f-me-projects-ScaleFlow/8532f597-d11b-4ef1-a051-08d80488a4fd/scratchpad"
npx tsc --noEmit && sh "$SCRATCH/check-surface.sh" && npm run build 2>&1 | tail -20
```

Esperado: `tsc` limpo; 33 actions; build conclui.

- [ ] **Step 6: Repetir a verificação de líder e de admin**

Refaça os Steps 2 e 3 da Tarefa 9. Esta tarefa mexeu exatamente no que escopa a visão do líder — é aqui que uma regressão apareceria. Compare com o que você registrou na Tarefa 9.

- [ ] **Step 7: Commit**

```bash
git add src/types/scope.ts src/lib
git commit -m "refactor: substituir getAuthFilter por objeto Scope explicito"
```

---

### Task 11: Tirar `getCoordinatorSectors` da superfície pública e remover a duplicação

Fecha RNF07 e resolve uma duplicação encontrada durante o planejamento: `src/app/servant/page.tsx:34-40` remonta à mão o mesmo `CoordinatorSector[]` que `getCoordinatorSectors` produz.

**Files:**
- Modify: `src/lib/scope.ts` (adicionar `mapCoordinatorSectors`)
- Modify: `src/lib/actions/coordinator.ts`
- Modify: `src/app/servant/page.tsx:34-40`

**Interfaces:**
- Consumes: `Scope` e `getScope()` da Tarefa 10; `CoordinatorSector` de `@/types/domain`.
- Produces: `mapCoordinatorSectors(rows)` em `@/lib/scope`. `getCoordinatorSectors` continua exportada de `coordinator.ts` (é o contrato público, critério de aceitação 2) mas para de ser chamada por outra action.

- [ ] **Step 1: Adicionar o mapeamento compartilhado a `src/lib/scope.ts`**

Função pura, sem consulta — para que quem já tem as linhas em memória não pague uma query extra.

```typescript
import type { CoordinatorSector } from "@/types/domain";

/**
 * Converte vínculos de servo (com setor e ministério carregados) na forma
 * `CoordinatorSector`. Pura de propósito: `src/app/servant/page.tsx` já
 * carregou esses vínculos e não deve consultar o banco de novo.
 */
export function mapCoordinatorSectors(
  rows: Array<{
    isCoordinator: boolean;
    sector: { id: number; name: string; ministry: { id: number; name: string } };
  }>
): CoordinatorSector[] {
  return rows
    .filter((r) => r.isCoordinator)
    .map((r) => ({
      id: r.sector.id,
      name: r.sector.name,
      ministryId: r.sector.ministry.id,
      ministryName: r.sector.ministry.name,
    }));
}
```

- [ ] **Step 2: Reescrever `coordinator.ts` para não chamar action de action**

```typescript
"use server";

import { db } from "@/db";
import { servants, schedules } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getScope, mapCoordinatorSectors } from "@/lib/scope";
import type { CoordinatorSector, CoordinatorSchedule } from "@/types/domain";

/** Carrega os vínculos de coordenação do usuário logado. Helper interno. */
async function loadCoordinatedSectors(): Promise<CoordinatorSector[]> {
  const scope = await getScope();
  const rows = await db.query.servants.findMany({
    where: eq(servants.userId, scope.userId),
    with: { sector: { with: { ministry: true } } },
  });
  return mapCoordinatorSectors(rows);
}

export async function getCoordinatorSectors(): Promise<CoordinatorSector[]> {
  return loadCoordinatedSectors();
}

export async function getCoordinatorSchedules(): Promise<CoordinatorSchedule[]> {
  const sectorIds = (await loadCoordinatedSectors()).map((s) => s.id);
  if (sectorIds.length === 0) return [];

  const rows = await db.query.schedules.findMany({
    where: inArray(schedules.sectorId, sectorIds),
    with: { ministry: true, sector: true, dates: true },
  });

  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    visibility: s.visibility,
    shareLink: s.shareLink,
    ministry: { name: s.ministry.name },
    sector: { name: s.sector.name },
    dates: s.dates.map((d) => ({ id: d.id, date: d.date, startTime: d.startTime })),
  }));
}
```

Note a diferença de comportamento em relação ao original: hoje `getCoordinatorSectors` filtra na query (`where isCoordinator = true`) e retorna todos os vínculos coordenados. O novo `loadCoordinatedSectors` busca todos os vínculos e filtra em memória via `mapCoordinatorSectors`. O resultado é o mesmo conjunto; a consulta traz mais linhas. Aceitável — um usuário tem poucos vínculos — e é o que permite compartilhar o mapeamento com `servant/page.tsx`.

- [ ] **Step 3: Remover a duplicação em `src/app/servant/page.tsx`**

```typescript
// antes (linhas 34-40)
const coordinatorSectors = memberships
  .filter((m) => m.isCoordinator)
  .map((m) => ({
    id: m.sector.id,
    name: m.sector.name,
    ministryId: m.sector.ministry.id,
    ministryName: m.sector.ministry.name,
  }));

// depois
const coordinatorSectors = mapCoordinatorSectors(memberships);
```

E adicione ao topo do arquivo:

```typescript
import { mapCoordinatorSectors } from "@/lib/scope";
```

`servant/page.tsx` é um server component, então importar de um módulo `server-only` é válido.

- [ ] **Step 4: Verificar**

```bash
cd "F:/Developer_Area_f/me/projects/ScaleFlow"
SCRATCH="C:/Users/crist/AppData/Local/Temp/claude/F--Developer-Area-f-me-projects-ScaleFlow/8532f597-d11b-4ef1-a051-08d80488a4fd/scratchpad"
npx tsc --noEmit && sh "$SCRATCH/check-surface.sh" && npm run build 2>&1 | tail -20
```

Esperado: `tsc` limpo; 33 actions; build conclui.

- [ ] **Step 5: Confirmar que nenhum módulo de action importa outro (RNF06)**

```bash
grep -rn "from \"@/lib/actions/" src/lib/actions/ && echo "VIOLA RNF06" || echo "OK: sem import cruzado entre actions"
```

Esperado: `OK: sem import cruzado entre actions`.

- [ ] **Step 6: Repetir a verificação de coordenador e de servo**

Refaça os Steps 4 e 5 da Tarefa 9 — é o que esta tarefa afeta.

- [ ] **Step 7: Rodar o checklist completo dos critérios de aceitação**

```bash
cd "F:/Developer_Area_f/me/projects/ScaleFlow"
echo "--- 1: modulos e tamanhos ---"; wc -l src/lib/actions/*.ts src/lib/scope.ts
echo "--- 3: nenhum tipo em use server ---"; grep -rn "^export interface\|^export type" src/lib/actions/ || echo "OK"
echo "--- 4: server-only ---"; head -1 src/lib/scope.ts
echo "--- 5: sem getAuthFilter ---"; grep -rn "getAuthFilter" src/ || echo "OK"
echo "--- 7: sem barrel ---"; test -f src/lib/actions.ts && echo "BARREL EXISTE" || echo "OK"
echo "--- 8/9/10 ---"; npx tsc --noEmit && npm run lint 2>&1 | tail -6 && npm run build 2>&1 | tail -6
```

- [ ] **Step 8: Atualizar `validation.md` e commitar**

Acrescente a `validation.md` os resultados das Tarefas 10 e 11, marcando os 13 critérios de aceitação da spec.

```bash
git add src/lib src/app specs/02-spec-refatorar-camada-de-actions/validation.md
git commit -m "refactor: getCoordinatorSectors deixa de ser chamada por action e some a duplicacao em servant/page"
```

---

## Self-Review

**Cobertura da spec.** Os 6 requisitos funcionais: RF01 → Tarefa 2; RF02 → Tarefa 3; RF03 → Tarefas 4-8; RF04 → Tarefa 10; RF05 → Tarefas 3 e 11; RF06 → Tarefas 2, 4-8. Os 7 não-funcionais: RNF01 → verificado nas Tarefas 9, 10 Step 6, 11 Step 6; RNF02 → estrutura das tarefas (2-8 movem, 10-11 mudam); RNF03 → Global Constraints; RNF04 → avisos explícitos nas Tarefas 5 (`getServants`, `resetServantPassword`) e 7 (`saveAvailability`); RNF05 → Tarefa 3 Steps 1 e 4; RNF06 → Tarefa 11 Step 5; RNF07 → Tarefa 11 Step 2. Os 13 critérios de aceitação → Tarefa 11 Step 7, exceto 11-13 que são cobertos pela Tarefa 9 (fluxos) e pelo aviso de RNF04.

**Lacuna encontrada e corrigida.** O critério de aceitação 13 ("nenhuma resposta de action carrega `users.password`") não tinha verificação mecânica no plano. Não é possível checar por `grep` porque depende do retorno em runtime. A verificação prática é o aviso de RNF04 nas Tarefas 5 e 7 mais uma conferência: toda ocorrência de `with: { user:` ou `with: { leader:` nos módulos novos deve usar `publicUser`. Rode, na Tarefa 11 Step 7:

```bash
grep -rn "with: { user:\|with: { leader:\|user: {\|leader: {" src/lib/actions/ | grep -v publicUser || echo "OK: toda inclusao de user/leader usa publicUser"
```

**Consistência de nomes.** `getScope()` (Tarefa 10) é usada com esse nome nas Tarefas 10 e 11. `mapCoordinatorSectors` (Tarefa 11 Step 1) é usada com esse nome nos Steps 2 e 3. `Scope` vive em `src/types/scope.ts`, separado de `src/types/domain.ts` — os dois caminhos aparecem consistentes nas Tarefas 10 e 11. `check-surface.sh` é criado na Tarefa 1 e referenciado com o mesmo caminho em todas as seguintes.

**Desvio deliberado do padrão da skill.** A skill pede TDD com teste falhando antes da implementação. Este repositório não tem framework de teste (`CLAUDE.md`: "There is no test suite/framework configured in this repo"), e introduzir um está fora do escopo da spec 02. O substituto é o script de diff de superfície da Tarefa 1, que detecta o modo de falha real de um refactor de movimentação — action perdida ou renomeada — mais `tsc`, `build` e o checklist manual por papel da Tarefa 9, executado como portão antes de qualquer mudança de lógica.
