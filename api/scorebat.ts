// ScoreBat public embed feed provides available highlight embeds, not full live-match rights.
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const configured = process.env.SCOREBAT_API_URL || 'https://www.scorebat.com/video-api/v3/feed/';
    const url = new URL(configured);
    if (process.env.SCOREBAT_API_TOKEN) url.searchParams.set('token', process.env.SCOREBAT_API_TOKEN);
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return res.status(502).json({ error: 'Highlights provider unavailable' });
    const data = await response.json();
    return res.status(200).json({ response: Array.isArray(data.response) ? data.response : [], provider: 'ScoreBat' });
  } catch { return res.status(502).json({ error: 'Unable to reach highlights provider' }); }
}
