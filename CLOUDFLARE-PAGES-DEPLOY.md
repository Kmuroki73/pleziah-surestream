# Cloudflare Pages deployment

This repository is a Vite + React application. Cloudflare Pages must publish the Vite build output, not the repository source tree.

## Build settings

In **Workers & Pages → pleziah-surestream → Settings → Builds & deployments**, use:

- Production branch: `main`
- Root directory: repository root (leave the field blank or set `/`)
- Framework preset: **React (Vite)**
- Build command: `npm run build`
- Build output directory: `dist`
- Build system: current v3 build image
- Node.js: `22.23.4` (also pinned in the root `.node-version` file)

The package manifest and Vite configuration are in the repository root. The entry file `index.html` references `/src/main.tsx`, which is a Vite development entry; it must be transformed into hashed production assets by `npm run build`.

## Environment variables

Set these for both Production and Preview if authentication and live Supabase data are needed:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These are public browser credentials. Never set a Supabase service-role key as a `VITE_` variable or expose it in browser code.

## Important Cloudflare vs Vercel distinction

The repository's `api/*.ts` files are Vercel-style API routes. Cloudflare Pages does not automatically deploy that root-level `api/` directory as Pages Functions. If this deployment is expected to serve the football `/api/matches` endpoint, that backend needs a Cloudflare Pages Functions implementation under `functions/api/` (or a separately hosted API). This does not prevent the static React UI from rendering, but API-backed match data will not work just because the frontend is deployed.

## Routing and product paths

Cloudflare Pages serves a React single-page application from the root when there is no top-level `404.html`. The repository currently maps:

- `/` — SureStream landing page
- `/pleziah` — Pleziah creator discovery
- `/creator/dashboard` — creator dashboard
- `/admin/pleziah` — Pleziah moderation dashboard

Pleziah's creator livestream functionality is separate from SureStream football match functionality.

## Blank-screen checks

After changing build settings, trigger a new deployment from the latest `main` commit and confirm the build log reports that `dist` was generated and uploaded. If the static boot message remains on screen, the Vite entry bundle did not start; inspect the browser Console and Network tabs for a failed `/assets/*.js` request.
