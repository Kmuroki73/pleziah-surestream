# ForeignLovee production deployment plan

## Approved direction
- Product: mainstream, paid-access social discovery and creator community.
- Excluded: adult marketplace, explicit media, adult subscriptions and adult-specific flows.
- Retain: approved creator profiles/media, social stories, posts, comments, follows, private messaging, notifications and a separate admin area.
- Hosting: Cloudflare Pages with Git integration.
- Data/auth: a brand-new Supabase production project.
- Bot protection: Cloudflare Turnstile on sign-up and sign-in; enable it in Supabase Auth.
- Monetization: paid platform access. Price, duration, currency and provider are configuration, not hard-coded assumptions.

## Current source baseline
The existing source is Kmuroki73/pleziah-surestream, branch feature/pleziah-v36.
The source release notes describe 13 imported creator profiles, 13 unique creator photographs and 30 MP4 clips. The release notes explicitly state that the media-to-profile assignment is provisional and must be verified. Do not publish imported archive media until creator ownership, consent, content suitability and rights are confirmed.
The existing source also contains adult-specific catalogue and route code. This branch is a preparation branch only; it is not safe to deploy as-is until that code and public media are removed/replaced.

## New Supabase project
Create a new project named foreignlovee-production.
Apply migrations in timestamp order from this branch. Configure:
- Auth site URL: https://foreignlovee.com
- Redirect URL: https://foreignlovee.com/auth/callback
- Additional preview redirect: the Cloudflare Pages preview hostname used for QA.
- Enable email verification and password recovery.
- Enable Cloudflare Turnstile under Auth > Bot and Abuse Protection > CAPTCHA.
- Configure Google OAuth only after adding the production callback URL to Google Cloud.
- Use the publishable/anon key in browser code; never expose the service-role key.

## Paid access
The migration provides platform_entitlements and payment_transactions. This is the entitlement ledger, not a payment integration. A payment provider must be selected and approve the business model. A server-side webhook must verify signatures and idempotency before setting a transaction to succeeded and creating an active entitlement. The browser must never be able to activate access by writing payment status.
Set the final price, duration, supported currencies and provider in server-side configuration after commercial approval. The application should display checkout first and keep member feeds/actions locked until the verified entitlement is active.

## Cloudflare Pages
Create a Pages project connected to the new GitHub branch/repository:
- Framework preset: Vite
- Build command: npm run build
- Build output: dist
- Production branch: foreignlovee-social-cloudflare during QA; switch production to main only after review and merge.
- Set environment variables VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_TURNSTILE_SITE_KEY.
- Never add Supabase service-role keys or payment secrets as VITE_* variables.
- Add foreignlovee.com through Pages > Custom domains. The apex domain requires the zone and nameservers to be on Cloudflare. Preserve existing MX, SPF, DKIM and DMARC records before changing nameservers.
- Test on the Pages preview domain before attaching the apex domain.

## Release gates
1. Remove adult routes, adult store/admin tabs, explicit flags/gates and all imported media from public web assets.
2. Review all retained creator assets and obtain documented permission before publishing.
3. Implement the social-first mobile UX and creator/story/post flows.
4. Wire all social features to the new Supabase schema and enforce entitlement checks server-side/RLS.
5. Add moderation, report/block flows and independent admin role checks.
6. Add payment provider checkout + verified webhook; no simulated payment success.
7. Run install, typecheck, lint, build, mobile viewport and auth/payment tests.
8. Only then deploy and point foreignlovee.com.

## First deployment configuration
Cloudflare Pages React/Vite build: npm run build, output directory dist.
