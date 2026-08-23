# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@web/AGENTS.md

## 📁 Repository layout — this is a monorepo, the Next app is NOT at the root

```text
scale-flow/
  web/        Next 16 app. Run every npm/npx command from HERE, not from the root.
  whatsapp/   Express + Baileys worker (spec 05). Own package.json, own deps. Skeleton.
  specs/      Spec-Driven Development, shared by both.
  docs/
  backups/    Database dumps. Gitignored — they contain password hashes.
```

`web/` holds its own `.env`, `node_modules`, `tsconfig.json` and `drizzle/`. The two projects share **the database and nothing else**: `whatsapp/` never imports from `web/`, and `web/` never calls `whatsapp/`. That is deliberate — it means no auth between services, and reminders keep working while Vercel is down.

Vercel's Root Directory is `web`. There is no `vercel.json`; it is a dashboard setting.

## ⚠️ Next.js 16 / React 19 — do not rely on training data

This project pins `next@16.3.1` and `react@19.2.4`, which include breaking API/convention changes vs. older Next.js. Before writing any Next.js code (routing, data fetching, server actions, config), consult `web/node_modules/next/dist/docs/01-app/` for current guidance rather than assuming familiar patterns. One concrete example already present in this codebase: dynamic route `params` are async — see `web/src/app/escala/[link]/page.tsx` (`{ params }: { params: Promise<{ link: string }> }`, then `const { link } = await params`).

## Commands

**All of these run from `web/`.** From the repository root they fail — `node_modules` lives in `web/`.

```bash
npm run dev             # start dev server
npm run build           # production build (never while `next dev` is running — it corrupts the Turbopack cache)
npm run lint            # eslint (flat config, eslint-config-next)

docker-compose up -d    # from the ROOT: local Postgres 15 (db scaleflow, postgres/password, port 5432)
```

### ⚠️ `.env` points at PRODUCTION (Neon)

Any db script run without an explicit target writes to the live database. Always pass the local URL inline:

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/scaleflow" npx tsx src/db/<script>.ts
```

Scripts in `web/src/db/` (all print the redacted target before writing):

| Script | What it does |
| :--- | :--- |
| `apply-migration.ts <file.sql>` | Applies a hand-written migration; **aborts if any row count changes**. |
| `preflight-multi-igreja.ts` | Read-only. Detects on its own whether the migration already ran. |
| `check-isolation.ts` | 20 cases: login through the real `authorize()` + database invariants. Refuses to run against neon.tech. |
| `create-church.ts` | The only way a church is born (env-driven). No UI by design — see RNF03 in spec 03. |
| `rename-church.ts` | Renames a church. The only way to change its `username`, which every servant types at login. |
| `seed.ts` | Fixture. Seeds a **second church** only on a local database — multi-tenancy tested with one church proves nothing. |

**Migrations are hand-written SQL in `web/drizzle/manual/`, applied with `apply-migration.ts`.** Do not use `drizzle-kit generate`: the journal was never applied (there is no `__drizzle_migrations` table) and the `0000` snapshot predates several existing columns, so it emits `ADD COLUMN` for columns that already exist. Do not use `push` either when a column is `NOT NULL` on a populated table.

There is no test framework (no test script, no test files). `web/src/lib/phone.ts` is pure and is the first thing worth covering if one is ever added.

Environment variables (`web/.env`, gitignored): `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `DATABASE_PASSWORD`. `web/src/db/index.ts` enables `ssl: { rejectUnauthorized: false }` automatically when `DATABASE_URL` contains `neon.tech`. `whatsapp/` needs its own `.env` with the same `DATABASE_URL` — each process only reads the one in its own folder.

## Architecture

**Stack:** Next.js 16 App Router + React 19 + TypeScript, Tailwind CSS v4, Drizzle ORM over PostgreSQL, Auth.js (NextAuth v4, JWT sessions, Credentials provider), Framer Motion, Lucide icons.

**Data layer.** The entire schema lives in `web/src/db/schema.ts` (Drizzle `pgTable` + `relations`). Core entities: `users` (role: `admin` | `leader` | `servant`) → `ministries` (led by a user) → `sectors` → `servants` (join of user + sector) → `schedules` (status: `draft` | `published`; visibility: `public` | `private`; has a unique `shareLink` nanoid) → `scheduleDates` → `scheduleAvailability` / `scheduleAssignments`. `swapRequests` links two `servants` for a given `scheduleDate` with a `pending` | `accepted` | `rejected` status. `web/src/db/index.ts` exports the singleton `db` (drizzle + node-postgres `Pool`). Always check `web/src/db/schema.ts` before writing a query — don't assume table shape.

