# SURESTREAM V22 — appearance and recovery update

## Changes
- Added a persistent Dark / Light mode toggle in the desktop top bar. Dark remains the default; selection is saved in browser local storage.
- Added a light-theme stylesheet for the app shell, navigation, match browser, match centre, panels, and age declaration.
- Added a React error boundary with a visible recovery message and refresh action instead of leaving an empty page if a render error occurs.
- Bumped the service-worker cache version to v3 so users receive the updated assets rather than a stale cached version.
- Added `ENVIRONMENT-VARIABLES-V22.md` with the exact Vercel variable names, which are required/optional, and safe setup steps.

## Validation
- ZIP integrity check is performed after packaging.
- TypeScript syntax transpilation is checked separately.
- `npm ci --ignore-scripts --no-audit --no-fund` timed out in this environment, so a complete Vite production build, dependency-backed typecheck, lint and browser test could not be completed. This release must not be represented as fully production-certified until those checks pass in Vercel Preview or a machine with dependencies installed.

## Environment and feature limits
- Live fixtures need a real `SPORTMONKS_API_KEY` in Vercel; otherwise `/api/matches` correctly reports that football data is not configured.
- Keep the existing SURESTREAM Supabase URL and anon/publishable key. Do not overwrite Songa Flight Watch settings.
- Credentials for M-Pesa, PayPal, email, ScoreBat, or Supabase service role do not by themselves make integrations functional; backend flows and security checks must exist and be tested.
- Sportmonks supplies football data, not broadcast rights or playable live video.
