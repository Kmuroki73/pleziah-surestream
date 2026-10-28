# SURESTREAM V10 — Phase 1–2 continuation package

This package continues the uploaded Bolt source. It preserves the React/Vite app and existing Penalty Rush implementation, adds a booking checkout page, reservation/payment-submission schema, auth callback, access gate, and a minimal offline shell cache.

## Launch rules in this build
- Standard: KSh 50
- VIP: KSh 50; configured maximum 3,000 reservations per event
- VVIP: KSh 100; configured maximum 1,000 reservations per event
- Standard currently has no defined cap from the owner; the SQL trigger uses a high ceiling and should be changed once a real Standard capacity is chosen.
- Reservation is pending/locked until a trusted administrator/backend verifies payment and grants access.
- M-PESA Pochi number shown: 0182437651. Confirm the recipient name and number in the M-PESA app before making any real payment.
- PayPal is displayed as an option but live PayPal order creation/capture is NOT implemented in this package. Do not accept PayPal money until the server-side integration and webhooks are implemented and tested.
- Manual Pochi transaction references are submissions for human verification, not proof of payment.
- The watch page no longer pretends a real stream is playing. A verified active reservation unlocks the access state, but an authorized video provider still needs to be integrated.

## Setup
1. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (publishable/anon key only).
2. In Supabase SQL Editor, review and apply `supabase/migrations/202610250001_surestream_phase12.sql` to the intended SURESTREAM project.
3. In Supabase Authentication URL Configuration, add the deployed URL and `${SITE_URL}/auth/callback` to allowed redirect URLs.
4. Confirm RLS is enabled and test with a non-admin user before public launch.
5. Install dependencies with `npm ci`, then run `npm run typecheck`, `npm run lint`, `npm run build` and test the production preview.
6. Do not add service-role keys or payment secrets to `VITE_*` variables or commit them to Git.

## Manual M-PESA review workflow (temporary)
1. Customer creates a pending reservation and submits the M-PESA transaction reference.
2. An authorized operator verifies the transaction in the actual merchant account—not from a screenshot alone.
3. Only after verification, a trusted operator updates that exact reservation in Supabase. Example SQL (replace the UUID and only run after checking actual receipt):

```sql
update public.reservations
set payment_status = 'paid',
    access_status = 'active',
    access_starts_at = now(),
    access_expires_at = now() + interval '3 hours',
    updated_at = now()
where id = 'REPLACE_WITH_VERIFIED_RESERVATION_UUID'
  and payment_status = 'pending';
```

This manual workflow is not automated M-PESA API collection. Do not expose the Supabase service-role key to a browser.

## Verification status
- TypeScript/JSX syntax transpile check: passed for source files after fixing the original malformed X/Twitter share URL in PenaltyRush.
- Full typecheck/build/lint: NOT VERIFIED. Dependency installation timed out in this environment and the local `node_modules` folder is incomplete (`vite` executable missing). Run the commands above in a working Node/npm environment before deployment.
- Live payment integration tests: NOT RUN; no merchant/API credentials were provided.
- Real streaming: NOT connected; access gating is implemented, but licensed stream integration remains a separate requirement.
