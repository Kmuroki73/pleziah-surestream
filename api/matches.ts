// V32 football feed. SportSRC is the primary provider; SportMonks is intentionally paused.
// All provider keys remain server-side. SportSRC supplies fixture metadata only here.
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=180');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const requestedDate = typeof req.query?.date === 'string' ? req.query.date : new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) return res.status(400).json({ error: 'date must use YYYY-MM-DD format' });
  try {
    const sportSrcKey = process.env.SPORTSRC_API_KEY;
    if (sportSrcKey) {
      const statuses = ['inprogress', 'notstarted'];
      const responses = await Promise.all(statuses.map(async status => {
        const url = new URL('https://api.sportsrc.org/v3/');
        url.searchParams.set('type', 'matches'); url.searchParams.set('sport', 'football');
        url.searchParams.set('status', status); url.searchParams.set('date', requestedDate);
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
      return res.status(200).json({ matches: [...unique.values()].sort((a,b)=>String(a.kickoff??'').localeCompare(String(b.kickoff??''))), provider: 'SportSRC', date: requestedDate, updatedAt: new Date().toISOString(), liveCount: rows.filter(m=>m.status==='LIVE').length, streamProviderConnected: false, note: 'SportSRC is the active fixture provider. Playback and third-party broadcast rights are checked separately.' });
    }
    // Optional non-SportMonks fallback when SportSRC has not been configured.
    const fallbackToken = process.env.FOOTBALL_DATA_API_KEY;
    if (fallbackToken) {
      const from = new Date(`${requestedDate}T00:00:00Z`); const to = new Date(from); to.setDate(to.getDate() + 7);
      const date = (d: Date) => d.toISOString().slice(0, 10);
      const url = new URL('https://api.football-data.org/v4/matches'); url.searchParams.set('dateFrom', date(from)); url.searchParams.set('dateTo', date(to));
      const upstream = await fetch(url, { headers: { 'X-Auth-Token': fallbackToken } });
      if (!upstream.ok) return res.status(upstream.status === 429 ? 429 : 502).json({ error: 'football-data.org request failed', providerStatus: upstream.status });
      const body = await upstream.json();
      const matches = (body.matches ?? []).map((m: any) => ({ id: m.id, competition: m.competition?.name ?? 'Football', competitionCode: m.competition?.code ?? '', home: m.homeTeam?.name ?? 'Home team', away: m.awayTeam?.name ?? 'Away team', homeShort: m.homeTeam?.shortName ?? m.homeTeam?.tla ?? '', awayShort: m.awayTeam?.shortName ?? m.awayTeam?.tla ?? '', homeCrest: m.homeTeam?.crest ?? null, awayCrest: m.awayTeam?.crest ?? null, kickoff: m.utcDate, status: m.status, minute: m.minute ?? null, homeScore: m.score?.fullTime?.home ?? m.score?.regularTime?.home ?? null, awayScore: m.score?.fullTime?.away ?? m.score?.regularTime?.away ?? null, venue: m.venue ?? null, streamAvailable: false }));
      return res.status(200).json({ matches, provider: 'football-data.org fallback', updatedAt: new Date().toISOString(), liveCount: matches.filter((m: any) => ['IN_PLAY','PAUSED'].includes(m.status)).length, streamProviderConnected: false });
    }
    return res.status(503).json({ error: 'Football data is not configured. Add SPORTSRC_API_KEY in Vercel Environment Variables. SportMonks is paused for V32.', code: 'MISSING_SPORTSRC_API_KEY' });
  } catch {
    return res.status(502).json({ error: 'Unable to reach the configured football data provider.' });
  }
}
