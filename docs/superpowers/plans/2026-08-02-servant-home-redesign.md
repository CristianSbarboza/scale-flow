# Servant Home Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `/servant` page with a tabbed home (Calendário / Escalas do Mês / Todas as Escalas) showing a monthly calendar of confirmed days, and lists of the servant's sector schedules with a fill-status chip.

**Architecture:** One new read-only server action (`getServantOverview`) in `src/lib/actions.ts` builds a single data structure — every schedule for the servant's sector, with each date flagged `confirmed`/`available` for that specific servant — consumed by four new client components (`ServantCalendar`, `ServantScheduleList`, `ServantScheduleDetailModal`, `ServantHome`) wired together in a rewritten `src/app/servant/page.tsx`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, plain CSS (design-system tokens) — no new dependencies, no date library (native `Date` only, month-grid math is simple enough not to justify one).

## Global Constraints

- No test framework exists in this repo (confirmed: no `test` script, no test files). Verification steps below use `npx tsc --noEmit`, `npx eslint <file>`, and manual checks against the running dev server instead of automated tests.
- Do not add new npm dependencies.
- Reuse existing design tokens exactly: `var(--radius)`, `var(--border)`, `var(--card-border)`, `var(--muted)`, `var(--muted-foreground)`, `var(--primary)`, the `.card`/`.glass`/`.btn`/`.btn-ghost`/`.input` classes, and the `#10b981` green already used everywhere for "confirmed"/"success" states.
- **Known cascade bug:** `src/app/globals.css` defines unlayered `.flex`/`.grid` classes that always beat Tailwind's own `flex`/`grid` utilities of the same name, silently forcing `align-items: center` and a fixed `gap`. Never rely on `className="flex ..."` or `className="grid ..."` (Tailwind utilities) for layouts that need `align-items: flex-start`/`stretch` or a custom `gap` — use inline `style={{ display: 'flex', ... }}` instead, as already done in `ScheduleEditor.tsx` / `ScheduleManager.tsx`. Tailwind classes for things the custom classes don't touch (`fixed`, `inset-0`, `z-50`, `bg-black/80`, `backdrop-blur-md`, `max-w-*`, `overflow-hidden`) are safe to keep.
- Per project policy, do not `git commit` automatically — these steps stop at "verify," not "commit." Committing happens later only if the user asks for it.

---

### Task 1: `getServantOverview()` server action

**Files:**
- Modify: `src/lib/actions.ts` (insert after the `getServants()` function, before the `// Schedules` section comment)

**Interfaces:**
- Consumes: existing `db`, `servants`, `schedules`, `scheduleAssignments`, `scheduleAvailability` (already imported in the file), `getServerSession`/`authOptions` (already imported).
- Produces:
  - `export interface ServantOverviewDate { id: number; date: string; startTime: string; confirmed: boolean; available: boolean; }`
  - `export interface ServantOverviewSchedule { id: number; name: string; ministryName: string; sectorName: string; dates: ServantOverviewDate[]; }`
  - `export async function getServantOverview(): Promise<ServantOverviewSchedule[]>`

- [ ] **Step 1: Add the types and function**

Insert this block immediately after the closing `}` of `getServants()` (i.e. right before the `// Schedules` comment):

