-- ForeignLovee social platform: clean Supabase foundation
-- Apply once to the NEW production Supabase project.
-- No legacy Pleziah/adult-commerce tables or payment states are migrated.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null default 'New member',
  avatar_path text,
  bio text not null default '',
  country text,
  account_type text not null default 'member' check (account_type in ('member','creator','professional')),
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','moderator','support')),
  created_at timestamptz not null default now()
);

create table if not exists public.platform_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null,
  status text not null default 'pending' check (status in ('pending','active','expired','cancelled','refunded')),
  starts_at timestamptz,
  expires_at timestamptz,
  provider text,
  provider_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists platform_entitlements_user_status_idx on public.platform_entitlements(user_id,status,expires_at desc);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_reference text unique,
  amount numeric(12,2) not null check (amount > 0),
  currency char(3) not null,
  status text not null default 'pending' check (status in ('pending','succeeded','failed','cancelled','refunded')),
  plan_code text not null,
  verified_at timestamptz,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id,following_id),
  check (follower_id <> following_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  post_type text not null default 'photo' check (post_type in ('photo','carousel','video','text')),
  caption text not null default '',
  media_paths jsonb not null default '[]'::jsonb,
  visibility text not null default 'public' check (visibility in ('public','followers','private')),
  status text not null default 'draft' check (status in ('draft','published','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_feed_idx on public.posts(status,created_at desc);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  media_path text not null,
  media_type text not null check (media_type in ('image','video')),
  caption text not null default '',
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index if not exists stories_active_idx on public.stories(status,expires_at desc);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (length(body) between 1 and 3000),
  status text not null default 'visible' check (status in ('visible','hidden','removed')),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments(post_id,created_at);

create table if not exists public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id,viewer_id)
);

create table if not exists public.saved_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id,post_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id,user_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  media_path text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_conversation_idx on public.messages(conversation_id,created_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_idx on public.notifications(recipient_id,created_at desc);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('profile','post','story','comment','message')),
  target_id uuid not null,
  reason text not null,
  details text not null default '',
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  moderator_id uuid references auth.users(id),
  moderator_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admin_roles ar where ar.user_id = auth.uid()) $$;

create or replace function public.has_active_entitlement()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.platform_entitlements e
  where e.user_id = auth.uid()
    and e.status = 'active'
    and e.starts_at <= now()
    and (e.expires_at is null or e.expires_at > now())
) $$;

create or replace function public.is_conversation_member(target_conversation uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.conversation_members cm
  where cm.conversation_id = target_conversation and cm.user_id = auth.uid()
) $$;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, username, display_name)
  values (
    new.id,
    nullif(lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username',''), '[^a-z0-9_]', '', 'g')), ''),
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), nullif(new.raw_user_meta_data->>'full_name',''), 'New member')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.admin_roles enable row level security;
alter table public.platform_entitlements enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.stories enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.story_views enable row level security;
alter table public.saved_posts enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.content_reports enable row level security;

create policy "profiles visible to entitled members or self/admin" on public.profiles for select
using (id = auth.uid() or public.is_platform_admin() or public.has_active_entitlement());
create policy "members update own profile" on public.profiles for update
using (id = auth.uid() or public.is_platform_admin()) with check (id = auth.uid() or public.is_platform_admin());
create policy "admins manage roles" on public.admin_roles for all
using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "users read own entitlement" on public.platform_entitlements for select
using (user_id = auth.uid() or public.is_platform_admin());
create policy "admins manage entitlements" on public.platform_entitlements for all
using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "users read own payments" on public.payment_transactions for select
using (user_id = auth.uid() or public.is_platform_admin());
create policy "admins manage payments" on public.payment_transactions for all
using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "follows visible to entitled members" on public.follows for select
using (public.has_active_entitlement() or follower_id = auth.uid());
create policy "entitled users follow" on public.follows for insert
with check (follower_id = auth.uid() and public.has_active_entitlement());
create policy "users unfollow self" on public.follows for delete
using (follower_id = auth.uid());

