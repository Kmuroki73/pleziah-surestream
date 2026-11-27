-- PLEZIAH wallet, paid-message and creator-payout ledger.
-- Additive migration. No customer cash-out or discretionary refund workflow is created.
begin;

alter table public.pleziah_creators
  alter column session_price set default 8;
comment on column public.pleziah_creators.session_price is
  'Creator-controlled USD price for paid chat messages; new creator default is USD 8.';

create table if not exists public.pleziah_wallets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  wallet_type text not null check (wallet_type in ('fan','creator','platform')),
  currency text not null default 'USD' check (currency='USD'),
  available_balance numeric(12,2) not null default 0 check (available_balance >= 0),
  held_balance numeric(12,2) not null default 0 check (held_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((wallet_type='platform' and owner_user_id is null) or (wallet_type in ('fan','creator') and owner_user_id is not null)),
  unique(owner_user_id,wallet_type)
);
create unique index if not exists pleziah_single_platform_wallet
  on public.pleziah_wallets(wallet_type) where wallet_type='platform';

create table if not exists public.pleziah_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.pleziah_wallets(id),
  entry_type text not null check (entry_type in ('deposit','message_purchase','creator_earning','platform_commission','withdrawal_hold','withdrawal_paid','withdrawal_released','admin_adjustment')),
  direction text not null check (direction in ('credit','debit')),
  amount numeric(12,2) not null check (amount > 0),
  balance_after numeric(12,2) not null check (balance_after >= 0),
  reference_type text,
  reference_id uuid,
  idempotency_key text,
  description text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists pleziah_wallet_ledger_idempotency
  on public.pleziah_wallet_ledger(wallet_id,idempotency_key)
  where idempotency_key is not null;
create index if not exists pleziah_wallet_ledger_wallet_date
  on public.pleziah_wallet_ledger(wallet_id,created_at desc);

create table if not exists public.pleziah_conversations (
  id uuid primary key default gen_random_uuid(),
  fan_user_id uuid not null references auth.users(id) on delete cascade,
  creator_id uuid not null references public.pleziah_creators(id) on delete cascade,
  started_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);
create index if not exists pleziah_conversations_fan_creator
  on public.pleziah_conversations(fan_user_id,creator_id,started_at desc);

create table if not exists public.pleziah_paid_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.pleziah_conversations(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  charged_amount numeric(12,2) not null default 0 check (charged_amount >= 0),
  creator_earning numeric(12,2) not null default 0 check (creator_earning >= 0),
  platform_commission numeric(12,2) not null default 0 check (platform_commission >= 0),
  is_introductory_free_message boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists pleziah_paid_messages_conversation_date
  on public.pleziah_paid_messages(conversation_id,created_at);

create table if not exists public.pleziah_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 150 and amount <= 300),
  currency text not null default 'USD' check (currency='USD'),
  payout_phone text not null,
  status text not null default 'pending' check (status in ('pending','processing','paid','rejected')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id),
  admin_note text not null default ''
);
create index if not exists pleziah_withdrawals_creator_date
  on public.pleziah_withdrawal_requests(creator_user_id,requested_at desc);
create index if not exists pleziah_withdrawals_status_date
  on public.pleziah_withdrawal_requests(status,requested_at);

alter table public.pleziah_wallets enable row level security;
alter table public.pleziah_wallet_ledger enable row level security;
alter table public.pleziah_conversations enable row level security;
alter table public.pleziah_paid_messages enable row level security;
alter table public.pleziah_withdrawal_requests enable row level security;

drop policy if exists "Members read own Pleziah wallets" on public.pleziah_wallets;
create policy "Members read own Pleziah wallets"
on public.pleziah_wallets for select to authenticated
using (owner_user_id=auth.uid() or public.is_pleziah_admin());

drop policy if exists "Members read own Pleziah ledger" on public.pleziah_wallet_ledger;
create policy "Members read own Pleziah ledger"
on public.pleziah_wallet_ledger for select to authenticated
using (
  exists(select 1 from public.pleziah_wallets w where w.id=wallet_id and w.owner_user_id=auth.uid())
  or public.is_pleziah_admin()
);

drop policy if exists "Participants read own conversations" on public.pleziah_conversations;
create policy "Participants read own conversations"
on public.pleziah_conversations for select to authenticated
using (fan_user_id=auth.uid() or exists(select 1 from public.pleziah_creators c where c.id=creator_id and c.user_id=auth.uid()) or public.is_pleziah_admin());