```ts
export interface ServantOverviewDate {
  id: number;
  date: string;
  startTime: string;
  confirmed: boolean;
  available: boolean;
}

export interface ServantOverviewSchedule {
  id: number;
  name: string;
  ministryName: string;
  sectorName: string;
  dates: ServantOverviewDate[];
}

// Returns every schedule for the logged-in servant's sector, with each date
// flagged for whether THIS servant is confirmed/has sent availability on it.
export async function getServantOverview(): Promise<ServantOverviewSchedule[]> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const servant = await db.query.servants.findFirst({
    where: eq(servants.userId, session.user.id),
  });
  if (!servant) return [];

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

  return sectorSchedules.map((s) => ({
    id: s.id,
    name: s.name,
    ministryName: s.ministry.name,
    sectorName: s.sector.name,
    dates: s.dates.map((d) => ({
      id: d.id,
      date: d.date,
      startTime: d.startTime,
      confirmed: d.assignments.length > 0,
      available: d.availabilities.length > 0,
    })),
  }));
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (the function isn't called anywhere yet, so this only validates the code you just wrote is syntactically/type correct standalone).

- [ ] **Step 3: Lint**

Run: `npx eslint src/lib/actions.ts`
Expected: no new errors/warnings.

Functional verification of this action happens in Task 6, once it's wired into the page (it depends on `getServerSession`, which needs a real request context and can't be exercised from a standalone script).

---

### Task 2: `ServantCalendar` component

**Files:**
- Create: `src/components/ServantCalendar.tsx`
- Modify: `src/app/globals.css` (append calendar grid CSS at the end of the file)

**Interfaces:**
- Consumes: `ServantOverviewSchedule` type from `src/lib/actions.ts` (Task 1).
- Produces: `export default function ServantCalendar({ schedules }: { schedules: ServantOverviewSchedule[] })`, a default export used by `ServantHome` (Task 5).

- [ ] **Step 1: Append calendar grid CSS**

Add to the end of `src/app/globals.css`:

```css
.servant-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.375rem;
}

