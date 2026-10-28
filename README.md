# Pleziah + SureStream V31

Unified React/Vite source project. Start with `PLEZIAH-SURESTREAM-RELEASE.md` for Supabase and Vercel configuration.

## Quick deploy
1. Upload this project to a GitHub repository (the folder containing `package.json`, `api/`, `src/`, and `vercel.json`).
2. Import the repository into Vercel with Framework Preset `Vite`, Build Command `npm run build`, Output Directory `dist`, and the project root as Root Directory.
3. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and server-side provider keys in Vercel Project Settings.
4. Apply `supabase/migrations/202610280001_pleziah_creator_platform.sql` in Supabase SQL Editor.
5. Verify Google/email authentication, media uploads and the football API before announcing launch.

The included code is source, not a compiled Vite `dist/` directory. The environment used to prepare this package could not download npm dependencies due registry DNS failures, so Vercel must perform the build. Payment processing and authorized live video playback are not yet complete; see the release notes.
