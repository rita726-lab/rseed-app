# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Next.js version

This project uses a newer Next.js version with breaking changes from common training data. Before writing any Next.js-specific code, check `node_modules/next/dist/docs/` for up-to-date API conventions.

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npm run lint     # run ESLint
```

## Architecture

Single-page app (`app/page.tsx`) with no separate route files. All UI is tab-based navigation rendered client-side in one component.

**Stack:**
- Next.js App Router, all code in `app/` — `layout.tsx` sets metadata, `page.tsx` is the entire app
- Supabase for auth (email OTP) and database
- Tailwind CSS v4 + inline styles (inline styles are the primary styling approach)

**Supabase tables required:**
- `users` — columns: `id`, `rseed` (float), `last_mined` (timestamp), `arigatou_count` (int), `username` (text)
- `history` — columns: `id`, `user_id`, `type` (mine | arigatou_sent | arigatou_received), `amount` (float), `created_at` (timestamp)

**Environment variables** (set in Vercel and `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Deployment:** Vercel — auto-deploys on push to `main` branch of `rita726-lab/rseed-app`.

## Project context

RSEED (RITATASEED) is a Web3 project for a "gratitude economy" — users mine RSEED tokens daily and send "arigatou" to others. Key game mechanics: title system (SEED → SPROUT → BLOOM → LEGEND) based on arigatou_count, NFT gallery unlocked by title, burn-and-redistribute staking model planned for future phases. BNB Chain / PancakeSwap is the target blockchain.
