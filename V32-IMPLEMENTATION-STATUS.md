# SURESTREAM + PLEZIAH V32 — implementation status

## Source and decisions
- Source of truth: PLEZIAH_SURESTREAM_V31.2_RAPIDAPI_PREP.
- Preserved: React 18, Vite, TypeScript, React Router, Supabase client/auth, existing route set, creator workflows, serverless Vercel API handlers and existing SQL migrations.
- Product choices: sports-first home, purple visual identity, 24-hour trending window as the intended ranking period.

## Implemented in this V32 working update
- Replaced the desktop left-sidebar shell with a responsive top navigation.
- Added responsive mobile navigation, search affordance, account/profile navigation and footer.
- Applied a premium dark/purple visual system to the existing match, fixture, watch and PLEZIAH components.
- Removed the oversized campaign hero from the sports homepage so live/upcoming match discovery is the first content.
- Restyled PLEZIAH creator discovery and creator/admin forms while retaining existing Supabase workflows and 18+ controls.
- Added `/library` e-book discovery entry with search/category UI and a clear empty state until catalogue records and checkout exist.
- Changed `/api/matches` to use SportSRC as the primary fixture provider. SportMonks is paused in this endpoint. `FOOTBALL_DATA_API_KEY` remains an optional fallback only when `SPORTSRC_API_KEY` is absent.

## Not implemented / requires backend and external configuration
- True 24-hour most-clicked / most-watched rankings. V31.2 has no verified event analytics schema or aggregated engagement RPC to rank matches, creators and books. This update deliberately does not fabricate views, stream counts or bestseller ranks.
- E-book catalogue, author records, secure purchase entitlements, KES/USD checkout and downloads. No e-book schema/payment workflow existed in V31.2; `/library` is a designed catalogue landing/empty state, not a functioning store.
- PLEZIAH live group rooms, 1:1 video/chat, gifts/coins, subscriptions and creator payouts. Existing profile/media moderation remains; these larger workflows need schema, realtime/video provider and payment integration.
- Social account OAuth publishing for YouTube/Facebook/X.
- Production playback. SportSRC fixture metadata is used; playback remains disabled in the existing API until provider and underlying broadcast rights are verified.

## Required Vercel configuration
- `SPORTSRC_API_KEY` (server-side; required for V32's primary fixture feed)
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (client-side Supabase configuration)
- Optional fallback: `FOOTBALL_DATA_API_KEY`
- Do not expose provider secrets in `VITE_` variables.

## Verification status
- Source archive extracted and modified.
- Dependency installation did not complete within the available execution window. Therefore `npm run typecheck`, `npm run build`, Vercel preview and live API tests have NOT been passed in this environment.
- Do not deploy this archive to Production yet. Run install, typecheck and build locally/CI, then deploy to a Vercel Preview and test `/api/matches` with the real project environment.

## Central admin + E-LIBRARY implementation update (2026-11-02)
- Added `/admin` central administration route using the existing Supabase Auth session and `public.is_pleziah_admin()` authorization function. No second auth system was introduced.
- Added dashboard overview, live E-Library management, unified payment ledger/verification actions, and a view into the existing PLEZIAH creator administration records.
- Added additive migration `supabase/migrations/202611020001_central_admin_elibrary.sql` for E-Library metadata, private book storage, public covers, orders, payments, entitlements, admin verification RPC and platform settings.
- Added `/library` Supabase catalogue loading. Active published listings display on the frontend; each publication is configured for 24-hour expiry. Purchaser storage access is entitlement-based and independent of listing expiry.
- Existing `/admin/pleziah` remains available; existing match APIs and playback restrictions are unchanged.
- IMPORTANT: Apply the new SQL migration to the same Supabase project before using `/admin` or publishing books. The admin email bootstrap from the existing creator migration must already have been applied; add the intended administrator to `pleziah_admins` if needed.
- Payment verification is implemented at the database RPC level. Customer payment submission/checkout and I&M Paybill instructions are not active until verified Paybill details and the customer-facing payment submission flow are configured. No payment details are fabricated.
- Matches, Customers and Settings dashboard tabs are integration placeholders in this update; they are not represented as complete modules.
- Build/typecheck could not be re-run in this environment because dependency installation timed out and the local npm cache lacks required packages. Run `npm ci`, `npm run typecheck`, and `npm run build` in the project environment before deployment.
