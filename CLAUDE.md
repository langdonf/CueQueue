# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

CueQueue is a Next.js 15 app for musicians to create, organize, and share setlists. It uses Supabase for auth/database, Stripe for subscriptions (free/pro tiers), Spotify API for song search, and Tailwind CSS v4 for styling. The app is dark-themed only.

## Rules

- **Never include "Claude" or "Co-Authored-By" lines in commit messages.**
- **Never run the dev server (`npm run dev`) unless explicitly asked.** The user runs it themselves.

## Commands

- `npm run dev` — start dev server (uses Turbopack)
- `npm run build` — production build
- `npm run lint` — ESLint via next lint
- No test framework is configured

## Architecture

**Stack:** Next.js 15 (App Router) + React 19 + TypeScript + Supabase + Tailwind CSS v4 + Stripe

**Route groups:**
- `(auth)` — login, signup, callback (public, no nav)
- `(dashboard)` — setlists, settings (protected, has Navbar + MobileNav)
- `shared/[token]` — public shared setlist view
- `api/` — Spotify search proxy, Stripe webhook/checkout/portal

**Data flow pattern:** Server Actions in `src/actions/` handle all mutations. Each action creates its own Supabase server client, authenticates via `getUser()`, performs the operation, and calls `revalidatePath()`. No React Query or SWR — the app relies on Next.js cache revalidation.

**Supabase clients:**
- `lib/supabase/server.ts` — `createSupabaseServerClient()` for Server Components and Server Actions
- `lib/supabase/client.ts` — browser client for client components
- `lib/supabase/admin.ts` — service role client (for Stripe webhook)
- `middleware.ts` — creates its own client for auth checks and cookie refresh

**Database schema** (Supabase with RLS): `profiles`, `setlists`, `songs`, `setlist_songs` (junction table with position + transition_notes), `share_links`. Songs are linked to setlists via the `setlist_songs` junction table. Reordering uses a Supabase RPC function (`reorder_setlist_songs`). Migrations are in `supabase/migrations/`.

**Subscription model:** Free tier (3 active setlists) vs Pro ($5/year). Pro gates: live mode, sharing, export, unlimited setlists. `lib/subscription.ts` has helpers. `lib/constants.ts` has limits. Lifetime pro flag (`is_lifetime_pro`) bypasses Stripe.

**Key UI patterns:**
- `SetlistEditor` is the main client component — handles song CRUD, drag-and-drop reorder (dnd-kit), inline editing, breaks (songs with title `___SET_BREAK___`), and Spotify search
- `SetlistEditor` accepts action function overrides via props to support both owner and shared editing modes
- `SharedSetlistEditor` wraps `SetlistEditor` with shared-specific action functions from `shared-song-actions.ts`
- Toast notifications via `sonner`
- Icons via `lucide-react`
- Fonts: Inter (sans) + Instrument Serif (display), loaded via `next/font`

**Path alias:** `@/` maps to `src/`
