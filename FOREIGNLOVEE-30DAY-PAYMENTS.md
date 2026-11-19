# ForeignLovee: one-time 30-day paid access architecture

## Commercial rule
A member purchases one 30-day access pass. It is a one-time payment, not an automatically renewing subscription. At expiry the member can purchase another pass. If a member buys early, the new 30 days are added after the current active pass expires; the member does not lose already-paid time.

The exact price, currency/currency strategy, taxes and payment provider are intentionally not assumed. The 30-day plan remains inactive until those commercial settings and merchant approval are confirmed.

## Checkout and fulfillment flow
1. The signed-in user selects the 30-day pass.
2. The trusted server reads the active plan and creates a pending checkout order using the plan's configured amount/currency.
3. The server creates a hosted checkout session with the selected payment provider. Only the hosted checkout URL/reference is returned to the browser.
4. The provider redirects the user back to ForeignLovee. The redirect is only a user-experience signal; it never unlocks access.
5. The provider sends a signed webhook to a server-side endpoint. The endpoint validates signature, event identity, provider, amount, currency, checkout/order reference and final paid status. Where supported, the endpoint also verifies the transaction against the provider's server API.
6. The server calls `fulfill_verified_30day_payment` with the validated values. The database function locks the order, checks exact amount/currency, records the payment, marks the order paid and grants a 30-day entitlement.
7. Duplicate webhook delivery is expected. Provider event IDs and payment references are unique, and already-fulfilled orders return the existing entitlement instead of granting extra days.
8. The application checks `has_active_entitlement()`/the user's active entitlement for protected features. Expired users can sign in, view their account and renew, but cannot access paid feeds, posting, stories, or messaging.

## Database objects added in migration 202611190003
- `membership_plans`: one-time plan catalogue; seeded with inactive `pass_30d`.
- `checkout_orders`: user, provider, expected amount/currency, status, expiry and provider references.
- `payment_webhook_events`: provider event idempotency and processing audit.
- `fulfill_verified_30day_payment(...)`: service-role-only fulfillment function. It cannot be called by anonymous or authenticated browser clients.

## Secrets
Browser build variables only:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_TURNSTILE_SITE_KEY`

Server-side secrets only (Supabase Edge Function secrets or Cloudflare Worker secrets):
- `SUPABASE_SERVICE_ROLE_KEY`
- provider API secret
- provider webhook signing secret
- any provider-specific verification credentials

Never put payment or service-role secrets in a `VITE_*` variable, frontend code, GitHub, or chat.

## Provider selection gate
Before integrating a gateway, obtain written merchant approval for the actual ForeignLovee business model and confirm:
- Kenya merchant onboarding and settlement bank support.
- International card acceptance and settlement currencies.
- Hosted checkout and server-to-server signed webhooks.
- Transaction lookup/verification API and refund support.
- Chargeback/dispute workflow, fees and settlement schedule.
- Whether the provider permits this social/discovery platform category and all planned content types.

Do not assume approval based on the gateway advertising card or M-Pesa support. The provider-specific integration is deliberately not implemented until this is confirmed.

## Still outstanding
- Confirm final 30-day price and currencies.
- Choose a payment provider and obtain merchant approval.
- Connect the new Supabase project and apply all three migrations in order.
- Implement provider-specific checkout creation and signed webhook verification as a Supabase Edge Function.
- Provision the first platform owner/admin role directly and securely.
- Wire the UI to the real checkout/order/entitlement APIs.
- Test pending, successful, failed, expired, duplicate-webhook, wrong-amount, wrong-currency, refund and renewal cases.
