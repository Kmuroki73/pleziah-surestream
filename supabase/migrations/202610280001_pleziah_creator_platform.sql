-- Pleziah creator profiles, private creator details, admin moderation and RLS.
-- Review and apply to the intended Supabase project. This migration is additive.
create extension if not exists pgcrypto;

create table if not exists public.pleziah_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.pleziah_creators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 70),
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  bio text not null default '' check (char_length(bio) <= 500),
  avatar_url text,
  content_categories text[] not null default '{}',
  session_price numeric(8,2) not null default 10 check (session_price >= 0 and session_price <= 10000),
  media_pack_enabled boolean not null default false,
  media_pack_price numeric(8,2) check (media_pack_price is null or (media_pack_price >= 0.5 and media_pack_price <= 10000)),
  is_approved boolean not null default false,
  is_published boolean not null default false,
  availability_status text not null default 'offline' check (availability_status in ('offline','available','live')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_pack_price_required check (not media_pack_enabled or media_pack_price is not null)
);

-- Sensitive eligibility/preferences and any future stream URL are deliberately separated
-- from the public-facing profile table.
create table if not exists public.pleziah_creator_private (
  creator_id uuid primary key references public.pleziah_creators(id) on delete cascade,
  age integer not null check (age >= 18 and age <= 99),
  sex text not null,
  preferred_sex text not null,
  content_preferences text[] not null default '{}',
  adult_consent_at timestamptz not null default now(),
  live_stream_url text,
  updated_at timestamptz not null default now()
);

create index if not exists pleziah_creators_public_idx on public.pleziah_creators(is_approved, is_published, created_at desc);
create index if not exists pleziah_creators_status_idx on public.pleziah_creators(availability_status);

alter table public.pleziah_admins enable row level security;
alter table public.pleziah_creators enable row level security;
alter table public.pleziah_creator_private enable row level security;

-- No direct client writes to creator/admin tables. Writes go through validated RPCs.
drop policy if exists "Pleziah public approved creator directory" on public.pleziah_creators;
create policy "Pleziah public approved creator directory"
on public.pleziah_creators for select to anon, authenticated
using ((is_approved = true and is_published = true) or user_id = (select auth.uid()));

drop policy if exists "Creators can read own private profile" on public.pleziah_creator_private;
create policy "Creators can read own private profile"
on public.pleziah_creator_private for select to authenticated
using (exists (select 1 from public.pleziah_creators c where c.id = creator_id and c.user_id = (select auth.uid())));

create or replace function public.is_pleziah_admin()
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (select 1 from public.pleziah_admins a where a.user_id = auth.uid());
$$;
revoke all on function public.is_pleziah_admin() from public;
grant execute on function public.is_pleziah_admin() to anon, authenticated;

