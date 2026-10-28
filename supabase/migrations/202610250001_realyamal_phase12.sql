-- REALYAMAL Phase 1–2: reservations and auditable manual payment submissions.
-- Apply in the intended Supabase project only after reviewing the project URL.
create extension if not exists pgcrypto;

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  tier text not null check (tier in ('standard','vip','vvip')),
  amount_kes integer not null check (amount_kes > 0),
  currency text not null default 'KES' check (currency = 'KES'),
  payment_method text not null check (payment_method in ('mpesa','paypal')),
  payment_status text not null default 'pending' check (payment_status in ('pending','submitted_for_verification','paid','failed','cancelled','refunded')),
  access_status text not null default 'locked' check (access_status in ('locked','active','expired','revoked')),
  access_starts_at timestamptz,
  access_expires_at timestamptz,
  provider_order_id text unique,
  provider_capture_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reservations_user_idx on public.reservations(user_id, created_at desc);
create index if not exists reservations_event_tier_idx on public.reservations(event_id, tier) where payment_status in ('pending','submitted_for_verification','paid');

create table if not exists public.payment_submissions (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  method text not null check (method = 'mpesa_manual'),
  transaction_reference text not null,
  created_at timestamptz not null default now(),
  unique(method, transaction_reference)
);

alter table public.reservations enable row level security;
alter table public.payment_submissions enable row level security;

-- A customer can only create a pending, locked reservation for their own account.
drop policy if exists "users create own pending reservations" on public.reservations;
create policy "users create own pending reservations" on public.reservations
  for insert to authenticated with check (
    auth.uid() = user_id and payment_status = 'pending' and access_status = 'locked'
    and ((tier = 'standard' and amount_kes = 50) or (tier = 'vip' and amount_kes = 50) or (tier = 'vvip' and amount_kes = 100))
  );
drop policy if exists "users read own reservations" on public.reservations;
create policy "users read own reservations" on public.reservations for select to authenticated using (auth.uid() = user_id);
-- No client update/delete policy: only trusted server/admin processes may verify payment or grant access.

drop policy if exists "users submit own payment references" on public.payment_submissions;
create policy "users submit own payment references" on public.payment_submissions
  for insert to authenticated with check (
    auth.uid() = user_id and exists (
      select 1 from public.reservations r where r.id = reservation_id and r.user_id = auth.uid()
      and r.payment_status = 'pending' and r.payment_method = 'mpesa'
    )
  );
drop policy if exists "users read own payment submissions" on public.payment_submissions;
create policy "users read own payment submissions" on public.payment_submissions for select to authenticated using (auth.uid() = user_id);

create or replace function public.enforce_reservation_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare seat_limit integer;
declare current_count integer;
begin
  seat_limit := case new.tier when 'vip' then 3000 when 'vvip' then 1000 when 'standard' then 6000 else 0 end;
  if tg_op = 'INSERT' and new.payment_status in ('pending','submitted_for_verification','paid') then
    perform pg_advisory_xact_lock(hashtext(new.event_id), hashtext(new.tier));
    select count(*) into current_count from public.reservations r
      where r.event_id = new.event_id and r.tier = new.tier
      and r.payment_status in ('pending','submitted_for_verification','paid');
    if current_count >= seat_limit then raise exception 'This seat tier is sold out for this event'; end if;
  end if;
  new.updated_at := now();
  return new;
end; $$;
drop trigger if exists reservations_capacity_trigger on public.reservations;
create trigger reservations_capacity_trigger before insert or update on public.reservations
for each row execute function public.enforce_reservation_capacity();

-- IMPORTANT: paid/access fields must only be changed by trusted server-side code/admin after provider verification.
