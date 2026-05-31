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
- **next-intl** — i18n (es/en/ca), cookie-based locale (no URL routing).
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
- **Expenses** live at `/expenses`. `lib/expenses.ts` (`getExpenses`) lists a
  month's expenses (joined with category + payer profile via the
  `expenses_paid_by_fkey` embed) with category/payer filters. Server Actions in
  `app/expenses/actions.ts` (`createExpense`, `updateExpense`, `deleteExpense`)
  validate with Zod, check the payer is a household member, and revalidate both
  `/expenses` and `/budget`. `createExpense` also accepts `source`
  (`form`/`ticket`) and `receiptPath`; expenses are stored `confirmed` (the user
  reviews before saving — `pending` is reserved for a future automated provider).
- **Receipt OCR** is **client-side and pluggable** (`lib/ocr/`): `OCRProvider`
  interface (`types.ts`), EUR/es-ES parser (`parse.ts` → amount/date/merchant),
  the default in-browser Tesseract.js provider (`tesseract.ts`, WASM/web worker,
  dynamic-imported), and `index.ts`'s `getOCRProvider()` selector (env-swappable
  for a future remote provider). UI: `components/ReceiptScanner.tsx` uploads the
  image to the private `receipts` Storage bucket and OCRs it in the browser;
  `components/NewExpense.tsx` wraps the scanner + `ExpenseForm`, seeding the form
  via its `prefill`/`source`/`receiptPath` props (remounts on each scan with a
  `key`). No OCR runs on the server — keeps Vercel free-tier cost at 0.
- **Self-hosting:** `Dockerfile` builds a Next.js **standalone** image
  (`output: "standalone"` in `next.config.ts`); `NEXT_PUBLIC_*` are build args.
  `next.config.ts` also aliases `canvas`/`encoding` to `false` for the
  tesseract.js browser bundle.
- **Alerts** live at `/alerts`. `lib/alerts.ts` (`getAlerts`,
  `getTriggeredAlerts`) evaluates active alerts against the current month:
  whole-household (`category_id` null) or per-category, by `threshold_amount`
  (absolute €) or `threshold_percent` (of the planned budget, or the category's
  `monthly_limit`). Server Actions in `app/alerts/actions.ts` (`createAlert`,
  `updateAlert`, `toggleAlert`, `deleteAlert`). `AlertBanner` shows triggered
  alerts on the dashboard and `/alerts`.
- **Budget** lives at `/budget`. `lib/budget.ts` (`getMonthlyBudget`,
  `normalizePeriod`, `formatPeriod`) builds the monthly snapshot: planned total
  (manual override from `monthly_budgets` or salary-derived), confirmed spend,
  remaining, per-member contributions and spend-by-category. Server Actions in
  `app/budget/actions.ts` (`setManualBudget` upserts an override,
  `resetToSalaryBudget` deletes it). The page takes `?year=&month=` search
  params; `MonthNav` switches months.
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

`0003_receipts_storage.sql` adds the private `receipts` Storage bucket with
member-scoped RLS on `storage.objects` (objects are laid out as
`{household_id}/{file}`; the leading folder is checked with
`is_household_member`).

Migrations are applied manually in the Supabase SQL editor, in order
(`0001…`, `0002…`, `0003…`).

## Environment

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe for the browser.
- `SUPABASE_SERVICE_ROLE_KEY` — **server-only**, never expose to the client.

## Conventions for new work

- Keep new DB changes as additive numbered migrations in `supabase/migrations/`.
- Scope all household data with RLS; never trust the client for `household_id`.
- **i18n (next-intl):** UI copy lives in `messages/{es,en,ca}.json`, grouped by
  namespace (one per view: `common`, `auth`, `onboarding`, `home`, `budget`,
  `categories`, `expenses`, `alerts`, …). The active locale comes from the
  `NEXT_LOCALE` cookie (set by `components/LocaleSwitcher` via the
  `setLocale` action in `app/i18n-actions.ts`); **no URL `/[locale]` routing**.
  Config in `i18n/request.ts` + `i18n/locales.ts`, wired through
  `next.config.ts` and the `NextIntlClientProvider` in `app/layout.tsx`
  (`<html lang>` is dynamic). Use `useTranslations` in Client Components and
  `getTranslations`/`getLocale` in Server Components. Locale-aware dates/periods
  go through `formatPeriod(year, month, locale)`. Keep the three message files
  in **key parity**; default locale is Spanish.
- **Action errors:** Server Actions are locale-agnostic — they return a
  translation **key** (e.g. `"amountPositive"`, `"generic"`) under the `errors`
  namespace, not user text. Zod messages are the keys themselves; Supabase auth
  errors map to keys via `authErrorKey`. Forms resolve them with
  `useTranslations("errors")` (`te(state.error)`). When adding an action error,
  add the key to all three `messages/*.json` under `errors`.
- Match the existing component style (Tailwind utility classes, rounded cards,
  indigo accent).
