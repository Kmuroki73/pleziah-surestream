# Pleziah

Pleziah is an adults-only creator platform built with React, TypeScript, Vite and Supabase. This branch is configured for Cloudflare Pages; it does not deploy through Vercel and contains no football-streaming product routes.

## Local development
```bash
npm ci
npm run dev
```

## Cloudflare Pages
See [CLOUDFLARE-DEPLOY.md](./CLOUDFLARE-DEPLOY.md).
- Build command: `npm run build`
- Build output: `dist`
- Root directory: repository root
- SPA fallback: `public/_redirects`

Required browser-safe variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (Supabase publishable/anon key only)

## Supabase migrations
Apply the migrations in chronological order to the intended Supabase project. The new `202611270001_pleziah_wallet_ledger.sql` migration adds customer and creator wallets, immutable ledger entries, the 60-second introductory chat window, the 90/10 payment split, creator withdrawal holds ($150 minimum / $300 maximum), and admin payout processing.

## Important release boundaries
- Phone + six-digit PIN auth requires the Supabase Phone provider. To meet the no-OTP signup requirement, phone confirmation must be disabled in Supabase Auth settings; evaluate the fraud and account-recovery trade-offs before enabling this.
- The internal wallet ledger is not a payment gateway or bank account. Real deposits and payouts remain disabled until an adult-content-approved provider, signed webhook verification, settlement reconciliation, safeguarding and applicable regulatory requirements are in place.
- The SQL paid-message RPC is ready for the chat client to call. It must be wired into the production conversation UI before paid messaging is advertised as live.
- The age gate is a front-end confirmation and is not a substitute for robust age/identity verification and consent moderation.
