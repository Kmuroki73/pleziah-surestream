// Server-side SportSRC detail proxy.
// Intentionally returns source metadata only, not embedUrl, until rights/terms are confirmed.
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.SPORTSRC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'SportSRC is not configured.', code: 'MISSING_SPORTSRC_API_KEY' });

  const id = typeof req.query?.id === 'string' ? req.query.id : '';
  if (!id || id.length > 300) return res.status(400).json({ error: 'A valid SportSRC match id is required.' });

  try {
    const url = new URL('https://api.sportsrc.org/v3/');
    url.searchParams.set('type', 'detail');
    url.searchParams.set('id', id);
    const upstream = await fetch(url.toString(), { headers: { 'X-API-KEY': apiKey, Accept: 'application/json' } });
    if (!upstream.ok) {
      const status = upstream.status === 429 ? 429 : upstream.status === 401 || upstream.status === 403 ? upstream.status : 502;
      return res.status(status).json({ error: 'SportSRC detail request failed.', providerStatus: upstream.status });
    }
    const body = await upstream.json();
    const match = body?.data;
    if (!match) return res.status(404).json({ error: 'SportSRC did not return match details.' });

    const sources = Array.isArray(match.sources) ? match.sources : [];
    return res.status(200).json({
      provider: 'SportSRC',
      match: {
        id: String(match.id ?? id),
        title: String(match.title ?? ''),
        status: String(match.status ?? ''),
        statusDetail: String(match.status_detail ?? ''),
        competition: String(match.league?.name ?? ''),
      },
      sourceCount: sources.length,
      sources: sources.map((source: any) => ({
        source: String(source.source ?? 'unknown'),
        language: String(source.language ?? 'Unknown'),
        hd: Boolean(source.hd),
      })),
      playbackEnabled: false,
      note: 'Stream source metadata detected. Playback is disabled until rights for this source and territory are confirmed.',
    });
  } catch {
    return res.status(502).json({ error: 'Unable to reach SportSRC detail endpoint.' });
  }
}