drop function if exists public.submit_pleziah_creator_profile(text,text,text,text,integer,text,text,text[],text[],numeric,boolean,numeric);
create or replace function public.submit_pleziah_creator_profile(
  p_display_name text,
  p_username text,
  p_bio text default '',
  p_avatar_url text default null,
  p_age integer default null,
  p_sex text default null,
  p_preferred_sex text default null,
  p_content_preferences text[] default '{}',
  p_content_categories text[] default '{}',
  p_session_price numeric default 10,
  p_media_pack_enabled boolean default false,
  p_media_pack_price numeric default null,
  p_adult_consent boolean default false
)
returns uuid
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_creator_id uuid;
begin
  if v_uid is null then raise exception 'Sign in before submitting a creator profile.'; end if;
  if coalesce(p_adult_consent,false) is not true then raise exception 'Confirm adult eligibility and content rights before submitting.'; end if;
  if p_age is null or p_age < 18 or p_age > 99 then raise exception 'Creators must be at least 18 years old.'; end if;
  if coalesce(trim(p_sex),'') = '' or coalesce(trim(p_preferred_sex),'') = '' then raise exception 'Complete the identity and audience preference fields.'; end if;
  if coalesce(trim(p_display_name),'') = '' or p_username !~ '^[A-Za-z0-9_]{3,24}$' then raise exception 'Enter a display name and a valid username (3–24 letters, numbers or underscores).'; end if;
  if p_session_price < 0 or p_session_price > 10000 then raise exception 'Session price is outside the allowed range.'; end if;
  if p_media_pack_enabled and (p_media_pack_price is null or p_media_pack_price < 0.5 or p_media_pack_price > 10000) then raise exception 'Enter a valid media pack price.'; end if;
  if p_avatar_url is not null and p_avatar_url !~ '^https://[^[:space:]]+$' then raise exception 'Profile image URL must use HTTPS.'; end if;

  insert into public.pleziah_creators(user_id, display_name, username, bio, avatar_url, content_categories, session_price, media_pack_enabled, media_pack_price)
  values (v_uid, trim(p_display_name), lower(trim(p_username)), coalesce(p_bio,''), p_avatar_url, coalesce(p_content_categories,'{}'), p_session_price, coalesce(p_media_pack_enabled,false), case when p_media_pack_enabled then p_media_pack_price else null end)
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    username = excluded.username,
    bio = excluded.bio,
    avatar_url = excluded.avatar_url,
    content_categories = excluded.content_categories,
    session_price = excluded.session_price,
    media_pack_enabled = excluded.media_pack_enabled,
    media_pack_price = excluded.media_pack_price,
    updated_at = now()
  returning id into v_creator_id;

  insert into public.pleziah_creator_private(creator_id, age, sex, preferred_sex, content_preferences, adult_consent_at)
  values (v_creator_id, p_age, trim(p_sex), trim(p_preferred_sex), coalesce(p_content_preferences,'{}'), now())
  on conflict (creator_id) do update set
    age = excluded.age,
    sex = excluded.sex,
    preferred_sex = excluded.preferred_sex,
    content_preferences = excluded.content_preferences,
    adult_consent_at = now(),
    updated_at = now();

  return v_creator_id;
end;
$$;
revoke all on function public.submit_pleziah_creator_profile(text,text,text,text,integer,text,text,text[],text[],numeric,boolean,numeric,boolean) from public;
grant execute on function public.submit_pleziah_creator_profile(text,text,text,text,integer,text,text,text[],text[],numeric,boolean,numeric,boolean) to authenticated;

create or replace function public.admin_list_pleziah_creators()
returns jsonb
language plpgsql stable security definer
set search_path = public, auth
as $$
declare v_result jsonb;
begin
  if not public.is_pleziah_admin() then raise exception 'Admin access required.'; end if;
  select coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object(
    'age', p.age, 'sex', p.sex, 'preferred_sex', p.preferred_sex,
    'content_preferences', p.content_preferences, 'live_stream_url', p.live_stream_url
  ) order by c.created_at desc), '[]'::jsonb)
  into v_result
  from public.pleziah_creators c left join public.pleziah_creator_private p on p.creator_id = c.id;
  return v_result;
end;
$$;
revoke all on function public.admin_list_pleziah_creators() from public;
grant execute on function public.admin_list_pleziah_creators() to authenticated;

create or replace function public.admin_set_pleziah_creator_status(
  p_creator_id uuid,
  p_is_approved boolean,
  p_is_published boolean,
  p_availability_status text,
  p_live_stream_url text default null
)
returns boolean
language plpgsql security definer
set search_path = public, auth
as $$
begin
  if not public.is_pleziah_admin() then raise exception 'Admin access required.'; end if;
  if p_availability_status not in ('offline','available','live') then raise exception 'Invalid availability status.'; end if;
  if p_is_published and not p_is_approved then raise exception 'Only approved profiles can be published.'; end if;
  if p_availability_status = 'live' and (p_live_stream_url is null or p_live_stream_url !~ '^https://[^[:space:]]+$') then
    raise exception 'A verified HTTPS live stream URL is required before marking a creator LIVE.';
  end if;
  update public.pleziah_creators set
    is_approved = p_is_approved,
    is_published = p_is_published,
    availability_status = p_availability_status,
    updated_at = now()
  where id = p_creator_id;
  if not found then raise exception 'Creator profile not found.'; end if;
  update public.pleziah_creator_private set live_stream_url = p_live_stream_url, updated_at = now() where creator_id = p_creator_id;
  return true;
