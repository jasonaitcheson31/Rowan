// ============================================================
// GET /api/fitbit-callback?code=...
// Receives the OAuth code from Fitbit, exchanges it for tokens,
// and bounces back to /health.html with tokens in the URL hash.
// Env vars required on Vercel:
//   FITBIT_CLIENT_ID
//   FITBIT_CLIENT_SECRET
// ============================================================
export default async function handler(req, res) {
  const code       = req.query && req.query.code;
  const errorParam = req.query && req.query.error;
  if (errorParam) return res.status(400).send('Fitbit auth error: ' + errorParam);
  if (!code)      return res.status(400).send('Missing code parameter.');

  const clientId     = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  const proto      = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host       = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = proto + '://' + host + '/api/fitbit-callback';

  if (!clientId || !clientSecret) {
    return res.status(500).send('Server not configured (missing FITBIT_CLIENT_ID / FITBIT_CLIENT_SECRET).');
  }

  try {
    const credentials = Buffer.from(clientId + ':' + clientSecret).toString('base64');
    const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
    const tokenRes = await fetch('https://api.fitbit.com/oauth2/token', {
      method:  'POST',
      headers: { 'Authorization': 'Basic ' + credentials, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const text = await tokenRes.text();
    if (!tokenRes.ok) return res.status(500).send('Fitbit token exchange failed: ' + text);
    let json;
    try { json = JSON.parse(text); } catch { return res.status(500).send('Fitbit returned non-JSON: ' + text); }
    const access    = json.access_token  || '';
    const refresh   = json.refresh_token || '';
    const expiresIn = json.expires_in    || 28800;
    const hash = new URLSearchParams({
      fitbit_access:  access,
      fitbit_refresh: refresh,
      fitbit_expires: String(Date.now() + expiresIn * 1000),
    }).toString();
    res.writeHead(302, { Location: '/health.html#' + hash });
    res.end();
  } catch (e) {
    res.status(500).send('Unexpected error: ' + (e && e.message ? e.message : String(e)));
  }
}
