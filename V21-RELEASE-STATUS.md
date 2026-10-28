# SURESTREAM V21 — release candidate status

## Changes made
- Added custom SURESTREAM SVG favicon and mascot/brand mark, a social preview JPG, updated metadata, and populated PWA icon declarations.
- Added original local stadium hero and matchday images; the high-resolution `stadium-art-master.png` is retained as an art master. The website uses optimized JPGs for loading performance.
- Removed the fabricated `12` live-match navigation badge.
- Replaced remote Pexels hero/preview images with local brand assets.
- Landing page's featured match console now uses a fixture returned by the configured API, when available.
- Added `/matches` page with provider-backed search, status filters, refresh, empty/error states and responsive match rows.
- Added `/match/:id` match centre with provider-backed match facts, lineups, statistics and event timeline. Player Quality Index (QI) is only shown if the upstream response contains a rating field; otherwise it explicitly says the provider did not supply it.
- Added site-wide 18+ self-declaration overlay (not identity verification).
- Added responsive CSS for new pages and updated service-worker cache version/assets.
- Penalty Rush remains clearly marked Coming Soon.

## Validation completed
- TypeScript/TSX syntax transpilation: 20 source/API files, zero syntax diagnostics.
- Assets and manifest created; source ZIP integrity checked after packaging.

## Validation not completed
- `npm ci` timed out in this environment; dependencies are not fully installed.
- Therefore `npm run build`, full typecheck, lint and real-browser/mobile testing could not be completed. Do not describe this candidate as fully production-tested.

## Configuration
- Set `SPORTMONKS_API_KEY` in Vercel Environment Variables (server-side only; never use a `VITE_` prefix).
- Keep the existing SURESTREAM `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values.
- Optional fallback: `FOOTBALL_DATA_API_KEY` is used only when Sportmonks is not configured.
- Deploy to Preview first and test `/api/matches`, `/matches`, and `/match/<fixture-id>` with the real trial key. Data inclusions and competitions depend on the Sportmonks subscription.

## Not yet complete / must not be advertised as active
- Sportmonks provides football data, not video. Stream now routes to the viewing experience but cannot play a match without a separately licensed video source.
- No automatic 15-minute playable preview until authorized video exists and server-side expiry is implemented.
- M-PESA Daraja STK/webhook verification and PayPal checkout/capture are not complete. Manual M-PESA reference submission is not proof of payment.
- Automatic email delivery to `lamineyamalapp@gmail.com` needs a configured transactional email provider and tested backend route.
- DAZN application/approval remains the owner's action; no partnership is claimed.
- Social profile/story/follow UI, server-authoritative points and the four-free-games redemption are not complete; prior SQL migration is only a foundation.
- Most secondary navigation routes still contain roadmap placeholders. This is a more complete match-data candidate, not yet the promised full social/payment/streaming platform.

## Safety
Do not overwrite Songa Flight Watch. Upload only to the SURESTREAM repository. Review Supabase migrations and use a Preview deployment before Production.
