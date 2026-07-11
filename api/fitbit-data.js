// ============================================================
// GET /api/fitbit-data?path=/1/user/-/activities/date/today.json
// Authorization: Bearer <user's Fitbit access_token>
// Proxies the request to https://api.fitbit.com<path>
// Needed because Fitbit's API doesn't send CORS headers.
// ============================================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'method not allowed' });

  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'missing bearer token' });

  const path = (req.query && req.query.path) || '';
  if (!path || !path.startsWith('/')) return res.status(400).json({ error: 'path required (must start with /)' });

  const url = 'https://api.fitbit.com' + path;

  try {
    const r = await fetch(url, {
      headers: { 'Authorization': auth, 'Accept': 'application/json' },
    });
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (e) {
    return res.status(500).json({ error: 'proxy fetch failed: ' + (e && e.message ? e.message : String(e)) });
  }
}
