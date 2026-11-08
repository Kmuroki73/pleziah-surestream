# Pleziah V36 Admin Update

The V36 admin dashboard and its stylesheet are already included in `src/pages/`.

The V36 catalogue migration `supabase/migrations/202611070001_pleziah_v36_catalogues.sql` has already been reported as successfully applied. Do not run it again.

Before deploying the story viewer, apply this new additive migration once:
`supabase/migrations/202611070002_pleziah_story_content_flags.sql`

Then run:
- `npm.cmd run typecheck`
- `npm.cmd run build`

The dashboard preserves existing auth, E-Library upload/publish logic, creator admin RPC and payment verification RPC. Software, Source Code and Adult Shop support catalogue metadata management. This does not create checkout, software download delivery, affiliate tracking, fulfilment or licensed live streaming. Football/Matches links to the existing `/matches` page. Customers are summarized from orders by customer UUID only.

The Pleziah story viewer uses published preview videos from the existing `pleziah_media` and `video-previews` flow. Explicit content is gated only when its `is_explicit` moderation flag is set. The secure paid chat/media checkout is still not configured in the existing source; do not advertise paid unlock as active until server-side payment verification and entitlement delivery are implemented.


## Imported ForeignLove creator media

The supplied ForeignLove V35 media archive has been incorporated into `public/assets/model-media` and a local catalogue manifest at `src/data/foreignLoveMediaManifest.json`. It includes all 30 MP4 creator videos and 13 unique creator photos (43 unique media files total). The 30 JPG app-screen screenshots were not treated as creator content.

When the Supabase creator directory has live records, imported profiles are appended unless the username already exists. When no Supabase creator records are available, the imported catalogue is used as a fallback. Video-to-profile grouping is provisional based on filename capture timestamps and must be checked against creator/source records before public release.

**Security:** these imported files currently live in the public Vite asset directory, so direct URLs can bypass the in-page 18+ acknowledgement. Do not publish explicit or paid media from this public directory. Move it into a private Supabase Storage bucket and use server-authorized, short-lived signed URLs before production. Confirm performer age, rights, consent and each model/media association before enabling public playback.
