# Pleziah Cloudflare Pages deployment

Pleziah is a Vite + React single-page application. Deploy this repository with **Cloudflare Pages**, not Vercel.

## Cloudflare Pages project settings
- Connect repository: `Kmuroki73/pleziah-surestream`
- Production branch: `feature/pleziah-wallet-cloudflare` for the first validation deployment; switch to `main` only after review/merge.
- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root
- Node compatibility: use Node.js 22 or a current supported LTS runtime.

## Build environment variables
Set these in Cloudflare Pages → Settings → Environment variables (Production and Preview):
- `VITE_SUPABASE_URL` — Supabase project URL.
- `VITE_SUPABASE_ANON_KEY` — Supabase publishable/anon key only. Never put the service-role key in a VITE_ variable.

## SPA routing
`public/_redirects` is copied into `dist` and sends app routes to `index.html`.

## Supabase setup
1. Review and apply `supabase/migrations/202611270001_pleziah_wallet_ledger.sql`.
2. In Supabase Auth, enable Phone and Google providers.
3. For the requested no-OTP phone + PIN sign-up flow, disable phone confirmation only after assessing the security and fraud implications for your deployment. The UI uses the phone number as the Supabase Auth identifier and a six-digit PIN as the password.
4. Add the production domain `https://pleziah.top` and `https://pleziah.top/auth/callback` to Supabase allowed redirect URLs.
5. Register the administrator account in `public.pleziah_admins`.

## Payment and payout integration status
The migration supplies the internal USD wallet ledger, 60-second introductory conversation window, 90/10 split, creator withdrawal holds, and admin payout state transitions. It does **not** connect a payment gateway or execute mobile-money payouts. Deposits must only be credited by a verified provider webhook (or a controlled admin verification action); do not credit balances from browser code. Select a payment provider that has explicitly approved this adult-content business model before enabling real deposits or payouts. Funds custody and safeguarding must be reviewed for the relevant jurisdictions before launch.

## Cloudflare Pages Functions
The static frontend can be deployed now for preview. A Cloudflare Pages Function/payment webhook and provider checkout integration are separate release tasks; never expose Supabase service-role or payment secrets in browser variables.
