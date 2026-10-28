SURESTREAM + PLEZIAH V31 — DELIVERY STATUS

Added in the V31 source package:
- Separate adult-only Pleziah route and age gate; football routes remain separate from the adult directory.
- Google OAuth and email/password sign-in UI using the existing Supabase client.
- Creator profile application with display name, username, bio, profile photo upload, age declaration, private identity/audience preferences, content categories, session pricing and optional media-pack pricing.
- Public directory shows only admin-approved and published profiles.
- Creator media upload for thumbnails, short preview clips and private premium files, with rights/consent confirmation.
- Admin-only creator approval/publication/availability dashboard and media moderation.
- Additive Supabase migration for tables, RPCs, RLS, Storage buckets and upload policies.
- SportSRC server-side match/source metadata endpoints; API key remains server-only. SportSRC is also a fixture fallback if Sportmonks and football-data.org keys are absent.
- Watch UI now displays provider source metadata without exposing third-party embed URLs or pretending that a source listing proves broadcast rights.
- Service worker cache version bumped to avoid stale V30 shell.

Still required before public production launch:
- Apply the SQL migration and configure Supabase project URL/public key in Vercel.
- Verify Google OAuth callback and email confirmation/recovery flows on pleziah.top.
- Add a compliant payment provider that explicitly approves adult digital content, plus server-side checkout, webhook verification, refunds and entitlement logic. The unlock button remains disabled.
- Add a signed URL/backend entitlement endpoint for premium video; private full files are not made publicly playable.
- Verify creator identity/age, consent and rights with an appropriate process. Self-declared age is not identity verification.
- Configure an authorized football broadcast provider and a true live-ingest/player service before enabling live playback. SportSRC endpoints intentionally return metadata only.
- Add SMTP for production email deliverability.

Validation: TypeScript/TSX syntax transpilation passed for 26 source/API files. A full `npm ci`, typecheck, lint and Vite build could not be completed in this environment because npm registry requests failed with DNS/network errors. Do not call this a fully build-verified production dist until Vercel or a connected Node/npm environment completes the build and smoke tests.
