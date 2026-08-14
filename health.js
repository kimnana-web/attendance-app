export default function handler(req, res) {
  res.status(200);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({
    ok: true,
    apiFunction: true,
    apiKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY)
  }));
}
