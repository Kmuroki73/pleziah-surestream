-- Additive SURESTREAM / PLEZIAH central administration and E-LIBRARY.
create extension if not exists pgcrypto;
create table if not exists public.elibrary_books (
 id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 2 and 180), author text not null default '', description text not null default '', category text not null default 'General', price numeric(10,2) not null default 1500 check(price>=0), currency text not null default 'KES' check(currency='KES'), cover_path text, content_path text not null, content_type text not null check(content_type in('application/pdf','image/jpeg','image/png','image/webp')), is_published boolean not null default false, published_at timestamptz, expires_at timestamptz, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists elibrary_books_public_idx on public.elibrary_books(is_published,expires_at desc,created_at desc);
alter table public.elibrary_books enable row level security;
drop policy if exists "Public can view active E-Library listings" on public.elibrary_books;
create policy "Public can view active E-Library listings" on public.elibrary_books for select to anon,authenticated using(is_published and expires_at>now());
drop policy if exists "Admins manage E-Library books" on public.elibrary_books;
create policy "Admins manage E-Library books" on public.elibrary_books for all to authenticated using(public.is_pleziah_admin()) with check(public.is_pleziah_admin());
grant select on public.elibrary_books to anon,authenticated; grant insert,update,delete on public.elibrary_books to authenticated;

