# SureStream / Pleziah V31.1 patch

## SureStream
- Uses the supplied Beyond Limits hero artwork (cropped to remove the dashboard sidebar and lower cards).
- Adds a responsive live/featured match rail powered only by `/api/matches` data.
- Shows red live indicator, provider-supplied score and minute where available.
- Normalizes common SportMonks live and finished status variants in the landing page.
- Removes the seat-reservation CTA from the Watch page. Seat reservation remains on the explicit match details/reservation route.
- Does not invent viewer counts or pretend SportSRC source metadata is a playable broadcast.

## Pleziah
- Existing creator directory reads only approved and published profiles.
- Existing profile modal reads published media only; admin approval/publication remains required for public visibility.
- Use `/admin/pleziah` to approve and publish submitted creators and media after verifying their rights/consent.

## Build/deploy
This archive contains updated source, not a prebuilt `dist/` folder. The build environment could not download/install the Vite dependencies, so no production build is claimed. In a network-enabled PowerShell terminal run:

```powershell
npm ci
npm run typecheck
npm run build
```

Then inspect `dist/` before deploying. Vercel should build from the source branch with `npm run build` and output directory `dist`.

## Important stream limitation
The current SportSRC detail endpoint returns listing metadata, not a playable, authorized video URL. The watch page correctly reports this limitation. A real broadcast provider/rights-cleared playable URL is required before real playback and a 10-minute preview timer can be enabled.
