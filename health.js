export default {
  async fetch() {
    return Response.json({
      ok: true,
      oidc: Boolean(process.env.VERCEL_OIDC_TOKEN),
      gatewayKey: Boolean(process.env.AI_GATEWAY_API_KEY),
      model: process.env.AI_MODEL || 'anthropic/claude-sonnet-5',
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  },
};