create table if not exists public.platform_orders (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references auth.users(id), product_type text not null check(product_type in('ebook','model_subscription','model_content','match_access','other')), product_id uuid, product_name text not null, amount numeric(10,2) not null check(amount>=0), currency text not null default 'KES', status text not null default 'pending' check(status in('pending','awaiting_verification','paid','rejected','cancelled')), payment_reference text, payer_name text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists platform_orders_created_idx on public.platform_orders(created_at desc); alter table public.platform_orders enable row level security;
drop policy if exists "Customers view own orders" on public.platform_orders; create policy "Customers view own orders" on public.platform_orders for select to authenticated using(customer_id=auth.uid() or public.is_pleziah_admin());
drop policy if exists "Customers create own orders" on public.platform_orders; create policy "Customers create own orders" on public.platform_orders for insert to authenticated with check(customer_id=auth.uid());
drop policy if exists "Admins update platform orders" on public.platform_orders; create policy "Admins update platform orders" on public.platform_orders for update to authenticated using(public.is_pleziah_admin()) with check(public.is_pleziah_admin()); grant select,insert,update on public.platform_orders to authenticated;

create table if not exists public.platform_payments (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.platform_orders(id), customer_id uuid not null references auth.users(id), product_type text not null, product_id uuid, product_name text not null, amount numeric(10,2) not null, currency text not null default 'KES', method text not null default 'I&M Bank Paybill', transaction_reference text, status text not null default 'pending' check(status in('pending','verified','rejected')), verified_by uuid references auth.users(id), verified_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists platform_payments_created_idx on public.platform_payments(created_at desc); alter table public.platform_payments enable row level security;
drop policy if exists "Admins manage platform payments" on public.platform_payments; create policy "Admins manage platform payments" on public.platform_payments for all to authenticated using(public.is_pleziah_admin()) with check(public.is_pleziah_admin());
drop policy if exists "Customers view own platform payments" on public.platform_payments; create policy "Customers view own platform payments" on public.platform_payments for select to authenticated using(customer_id=auth.uid()); grant select,insert,update on public.platform_payments to authenticated;

create table if not exists public.platform_entitlements (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references auth.users(id) on delete cascade, product_type text not null, product_id uuid not null, order_id uuid not null references public.platform_orders(id), granted_at timestamptz not null default now(), unique(customer_id,product_type,product_id)
); alter table public.platform_entitlements enable row level security;
drop policy if exists "Customers read own entitlements" on public.platform_entitlements; create policy "Customers read own entitlements" on public.platform_entitlements for select to authenticated using(customer_id=auth.uid() or public.is_pleziah_admin());
drop policy if exists "Admins manage entitlements" on public.platform_entitlements; create policy "Admins manage entitlements" on public.platform_entitlements for all to authenticated using(public.is_pleziah_admin()) with check(public.is_pleziah_admin()); grant select,insert,update,delete on public.platform_entitlements to authenticated;

create or replace function public.admin_verify_platform_payment(p_payment_id uuid,p_approve boolean) returns boolean language plpgsql security definer set search_path=public,auth as $$
declare p public.platform_payments%rowtype; o public.platform_orders%rowtype;
begin if not public.is_pleziah_admin() then raise exception 'Admin access required'; end if; select * into p from public.platform_payments where id=p_payment_id for update; if not found then raise exception 'Payment not found'; end if; select * into o from public.platform_orders where id=p.order_id for update;
if p_approve then update public.platform_payments set status='verified',verified_by=auth.uid(),verified_at=now() where id=p_payment_id; update public.platform_orders set status='paid',updated_at=now() where id=o.id; if o.product_id is not null then insert into public.platform_entitlements(customer_id,product_type,product_id,order_id) values(o.customer_id,o.product_type,o.product_id,o.id) on conflict do nothing; end if;
else update public.platform_payments set status='rejected',verified_by=auth.uid(),verified_at=now() where id=p_payment_id; update public.platform_orders set status='rejected',updated_at=now() where id=o.id; end if; return true; end; $$;
revoke all on function public.admin_verify_platform_payment(uuid,boolean) from public; grant execute on function public.admin_verify_platform_payment(uuid,boolean) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('elibrary-private','elibrary-private',false,52428800,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=52428800,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "E-Library admins upload files" on storage.objects; create policy "E-Library admins upload files" on storage.objects for insert to authenticated with check(bucket_id='elibrary-private' and public.is_pleziah_admin());
drop policy if exists "E-Library admins update files" on storage.objects; create policy "E-Library admins update files" on storage.objects for update to authenticated using(bucket_id='elibrary-private' and public.is_pleziah_admin()) with check(bucket_id='elibrary-private' and public.is_pleziah_admin());
drop policy if exists "E-Library admins delete files" on storage.objects; create policy "E-Library admins delete files" on storage.objects for delete to authenticated using(bucket_id='elibrary-private' and public.is_pleziah_admin());
drop policy if exists "E-Library entitled customers read files" on storage.objects; create policy "E-Library entitled customers read files" on storage.objects for select to authenticated using(bucket_id='elibrary-private' and (public.is_pleziah_admin() or exists(select 1 from public.elibrary_books b join public.platform_entitlements e on e.product_id=b.id and e.product_type='ebook' where e.customer_id=auth.uid() and (b.content_path=name or b.cover_path=name))));

create table if not exists public.platform_settings(setting_key text primary key,setting_value jsonb not null default '{}'::jsonb,updated_by uuid references auth.users(id),updated_at timestamptz not null default now()); alter table public.platform_settings enable row level security;
drop policy if exists "Admins manage platform settings" on public.platform_settings; create policy "Admins manage platform settings" on public.platform_settings for all to authenticated using(public.is_pleziah_admin()) with check(public.is_pleziah_admin()); grant select,insert,update,delete on public.platform_settings to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('elibrary-covers','elibrary-covers',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Public read E-Library covers" on storage.objects; create policy "Public read E-Library covers" on storage.objects for select to anon,authenticated using(bucket_id='elibrary-covers');
drop policy if exists "Admins upload E-Library covers" on storage.objects; create policy "Admins upload E-Library covers" on storage.objects for insert to authenticated with check(bucket_id='elibrary-covers' and public.is_pleziah_admin());
drop policy if exists "Admins update E-Library covers" on storage.objects; create policy "Admins update E-Library covers" on storage.objects for update to authenticated using(bucket_id='elibrary-covers' and public.is_pleziah_admin()) with check(bucket_id='elibrary-covers' and public.is_pleziah_admin());
drop policy if exists "Admins delete E-Library covers" on storage.objects; create policy "Admins delete E-Library covers" on storage.objects for delete to authenticated using(bucket_id='elibrary-covers' and public.is_pleziah_admin());
-- Security-definer entitlement check deliberately ignores public listing expiry,
-- so a verified buyer keeps access after the 24-hour listing window closes.
create or replace function public.can_read_elibrary_object(p_object_path text)
returns boolean language sql stable security definer set search_path=public,auth as $$
 select public.is_pleziah_admin() or exists(
  select 1 from public.elibrary_books b
  join public.platform_entitlements e on e.product_id=b.id and e.product_type='ebook'
  where e.customer_id=auth.uid() and b.content_path=p_object_path
 );
$$;
revoke all on function public.can_read_elibrary_object(text) from public;
grant execute on function public.can_read_elibrary_object(text) to authenticated;
drop policy if exists "E-Library entitled customers read files" on storage.objects;
create policy "E-Library entitled customers read files" on storage.objects for select to authenticated
using(bucket_id='elibrary-private' and public.can_read_elibrary_object(name));
