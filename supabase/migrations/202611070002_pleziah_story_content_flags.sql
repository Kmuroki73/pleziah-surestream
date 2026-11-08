-- V36: explicit-content metadata for creator story previews.
-- Apply once after the V36 catalogue migration.
alter table if exists public.pleziah_media
  add column if not exists is_explicit boolean not null default false;

comment on column public.pleziah_media.is_explicit is
  'Creator/admin moderation flag. Explicit previews must display an age/consent gate before playback.';