drop policy if exists "Participants read own paid messages" on public.pleziah_paid_messages;
create policy "Participants read own paid messages"
on public.pleziah_paid_messages for select to authenticated
using (
  sender_user_id=auth.uid()
  or exists(select 1 from public.pleziah_conversations v join public.pleziah_creators c on c.id=v.creator_id where v.id=conversation_id and (v.fan_user_id=auth.uid() or c.user_id=auth.uid()))
  or public.is_pleziah_admin()
);

drop policy if exists "Creators read own withdrawal requests" on public.pleziah_withdrawal_requests;
create policy "Creators read own withdrawal requests"
on public.pleziah_withdrawal_requests for select to authenticated
using (creator_user_id=auth.uid() or public.is_pleziah_admin());

grant select on public.pleziah_wallets,public.pleziah_wallet_ledger,public.pleziah_conversations,public.pleziah_paid_messages,public.pleziah_withdrawal_requests to authenticated;

create or replace function public.pleziah_start_conversation(p_creator_id uuid)
returns uuid
language plpgsql security definer
set search_path=public,auth
as $$
declare v_uid uuid:=auth.uid(); v_creator public.pleziah_creators%rowtype; v_id uuid;
begin
  if v_uid is null then raise exception 'Sign in to start a conversation.'; end if;
  select * into v_creator from public.pleziah_creators
   where id=p_creator_id and is_approved and is_published;
  if not found then raise exception 'This creator is not currently available.'; end if;
  if v_creator.user_id=v_uid then raise exception 'You cannot start a paid conversation with your own creator profile.'; end if;
  insert into public.pleziah_conversations(fan_user_id,creator_id)
  values(v_uid,p_creator_id) returning id into v_id;
  insert into public.pleziah_wallets(owner_user_id,wallet_type)
  values(v_uid,'fan') on conflict(owner_user_id,wallet_type) do nothing;
  return v_id;
end;
$$;
revoke all on function public.pleziah_start_conversation(uuid) from public;
grant execute on function public.pleziah_start_conversation(uuid) to authenticated;

create or replace function public.pleziah_send_paid_message(p_conversation_id uuid,p_body text)
returns jsonb
language plpgsql security definer
set search_path=public,auth
as $$
declare
  v_uid uuid:=auth.uid();
  v_conv public.pleziah_conversations%rowtype;
  v_creator public.pleziah_creators%rowtype;
  v_fan_wallet public.pleziah_wallets%rowtype;
  v_creator_wallet public.pleziah_wallets%rowtype;
  v_platform_wallet public.pleziah_wallets%rowtype;
  v_price numeric(12,2);
  v_creator_share numeric(12,2);
  v_fee numeric(12,2);
  v_message_id uuid;
  v_free boolean;
begin
  if v_uid is null then raise exception 'Sign in before sending a message.'; end if;
  if coalesce(length(trim(p_body)),0)=0 or length(p_body)>4000 then raise exception 'Message must contain 1 to 4000 characters.'; end if;
  select * into v_conv from public.pleziah_conversations where id=p_conversation_id and fan_user_id=v_uid and status='open' for update;
  if not found then raise exception 'Conversation not found or closed.'; end if;
  select * into v_creator from public.pleziah_creators where id=v_conv.creator_id and is_approved and is_published;
  if not found then raise exception 'Creator is not available.'; end if;
  v_free := now() <= v_conv.started_at + interval '60 seconds';
  v_price := case when v_free then 0 else v_creator.session_price end;

  insert into public.pleziah_wallets(owner_user_id,wallet_type) values(v_uid,'fan')
    on conflict(owner_user_id,wallet_type) do nothing;
  select * into v_fan_wallet from public.pleziah_wallets where owner_user_id=v_uid and wallet_type='fan' for update;
  if v_price>0 and v_fan_wallet.available_balance<v_price then raise exception 'Insufficient wallet balance. Add funds to continue.'; end if;

  if v_price>0 then
    v_creator_share := round(v_price*0.90,2);
    v_fee := v_price-v_creator_share;
    update public.pleziah_wallets set available_balance=available_balance-v_price,updated_at=now()
      where id=v_fan_wallet.id returning * into v_fan_wallet;
    insert into public.pleziah_wallet_ledger(wallet_id,entry_type,direction,amount,balance_after,reference_type,description)
      values(v_fan_wallet.id,'message_purchase','debit',v_price,v_fan_wallet.available_balance,'conversation','Paid creator message');

    insert into public.pleziah_wallets(owner_user_id,wallet_type) values(v_creator.user_id,'creator')
      on conflict(owner_user_id,wallet_type) do nothing;
    select * into v_creator_wallet from public.pleziah_wallets where owner_user_id=v_creator.user_id and wallet_type='creator' for update;
    update public.pleziah_wallets set available_balance=available_balance+v_creator_share,updated_at=now()
      where id=v_creator_wallet.id returning * into v_creator_wallet;
    insert into public.pleziah_wallet_ledger(wallet_id,entry_type,direction,amount,balance_after,reference_type,description)
      values(v_creator_wallet.id,'creator_earning','credit',v_creator_share,v_creator_wallet.available_balance,'conversation','90% creator share from paid message');

    insert into public.pleziah_wallets(owner_user_id,wallet_type) values(null,'platform')
      on conflict do nothing;
    select * into v_platform_wallet from public.pleziah_wallets where wallet_type='platform' for update;
    update public.pleziah_wallets set available_balance=available_balance+v_fee,updated_at=now()
      where id=v_platform_wallet.id returning * into v_platform_wallet;
    insert into public.pleziah_wallet_ledger(wallet_id,entry_type,direction,amount,balance_after,reference_type,description)
      values(v_platform_wallet.id,'platform_commission','credit',v_fee,v_platform_wallet.available_balance,'conversation','10% Pleziah commission');
  else
    v_creator_share:=0; v_fee:=0;
  end if;

  insert into public.pleziah_paid_messages(conversation_id,sender_user_id,body,charged_amount,creator_earning,platform_commission,is_introductory_free_message)
  values(p_conversation_id,v_uid,trim(p_body),v_price,v_creator_share,v_fee,v_free)
  returning id into v_message_id;
  return jsonb_build_object('message_id',v_message_id,'charged_amount',v_price,'creator_earning',v_creator_share,'platform_commission',v_fee,'introductory_free',v_free,'currency','USD');