create policy "entitled users read published posts" on public.posts for select
using ((status = 'published' and public.has_active_entitlement()) or author_id = auth.uid() or public.is_platform_admin());
create policy "entitled users create own posts" on public.posts for insert
with check (author_id = auth.uid() and public.has_active_entitlement());
create policy "authors update own posts" on public.posts for update
using (author_id = auth.uid() or public.is_platform_admin()) with check (author_id = auth.uid() or public.is_platform_admin());
create policy "authors delete own posts" on public.posts for delete
using (author_id = auth.uid() or public.is_platform_admin());

create policy "entitled users read active stories" on public.stories for select
using ((status = 'published' and expires_at > now() and public.has_active_entitlement()) or author_id = auth.uid() or public.is_platform_admin());
create policy "entitled users create own stories" on public.stories for insert
with check (author_id = auth.uid() and public.has_active_entitlement());
create policy "authors manage own stories" on public.stories for update
using (author_id = auth.uid() or public.is_platform_admin()) with check (author_id = auth.uid() or public.is_platform_admin());
create policy "authors delete own stories" on public.stories for delete
using (author_id = auth.uid() or public.is_platform_admin());

create policy "entitled users read likes" on public.post_likes for select
using (public.has_active_entitlement() or user_id = auth.uid());
create policy "users like as self" on public.post_likes for insert
with check (user_id = auth.uid() and public.has_active_entitlement());
create policy "users unlike self" on public.post_likes for delete
using (user_id = auth.uid());

create policy "entitled users read visible comments" on public.comments for select
using ((status = 'visible' and public.has_active_entitlement()) or author_id = auth.uid() or public.is_platform_admin());
create policy "entitled users comment as self" on public.comments for insert
with check (author_id = auth.uid() and public.has_active_entitlement());
create policy "authors or admins moderate own comments" on public.comments for update
using (author_id = auth.uid() or public.is_platform_admin()) with check (author_id = auth.uid() or public.is_platform_admin());
create policy "authors delete own comments" on public.comments for delete
using (author_id = auth.uid() or public.is_platform_admin());

create policy "users read own story views" on public.story_views for select
using (viewer_id = auth.uid() or public.is_platform_admin());
create policy "entitled users record story views" on public.story_views for insert
with check (viewer_id = auth.uid() and public.has_active_entitlement());
create policy "users manage own saved posts" on public.saved_posts for all
using (user_id = auth.uid()) with check (user_id = auth.uid() and public.has_active_entitlement());

create policy "members read own conversations" on public.conversations for select
using (public.is_conversation_member(id) or public.is_platform_admin());
create policy "entitled members create conversations" on public.conversations for insert
with check (public.has_active_entitlement());
create policy "members read conversation membership" on public.conversation_members for select
using (user_id = auth.uid() or public.is_conversation_member(conversation_id) or public.is_platform_admin());
create policy "entitled users join conversations" on public.conversation_members for insert
with check (user_id = auth.uid() and public.has_active_entitlement());
create policy "members read messages" on public.messages for select
using (public.is_conversation_member(conversation_id) or public.is_platform_admin());
create policy "members send messages" on public.messages for insert
with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id) and public.has_active_entitlement());
create policy "members mark own messages read" on public.messages for update
using (public.is_conversation_member(conversation_id)) with check (public.is_conversation_member(conversation_id));

create policy "users read own notifications" on public.notifications for select
using (recipient_id = auth.uid() or public.is_platform_admin());
create policy "users update own notifications" on public.notifications for update
using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "users submit reports" on public.content_reports for insert
with check (reporter_id = auth.uid() and public.has_active_entitlement());
create policy "reporters and moderators read reports" on public.content_reports for select
using (reporter_id = auth.uid() or public.is_platform_admin());
create policy "moderators manage reports" on public.content_reports for update
using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Media remains private. Upload paths must begin with the authenticated user's UUID.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('social-media','social-media',false,104857600,array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict (id) do update set public = false;

create policy "users upload to own media folder" on storage.objects for insert
with check (bucket_id = 'social-media' and (storage.foldername(name))[1] = auth.uid()::text and public.has_active_entitlement());
create policy "users manage own media files" on storage.objects for delete
using (bucket_id = 'social-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users read own media files" on storage.objects for select
using (bucket_id = 'social-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- IMPORTANT: Payment provider webhooks must verify signatures server-side and idempotency
-- before setting a transaction to succeeded and creating an active entitlement.
-- Never let clients insert/update payment_transactions or activate their own entitlement.
