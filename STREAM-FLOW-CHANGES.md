# Pleziah / SureStream stream-flow update

## What changed
- The Watch page no longer blocks entry behind reservation/payment verification. Opening Stream Now immediately loads match details and checks SportSRC source metadata.
- A detected SportSRC source is labelled as metadata only when the API does not provide a playable video URL. The UI does not fake playback.
- Match detail pages show Watch live / Check stream for live fixtures, Reserve seat only for fixtures not started, and Match coverage for finished fixtures.
- Landing page fixture cards and match-story cards route live matches to Watch and upcoming matches to the match centre/reservation flow.

## Important limitation
The current `/api/sportsrc-detail` endpoint intentionally returns only source count, source names, language and HD metadata; it does not return an embed/player URL. Therefore the current build can test discovery but cannot play an actual match stream yet. Only connect playback through an authorized provider and a rights-cleared URL for the viewer's territory. The 10-minute preview/paywall timer must be wired to actual playback start time and a real server-verified payment provider after playback is available.

## Build verification
The build could not be run in this environment because project dependencies are not installed (`vite: not found`) and the available node_modules tree is incomplete. Run `npm ci`, then `npm run build` and `npm run typecheck` in a network-enabled environment before deploying.
