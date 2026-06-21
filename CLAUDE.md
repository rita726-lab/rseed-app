# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Next.js version

This project uses Next.js 16.2.9 with breaking changes from common training data. Before writing any Next.js-specific code, check `node_modules/next/dist/docs/` for up-to-date API conventions.

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npm run lint     # run ESLint
```

## Architecture

The entire app lives in **`app/page.tsx`** (586 lines, single component). No separate route files exist. Tab-based navigation renders all screens client-side in one component.

**Stack:**
- Next.js App Router — `layout.tsx` sets metadata only, `page.tsx` is the entire app
- Supabase: auth (email + password) and PostgreSQL database
- Tailwind CSS v4 + inline styles (inline styles are primary)

**Key state in the root component:**
- `tab` — active screen (`home | ranking | arigatou | nft | profile | wallet | kuji`)
- `user`, `userData` — Supabase auth user + app-level user row
- `rseed`, `arigatouCount`, `accumulatedHours`, `accumulatedRseed` — game state
- `isSignUp`, `email`, `password` — auth form state

**Game mechanics:**
- Mining: accumulates up to 24h (0.001 RSEED/hour), capped at 0.024/day
- Title system: SEED (0) → SPROUT (10) → BLOOM (100) → LEGEND (500) based on `arigatou_count`
- Kuji lottery: user picks 0.001–10 RSEED; 1% chance 100x, 9% chance 10x, 90% get 10% back
- NFTs: 4 tiers, unlocked by title level (Genesis Seed = LEGEND only)

**Supabase tables:**
- `users` — `id`, `rseed` (float), `last_mined` (timestamp), `arigatou_count` (int), `username` (text)
- `history` — `id`, `user_id`, `type` (mine | arigatou_sent | arigatou_received), `amount` (float), `created_at` (timestamp), `from_username` (text), `to_username` (text)

**Environment variables** (set in both `.env.local` and Vercel):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — must be the JWT (`eyJ...`) format, NOT `sb_publishable_` format

**Deployment:** Vercel auto-deploys on push to `main` branch (`rita726-lab/rseed-app`).

## Project context

RSEED (RITATASEED) is a Web3 "gratitude economy" app — users mine RSEED tokens and send "arigatou" to others. Future phases: BNB Chain NFT minting, PancakeSwap listing, staking (burn-and-redistribute model). The Supabase anon key in Vercel must be the JWT format for auth to work in production.
