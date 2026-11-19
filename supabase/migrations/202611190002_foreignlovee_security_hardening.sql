-- ForeignLovee hardening migration. Apply after 202611190001.
-- Prevent self-verification, private-post leakage, message edits and client-side chat membership injection.

-- Profiles: members may edit ordinary profile fields only.
revoke update on public.profiles from authenticated;
grant update (username, display_name, avatar_path, bio, country) on public.profiles to authenticated;

-- Posts: enforce the selected visibility mode in the database.
drop policy if exists "entitled users read published posts" on public.posts;
create policy "entitled users read posts by visibility" on public.posts for select
using (
  author_id = auth.uid()
  or public.is_platform_admin()
  or (
    status = 'published'
    and public.has_active_entitlement()
    and (
      visibility = 'public'
      or (visibility = 'followers' and exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.following_id = posts.author_id
      ))
    )
  )
);

-- Stories expire no later than 24 hours after creation, even if the client is modified.
drop policy if exists "authors manage own stories" on public.stories;
create policy "authors manage own stories" on public.stories for update
using (author_id = auth.uid() or public.is_platform_admin())
with check (
  (author_id = auth.uid() and expires_at <= created_at + interval '24 hours')
  or public.is_platform_admin()
);

-- Read receipts only: a conversation participant cannot edit another participant's message body.
drop policy if exists "members mark own messages read" on public.messages;
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;
create policy "recipients mark messages read" on public.messages for update
using (public.is_conversation_member(conversation_id) and sender_id <> auth.uid())
with check (public.is_conversation_member(conversation_id) and sender_id <> auth.uid());

-- Chat participants must be added through a checked RPC, not by inserting arbitrary member rows.
drop policy if exists "entitled users create conversations" on public.conversations;
drop policy if exists "entitled users join conversations" on public.conversation_members;
revoke insert on public.conversations from authenticated;
revoke insert on public.conversation_members from authenticated;

create or replace function public.create_direct_conversation(other_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_conversation uuid;
begin
  if auth.uid() is null or other_user is null or other_user = auth.uid() then
    raise exception 'Invalid conversation participants';
  end if;
  if not public.has_active_entitlement() then
    raise exception 'An active platform pass is required';
  end if;
  if not exists (
    select 1 from public.platform_entitlements e
    where e.user_id = other_user and e.status = 'active'
      and e.starts_at <= now() and (e.expires_at is null or e.expires_at > now())
  ) then
    raise exception 'The other member does not have active access';
  end if;

  insert into public.conversations default values returning id into new_conversation;
  insert into public.conversation_members(conversation_id,user_id)
  values (new_conversation,auth.uid()),(new_conversation,other_user);
  return new_conversation;
end;
$$;
grant execute on function public.create_direct_conversation(uuid) to authenticated;

-- Reporting must remain available to every signed-in user, including users whose pass has expired.
drop policy if exists "users submit reports" on public.content_reports;
create policy "signed in users submit reports" on public.content_reports for insert
with check (reporter_id = auth.uid());

-- The first owner role must be provisioned manually by the project owner in the Supabase SQL editor
-- after the owner's auth.users row exists. Do not add a public client-side admin bootstrap route.
