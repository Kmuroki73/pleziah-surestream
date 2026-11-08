# Pleziah / SureStream V36 Release Candidate

## Included
- V36 central admin dashboard update for Software, Source Code and Adult Shop catalogues.
- Retained V32 admin, E-Library, creator moderation and existing payment-verification integrations.
- Refined SureStream Matches page with clearer match cards, live/upcoming/results filters, feed status, summary counts, responsive layout, and loading/empty/error states.
- Pleziah creator directory story rail, full-screen story viewer, creator photo/video gallery, and an 18+ acknowledgement gate for imported archive media pending moderation.
- Imported the creator media supplied in ForeignLove V35: 13 unique creator photos and all 30 MP4 videos (43 unique media files, about 70.5 MB).
- Added 13 imported creator profiles to the Pleziah directory as fallback catalogue entries, while retaining live Supabase creators.
- Added an additive SQL migration for the `pleziah_media.is_explicit` moderation flag.

## Source baseline and archive handling
- Source baseline: `SURESTREAM_PLEZIAH_V32_CENTRAL_ADMIN_ELIBRARY(4).zip`.
- Admin update: `PLEZIAH_V36_ADMIN_UPDATE (1).zip`.
- ForeignLove V35 contained 30 MP4 videos, 14 JPG files that are creator photos (one exact duplicate), and 30 JPG screenshots of app screens. All 30 videos and all 13 unique creator photos are included in the Pleziah media catalogue. The 30 app-screen screenshots are not creator media and are excluded from the public web assets.
- The supplied ForeignLove profile bundle names 13 creator profiles. Video-to-profile grouping is provisional and based on the nearest capture timestamp encoded in filenames. Verify ownership with the creator/source records before public release; do not treat timestamp proximity as proof of identity.
- The ForeignLove application bundle itself was not merged into SureStream/Pleziah.

## Important media security note
Imported media currently resides under `public/assets/model-media` so it is included and can be previewed in the web app. Public-folder files can be fetched directly by URL; an in-page 18+ acknowledgement is not access control. Before production, move explicit or paid media into a private Supabase Storage bucket and issue short-lived signed URLs only after age/consent and entitlement checks. The imported assets should remain unpublished until the rights, adult status, consent and model-to-media mapping have been confirmed.

## Required database step
The V36 catalogue migration (`202611070001_pleziah_v36_catalogues.sql`) is already reported as applied; do not rerun it.
Apply `202611070002_pleziah_story_content_flags.sql` once before deploying this release so the story query can read `pleziah_media.is_explicit`.

The new flag defaults to false. Imported archive items are temporarily shown behind an acknowledgement gate in the local fallback catalogue pending moderation. For live Supabase items, an authorized admin must review and mark explicit previews.

## Important checkout limitation
The current source explicitly indicates that secure paid chat/media checkout is not configured. The story flow requests sign-in before chat, but this candidate does not invent a payment success state or unlock premium media without a verified payment provider and server-side entitlement flow. Imported creator profiles also need linking to verified creator accounts before real chat can be enabled. Existing payment verification code is preserved.

## Validation
- TypeScript/TSX syntax transpilation: passed for changed React files.
- Full `npm run typecheck` and `npm run build`: not completed. Dependency installation repeatedly timed out in this environment, leaving an incomplete `node_modules` directory. Run both commands in a normal connected development environment before production deployment.


## V36.1 creator-first / stream-first experience update
- Removed the Pleziah hero section so creator stories and creator discovery lead immediately.
- Reworked creator discovery into a responsive four-column desktop / three-column tablet / two-column mobile card grid, with creator posters, clear 18+ labels, pricing status, View Gallery and Go Live actions.
- Prioritised imported profiles with more supplied video clips first. This is a content-volume ordering only, not a fabricated popularity or viewer ranking.
- Creator story rail remains at the top of Pleziah. Opening an imported story requires an 18+ acknowledgement before media playback.
- Gallery includes every imported model photo and video.
- Removed the promotional hero and summary tiles from the football page; it now opens directly on matches, filters and results.
- Go Live opens the sign-in step. Paid session / stream checkout is still not activated because the production payment provider and server-side verification/entitlement route are not confirmed in this source.
- Imported videos are not autoplayed on model cards; cards use poster images and open the consent-gated viewer to avoid bypassing the age acknowledgement.

## Media assignment note
All 13 unique creator photos and 30 MP4 clips from the supplied V35 media directory are included. Model-to-video assignment is provisional based on filename capture timestamps and needs verification against creator records before public release. Do not present provisional grouping as verified ownership.