end;
$$;
revoke all on function public.admin_set_pleziah_creator_status(uuid,boolean,boolean,text,text) from public;
grant execute on function public.admin_set_pleziah_creator_status(uuid,boolean,boolean,text,text) to authenticated;

-- Bootstrap the admin if the intended admin account already exists in Supabase Auth.
-- If it does not exist yet, create/sign in with that account and rerun this insert manually.
insert into public.pleziah_admins(user_id)
select id from auth.users where lower(email) = 'owenroki73@gmail.com'
on conflict (user_id) do nothing;

-- Media catalogue: public metadata is separated from private object paths.
create table if not exists public.pleziah_media (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.pleziah_creators(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  thumbnail_url text,
  media_type text not null default 'video' check (media_type in ('video','media_pack')),
  price numeric(8,2) not null default 1 check (price >= 0.5 and price <= 10000),
  has_preview boolean not null default false,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.pleziah_media_private (
  media_id uuid primary key references public.pleziah_media(id) on delete cascade,
  preview_path text,
  premium_path text not null,
  updated_at timestamptz not null default now()
);
create index if not exists pleziah_media_creator_idx on public.pleziah_media(creator_id, created_at desc);
alter table public.pleziah_media enable row level security;
alter table public.pleziah_media_private enable row level security;

drop policy if exists "Public published media from approved creators" on public.pleziah_media;
create policy "Public published media from approved creators"
on public.pleziah_media for select to anon, authenticated
using (is_published = true and exists (select 1 from public.pleziah_creators c where c.id = creator_id and c.is_approved = true and c.is_published = true));
drop policy if exists "Creator can read own media metadata" on public.pleziah_media;
create policy "Creator can read own media metadata"
on public.pleziah_media for select to authenticated
using (exists (select 1 from public.pleziah_creators c where c.id = creator_id and c.user_id = (select auth.uid())));
drop policy if exists "Creator can read own private media paths" on public.pleziah_media_private;
create policy "Creator can read own private media paths"
on public.pleziah_media_private for select to authenticated
using (exists (select 1 from public.pleziah_media m join public.pleziah_creators c on c.id = m.creator_id where m.id = media_id and c.user_id = (select auth.uid())));

grant select on public.pleziah_creators, public.pleziah_media to anon, authenticated;
grant select on public.pleziah_creator_private, public.pleziah_media_private to authenticated;

drop function if exists public.submit_pleziah_media(text,text,text,text,text,text,numeric,integer);
create or replace function public.submit_pleziah_media(
  p_title text,
  p_description text,
  p_media_type text,
  p_thumbnail_url text,
  p_preview_path text,
  p_premium_path text,
  p_price numeric,
  p_duration_seconds integer default null,
  p_media_rights_confirmed boolean default false
)
returns uuid
language plpgsql security definer
set search_path = public, auth
as $$
declare v_creator_id uuid; v_media_id uuid; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in before uploading media.'; end if;
  if coalesce(p_media_rights_confirmed,false) is not true then raise exception 'Confirm that you have rights and consent for this media.'; end if;
  select id into v_creator_id from public.pleziah_creators where user_id = v_uid;
  if v_creator_id is null then raise exception 'Submit your creator profile before adding media.'; end if;
  if coalesce(trim(p_title),'') = '' or char_length(p_title) > 100 then raise exception 'Enter a valid media title.'; end if;
  if p_media_type not in ('video','media_pack') then raise exception 'Invalid media type.'; end if;
  if p_price < 0.5 or p_price > 10000 then raise exception 'Media price is outside the allowed range.'; end if;
  if p_premium_path is null or split_part(p_premium_path,'/',1) <> v_uid::text then raise exception 'Premium media must be uploaded into your private account folder.'; end if;
  if p_preview_path is not null and split_part(p_preview_path,'/',1) <> v_uid::text then raise exception 'Preview media must be uploaded into your private account folder.'; end if;
  if p_thumbnail_url is not null and p_thumbnail_url !~ '^https://[^[:space:]]+$' then raise exception 'Thumbnail URL must use HTTPS.'; end if;
  insert into public.pleziah_media(creator_id,title,description,thumbnail_url,media_type,price,has_preview,duration_seconds)
  values(v_creator_id,trim(p_title),coalesce(p_description,''),p_thumbnail_url,p_media_type,p_price,p_preview_path is not null,p_duration_seconds)
  returning id into v_media_id;
  insert into public.pleziah_media_private(media_id,preview_path,premium_path) values(v_media_id,p_preview_path,p_premium_path);
  return v_media_id;
end;
$$;
revoke all on function public.submit_pleziah_media(text,text,text,text,text,text,numeric,integer,boolean) from public;
grant execute on function public.submit_pleziah_media(text,text,text,text,text,text,numeric,integer,boolean) to authenticated;

create or replace function public.admin_list_pleziah_media()
returns jsonb language plpgsql stable security definer set search_path = public, auth
as $$ declare v_result jsonb;
begin
  if not public.is_pleziah_admin() then raise exception 'Admin access required.'; end if;
  select coalesce(jsonb_agg(to_jsonb(m) || jsonb_build_object('creator_name',c.display_name,'creator_username',c.username,'premium_path',p.premium_path,'preview_path',p.preview_path) order by m.created_at desc),'[]'::jsonb)
  into v_result from public.pleziah_media m join public.pleziah_creators c on c.id=m.creator_id left join public.pleziah_media_private p on p.media_id=m.id;
  return v_result;
end; $$;
revoke all on function public.admin_list_pleziah_media() from public;
grant execute on function public.admin_list_pleziah_media() to authenticated;

create or replace function public.admin_set_pleziah_media_status(p_media_id uuid,p_is_published boolean)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_pleziah_admin() then raise exception 'Admin access required.'; end if;
  if p_is_published and not exists(select 1 from public.pleziah_media m join public.pleziah_creators c on c.id=m.creator_id where m.id=p_media_id and c.is_approved=true and c.is_published=true) then
    raise exception 'Publish the creator profile first.';
  end if;
  update public.pleziah_media set is_published=p_is_published,updated_at=now() where id=p_media_id;
  if not found then raise exception 'Media item not found.'; end if;
  return true;
end; $$;
revoke all on function public.admin_set_pleziah_media_status(uuid,boolean) from public;
grant execute on function public.admin_set_pleziah_media_status(uuid,boolean) to authenticated;

-- Storage buckets are created safely if they do not exist. Supabase Free's default
-- per-file cap is 50 MB; larger videos need a different upload/hosting strategy.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('creator-thumbnails','creator-thumbnails',true,5242880,array['image/jpeg','image/png','image/webp','image/avif']),
 ('video-previews','video-previews',false,52428800,array['video/mp4','video/webm','video/quicktime']),
 ('premium-videos','premium-videos',false,52428800,array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Public can read creator thumbnails" on storage.objects;
create policy "Public can read creator thumbnails" on storage.objects for select to anon, authenticated using (bucket_id='creator-thumbnails');
drop policy if exists "Creators upload own thumbnails" on storage.objects;
create policy "Creators upload own thumbnails" on storage.objects for insert to authenticated with check (bucket_id='creator-thumbnails' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Creators update own thumbnails" on storage.objects;
create policy "Creators update own thumbnails" on storage.objects for update to authenticated using (bucket_id='creator-thumbnails' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='creator-thumbnails' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Creators delete own thumbnails" on storage.objects;
create policy "Creators delete own thumbnails" on storage.objects for delete to authenticated using (bucket_id='creator-thumbnails' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "Creators upload own previews" on storage.objects;
create policy "Creators upload own previews" on storage.objects for insert to authenticated with check (bucket_id='video-previews' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Creators read own previews and admins read all" on storage.objects;
create policy "Creators read own previews and admins read all" on storage.objects for select to authenticated using (bucket_id='video-previews' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_pleziah_admin()));
drop policy if exists "Creators update own previews" on storage.objects;
create policy "Creators update own previews" on storage.objects for update to authenticated using (bucket_id='video-previews' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='video-previews' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Creators delete own previews" on storage.objects;
create policy "Creators delete own previews" on storage.objects for delete to authenticated using (bucket_id='video-previews' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "Creators upload own premium videos" on storage.objects;
create policy "Creators upload own premium videos" on storage.objects for insert to authenticated with check (bucket_id='premium-videos' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Creators read own premium videos and admins read all" on storage.objects;
create policy "Creators read own premium videos and admins read all" on storage.objects for select to authenticated using (bucket_id='premium-videos' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_pleziah_admin()));
drop policy if exists "Creators update own premium videos" on storage.objects;
create policy "Creators update own premium videos" on storage.objects for update to authenticated using (bucket_id='premium-videos' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='premium-videos' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Creators delete own premium videos" on storage.objects;
create policy "Creators delete own premium videos" on storage.objects for delete to authenticated using (bucket_id='premium-videos' and (storage.foldername(name))[1]=(select auth.uid())::text);


-- Public preview clips can be signed only when the associated media is published
-- and its creator profile is approved/published. Full premium files remain private.
drop policy if exists "Public can access published creator previews" on storage.objects;
create policy "Public can access published creator previews" on storage.objects for select to anon, authenticated
using (bucket_id='video-previews' and exists (
  select 1 from public.pleziah_media_private mp
  join public.pleziah_media m on m.id=mp.media_id
  join public.pleziah_creators c on c.id=m.creator_id
  where mp.preview_path=name and m.is_published=true and c.is_approved=true and c.is_published=true
));

create or replace function public.public_pleziah_preview_paths(p_creator_id uuid)
returns jsonb language sql stable security definer set search_path = public, auth
as $$
  select coalesce(jsonb_agg(jsonb_build_object('media_id',m.id,'preview_path',mp.preview_path) order by m.created_at desc),'[]'::jsonb)
  from public.pleziah_media m
  join public.pleziah_media_private mp on mp.media_id=m.id
  join public.pleziah_creators c on c.id=m.creator_id
  where m.creator_id=p_creator_id and m.is_published=true and m.has_preview=true
    and c.is_approved=true and c.is_published=true and mp.preview_path is not null;
$$;
revoke all on function public.public_pleziah_preview_paths(uuid) from public;
grant execute on function public.public_pleziah_preview_paths(uuid) to anon, authenticated;


create or replace function public.is_public_pleziah_preview(p_path text)
returns boolean language sql stable security definer set search_path = public, auth
as $$
  select exists (
    select 1 from public.pleziah_media_private mp
    join public.pleziah_media m on m.id=mp.media_id
    join public.pleziah_creators c on c.id=m.creator_id
    where mp.preview_path=p_path and m.is_published=true and c.is_approved=true and c.is_published=true
  );
$$;
revoke all on function public.is_public_pleziah_preview(text) from public;
grant execute on function public.is_public_pleziah_preview(text) to anon, authenticated;
drop policy if exists "Public can access published creator previews" on storage.objects;
create policy "Public can access published creator previews" on storage.objects for select to anon, authenticated
using (bucket_id='video-previews' and public.is_public_pleziah_preview(name));