end;
$$;
revoke all on function public.pleziah_send_paid_message(uuid,text) from public;
grant execute on function public.pleziah_send_paid_message(uuid,text) to authenticated;

create or replace function public.pleziah_request_creator_withdrawal(p_amount numeric)
returns uuid
language plpgsql security definer
set search_path=public,auth
as $$
declare
  v_uid uuid:=auth.uid();
  v_phone text;
  v_wallet public.pleziah_wallets%rowtype;
  v_request_id uuid;
begin
  if v_uid is null then raise exception 'Sign in before requesting a withdrawal.'; end if;
  if p_amount<150 or p_amount>300 then raise exception 'Creator withdrawals must be between USD 150 and USD 300 per request.'; end if;
  if not exists(select 1 from public.pleziah_creators where user_id=v_uid) then raise exception 'Only registered creators can request earnings withdrawals.'; end if;
  select coalesce(nullif(phone,''),nullif(raw_user_meta_data->>'payout_phone',''))
    into v_phone from auth.users where id=v_uid;
  if v_phone is null or v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Add your international payout phone number in your account settings before withdrawing.';
  end if;
  select * into v_wallet from public.pleziah_wallets where owner_user_id=v_uid and wallet_type='creator' for update;
  if not found or v_wallet.available_balance<p_amount then raise exception 'Insufficient available creator earnings.'; end if;
  update public.pleziah_wallets set available_balance=available_balance-p_amount,held_balance=held_balance+p_amount,updated_at=now()
    where id=v_wallet.id returning * into v_wallet;
  insert into public.pleziah_withdrawal_requests(creator_user_id,amount,payout_phone)
    values(v_uid,p_amount,v_phone) returning id into v_request_id;
  insert into public.pleziah_wallet_ledger(wallet_id,entry_type,direction,amount,balance_after,reference_type,reference_id,description)
    values(v_wallet.id,'withdrawal_hold','debit',p_amount,v_wallet.available_balance,'withdrawal',v_request_id,'Creator withdrawal request held for processing');
  return v_request_id;
end;
$$;
revoke all on function public.pleziah_request_creator_withdrawal(numeric) from public;
grant execute on function public.pleziah_request_creator_withdrawal(numeric) to authenticated;

create or replace function public.admin_list_pleziah_withdrawals()
returns jsonb
language plpgsql stable security definer
set search_path=public,auth
as $$
declare v_rows jsonb;
begin
  if not public.is_pleziah_admin() then raise exception 'Admin access required.'; end if;
  select coalesce(jsonb_agg(to_jsonb(w) || jsonb_build_object('display_name',c.display_name,'username',c.username) order by w.requested_at desc),'[]'::jsonb)
    into v_rows
    from public.pleziah_withdrawal_requests w
    left join public.pleziah_creators c on c.user_id=w.creator_user_id;
  return v_rows;
end;
$$;
revoke all on function public.admin_list_pleziah_withdrawals() from public;
grant execute on function public.admin_list_pleziah_withdrawals() to authenticated;

