// Server-side football data proxy. Provider tokens never enter the browser bundle.
// Sportmonks is primary; football-data.org is an explicitly configured fallback.
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const sportmonksToken = process.env.SPORTMONKS_API_KEY;
    if (sportmonksToken) {
      const now = new Date();
      const from = new Date(now); from.setDate(from.getDate() - 1);
      const to = new Date(now); to.setDate(to.getDate() + 7);
      const day = (d: Date) => d.toISOString().slice(0, 10);
      const base = 'https://api.sportmonks.com/v3/football';
      const common = new URLSearchParams({ api_token: sportmonksToken, include: 'participants;scores;state;league;venue;events;statistics;lineups', per_page: '50' });
      const [liveResponse, fixturesResponse] = await Promise.all([
        fetch(`${base}/livescores/inplay?${common.toString()}`),
        fetch(`${base}/fixtures/between/${day(from)}/${day(to)}?${common.toString()}`),
      ]);
      if (!liveResponse.ok && !fixturesResponse.ok) {
        const status = liveResponse.status === 429 || fixturesResponse.status === 429 ? 429 : 502;
        return res.status(status).json({ error: status === 429 ? 'Sportmonks rate limit reached' : 'Sportmonks request failed; check API key, plan and endpoint permissions', providerStatus: liveResponse.status, code: 'SPORTMONKS_UPSTREAM_ERROR' });
      }
      const liveBody = liveResponse.ok ? await liveResponse.json() : { data: [] };
      const fixtureBody = fixturesResponse.ok ? await fixturesResponse.json() : { data: [] };
      const all = [...(liveBody.data ?? []), ...(fixtureBody.data ?? [])];
      const unique = new Map<string, any>();
      for (const f of all) unique.set(String(f.id), f);
      const scoreFor = (f: any, participantId: number) => {
        const row = (f.scores ?? []).find((s: any) => (s.description === 'CURRENT' || s.description === '2ND_HALF' || s.description === '1ST_HALF') && Number(s.participant_id) === participantId);
        return row?.score?.goals ?? null;
      };
      const matches = [...unique.values()].map((f: any) => {
        const participants = f.participants ?? [];
        const home = participants.find((p: any) => p.meta?.location === 'home') ?? participants[0];
        const away = participants.find((p: any) => p.meta?.location === 'away') ?? participants[1];
        const state = f.state ?? {};
        const stateName = String(state.state ?? state.name ?? '').toLowerCase();
        const status = /live|in.?play|half.?time|1st|2nd|extra|penalty/.test(stateName) ? 'LIVE' : /finish|ended|full.?time/.test(stateName) ? 'FINISHED' : /cancel|postpon|abandon/.test(stateName) ? 'CANCELLED' : 'SCHEDULED';
        return { id: f.id, competition: f.league?.name ?? 'Competition', competitionCode: f.league?.short_code ?? '', home: home?.name ?? 'Home team', away: away?.name ?? 'Away team', homeShort: home?.short_code ?? '', awayShort: away?.short_code ?? '', homeCrest: home?.image_path ?? null, awayCrest: away?.image_path ?? null, kickoff: f.starting_at ?? f.starting_at_timestamp ? (f.starting_at ?? new Date(f.starting_at_timestamp * 1000).toISOString()) : null, status, minute: f.periods?.[0]?.minutes ?? null, homeScore: home ? scoreFor(f, Number(home.id)) : null, awayScore: away ? scoreFor(f, Number(away.id)) : null, venue: f.venue?.name ?? null, events: f.events ?? [], lineups: f.lineups ?? [], statistics: f.statistics ?? [], streamAvailable: false };
      }).sort((a: any, b: any) => String(a.kickoff ?? '').localeCompare(String(b.kickoff ?? '')));
      return res.status(200).json({ matches, provider: 'Sportmonks', updatedAt: new Date().toISOString(), liveCount: matches.filter((m: any) => m.status === 'LIVE').length, streamProviderConnected: false });
    }
    const fallbackToken = process.env.FOOTBALL_DATA_API_KEY;
    if (fallbackToken) {
      const now = new Date(); const from = new Date(now); from.setDate(from.getDate() - 1); const to = new Date(now); to.setDate(to.getDate() + 7);
      const date = (d: Date) => d.toISOString().slice(0, 10);
      const url = new URL('https://api.football-data.org/v4/matches'); url.searchParams.set('dateFrom', date(from)); url.searchParams.set('dateTo', date(to));
      const upstream = await fetch(url, { headers: { 'X-Auth-Token': fallbackToken } });
      if (!upstream.ok) return res.status(upstream.status === 429 ? 429 : 502).json({ error: 'football-data.org request failed', providerStatus: upstream.status });
      const body = await upstream.json();
      const matches = (body.matches ?? []).map((m: any) => ({ id: m.id, competition: m.competition?.name ?? 'Football', competitionCode: m.competition?.code ?? '', home: m.homeTeam?.name ?? 'Home team', away: m.awayTeam?.name ?? 'Away team', homeShort: m.homeTeam?.shortName ?? m.homeTeam?.tla ?? '', awayShort: m.awayTeam?.shortName ?? m.awayTeam?.tla ?? '', homeCrest: m.homeTeam?.crest ?? null, awayCrest: m.awayTeam?.crest ?? null, kickoff: m.utcDate, status: m.status, minute: m.minute ?? null, homeScore: m.score?.fullTime?.home ?? m.score?.regularTime?.home ?? null, awayScore: m.score?.fullTime?.away ?? m.score?.regularTime?.away ?? null, venue: m.venue ?? null, streamAvailable: false }));
      return res.status(200).json({ matches, provider: 'football-data.org', updatedAt: new Date().toISOString(), streamProviderConnected: false });
    }
    const sportSrcKey = process.env.SPORTSRC_API_KEY;
    if (sportSrcKey) {
      const date = new Date().toISOString().slice(0, 10);
      const statuses = ['inprogress', 'notstarted'];
      const responses = await Promise.all(statuses.map(async status => {
        const url = new URL('https://api.sportsrc.org/v3/');
        url.searchParams.set('type', 'matches'); url.searchParams.set('sport', 'football');
        url.searchParams.set('status', status); url.searchParams.set('date', date);
        return fetch(url.toString(), { headers: { 'X-API-KEY': sportSrcKey, Accept: 'application/json' } });
      }));
      const failed = responses.find(r => !r.ok);
      if (failed) return res.status(failed.status === 429 ? 429 : failed.status === 401 || failed.status === 403 ? failed.status : 502).json({ error: 'SportSRC fixture request failed. Check the server-side key and plan access.', providerStatus: failed.status, code: 'SPORTSRC_UPSTREAM_ERROR' });
      const bodies = await Promise.all(responses.map(r => r.json()));
      const rows: any[] = [];
      for (const body of bodies) for (const group of (Array.isArray(body?.data) ? body.data : [])) for (const match of (Array.isArray(group?.matches) ? group.matches : [])) {
        const rawStatus = String(match.status ?? '').toLowerCase();
        const home = String(match.teams?.home?.name ?? ''); const away = String(match.teams?.away?.name ?? '');
        const score = match.score && typeof match.score === 'object' ? match.score : {};
        const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;
        rows.push({ id: String(match.id), competition: String(group.league?.name ?? 'Football'), competitionCode: '', home, away, homeShort: home.slice(0,3).toUpperCase(), awayShort: away.slice(0,3).toUpperCase(), homeCrest: match.teams?.home?.logo ?? null, awayCrest: match.teams?.away?.logo ?? null, kickoff: Number(match.timestamp) ? new Date(Number(match.timestamp) * 1000).toISOString() : null, status: /progress|live|playing/.test(rawStatus) ? 'LIVE' : /finish|ended|complete/.test(rawStatus) ? 'FINISHED' : /postpon|cancel|abandon/.test(rawStatus) ? 'CANCELLED' : 'SCHEDULED', minute: match.minute ?? null, homeScore: numeric(score.home ?? score.home_score), awayScore: numeric(score.away ?? score.away_score), venue: null, events: [], lineups: [], statistics: [], streamAvailable: false, streamSourceProvider: 'SportSRC' });
      }
      const unique = new Map<string, any>(); for (const row of rows) if (row.home && row.away) unique.set(row.id, row);
      return res.status(200).json({ matches: [...unique.values()].sort((a,b)=>String(a.kickoff??'').localeCompare(String(b.kickoff??''))), provider: 'SportSRC fixture metadata', updatedAt: new Date().toISOString(), liveCount: rows.filter(m=>m.status==='LIVE').length, streamProviderConnected: false, note: 'SportSRC is used for fixture metadata only. Stream availability and broadcast rights are checked separately.' });
    }
    return res.status(503).json({ error: 'Football data is not configured. Add SPORTMONKS_API_KEY, FOOTBALL_DATA_API_KEY, or SPORTSRC_API_KEY in Vercel, then redeploy.', code: 'MISSING_API_KEY' });
  } catch {
    return res.status(502).json({ error: 'Unable to reach the configured football data provider.' });
  }
}
