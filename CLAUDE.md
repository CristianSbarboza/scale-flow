# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## ⚠️ Next.js 16 / React 19 — do not rely on training data

This project pins `next@16.2.4` and `react@19.2.4`, which include breaking API/convention changes vs. older Next.js. Before writing any Next.js code (routing, data fetching, server actions, config), consult `node_modules/next/dist/docs/01-app/` for current guidance rather than assuming familiar patterns. One concrete example already present in this codebase: dynamic route `params` are async — see `src/app/escala/[link]/page.tsx` (`{ params }: { params: Promise<{ link: string }> }`, then `const { link } = await params`).

## Commands

```bash
npm run dev            # start dev server
npm run build           # production build
npm run start           # run production build
npm run lint             # eslint (flat config, eslint-config-next)

npx drizzle-kit push     # sync src/db/schema.ts to the database (no migration files generated)
npx drizzle-kit generate # generate a SQL migration into /drizzle instead of pushing directly
npx tsx src/db/seed.ts   # seed the initial admin user (admin@scaleflow.com / admin123)
npx tsx src/db/reset.ts  # reset script — check the file before running, it is destructive

docker-compose up -d      # start local Postgres 15 (db: scaleflow, user: postgres/password, port 5432)
```

There is no test suite/framework configured in this repo (no test script, no test files).

Environment variables (`.env`, gitignored): `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `DATABASE_PASSWORD`. `src/db/index.ts` enables `ssl: { rejectUnauthorized: false }` automatically when `DATABASE_URL` contains `neon.tech`.

## Architecture

**Stack:** Next.js 16 App Router + React 19 + TypeScript, Tailwind CSS v4, Drizzle ORM over PostgreSQL, Auth.js (NextAuth v4, JWT sessions, Credentials provider), Framer Motion, Lucide icons.

**Data layer.** The entire schema lives in `src/db/schema.ts` (Drizzle `pgTable` + `relations`). Core entities: `users` (role: `admin` | `leader` | `servant`) → `ministries` (led by a user) → `sectors` → `servants` (join of user + sector) → `schedules` (has a unique `shareLink` nanoid) → `scheduleDates` → `scheduleAvailability` / `scheduleAssignments`. `src/db/index.ts` exports the singleton `db` (drizzle + node-postgres `Pool`). Always check `src/db/schema.ts` before writing a query — don't assume table shape.

**Server actions, not API routes.** Nearly all mutations and reads go through `"use server"` functions in `src/lib/actions.ts` (not `src/app/actions.ts`, which is an unused stub — put new server actions in `src/lib/actions.ts`). Components call these directly rather than fetching from REST endpoints. The only real API route is NextAuth's catch-all at `src/app/api/auth/[...nextauth]/route.ts`.

**Auth & authorization model.** `src/lib/auth.ts` defines `authOptions` (Credentials provider, bcrypt password compare, JWT callbacks that stamp `role`/`id` onto the token/session). There is no `middleware.ts`; route protection is done per-layout by calling `getServerSession(authOptions)` and redirecting (see `src/app/admin/layout.tsx`, which allows `admin` and `leader` roles). Inside server actions, `getAuthFilter()` in `src/lib/actions.ts` inspects the session role: admins see everything, `leader`/other roles get results scoped to their own `leaderId`. When adding a new action that reads ministry/sector/servant/schedule data, follow this same scoping pattern rather than querying unfiltered.

**User provisioning pattern.** Ministries/sectors/servants are created by an admin who types a leader's/servant's name+email; `getOrCreateUser()` in `src/lib/actions.ts` either creates the user with a random generated password (returned once to the caller so the admin can share it) or reuses an existing user, upgrading `servant`→`leader` role if needed. Reuse this helper rather than inserting into `users` directly.

**Public share-link flow.** `src/app/escala/[link]/page.tsx` is an unauthenticated route: it looks up a `schedule` by its `shareLink`, lists the sector's servants, and renders `AvailabilityForm` (client component) so servants can self-report availability without logging in.

**Routing structure:**
- `/src/app/admin/*` — authenticated admin/leader console (ministries, sectors, servants, schedules), guarded by `admin/layout.tsx`.
- `/src/app/servant` — logged-in servant's personal view.
- `/src/app/escala/[link]` — public, token-based availability submission.
- `/src/app/login`, `/src/app/register` — auth pages.

**Design system.** Global design tokens (CSS variables) live in `src/styles/design-system.css`; use those semantic tokens instead of raw Tailwind color utilities (e.g. avoid `bg-red-500`), per `specs/constitution.md`. The product is meant to look "premium" (glassmorphism, dark mode native, no visual placeholders) — see `specs/constitution.md` for the full design mandate before building UI.

**Spec-driven development.** Non-trivial features are expected to go through `/specs/[ID]-spec-[feature-name]/{spec,tasks,validation}.md`, copied from `/specs/templates/`. Read `specs/README.md` and `specs/constitution.md` before starting significant new feature work — the constitution is described as the project's binding source of truth for architecture/style decisions.
