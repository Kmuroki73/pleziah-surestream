# Pleziah + SureStream unified release package

This release preserves the SureStream React/Vite app and adds a separate Pleziah route, creator application dashboard, admin moderation dashboard, Supabase schema/storage migration, creator media uploads, and server-side SportSRC match/source metadata endpoints.

## Routes
- `/` — existing SureStream home
- `/matches` — existing football match centre, populated by `/api/matches` when a server-side provider key is configured
- `/watch/:id` — match watch/access page, with SportSRC source-discovery metadata; no unauthorized embed URLs are exposed
- `/pleziah` — public creator directory (only approved and published profiles appear)
- `/creator/dashboard` — Google/email authentication, creator profile submission, rates and media upload
- `/admin/pleziah` — admin-only creator approval, publishing and availability controls
- `/auth/callback` — OAuth return handler

## Supabase setup
1. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel. These are public browser credentials; never expose a service-role key.
2. In Supabase SQL Editor, review and run `supabase/migrations/202610280001_pleziah_creator_platform.sql` against the intended project. It creates creator/media tables, RPC functions, RLS policies, and Storage buckets.
3. If the admin user `owenroki73@gmail.com` had not registered in Supabase Auth when the migration ran, sign in with that account and run:

   ```sql
   insert into public.pleziah_admins(user_id)
   select id from auth.users where lower(email) = 'owenroki73@gmail.com'
   on conflict (user_id) do nothing;
   ```

4. Supabase Auth URL Configuration should use `https://pleziah.top` as Site URL once DNS is connected. Add `https://pleziah.top/**`, the Vercel production URL if used, and `https://pleziah.top/auth/callback` (the wildcard already covers it) to allowed redirects. Google OAuth's Authorized redirect URI must be the exact Supabase callback URL shown under the Google provider, not the Pleziah domain.
5. The storage migration configures `creator-thumbnails` as public image-only storage and `video-previews`/`premium-videos` as private. Uploads are limited to 5 MB for thumbnails and 50 MB for each video on this Free-plan starter setup.
6. Creator media upload uses paths scoped to the signed-in user's UUID. Preview files should be short clips (around 60 seconds) uploaded as separate video files. The premium bucket is private.

## Vercel environment variables
- `VITE_SUPABASE_URL` — browser public Supabase URL.
- `VITE_SUPABASE_ANON_KEY` — browser public/anon key.
- `SPORTMONKS_API_KEY` — server-side fixture and score data.
- `SPORTSRC_API_KEY` — server-side SportSRC match/source discovery. Rotate any key previously pasted into chat; never commit it.
- `FOOTBALL_DATA_API_KEY` — optional server-side fallback.

## Stream and payment limitations — read before launch
- SportSRC endpoints return fixture/source metadata only. They intentionally do not expose third-party embed URLs or bypass rights restrictions. Obtain written confirmation that any stream is licensed for the relevant territory and paid commercial use before enabling playback.
- SureStream's existing match centre needs a valid football data provider key. If none is configured, the API reports a clear setup error instead of inventing fixtures.
- The watch page does not simulate a working football broadcast. A paid entitlement is not proof that a licensed stream is connected.
- Creator media upload and moderation are included, but the production premium-video signed-URL entitlement endpoint, payment checkout/webhooks, refunds, paid chat/session booking, and a true live-ingest service are not implemented in this release. Do not accept real payments or promise paid access until those server-side pieces are implemented and tested.
- The admin can mark a creator LIVE only when an HTTPS stream URL is supplied. An administrator must verify it is a real authorized broadcast before doing so; the URL field is not automatic live-stream verification.
- Adult-content operation requires a provider that explicitly approves adult digital content, performer age/identity and consent verification, moderation, privacy controls, takedown process, and legal review. A creator's age field is a self-declaration, not identity verification.

## Build and deployment
The project uses Vite, React, TypeScript and Vercel API functions. In a normal Node/npm environment:

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```

Vercel should build the project root (the folder containing `package.json` and `vercel.json`) with `npm run build`, output directory `dist`. This working environment could not download npm packages because the npm registry returned DNS/network errors, so a final Vite production build could not be verified here. Run the commands above in Vercel or a connected local environment before treating this as a production-verified deployment.


## Final integration verification — 29 October 2026

### RapidAPI
The project now documents the required server-only environment variables in `.env.example`:
- `RAPIDAPI_KEY`
- `RAPIDAPI_HOST`
- `RAPIDAPI_BASE_URL`
- `RAPIDAPI_ENDPOINT`

Do not paste a real key into source files, browser code, or Git. The actual API name/listing URL and endpoint schema were not supplied with this archive, so an executable RapidAPI request cannot be safely implemented yet. Set the variables in Vercel only after confirming the API's endpoint and required parameters. An adult-content provider should be used only for content legally available for redistribution/embedding and verified to involve adults.

### Google OAuth redirect
`src/pages/PleziahHub.tsx` constructs the OAuth redirect from `window.location.origin` and `/auth/callback`; `src/pages/AuthCallback.tsx` then reads the Supabase session. This source does not hard-code `localhost:3000` in that flow. If production still redirects to localhost, check:
1. Supabase Dashboard → Authentication → URL Configuration → Site URL should be `https://pleziah.top`.
2. Add `https://pleziah.top/auth/callback` to Redirect URLs (and the actual Vercel production domain if also used).
3. Google Cloud OAuth client → Authorized redirect URI must be the Supabase callback URL, normally `https://<project-ref>.supabase.co/auth/v1/callback`, not `localhost:3000`.
4. Verify the deployed Vercel project is built from this repository/branch and contains the latest commit. Clear stale deployment/cache by redeploying after settings are corrected.
5. A Supabase `Unable to exchange external code` error may also indicate Google OAuth client/secret mismatch, expired/reused authorization code, or a mismatched redirect URI. Inspect Supabase Auth logs.

### What is present in this source archive
- SportMonks proxy at `api/matches.ts` keeps the provider key server-side and normalizes fixture fields.
- Landing page uses `public/assets/beyond-limits-hero.jpg` and includes a live-match rail.
- Watch page checks for stream-source metadata; it does not manufacture a playable stream URL. Actual playback requires a licensed, playable stream URL.
- Live Match Intelligence intentionally shows an honest empty state when the provider has no live fixtures or licensed event coordinates.
- Pleziah creator and media UI is in `src/pages/PleziahHub.tsx`, backed by Supabase. Published/approved visibility depends on the database rows, policies, storage paths and creator approval flags.
- The RapidAPI content page, product/toy catalogue and persistent comments cannot be claimed integrated by this archive alone: the RapidAPI endpoint schema and a configured product/comment data source are not present in the supplied source. Do not show fake API results or claim comments are persisted until the schema/backend is connected.
