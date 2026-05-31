# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Project

**Monymony** — a web app to manage **shared household expenses**. Members plan a
monthly budget derived from the sum of their salaries (weighted by each member's
percentage), record expenses by form or by **receipt photo (OCR)**, organize
them with custom categories (color + Google Material icon), and get **alerts**
when they overspend. Currency is **EUR (€)**.

See `ROADMAP.md` for the phased plan. The app is greenfield — most features
beyond auth + the DB schema are not built yet.

## Stack

- **Next.js 15** (App Router, React 19, TypeScript) — `app/` directory.
- **Tailwind CSS v4** (configured via `@import "tailwindcss"` in `app/globals.css`; no `tailwind.config`).
- **Supabase** — Auth, Postgres, Storage. Accessed via `@supabase/ssr`.
- **Zod** — validation.
- **Vercel** — hosting. Goal: stay on free tiers (cost 0).

## Commands

This project uses **pnpm** (pinned via `packageManager` in `package.json`; run
`corepack enable` once so the right version is used).

```bash
pnpm install    # install dependencies
pnpm dev        # start dev server (http://localhost:3000)
pnpm build      # production build
pnpm start      # serve production build
pnpm lint       # eslint
```

There is no test runner configured yet.

## Architecture & conventions

- **Path alias:** `@/*` maps to the repo root (e.g. `@/lib/supabase/server`).
- **Supabase clients** live in `lib/supabase/`:
  - `client.ts` — `createClient()` for Client Components (`"use client"`).
  - `server.ts` — `createClient()` (async) for Server Components, Server Actions, Route Handlers.
  - `middleware.ts` — `updateSession()` refreshes the session and guards routes.
- **Auth routing** is enforced in root `middleware.ts`: unauthenticated users are
  redirected to `/login`; only `/login` and `/auth/*` are public.
- **Auth actions** are Server Actions in `app/login/actions.ts` (`login`,
  `signup`, `signOut`). The login page (`app/login/page.tsx`) is a Client
  Component using `useActionState`.
- **Household actions** are Server Actions in `app/household/actions.ts`
  (`createHousehold`, `joinHousehold`, `updateSalary`, `leaveHousehold`).
  Create/join call SECURITY DEFINER RPCs (`create_household`,
  `join_household_by_code`) so the cross-table writes / pre-membership lookup
  work under RLS.
- **`lib/household.ts`** — `getActiveHousehold()` loads the user's first
  household with members and salary-derived contribution percentages. The home
  page (`app/page.tsx`) redirects to `/onboarding` when there's no household.
- **Category actions** are Server Actions in `app/categories/actions.ts`
  (`createCategory`, `updateCategory`, `deleteCategory`). The `/categories`
  page lists + edits them inline. Icon/color catalogs live in `lib/icons.ts`
  (`EXPENSE_ICONS`, `CATEGORY_COLORS`); `lib/categories.ts` has `getCategories`.
- **`lib/format.ts`** — `formatEuro` / `formatPercent` (es-ES locale).
- Client UI bits live in `components/` (`SalaryForm`, `InviteCode`,
  `CategoryForm`, `CategoryItem`, `IconPicker`, `ColorPicker`).
- Prefer **Server Components** for data fetching and **Server Actions** for
  mutations. Reach for Client Components only when you need interactivity.
- **Money** is stored as `numeric(12,2)` (euros) in Postgres. Format with the
  `es-ES` / `EUR` locale on the client.
- **Icons:** category icons use **Google Material Symbols** (loaded in
  `app/layout.tsx`); store the symbol name (e.g. `pets`, `bolt`) in the DB.

## Database

Schema and RLS live in `supabase/migrations/`. Core tables:

- `profiles` — 1:1 with `auth.users` (auto-created via trigger on signup).
- `households` — a house/group, has an `owner_id`.
- `household_members` — membership + `monthly_salary`; budget % is derived from salaries.
- `categories` — user-defined concepts (`name`, `color`, `icon`, optional `monthly_limit`).
- `monthly_budgets` — planned total per household/month; `is_manual` overrides the salary-derived total.
- `expenses` — `amount`, `category_id`, `expense_date`, `source` (`form`/`ticket`), `status` (`pending`/`confirmed`), `receipt_url`.
- `alerts` — thresholds (`threshold_percent` or `threshold_amount`); `category_id` null = whole-household.

**RLS:** every data table is scoped to household membership via the
`is_household_member(household_id)` SQL helper. When adding tables, enable RLS
and add equivalent member-scoped policies. Co-member profile visibility uses
`shares_household(user_id)`. Cross-table or pre-membership operations go through
SECURITY DEFINER RPCs (see `0002_households_invites.sql`).

Migrations are applied manually in the Supabase SQL editor, in order
(`0001…`, `0002…`).

## Environment

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe for the browser.
- `SUPABASE_SERVICE_ROLE_KEY` — **server-only**, never expose to the client.

## Conventions for new work

- Keep new DB changes as additive numbered migrations in `supabase/migrations/`.
- Scope all household data with RLS; never trust the client for `household_id`.
- UI copy is in **Spanish** (`<html lang="es">`); keep it consistent.
- Match the existing component style (Tailwind utility classes, rounded cards,
  indigo accent).
