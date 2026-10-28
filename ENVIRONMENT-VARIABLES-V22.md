# SURESTREAM V22 — environment variables

Use the SURESTREAM Vercel project only. Do not add these variables to Songa Flight Watch.

## Required for live match data
- `SPORTMONKS_API_KEY` — Sportmonks Football API token. Add in Vercel Project Settings → Environment Variables. Server-side only; do not prefix with `VITE_`.

## Required for Supabase features already configured in the frontend
- `VITE_SUPABASE_URL` — URL of the existing SURESTREAM Supabase project.
- `VITE_SUPABASE_ANON_KEY` — publishable/anon key for that same project. It is intended for browser use when Row Level Security is correctly configured.

## Optional fallback
- `FOOTBALL_DATA_API_KEY` — football-data.org token. Used only when Sportmonks is not configured.

## Optional / only add if you have credentials and have enabled the matching backend
- `SUPABASE_SERVICE_ROLE_KEY` — highly privileged secret; server-side only. Never put in `VITE_` variables or expose in browser code.
- `SCOREBAT_API_URL=https://www.scorebat.com/video-api/v3/feed/`
- `SCOREBAT_API_TOKEN` — only if your ScoreBat access requires a token and the account supplies one.
- `RESEND_API_KEY` — Resend transactional email API key; the reservation email workflow is not production-complete until a backend route is implemented and tested.
- `RESERVATION_NOTIFICATION_TO=lamineyamalapp@gmail.com`
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV=sandbox` — credentials alone do not activate checkout; payment endpoints and callbacks must be implemented and tested.
- `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY` — Daraja credentials; payment callbacks and verification must be implemented and tested before taking payments.

## Setup
1. In Vercel, open the SURESTREAM project → Settings → Environment Variables.
2. Add each variable to Preview first. Paste actual values from the relevant provider dashboards; do not use the example placeholders.
3. Redeploy the Preview deployment and test `/api/matches`.
4. Only after the site and required integrations pass tests, add the same values to Production and deploy.

Never commit `.env`, `.env.local`, provider tokens, service-role keys, or payment secrets to GitHub. The included `.env.example` contains placeholders, not working credentials. No API key can be generated on your behalf; it must come from your provider account.
