-- PLEZIAH V36 catalogue migration. Additive; payment verification RPC unchanged.
begin;
create table if not exists public.platform_catalog_items (
 id uuid primary key default gen_random_uuid(),
 item_type text not null check(item_type in('software','source_code','adult_shop')),
 title text not null check(char_length(title) between 2 and 180),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 description text not null default '', category text not null default 'General',
 price numeric(10,2) not null default 0 check(price>=0),
 currency text not null default 'KES' check(currency='KES'),
 cover_url text, external_url text, affiliate_url text,
 status text not null default 'draft' check(status in('draft','published','archived')),
 metadata jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists platform_catalog_items_type_status_idx on public.platform_catalog_items(item_type,status,created_at desc);
alter table public.platform_catalog_items enable row level security;
drop policy if exists "Public can view published catalogue items" on public.platform_catalog_items;
create policy "Public can view published catalogue items" on public.platform_catalog_items for select to anon,authenticated using(status='published');
drop policy if exists "Admins manage catalogue items" on public.platform_catalog_items;
create policy "Admins manage catalogue items" on public.platform_catalog_items for all to authenticated using(public.is_pleziah_admin()) with check(public.is_pleziah_admin());
grant select on public.platform_catalog_items to anon,authenticated;
grant insert,update,delete on public.platform_catalog_items to authenticated;
alter table public.platform_orders drop constraint if exists platform_orders_product_type_check;
alter table public.platform_orders add constraint platform_orders_product_type_check check(product_type in('ebook','model_subscription','model_content','match_access','other','software','source_code','adult_shop'));
commit;