create or replace function public.admin_process_pleziah_withdrawal(p_request_id uuid,p_action text,p_note text default '')
returns boolean
language plpgsql security definer
set search_path=public,auth
as $$
declare
  v_request public.pleziah_withdrawal_requests%rowtype;
  v_wallet public.pleziah_wallets%rowtype;
begin
  if not public.is_pleziah_admin() then raise exception 'Admin access required.'; end if;
  if p_action not in ('processing','paid','rejected') then raise exception 'Invalid withdrawal action.'; end if;
  select * into v_request from public.pleziah_withdrawal_requests where id=p_request_id for update;
  if not found then raise exception 'Withdrawal request not found.'; end if;
  if v_request.status in ('paid','rejected') then raise exception 'This withdrawal request has already been closed.'; end if;
  if p_action='processing' then
    update public.pleziah_withdrawal_requests set status='processing',admin_note=coalesce(p_note,''),processed_by=auth.uid() where id=p_request_id;
    return true;
  end if;
  select * into v_wallet from public.pleziah_wallets where owner_user_id=v_request.creator_user_id and wallet_type='creator' for update;
  if p_action='paid' then
    update public.pleziah_wallets set held_balance=held_balance-v_request.amount,updated_at=now() where id=v_wallet.id returning * into v_wallet;
    insert into public.pleziah_wallet_ledger(wallet_id,entry_type,direction,amount,balance_after,reference_type,reference_id,description)
      values(v_wallet.id,'withdrawal_paid','debit',v_request.amount,v_wallet.available_balance,'withdrawal',p_request_id,'Creator payout marked paid by admin');
  else
    update public.pleziah_wallets set held_balance=held_balance-v_request.amount,available_balance=available_balance+v_request.amount,updated_at=now() where id=v_wallet.id returning * into v_wallet;
    insert into public.pleziah_wallet_ledger(wallet_id,entry_type,direction,amount,balance_after,reference_type,reference_id,description)
      values(v_wallet.id,'withdrawal_released','credit',v_request.amount,v_wallet.available_balance,'withdrawal',p_request_id,'Rejected withdrawal returned to creator wallet');
  end if;
  update public.pleziah_withdrawal_requests set status=p_action,processed_at=now(),processed_by=auth.uid(),admin_note=coalesce(p_note,'') where id=p_request_id;
  return true;
end;
$$;
revoke all on function public.admin_process_pleziah_withdrawal(uuid,text,text) from public;
grant execute on function public.admin_process_pleziah_withdrawal(uuid,text,text) to authenticated;

-- Only a trusted payment webhook (service role) or administrator can credit a fan wallet
-- after independently verifying a successful payment. No fan-facing balance mutation exists.
create or replace function public.pleziah_credit_fan_wallet_after_payment(
  p_fan_user_id uuid,p_amount numeric,p_provider text,p_provider_reference text
)
returns boolean
language plpgsql security definer
set search_path=public,auth
as $$
declare v_wallet public.pleziah_wallets%rowtype; v_role text;
begin
  v_role:=coalesce(current_setting('request.jwt.claim.role',true),'');
  if v_role<>'service_role' and not public.is_pleziah_admin() then raise exception 'Verified payment webhook or admin access required.'; end if;
  if p_amount<=0 or p_amount>5000 then raise exception 'Deposit amount is outside the allowed range.'; end if;
  if coalesce(trim(p_provider),'')='' or coalesce(trim(p_provider_reference),'')='' then raise exception 'Payment provider and reference are required.'; end if;
  insert into public.pleziah_wallets(owner_user_id,wallet_type) values(p_fan_user_id,'fan')
    on conflict(owner_user_id,wallet_type) do nothing;
  select * into v_wallet from public.pleziah_wallets where owner_user_id=p_fan_user_id and wallet_type='fan' for update;
  if exists(select 1 from public.pleziah_wallet_ledger where wallet_id=v_wallet.id and idempotency_key=p_provider||':'||p_provider_reference) then return true; end if;
  update public.pleziah_wallets set available_balance=available_balance+p_amount,updated_at=now()
    where id=v_wallet.id returning * into v_wallet;
  insert into public.pleziah_wallet_ledger(wallet_id,entry_type,direction,amount,balance_after,idempotency_key,description,metadata)
    values(v_wallet.id,'deposit','credit',p_amount,v_wallet.available_balance,p_provider||':'||p_provider_reference,'Verified fan wallet deposit',jsonb_build_object('provider',p_provider,'provider_reference',p_provider_reference));
  return true;
end;
$$;
revoke all on function public.pleziah_credit_fan_wallet_after_payment(uuid,numeric,text,text) from public;
grant execute on function public.pleziah_credit_fan_wallet_after_payment(uuid,numeric,text,text) to service_role,authenticated;

commit;