.servant-calendar-cell {
  aspect-ratio: 1;
  width: 100%;
  border: none;
  border-radius: var(--radius);
  font-size: clamp(0.75rem, 2.5vw, 0.9375rem);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 2: Create the component**

```tsx
"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, MapPin, X } from "lucide-react";
import type { ServantOverviewSchedule } from "@/lib/actions";

interface ServantCalendarProps {
  schedules: ServantOverviewSchedule[];
}

interface DayEntry {
  scheduleName: string;
  ministryName: string;
  sectorName: string;
  startTime: string;
}

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function ServantCalendar({ schedules }: ServantCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const confirmedByDay = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    for (const schedule of schedules) {
      for (const date of schedule.dates) {
        if (!date.confirmed) continue;
        const key = date.date.slice(0, 10);
        const entry: DayEntry = {
          scheduleName: schedule.name,
          ministryName: schedule.ministryName,
          sectorName: schedule.sectorName,
          startTime: date.startTime,
        };
        map.set(key, [...(map.get(key) ?? []), entry]);
      }
    }
    return map;
  }, [schedules]);

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const goToMonth = (offset: number) => {
    const next = new Date(viewYear, viewMonth + offset, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const selectedEntries = selectedDay ? confirmedByDay.get(selectedDay) ?? [] : [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <button onClick={() => goToMonth(-1)} className="btn btn-ghost" style={{ padding: "0.5rem" }} aria-label="Mês anterior">
          <ChevronLeft size={20} />
        </button>
        <h3 style={{ textTransform: "capitalize" }}>{monthLabel}</h3>
        <button onClick={() => goToMonth(1)} className="btn btn-ghost" style={{ padding: "0.5rem" }} aria-label="Próximo mês">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="servant-calendar-grid">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--muted-foreground)", fontWeight: 600 }}>
            {label}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = toDateKey(viewYear, viewMonth, day);
          const entries = confirmedByDay.get(key);
          const isConfirmed = !!entries?.length;
          return (
            <button
              key={i}
              type="button"
              disabled={!isConfirmed}
              onClick={() => setSelectedDay(key)}
              className="servant-calendar-cell"
              style={{
                background: isConfirmed ? "rgba(16, 185, 129, 0.15)" : "transparent",
                color: isConfirmed ? "#10b981" : "var(--foreground)",
                fontWeight: isConfirmed ? 700 : 400,
                cursor: isConfirmed ? "pointer" : "default",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="card glass"
            style={{ width: "100%", maxWidth: "360px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3>
                {new Date(`${selectedDay}T00:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="btn btn-ghost" style={{ borderRadius: "50%", padding: "0.5rem" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {selectedEntries.map((entry, i) => (
                <div key={i} style={{ padding: "0.75rem 1rem", background: "var(--muted)", borderRadius: "var(--radius)" }}>
                  <p style={{ fontWeight: 600, marginBottom: "0.375rem" }}>{entry.scheduleName}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                    <Clock size={14} /> {entry.startTime}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
                    <MapPin size={14} /> {entry.ministryName} - {entry.sectorName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/ServantCalendar.tsx`
Expected: no errors. (The component isn't rendered anywhere yet — this only validates it compiles standalone. Visual/functional check happens in Task 6.)

---

### Task 3: `ServantScheduleDetailModal` component

**Files:**
- Create: `src/components/ServantScheduleDetailModal.tsx`

**Interfaces:**
- Consumes: `ServantOverviewSchedule` type from `src/lib/actions.ts` (Task 1).
- Produces: `export default function ServantScheduleDetailModal({ schedule, onClose }: { schedule: ServantOverviewSchedule; onClose: () => void })`, used by `ServantScheduleList` (Task 4).

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { X, Clock, CalendarDays } from "lucide-react";
import type { ServantOverviewSchedule } from "@/lib/actions";

interface ServantScheduleDetailModalProps {
  schedule: ServantOverviewSchedule;
  onClose: () => void;
}

function statusFor(date: ServantOverviewSchedule["dates"][number]) {
  if (date.confirmed) return { label: "Confirmado", color: "#10b981" };
  if (date.available) return { label: "Disponibilidade enviada (aguardando confirmação)", color: "var(--primary)" };
  return { label: "Não enviado", color: "var(--muted-foreground)" };
}

export default function ServantScheduleDetailModal({ schedule, onClose }: ServantScheduleDetailModalProps) {
  const sortedDates = [...schedule.dates].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="glass w-full max-w-lg max-h-[85vh]"
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius)",
          border: "1px solid var(--card-border)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ marginBottom: "0.25rem" }}>{schedule.name}</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
              {schedule.ministryName} · {schedule.sectorName}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ borderRadius: "50%", padding: "0.5rem" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "1.5rem", overflowY: "auto", display: "grid", gap: "0.75rem" }}>
          {sortedDates.map((date) => {
            const status = statusFor(date);
            return (
              <div
                key={date.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  background: "var(--muted)",
                  borderRadius: "var(--radius)",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontWeight: 600, fontSize: "0.9375rem" }}>
                    <CalendarDays size={16} color="var(--primary)" />
                    {new Date(`${date.date.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
                    <Clock size={13} /> {date.startTime}
                  </div>
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: status.color, textAlign: "right" }}>
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/ServantScheduleDetailModal.tsx`
Expected: no errors.

---

### Task 4: `ServantScheduleList` component

**Files:**
- Create: `src/components/ServantScheduleList.tsx`

**Interfaces:**
- Consumes: `ServantOverviewSchedule` type (Task 1), `ServantScheduleDetailModal` default export (Task 3).
- Produces: `export default function ServantScheduleList({ schedules, monthFilter, emptyMessage }: { schedules: ServantOverviewSchedule[]; monthFilter?: { year: number; month: number }; emptyMessage: string })`, used by `ServantHome` (Task 5).

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import type { ServantOverviewSchedule } from "@/lib/actions";
import ServantScheduleDetailModal from "@/components/ServantScheduleDetailModal";

interface ServantScheduleListProps {
  schedules: ServantOverviewSchedule[];
  monthFilter?: { year: number; month: number };
  emptyMessage: string;
}

export default function ServantScheduleList({ schedules, monthFilter, emptyMessage }: ServantScheduleListProps) {
  const [selectedSchedule, setSelectedSchedule] = useState<ServantOverviewSchedule | null>(null);

  const visibleSchedules = monthFilter
    ? schedules.filter((s) =>
        s.dates.some((d) => {
          const parsed = new Date(`${d.date.slice(0, 10)}T00:00:00`);
          return parsed.getFullYear() === monthFilter.year && parsed.getMonth() === monthFilter.month;
        })
      )
    : schedules;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {visibleSchedules.length === 0 && (
        <div className="card glass" style={{ textAlign: "center", padding: "3rem", color: "var(--muted-foreground)" }}>
          {emptyMessage}
        </div>
      )}
      {visibleSchedules.map((schedule) => {
        const filled = schedule.dates.some((d) => d.available);
        return (
          <button
            key={schedule.id}
            type="button"
            onClick={() => setSelectedSchedule(schedule)}
            className="card glass"
            style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <div>
                <h4 style={{ fontSize: "1.0625rem", marginBottom: "0.25rem" }}>{schedule.name}</h4>
                <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                  {schedule.ministryName} · {schedule.sectorName}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                  <Calendar size={14} /> {schedule.dates.length} {schedule.dates.length === 1 ? "data" : "datas"}
                </div>
              </div>
              <span
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: "1rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  background: filled ? "rgba(16, 185, 129, 0.15)" : "rgba(249, 115, 22, 0.15)",
                  color: filled ? "#10b981" : "var(--primary)",
                }}
              >
                {filled ? "Preenchido" : "Pendente"}
              </span>
            </div>
          </button>
        );
      })}

      {selectedSchedule && (
        <ServantScheduleDetailModal schedule={selectedSchedule} onClose={() => setSelectedSchedule(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/ServantScheduleList.tsx`
Expected: no errors.

---

### Task 5: `ServantHome` component (tab controller)

**Files:**
- Create: `src/components/ServantHome.tsx`
- Modify: `src/app/globals.css` (append tab bar CSS at the end of the file)

**Interfaces:**
- Consumes: `ServantOverviewSchedule` type (Task 1), `ServantCalendar` default export (Task 2), `ServantScheduleList` default export (Task 4).
- Produces: `export default function ServantHome({ schedules }: { schedules: ServantOverviewSchedule[] })`, used by `src/app/servant/page.tsx` (Task 6).

- [ ] **Step 1: Append tab bar CSS**

Add to the end of `src/app/globals.css`:

```css
.servant-tabbar {
  display: flex;
  gap: 0.5rem;
}

.servant-tab-content {
  padding-bottom: 0;
}

@media (max-width: 640px) {
  .servant-tabbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 40;
    padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
    background: var(--card);
    border-top: 1px solid var(--border);
  }

  .servant-tab-content {
    padding-bottom: 5rem;
  }
}
```

- [ ] **Step 2: Create the component**

```tsx
"use client";

import { useState } from "react";
import { CalendarDays, CalendarRange, ListChecks } from "lucide-react";
import type { ServantOverviewSchedule } from "@/lib/actions";
import ServantCalendar from "@/components/ServantCalendar";
import ServantScheduleList from "@/components/ServantScheduleList";

type Tab = "calendar" | "month" | "all";

const TABS: { value: Tab; label: string; icon: typeof CalendarDays }[] = [
  { value: "calendar", label: "Calendário", icon: CalendarDays },
  { value: "month", label: "Escalas do Mês", icon: CalendarRange },
  { value: "all", label: "Todas as Escalas", icon: ListChecks },
];

interface ServantHomeProps {
  schedules: ServantOverviewSchedule[];
}

export default function ServantHome({ schedules }: ServantHomeProps) {
  const [tab, setTab] = useState<Tab>("calendar");
  const today = new Date();

  return (
    <div className="servant-tab-content">
      <nav className="servant-tabbar">
        {TABS.map((t) => {
          const isActive = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.5rem",
                borderRadius: "var(--radius)",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: isActive ? "var(--primary)" : "var(--muted-foreground)",
              }}
            >
              <t.icon size={20} />
              {t.label}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: "1.5rem" }}>
        {tab === "calendar" && <ServantCalendar schedules={schedules} />}
        {tab === "month" && (
          <ServantScheduleList
            schedules={schedules}
            monthFilter={{ year: today.getFullYear(), month: today.getMonth() }}
            emptyMessage="Nenhuma escala do seu setor com datas neste mês."
          />
        )}
        {tab === "all" && (
          <ServantScheduleList schedules={schedules} emptyMessage="Nenhuma escala encontrada para o seu setor." />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/ServantHome.tsx`
Expected: no errors.

---

### Task 6: Wire into `src/app/servant/page.tsx`

**Files:**
- Modify: `src/app/servant/page.tsx` (full rewrite of the existing file)

**Interfaces:**
- Consumes: `getServantOverview` (Task 1), `ServantHome` default export (Task 5).
- Produces: the rendered `/servant` route — nothing else depends on this file.

- [ ] **Step 1: Replace the file contents**

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { servants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Calendar, User } from "lucide-react";
import { getServantOverview } from "@/lib/actions";
import ServantHome from "@/components/ServantHome";

export default async function ServantDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const servant = await db.query.servants.findFirst({
    where: eq(servants.userId, session.user.id),
    with: {
      sector: { with: { ministry: true } }
    }
  });

  if (!servant) {
    return <div>Perfil de servo não encontrado.</div>;
  }

  const schedules = await getServantOverview();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <header className="glass" style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={24} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>ScaleFlow</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 600 }}>{session.user?.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{servant.sector.name}</p>
            </div>
            <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '0.75rem' }}>
              <User size={20} color="white" />
            </div>
          </div>
          <Link href="/api/auth/signout" className="btn btn-ghost" style={{ padding: '0.5rem', color: '#ef4444' }}>
            Sair
          </Link>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Minha Agenda</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Acompanhe seus dias confirmados e responda às escalas do seu setor.</p>
        </div>

        <ServantHome schedules={schedules} />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/app/servant/page.tsx`
Expected: no errors.

---

### Task 7: Manual QA pass

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Confirm baseline data exists**

Log in as `admin@scaleflow.com` / `admin123`, and using the "Líder de Teste" ministry / "Setor de Teste" sector seeded by `src/db/seed.ts`, create (if not already present) at least one schedule with 2+ dates: one date in the current month, one in a different month. Use the public link (`/escala/[link]`) or the servant's assignment flow to give `servo.teste` an availability on at least one date, and confirm (assign) `servo.teste` on at least one date as admin/leader (`Ver detalhes` on the schedule in `/admin/schedules`).

- [ ] **Step 3: Log in as the servant**

Log out, log in on the "Servo" tab with usuário `servo.teste` / senha `servo123`.

- [ ] **Step 4: Verify the Calendário tab**

Confirm the confirmed date from Step 2 shows highlighted in green on the calendar. Click it — a modal opens with the schedule name, ministry · setor, and start time. Click a non-highlighted day — nothing happens (button is disabled). Navigate to the previous/next month with the arrows and back.

- [ ] **Step 5: Verify the Escalas do Mês tab**

Confirm only schedules with a date in the current month appear, and the chip reads "Preenchido" for the schedule you sent availability on (if that date is in the current month) or "Pendente" otherwise.

- [ ] **Step 6: Verify the Todas as Escalas tab**

Confirm all of the sector's schedules appear regardless of month, each with the correct chip.

- [ ] **Step 7: Verify the schedule detail modal**

Click a schedule card from either list — the modal lists every date of that schedule with the correct per-date status (Confirmado / Disponibilidade enviada (aguardando confirmação) / Não enviado).

- [ ] **Step 8: Verify mobile responsiveness**

Open DevTools, switch to a mobile viewport (e.g. 375px wide). Confirm the tab bar becomes fixed to the bottom of the screen, content isn't hidden behind it, and the calendar grid still shows 7 full columns without horizontal scrolling or overlapping text.

## Self-Review Notes

- **Spec coverage:** calendar with highlighted confirmed days + day modal (Task 2) · month/all schedule lists with chip (Task 4) · schedule detail list-by-day (Task 3) · tab navigation, bottom bar on mobile (Task 5) · data layer (Task 1) · page wiring (Task 6) · manual validation matching the spec's Validation section (Task 7). No spec section is uncovered.
- **Placeholder scan:** no TBD/TODO, every step has literal code or literal shell commands.
- **Type consistency:** `ServantOverviewSchedule`/`ServantOverviewDate` (Task 1) are the only shared types and are used with identical field names (`id`, `name`, `ministryName`, `sectorName`, `dates`, `date`, `startTime`, `confirmed`, `available`) in Tasks 2–6.
