export default {
  async fetch() {
    return new Response(JSON.stringify({
      ok: true,
      apiFunction: true,
      apiKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY)
    }), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  }
};
