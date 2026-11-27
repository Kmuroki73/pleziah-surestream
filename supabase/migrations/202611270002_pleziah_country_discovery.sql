-- V38: country-based creator discovery and consistent media-pack pricing.
begin;
alter table public.pleziah_creators add column if not exists country_code text;
alter table public.pleziah_creators add constraint pleziah_creator_country_code_format check (country_code is null or country_code ~ '^[A-Z]{2}$');
create index if not exists pleziah_creators_country_public_idx on public.pleziah_creators(country_code, is_approved, is_published, availability_status);
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
  p_session_price numeric default 8,
  p_media_pack_enabled boolean default false,
  p_media_pack_price numeric default null,
  p_adult_consent boolean default false,
  p_country_code text default null
)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid(); v_creator_id uuid;
begin
 if v_uid is null then raise exception 'Sign in before submitting a creator profile.'; end if;
 if coalesce(p_adult_consent,false) is not true then raise exception 'Confirm adult eligibility and content rights before submitting.'; end if;
 if p_age is null or p_age<18 or p_age>99 then raise exception 'Creators must be at least 18 years old.'; end if;
 if coalesce(trim(p_sex),'')='' or coalesce(trim(p_preferred_sex),'')='' then raise exception 'Complete the identity and audience preference fields.'; end if;
 if coalesce(trim(p_display_name),'')='' or p_username !~ '^[A-Za-z0-9_]{3,24}$' then raise exception 'Enter a display name and a valid username.'; end if;
 if p_session_price<0 or p_session_price>10000 then raise exception 'Session price is outside the allowed range.'; end if;
 if p_media_pack_enabled and (p_media_pack_price is null or p_media_pack_price<2 or p_media_pack_price>10000) then raise exception 'Media packs start at USD 2.'; end if;
 if p_country_code is not null and p_country_code !~ '^[A-Z]{2}$' then raise exception 'Select a valid country.'; end if;
 if p_avatar_url is not null and p_avatar_url !~ '^https://[^[:space:]]+$' then raise exception 'Profile image URL must use HTTPS.'; end if;
 insert into public.pleziah_creators(user_id,display_name,username,country_code,bio,avatar_url,content_categories,session_price,media_pack_enabled,media_pack_price)
 values(v_uid,trim(p_display_name),lower(trim(p_username)),p_country_code,coalesce(p_bio,''),p_avatar_url,coalesce(p_content_categories,'{}'),p_session_price,coalesce(p_media_pack_enabled,false),case when p_media_pack_enabled then p_media_pack_price else null end)
 on conflict(user_id) do update set display_name=excluded.display_name,username=excluded.username,country_code=excluded.country_code,bio=excluded.bio,avatar_url=excluded.avatar_url,content_categories=excluded.content_categories,session_price=excluded.session_price,media_pack_enabled=excluded.media_pack_enabled,media_pack_price=excluded.media_pack_price,updated_at=now()
 returning id into v_creator_id;
 insert into public.pleziah_creator_private(creator_id,age,sex,preferred_sex,content_preferences,adult_consent_at) values(v_creator_id,p_age,trim(p_sex),trim(p_preferred_sex),coalesce(p_content_preferences,'{}'),now())
 on conflict(creator_id) do update set age=excluded.age,sex=excluded.sex,preferred_sex=excluded.preferred_sex,content_preferences=excluded.content_preferences,adult_consent_at=now(),updated_at=now();
 return v_creator_id;
end; $$;
revoke all on function public.submit_pleziah_creator_profile(text,text,text,text,integer,text,text,text[],text[],numeric,boolean,numeric,boolean,text) from public;
grant execute on function public.submit_pleziah_creator_profile(text,text,text,text,integer,text,text,text[],text[],numeric,boolean,numeric,boolean,text) to authenticated;
commit;
