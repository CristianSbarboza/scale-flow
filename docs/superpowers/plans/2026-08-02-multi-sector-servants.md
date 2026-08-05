# Multi-Sector Servants + Member Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a servant belong to N sectors (already possible at the schema level), surface that everywhere the app reads servant data, and give admin/leader a member-detail panel to add/remove sectors, reset password, and delete a servant account.

**Architecture:** `servants` rows are already one-per-(user,sector) with no uniqueness on `userId` alone, so no schema migration is needed. The data-layer functions that assumed one membership (`getServants`, `getServantOverview`, the servant dashboard's own query) change from `findFirst`/flat-list to `findMany`/grouped-by-person. Four new server actions manage membership/password/deletion, gated by a shared `requireServantAccess` scope check (admin: unrestricted; leader: only servants with a membership in one of their own ministries). A new slide-in panel component (matching the existing `MinistryDetails`/`SectorDetails` visual pattern) is the UI for all of this.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM — no schema changes, no new dependencies.

## Global Constraints

- No test framework in this repo — verify with `npx tsc --noEmit`, `npx eslint <file>`, and (final task) a manual QA pass against the dev server.
- Do not modify `src/db/schema.ts` — the existing `servants` table already supports multiple sectors per user.
- Reuse existing patterns exactly: `.card`/`.glass` classes and `var(--radius)`/`var(--border)`/`var(--muted)`/`var(--muted-foreground)`/`var(--primary)` tokens for anything not following the `MinistryDetails.tsx`/`SectorDetails.tsx` slide-in-panel style (which itself uses Tailwind v4's `bg-(--token)` arbitrary-value syntax — match that file's exact class conventions when touching it, but for the *new* panel component, follow the same Tailwind `-(--token)` syntax since it's a same-family sibling of `SectorDetails.tsx`).
- Never rely on `className="flex ..."`/`className="grid ..."` Tailwind utilities for a layout that needs `align-items` other than `center` or a specific `gap` value — a same-named unlayered custom class in `globals.css` silently overrides Tailwind's utility of the same name. Use inline `style={{ display: 'flex', ... }}` instead (see `ScheduleEditor.tsx`/`ScheduleManager.tsx` for the established fix).
- Use `useToast()` (`src/components/Toast.tsx`) for success/error feedback and `useConfirm()` (`src/components/ConfirmDialog.tsx`) for destructive-action confirmation — both are already wired globally in `src/components/Providers.tsx`. Never use native `alert`/`confirm`.
- Per project policy, do not `git commit`/`git push` — these steps stop at "verify." Committing happens only if the user asks for it after reviewing.

---

### Task 1: Rewrite `getServants()` and `getServantOverview()` to aggregate multiple sectors per person

**Files:**
- Modify: `src/lib/actions.ts`

**Interfaces:**
- Consumes: existing `db`, `servants`, `sectors`, `ministries`, `schedules`, `scheduleAssignments`, `scheduleAvailability` (already imported), `getAuthFilter()` (existing helper in this file).
- Produces:
  - `export interface ServantMembership { servantId: number; sectorId: number; sectorName: string; ministryId: number; ministryName: string; }`
  - `export interface ServantSummary { userId: string; name: string; username: string | null; email: string | null; memberships: ServantMembership[]; }`
  - `export async function getServants(): Promise<ServantSummary[]>` (replaces the current one-row-per-membership version — same export name, new return shape)
  - `getServantOverview()` keeps its existing exported signature and return type (`Promise<ServantOverviewSchedule[]>`) — only its internal implementation changes to loop over all of the caller's sector memberships instead of just the first.

- [ ] **Step 1: Replace `getServants()`**

Find the current `getServants()` function (it starts with `export async function getServants() {` and ends with the closing `}` right before the `export interface ServantOverviewDate {` block) and replace the whole function with:

```ts
export interface ServantMembership {
  servantId: number;
  sectorId: number;
  sectorName: string;
  ministryId: number;
  ministryName: string;
}

export interface ServantSummary {
  userId: string;
  name: string;
  username: string | null;
  email: string | null;
  memberships: ServantMembership[];
}

export async function getServants(): Promise<ServantSummary[]> {
  const leaderId = await getAuthFilter();
  const rows = leaderId
    ? await db.query.servants.findMany({
        where: (servants, { exists }) => exists(
          db.select().from(sectors).where(
            and(
              eq(sectors.id, servants.sectorId),
              exists(
                db.select().from(ministries).where(
                  and(
                    eq(ministries.id, sectors.ministryId),
                    eq(ministries.leaderId, leaderId)
                  )
                )
              )
            )
          )
        ),
        with: {
          user: true,
          sector: { with: { ministry: true } }
        }
      })
    : await db.query.servants.findMany({
        with: {
          user: true,
          sector: { with: { ministry: true } }
        }
      });

  const byUser = new Map<string, ServantSummary>();
  for (const row of rows) {
    const membership: ServantMembership = {
      servantId: row.id,
      sectorId: row.sector.id,
      sectorName: row.sector.name,
      ministryId: row.sector.ministry.id,
      ministryName: row.sector.ministry.name,
    };
    const existing = byUser.get(row.userId);
    if (existing) {
      existing.memberships.push(membership);
    } else {
      byUser.set(row.userId, {
        userId: row.userId,
        name: row.user.name,
        username: row.user.username,
        email: row.user.email,
        memberships: [membership],
      });
    }
  }
  return Array.from(byUser.values());
}
```

- [ ] **Step 2: Rewrite `getServantOverview()`'s body**

Find the existing `getServantOverview()` function and replace its body (keep the `export async function getServantOverview(): Promise<ServantOverviewSchedule[]> {` signature line) with:

```ts
export async function getServantOverview(): Promise<ServantOverviewSchedule[]> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const memberships = await db.query.servants.findMany({
    where: eq(servants.userId, session.user.id),
  });
  if (memberships.length === 0) return [];

  const results: ServantOverviewSchedule[] = [];
  for (const servant of memberships) {
    const sectorSchedules = await db.query.schedules.findMany({
      where: eq(schedules.sectorId, servant.sectorId),
      with: {
        ministry: true,
        sector: true,
        dates: {
          with: {
            assignments: { where: eq(scheduleAssignments.servantId, servant.id) },
            availabilities: { where: eq(scheduleAvailability.servantId, servant.id) },
          },
        },
      },
    });

    for (const s of sectorSchedules) {
      results.push({
        id: s.id,
        name: s.name,
        ministryName: s.ministry.name,
        sectorName: s.sector.name,
        shareLink: s.shareLink,
        servantId: servant.id,
        dates: s.dates.map((d) => ({
          id: d.id,
          date: d.date,
          startTime: d.startTime,
          confirmed: d.assignments.length > 0,
          available: d.availabilities.length > 0,
        })),
      });
    }
  }
  return results;
}
```

Do not touch the `ServantOverviewDate`/`ServantOverviewSchedule` interfaces above it — they stay exactly as they are.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors in `src/app/admin/servants/page.tsx` and `src/app/servant/page.tsx` (they consume the old `getServants()`/servant-lookup shape) — that's expected, Tasks 3 and 5 fix them. Confirm there are **no** errors reported inside `src/lib/actions.ts` itself.

- [ ] **Step 4: Lint**

Run: `npx eslint src/lib/actions.ts`
Expected: no errors/warnings.

---

### Task 2: Add membership-management actions (`addServantToSector`, `removeServantFromSector`, `resetServantPassword`, `deleteServantAccount`)

**Files:**
- Modify: `src/lib/actions.ts`

**Interfaces:**
- Consumes: `getServerSession`, `authOptions`, `db`, `servants`, `sectors`, `ministries`, `users`, `hash` (all already imported in this file).
- Produces:
  - `export async function addServantToSector(userId: string, sectorId: number): Promise<void>`
  - `export async function removeServantFromSector(servantId: number): Promise<void>`
  - `export async function resetServantPassword(userId: string, newPassword: string): Promise<void>`
  - `export async function deleteServantAccount(userId: string): Promise<void>`
  - These are consumed by Task 4's `ServantMemberDetails.tsx`.

- [ ] **Step 1: Add the actions**

Insert this block at the end of `src/lib/actions.ts` (after the existing `registerUser` function, which is the last thing in the file):

```ts
async function requireServantAccess(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "admin" && session.user.role !== "leader")) {
    throw new Error("Não autorizado");
  }
  if (session.user.role === "admin") return;

  const [membership] = await db.select().from(servants)
    .innerJoin(sectors, eq(servants.sectorId, sectors.id))
    .innerJoin(ministries, eq(sectors.ministryId, ministries.id))
    .where(and(eq(servants.userId, userId), eq(ministries.leaderId, session.user.id)));

  if (!membership) {
    throw new Error("Não autorizado a gerenciar este membro");
  }
}

export async function addServantToSector(userId: string, sectorId: number) {
  await requireServantAccess(userId);

  const session = await getServerSession(authOptions);
  if (session!.user.role === "leader") {
    const [sector] = await db.select().from(sectors)
      .innerJoin(ministries, eq(sectors.ministryId, ministries.id))
      .where(and(eq(sectors.id, sectorId), eq(ministries.leaderId, session!.user.id)));
    if (!sector) throw new Error("Não autorizado a adicionar este setor");
  }

  const [existing] = await db.select().from(servants).where(
    and(eq(servants.userId, userId), eq(servants.sectorId, sectorId))
  );
  if (!existing) {
    await db.insert(servants).values({ userId, sectorId });
  }

  revalidatePath("/admin/servants");
  revalidatePath("/servant");
}

export async function removeServantFromSector(servantId: number) {
  const [membership] = await db.select().from(servants).where(eq(servants.id, servantId));
  if (!membership) throw new Error("Vínculo não encontrado");
  await requireServantAccess(membership.userId);

  await db.delete(servants).where(eq(servants.id, servantId));

  revalidatePath("/admin/servants");
  revalidatePath("/servant");
}

export async function resetServantPassword(userId: string, newPassword: string) {
  await requireServantAccess(userId);

  const hashedPassword = await hash(newPassword, 10);
  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));

  revalidatePath("/admin/servants");
}

export async function deleteServantAccount(userId: string) {
  await requireServantAccess(userId);

  await db.delete(users).where(eq(users.id, userId));

  revalidatePath("/admin/servants");
  revalidatePath("/admin/sectors");
  revalidatePath("/admin/ministries");
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/lib/actions.ts`
Expected: same pre-existing errors from Task 1's Step 3 (in the two page files not yet updated), no new errors inside `actions.ts`.

---

### Task 3: Update `src/app/servant/page.tsx` for multiple sector memberships

**Files:**
- Modify: `src/app/servant/page.tsx`

**Interfaces:**
- Consumes: `getServantOverview` (Task 1, unchanged signature), `db.query.servants` (schema relation, unchanged).

- [ ] **Step 1: Replace the servant-lookup and sector-name logic**

Find this block near the top of the component body:

```tsx
  const servant = await db.query.servants.findFirst({
    where: eq(servants.userId, session.user.id),
    with: {
      sector: { with: { ministry: true } }
    }
  });

  if (!servant) {
    return <div>Perfil de servo não encontrado.</div>;
  }
```

Replace it with:

```tsx
  const memberships = await db.query.servants.findMany({
    where: eq(servants.userId, session.user.id),
    with: {
      sector: { with: { ministry: true } }
    }
  });

  if (memberships.length === 0) {
    return <div>Perfil de servo não encontrado.</div>;
  }

  const sectorNames = memberships.map((m) => m.sector.name).join(", ");
```

- [ ] **Step 2: Update the two places that read `servant.sector.name`**

There are two occurrences of `servant.sector.name` in this file (one in the desktop header block, one passed to `<ServantProfileMenu sectorName={...} />` in the mobile header row). Replace both occurrences of `servant.sector.name` with `sectorNames`.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/app/servant/page.tsx`
Expected: no errors for this file (some errors may still remain in `src/app/admin/servants/page.tsx` until Task 5 — that's expected).

---

### Task 4: `ServantMemberDetails` component

**Files:**
- Create: `src/components/ServantMemberDetails.tsx`

**Interfaces:**
- Consumes: `ServantSummary`/`ServantMembership` types (Task 1), `addServantToSector`/`removeServantFromSector`/`resetServantPassword`/`deleteServantAccount` (Task 2), `useToast` (`src/components/Toast.tsx`), `useConfirm` (`src/components/ConfirmDialog.tsx`).
- Produces: `export default function ServantMemberDetails({ member, sectors, onClose, onChange }: Props)`, used by Task 5's `admin/servants/page.tsx`.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, LayoutGrid, KeyRound, Trash2 } from "lucide-react";
import { addServantToSector, removeServantFromSector, resetServantPassword, deleteServantAccount } from "@/lib/actions";
import type { ServantSummary } from "@/lib/actions";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";

interface SectorOption {
  id: number;
  name: string;
  ministry: { id: number; name: string };
}

interface Props {
  member: ServantSummary;
  sectors: SectorOption[];
  onClose: () => void;
  onChange: () => void;
}

export default function ServantMemberDetails({ member: initialMember, sectors, onClose, onChange }: Props) {
  const { showToast } = useToast();
  const askConfirm = useConfirm();
  const [member, setMember] = useState(initialMember);
  const [selectedSectorId, setSelectedSectorId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [addingLoading, setAddingLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const availableSectors = sectors.filter(
    (s) => !member.memberships.some((m) => m.sectorId === s.id)
  );

  const handleAddSector = async () => {
    if (!selectedSectorId) return;
    setAddingLoading(true);
    try {
      await addServantToSector(member.userId, parseInt(selectedSectorId));
      const sector = sectors.find((s) => s.id === parseInt(selectedSectorId))!;
      setMember((prev) => ({
        ...prev,
        memberships: [
          ...prev.memberships,
          {
            servantId: -Date.now(),
            sectorId: sector.id,
            sectorName: sector.name,
            ministryId: sector.ministry.id,
            ministryName: sector.ministry.name,
          },
        ],
      }));
      setSelectedSectorId("");
      onChange();
      showToast("Setor adicionado.", "success");
    } catch (error) {
      console.error(error);
      showToast("Erro ao adicionar setor.", "error");
    } finally {
      setAddingLoading(false);
    }
  };

  const handleRemoveSector = async (servantId: number, sectorName: string) => {
    const ok = await askConfirm({
      title: "Remover de setor",
      message: `Remover ${member.name} do setor ${sectorName}? A disponibilidade e confirmações dele nesse setor também serão apagadas.`,
      confirmLabel: "Remover",
    });
    if (!ok) return;

    try {
      await removeServantFromSector(servantId);
      setMember((prev) => ({
        ...prev,
        memberships: prev.memberships.filter((m) => m.servantId !== servantId),
      }));
      onChange();
      showToast("Removido do setor.", "success");
    } catch (error) {
      console.error(error);
      showToast("Erro ao remover do setor.", "error");
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword) return;
    setPasswordLoading(true);
    try {
      await resetServantPassword(member.userId, newPassword);
      setNewPassword("");
      showToast("Senha alterada.", "success");
    } catch (error) {
      console.error(error);
      showToast("Erro ao alterar senha.", "error");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDelete = async () => {
    const ok = await askConfirm({
      title: "Excluir membro",
      message: `Excluir ${member.name} definitivamente? A conta, todos os vínculos e o histórico de disponibilidade/confirmação serão apagados. Essa ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
    });
    if (!ok) return;

    try {
      await deleteServantAccount(member.userId);
      onChange();
      onClose();
      showToast("Membro excluído.", "success");
    } catch (error) {
      console.error(error);
      showToast("Erro ao excluir membro.", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
      />

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-2xl h-full bg-(--background) border-l border-(--border) flex flex-col shadow-2xl"
      >
        <div className="flex justify-between items-center px-12 py-10 border-b border-(--border)">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">{member.name}</h2>
            <p className="text-(--muted-foreground) text-sm mt-1">
              {member.username ? `usuário: ${member.username}` : (member.email || "-")}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost border border-(--border)">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-12" style={{ display: "grid", gap: "2.5rem" }}>
          <div>
            <div className="flex items-center gap-3" style={{ marginBottom: "1.5rem" }}>
              <LayoutGrid size={18} className="text-(--primary)" />
              <h3 className="text-white text-sm font-bold uppercase tracking-widest">Setores</h3>
            </div>

            <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {member.memberships.map((m) => (
                <div
                  key={m.servantId}
                  className="card"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div>
                    <p style={{ fontWeight: 600 }}>{m.sectorName}</p>
                    <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>{m.ministryName}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveSector(m.servantId, m.sectorName)}
                    style={{ color: "#ef4444", padding: "0.5rem" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {member.memberships.length === 0 && (
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>Sem setores vinculados.</p>
              )}
            </div>

            {availableSectors.length > 0 && (
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <select
                  className="input"
                  value={selectedSectorId}
                  onChange={(e) => setSelectedSectorId(e.target.value)}
                >
                  <option value="">Selecione um setor</option>
                  {availableSectors.map((s) => (
                    <option key={s.id} value={s.id}>{s.ministry.name} - {s.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddSector}
                  className="btn btn-primary"
                  disabled={!selectedSectorId || addingLoading}
                >
                  Adicionar
                </button>
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "2rem" }}>
            <div className="flex items-center gap-3" style={{ marginBottom: "1.5rem" }}>
              <KeyRound size={18} className="text-(--primary)" />
              <h3 className="text-white text-sm font-bold uppercase tracking-widest">Zona de Risco</h3>
            </div>

            <div style={{ display: "grid", gap: "0.75rem", marginBottom: "2rem" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>Nova senha</label>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <input
                  className="input"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                />
                <button
                  onClick={handleChangePassword}
                  className="btn btn-secondary"
                  disabled={!newPassword || passwordLoading}
                >
                  Alterar Senha
                </button>
              </div>
            </div>

            <button onClick={handleDelete} className="btn" style={{ width: "100%", background: "#ef4444", color: "white" }}>
              <Trash2 size={18} />
              Excluir Membro
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/ServantMemberDetails.tsx`
Expected: no errors for this file.

---

### Task 5: Rewrite `admin/servants/page.tsx` list to group by person and wire in the detail panel

**Files:**
- Modify: `src/app/admin/servants/page.tsx`

**Interfaces:**
- Consumes: `getServants` (Task 1, new `ServantSummary[]` shape), `ServantMemberDetails` (Task 4).

- [ ] **Step 1: Replace the `Servant` interface and related state**

Replace:

```tsx
interface Servant {
  id: number;
  user: { name: string; username: string | null; email: string | null };
  sector: { id: number; name: string; ministry: { id: number; name: string } };
}
```

with:

```tsx
interface Membership {
  servantId: number;
  sectorId: number;
  sectorName: string;
  ministryId: number;
  ministryName: string;
}

interface ServantSummary {
  userId: string;
  name: string;
  username: string | null;
  email: string | null;
  memberships: Membership[];
}
```

Then find:

```tsx
export default function ServantsPage() {
  const { data: session } = useSession();
  const isLeader = session?.user.role === "leader";
  const [servants, setServants] = useState<Servant[]>([]);
```

and change the state type:

```tsx
export default function ServantsPage() {
  const { data: session } = useSession();
  const isLeader = session?.user.role === "leader";
  const [servants, setServants] = useState<ServantSummary[]>([]);
  const [selectedMember, setSelectedMember] = useState<ServantSummary | null>(null);
```

Update the two `as unknown as Servant[]` casts (one in the initial `useEffect` load, one in `handleCreate`'s refresh) to `as unknown as ServantSummary[]`.

- [ ] **Step 2: Add the import for `ServantMemberDetails`**

Add to the top imports:

```tsx
import ServantMemberDetails from "@/components/ServantMemberDetails";
```

- [ ] **Step 3: Update the filter logic**

Replace:

```tsx
  const filteredServants = servants.filter(s => {
    const matchesSearch = s.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
                          (s.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesMinistry = filterMinistryId === "all" || s.sector.ministry.id === parseInt(filterMinistryId);
    const matchesSector = filterSectorId === "all" || s.sector.id === parseInt(filterSectorId);
    return matchesSearch && matchesMinistry && matchesSector;
  });
```

with:

```tsx
  const filteredServants = servants.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.username?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
                          (s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesMinistry = filterMinistryId === "all" || s.memberships.some(m => m.ministryId === parseInt(filterMinistryId));
    const matchesSector = filterSectorId === "all" || s.memberships.some(m => m.sectorId === parseInt(filterSectorId));
    return matchesSearch && matchesMinistry && matchesSector;
  });
```

- [ ] **Step 4: Replace the table body (columns and rows)**

Replace this whole block:

```tsx
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Nome</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Usuário</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Setor</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Ministério</th>
                  <th style={{ padding: '1rem 0.5rem' }}>E-mail</th>
                </tr>
              </thead>
              <tbody>
                {filteredServants.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem 0.5rem' }}>{s.user.name}</td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--muted-foreground)' }}>{s.user.username || "-"}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        background: 'var(--muted)',
                        borderRadius: '1rem'
                      }}>
                        {s.sector.name}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{s.sector.ministry.name}</span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--muted-foreground)' }}>{s.user.email || "-"}</td>
                  </tr>
                ))}
                {filteredServants.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
                      Nenhum servo encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
```

with:

```tsx
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Nome</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Usuário/E-mail</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Setores</th>
                </tr>
              </thead>
              <tbody>
                {filteredServants.map((s) => (
                  <tr
                    key={s.userId}
                    onClick={() => setSelectedMember(s)}
                    className="cursor-pointer hover:bg-white/5 transition-colors"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td style={{ padding: '1rem 0.5rem' }}>{s.name}</td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--muted-foreground)' }}>{s.username || s.email || "-"}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                        {s.memberships.map((m) => (
                          <span
                            key={m.servantId}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem',
                              background: 'var(--muted)',
                              borderRadius: '1rem'
                            }}
                          >
                            {m.sectorName}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredServants.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
                      Nenhum servo encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
```

- [ ] **Step 5: Render the detail panel**

Find the closing of the page's root `<div className="animate-fade-in">` (the very end of the component's returned JSX, right before the final `</div>\n  );\n}`), and add the panel just before that closing `</div>`:

```tsx
      {selectedMember && (
        <ServantMemberDetails
          member={selectedMember}
          sectors={sectors}
          onClose={() => setSelectedMember(null)}
          onChange={() => {
            getServants().then((srv) => setServants(srv as unknown as ServantSummary[]));
          }}
        />
      )}
```

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/app/admin/servants/page.tsx`
Expected: zero errors anywhere in the project now — this was the last file with pending errors from Tasks 1-2.

---

### Task 6: Manual QA pass

**Files:** none (verification only)

- [ ] **Step 1: Full project verification**

Run: `npx tsc --noEmit && npx eslint src/ && npx next build`
Expected: all three clean (build succeeds, no type/lint errors anywhere).

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`

- [ ] **Step 3: Verify multi-sector add/remove**

Log in as admin. Open "Servos Cadastrados", click an existing member (e.g. the seeded `cristian.barboza`) — the panel opens showing their current sector(s). Add a second sector (e.g. "Fotografia") via the dropdown — confirm it appears in both the panel and, after closing, in the table's chip list for that row.

- [ ] **Step 4: Verify remove**

In the same panel, remove one of the two sectors — confirm the `ConfirmDialog` appears with the warning text, confirm removal, and that the chip disappears from the table after closing.

- [ ] **Step 5: Verify the servant's own dashboard aggregates both sectors**

Log out, log in as that servant. Confirm `/servant`'s header shows both sector names (comma-separated), and that "Todas as Escalas" lists schedules from both sectors (create a second schedule in the second sector as admin first if none exists).

- [ ] **Step 6: Verify password reset**

As admin, open the member panel again, set a new password via "Alterar Senha", confirm the toast. Log out, log in as that servant with the new password — confirm it works.

- [ ] **Step 7: Verify delete**

As admin, open the panel for a **disposable test servant** (not `cristian.barboza` — create a throwaway one first via "Cadastrar Novo Servo" for this step, or use one of the seed accounts you don't need), click "Excluir Membro", confirm the `ConfirmDialog` warning, confirm deletion, and verify the row disappears from the table and that logging in with that account's credentials now fails.

- [ ] **Step 8: Verify leader scoping**

Log in as a leader (create one via `createMinistry` as admin if none exists locally). Confirm "Servos Cadastrados" only shows servants with a membership in that leader's own ministry/sector, and that the "add to sector" dropdown in the member panel only offers sectors that leader controls.
