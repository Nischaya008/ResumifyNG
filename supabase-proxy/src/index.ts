interface Env {
  SUPABASE_URL: string;
}

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://resumifyng.vercel.app',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type, x-client-info, X-Supabase-Api-Version, Accept, Range, Content-Range, Prefer',
    'Access-Control-Expose-Headers': 'Content-Range, Range, Content-Length, X-Supabase-Api-Version',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const targetURL = env.SUPABASE_URL + url.pathname + url.search;

    const headers = new Headers(request.headers);
    const supabaseHost = new URL(env.SUPABASE_URL).host;
    headers.set('Host', supabaseHost);

    headers.delete('cf-connecting-ip');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');
    headers.delete('cf-ipcountry');
    headers.delete('cf-ew-via');

    try {
      const response = await fetch(targetURL, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'manual',
      });

      const responseHeaders = new Headers(response.headers);

      Object.entries(corsHeaders).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location');
        if (location) {
          const locationUrl = new URL(location, env.SUPABASE_URL);
          if (locationUrl.host === supabaseHost) {
            locationUrl.host = url.host;
            locationUrl.protocol = url.protocol;
            responseHeaders.set('Location', locationUrl.toString());
          }
        }
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response(
        JSON.stringify({ error: 'Proxy request failed', details: String(error) }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }
  },
};
