-- REALYAMAL V20 additive social foundation. Review and apply to the intended Supabase project.
create table if not exists public.fan_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (char_length(handle) between 3 and 24),
  display_name text not null default 'Football Fan',
  bio text not null default '' check (char_length(bio) <= 280),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.fan_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  media_url text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create table if not exists public.fan_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);
create table if not exists public.fan_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  points integer not null check (points > 0),
  reason text not null check (reason in ('daily_active','story_posted','follow_created','reservation_paid','match_watched')),
  reference_id text,
  created_at timestamptz not null default now(),
  unique (user_id, reason, reference_id)
);
create index if not exists fan_stories_created_idx on public.fan_stories(created_at desc);
create index if not exists fan_stories_user_idx on public.fan_stories(user_id, created_at desc);
create index if not exists fan_follows_followed_idx on public.fan_follows(followed_id);
create index if not exists fan_points_user_idx on public.fan_points_ledger(user_id, created_at desc);
alter table public.fan_profiles enable row level security;
alter table public.fan_stories enable row level security;
alter table public.fan_follows enable row level security;
alter table public.fan_points_ledger enable row level security;
drop policy if exists "Profiles are publicly viewable" on public.fan_profiles;
create policy "Profiles are publicly viewable" on public.fan_profiles for select using (true);
drop policy if exists "Users manage their own profile" on public.fan_profiles;
create policy "Users manage their own profile" on public.fan_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Unexpired stories are publicly viewable" on public.fan_stories;
create policy "Unexpired stories are publicly viewable" on public.fan_stories for select using (expires_at > now());
drop policy if exists "Users manage their own stories" on public.fan_stories;
create policy "Users manage their own stories" on public.fan_stories for insert with check (auth.uid() = user_id);
drop policy if exists "Users delete their own stories" on public.fan_stories;
create policy "Users delete their own stories" on public.fan_stories for delete using (auth.uid() = user_id);
drop policy if exists "Follows are viewable" on public.fan_follows;
create policy "Follows are viewable" on public.fan_follows for select using (true);
drop policy if exists "Users manage their own follows" on public.fan_follows;
create policy "Users manage their own follows" on public.fan_follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);
drop policy if exists "Users can view own points" on public.fan_points_ledger;
create policy "Users can view own points" on public.fan_points_ledger for select using (auth.uid() = user_id);
-- Point awards must be issued by trusted server-side logic, never by the browser.
