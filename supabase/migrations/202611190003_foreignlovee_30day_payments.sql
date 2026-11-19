-- ForeignLovee: one-time 30-day membership checkout and verified fulfillment.
-- Apply after 202611190001 and 202611190002.
-- The amount/currency are intentionally unset until merchant pricing is approved.

create table if not exists public.membership_plans (
  code text primary key,
  name text not null,
  duration_days integer not null check (duration_days between 1 and 366),
  billing_type text not null default 'one_time' check (billing_type = 'one_time'),
  amount numeric(12,2),
  currency char(3),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (is_active = false)
    or (amount is not null and amount > 0 and currency is not null)
  )
);

insert into public.membership_plans(code,name,duration_days,billing_type,is_active)
values ('pass_30d','30-day access pass',30,'one_time',false)
on conflict (code) do nothing;

create table if not exists public.checkout_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null references public.membership_plans(code),
  provider text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency char(3) not null,
  status text not null default 'pending' check (status in ('pending','processing','paid','failed','cancelled','expired')),
  provider_checkout_reference text unique,
  provider_payment_reference text unique,
  checkout_url text,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists checkout_orders_user_created_idx on public.checkout_orders(user_id,created_at desc);

alter table public.payment_transactions
  add column if not exists checkout_order_id uuid references public.checkout_orders(id),
  add column if not exists provider_event_id text;

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  processing_error text,
  received_at timestamptz not null default now(),
  unique(provider,provider_event_id)
);

alter table public.membership_plans enable row level security;
alter table public.checkout_orders enable row level security;
alter table public.payment_webhook_events enable row level security;

create policy "users read active plans" on public.membership_plans for select
using (is_active = true);
create policy "users read own checkout orders" on public.checkout_orders for select
using (user_id = auth.uid() or public.is_platform_admin());
create policy "admins manage checkout orders" on public.checkout_orders for all
using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "admins inspect webhook events" on public.payment_webhook_events for select
using (public.is_platform_admin());

-- Clients cannot create or mark their own checkout/payment state.
revoke insert, update, delete on public.checkout_orders from authenticated;
revoke insert, update, delete on public.payment_transactions from authenticated;
revoke insert, update, delete on public.payment_webhook_events from authenticated;
revoke insert, update, delete on public.platform_entitlements from authenticated;

-- Called only by a trusted server after validating the provider's webhook signature
-- and confirming the provider's transaction status via its server API where supported.
create or replace function public.fulfill_verified_30day_payment(
  p_order_id uuid,
  p_provider text,
  p_provider_event_id text,
  p_provider_payment_reference text,
  p_paid_amount numeric,
  p_paid_currency char(3),
  p_event_type text,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.checkout_orders%rowtype;
  v_event_id uuid;
  v_entitlement_id uuid;
  v_now timestamptz := now();
begin
  if p_provider_event_id is null or length(trim(p_provider_event_id)) = 0 then
    raise exception 'Provider event ID is required';
  end if;

  insert into public.payment_webhook_events(provider,provider_event_id,event_type,payload)
  values (p_provider,p_provider_event_id,p_event_type,coalesce(p_payload,'{}'::jsonb))
  on conflict (provider,provider_event_id) do nothing
  returning id into v_event_id;

  select * into v_order
  from public.checkout_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Checkout order not found';
  end if;

  if v_order.provider <> p_provider then
    raise exception 'Payment provider does not match checkout order';
  end if;

  if v_order.status = 'paid' then
    select id into v_entitlement_id
    from public.platform_entitlements
    where provider_reference = v_order.provider_payment_reference
    order by created_at desc limit 1;
    if v_entitlement_id is not null then
      return v_entitlement_id;
    end if;
    raise exception 'Paid order has no entitlement record; manual reconciliation required';
  end if;

  if v_order.status not in ('pending','processing') or v_order.expires_at < v_now then
    raise exception 'Checkout order is not payable';
  end if;

  if v_order.amount <> p_paid_amount or upper(v_order.currency) <> upper(p_paid_currency) then
    raise exception 'Paid amount or currency does not match the checkout order';
  end if;

  if exists (
    select 1 from public.payment_transactions
    where provider_reference = p_provider_payment_reference
      and status = 'succeeded'
  ) then
    raise exception 'Payment reference already fulfilled';
  end if;

  update public.checkout_orders
  set status = 'paid',
      provider_payment_reference = p_provider_payment_reference,
      paid_at = v_now,
      updated_at = v_now
  where id = p_order_id;

  insert into public.payment_transactions(
    user_id,provider,provider_reference,amount,currency,status,plan_code,
    verified_at,provider_payload,checkout_order_id,provider_event_id
  ) values (
    v_order.user_id,p_provider,p_provider_payment_reference,p_paid_amount,
    upper(p_paid_currency),'succeeded',v_order.plan_code,v_now,
    coalesce(p_payload,'{}'::jsonb),v_order.id,p_provider_event_id
  );

  -- Extend from the later of now or the member's current active expiry.
  insert into public.platform_entitlements(
    user_id,plan_code,status,starts_at,expires_at,provider,provider_reference
  )
  values (
    v_order.user_id,
    'pass_30d',
    'active',
    greatest(v_now, coalesce((
      select max(expires_at)
      from public.platform_entitlements
      where user_id = v_order.user_id
        and status = 'active'
        and expires_at > v_now
    ),v_now)),
    greatest(v_now, coalesce((
      select max(expires_at)
      from public.platform_entitlements
      where user_id = v_order.user_id
        and status = 'active'
        and expires_at > v_now
    ),v_now)) + interval '30 days',
    p_provider,
    p_provider_payment_reference
  )
  returning id into v_entitlement_id;

  update public.payment_webhook_events
  set processed_at = v_now, processing_error = null
  where provider = p_provider and provider_event_id = p_provider_event_id;

  return v_entitlement_id;
exception when others then
  update public.payment_webhook_events
  set processing_error = sqlerrm
  where provider = p_provider and provider_event_id = p_provider_event_id
    and processed_at is null;
  raise;
end;
$$;

revoke all on function public.fulfill_verified_30day_payment(uuid,text,text,text,numeric,char,text,jsonb) from public,anon,authenticated;
grant execute on function public.fulfill_verified_30day_payment(uuid,text,text,text,numeric,char,text,jsonb) to service_role;

-- Only trusted backend code may create a pending checkout order.
-- The service-role key must never be included in browser bundles.
