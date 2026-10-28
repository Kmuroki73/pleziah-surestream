// Server-side SportSRC stream availability discovery.
// Never expose SPORTSRC_API_KEY to the browser. This endpoint returns metadata only;
// it deliberately does not return third-party embed URLs until rights are verified.
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.SPORTSRC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'SportSRC is not configured. Add SPORTSRC_API_KEY in Vercel Environment Variables and redeploy.',
      code: 'MISSING_SPORTSRC_API_KEY',
    });
  }

  const dateParam = typeof req.query?.date === 'string' ? req.query.date : new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return res.status(400).json({ error: 'date must use YYYY-MM-DD format' });
  }

  try {
    const statuses = ['inprogress', 'notstarted'];
    const responses = await Promise.all(statuses.map(async status => {
      const url = new URL('https://api.sportsrc.org/v3/');
      url.searchParams.set('type', 'matches');
      url.searchParams.set('sport', 'football');
      url.searchParams.set('status', status);
      url.searchParams.set('date', dateParam);
      return fetch(url.toString(), { headers: { 'X-API-KEY': apiKey, Accept: 'application/json' } });
    }));

    const bad = responses.find(r => !r.ok);
    if (bad) {
      const status = bad.status === 429 ? 429 : bad.status === 401 || bad.status === 403 ? bad.status : 502;
      return res.status(status).json({
        error: status === 429 ? 'SportSRC request limit reached' : status === 401 || status === 403 ? 'SportSRC rejected the key or plan access' : 'SportSRC upstream request failed',
        providerStatus: bad.status,
        code: 'SPORTSRC_UPSTREAM_ERROR',
      });
    }

    const bodies = await Promise.all(responses.map(r => r.json()));
    const rows: any[] = [];
    for (const body of bodies) {
      for (const leagueGroup of (Array.isArray(body?.data) ? body.data : [])) {
        for (const match of (Array.isArray(leagueGroup?.matches) ? leagueGroup.matches : [])) {
          rows.push({
            id: String(match.id),
            title: String(match.title ?? `${match.teams?.home?.name ?? ''} vs ${match.teams?.away?.name ?? ''}`),
            home: String(match.teams?.home?.name ?? ''),
            away: String(match.teams?.away?.name ?? ''),
            competition: String(leagueGroup.league?.name ?? ''),
            timestamp: Number(match.timestamp) || null,
            status: String(match.status ?? ''),
            statusDetail: String(match.status_detail ?? ''),
            hasStream: true,
            score: match.score ?? null,
          });
        }
      }
    }
    const unique = new Map<string, any>();
    for (const row of rows) unique.set(row.id, row);
    return res.status(200).json({
      provider: 'SportSRC',
      date: dateParam,
      matches: [...unique.values()],
      note: 'Availability metadata only. Third-party playback is disabled until commercial and broadcast rights are verified.',
    });
  } catch {
    return res.status(502).json({ error: 'Unable to reach SportSRC.' });
  }
}
