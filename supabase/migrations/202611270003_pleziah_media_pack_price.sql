-- V38.1: enforce USD 2 price for each creator media pack at the database boundary.
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
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare v_creator_id uuid; v_media_id uuid; v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Sign in before uploading media.'; end if;
 if coalesce(p_media_rights_confirmed,false) is not true then raise exception 'Confirm that you have rights and consent for this media.'; end if;
 select id into v_creator_id from public.pleziah_creators where user_id=v_uid;
 if v_creator_id is null then raise exception 'Submit your creator profile before adding media.'; end if;
 if coalesce(trim(p_title),'')='' or char_length(p_title)>100 then raise exception 'Enter a valid media title.'; end if;
 if p_media_type not in ('video','media_pack') then raise exception 'Invalid media type.'; end if;
 if p_media_type='media_pack' then p_price:=2; end if;
 if p_price<0.5 or p_price>10000 then raise exception 'Media price is outside the allowed range.'; end if;
 if p_premium_path is null or split_part(p_premium_path,'/',1)<>v_uid::text then raise exception 'Premium media must be uploaded into your private account folder.'; end if;
 if p_preview_path is not null and split_part(p_preview_path,'/',1)<>v_uid::text then raise exception 'Preview media must be uploaded into your private account folder.'; end if;
 if p_thumbnail_url is not null and p_thumbnail_url !~ '^https://[^[:space:]]+$' then raise exception 'Thumbnail URL must use HTTPS.'; end if;
 insert into public.pleziah_media(creator_id,title,description,thumbnail_url,media_type,price,has_preview,duration_seconds)
 values(v_creator_id,trim(p_title),coalesce(p_description,''),p_thumbnail_url,p_media_type,p_price,p_preview_path is not null,p_duration_seconds)
 returning id into v_media_id;
 insert into public.pleziah_media_private(media_id,preview_path,premium_path) values(v_media_id,p_preview_path,p_premium_path);
 return v_media_id;
end; $$;
revoke all on function public.submit_pleziah_media(text,text,text,text,text,text,numeric,integer,boolean) from public;
grant execute on function public.submit_pleziah_media(text,text,text,text,text,text,numeric,integer,boolean) to authenticated;