**Server actions, not API routes.** Nearly all mutations and reads go through `"use server"` functions under `web/src/lib/actions/` — one module per domain (`ministries`, `sectors`, `servants`, `schedules`, `availability`, `swaps`, `coordinator`, `account`, `church`). Components call these directly rather than fetching from REST endpoints. The only real API route is NextAuth's catch-all at `web/src/app/api/auth/[...nextauth]/route.ts`. Every export of a `"use server"` module becomes a POST endpoint, so shared types live in `web/src/types/domain.ts` and shared helpers in `web/src/lib/scope.ts` (which is `import 'server-only'`, not `"use server"`).

**Auth & authorization model.** `web/src/lib/auth.ts` defines `authOptions` (Credentials provider, bcrypt password compare, JWT callbacks that stamp `role`/`id`/`churchId` onto the token/session). Two ways to identify: admins and leaders sign in by e-mail (globally unique); servants sign in with **church username + their username** (`users.username` is unique only within a church, via the `users_church_username_idx` index — `/login` has a text field for it, and `?igreja=` prefills it). There is no `middleware.ts`; route protection is done per-layout by calling `getServerSession(authOptions)` and redirecting (see `web/src/app/admin/layout.tsx`, which allows `admin` and `leader` roles).

Authorization lives in `web/src/lib/scope.ts`, and it has **two independent dimensions**:

1. **Church is a hard barrier.** `churchId` applies to every role, admin included — "admin" means "everything within one church", never "everything". Every `requireXAccess` checks the church *before* the `role === "admin"` early return. A query over ministries/sectors/servants/schedules that does not filter by church is a security bug, not a missing optimization; reach the church through `ministries.churchId`, which is where it lives.
2. **Role scoping inside the church.** `getScope()` returns `{ userId, role, churchId, ledMinistryIds, coordinatedSectorIds }`. Leaders see their own ministries, coordinators their own sectors.

When adding a read, build one predicate that always includes the church and adds the role condition on top (see `schedulesVisibleTo`/`servantsVisibleTo`) rather than branching into an unfiltered admin query. When adding a mutation, remember that **every id in the signature arrives from the client**: validating one of them does not validate the others.

**User provisioning pattern.** Ministries/sectors/servants are created by an admin who types a leader's/servant's name+email; `getOrCreateUser()` in `web/src/lib/scope.ts` either creates the user with a random generated password (returned once to the caller so the admin can share it) or reuses an existing user, upgrading `servant`→`leader` role if needed. It takes a `churchId` and refuses to reuse an account belonging to another church. Reuse this helper rather than inserting into `users` directly. New churches are created by script (`npx tsx src/db/create-church.ts`, env-driven) — there is no platform-level UI for it.

**Public share-link flow.** `web/src/app/escala/[link]/page.tsx` looks up a `schedule` by its `shareLink`, lists the sector's servants, and renders `AvailabilityForm` (client component) so servants can self-report availability. Whether it's actually reachable without login depends on `schedules.visibility`: `public` schedules accept any visitor; `private` schedules require a session and sector membership, and the page renders a `BlockedNotice` explaining why instead of a form the server would reject on submit anyway. Keep that gating logic in sync between the page (UX) and the server action (actual enforcement) when touching this flow.

**Routing structure:**
- `web/src/app/admin/*` — authenticated admin/leader console (ministries, sectors, servants, schedules), guarded by `admin/layout.tsx`.
- `web/src/app/servant` — logged-in servant's personal view.
- `web/src/app/escala/[link]` — public, token-based availability submission.
- `web/src/app/login`, `web/src/app/register` — auth pages.

**Design system.** Global design tokens (CSS variables) live in `web/src/styles/design-system.css`; use those semantic tokens instead of raw Tailwind color utilities (e.g. avoid `bg-red-500`), per `specs/constitution.md`. The product is meant to look "premium" (glassmorphism, dark mode native, no visual placeholders) — see `specs/constitution.md` for the full design mandate before building UI.

**Spec-driven development.** Non-trivial features are expected to go through `specs/[ID]-spec-[feature-name]/{spec,tasks,validation}.md`, copied from `specs/templates/`. Read `specs/README.md` and `specs/constitution.md` before starting significant new feature work — the constitution is described as the project's binding source of truth for architecture/style decisions.
