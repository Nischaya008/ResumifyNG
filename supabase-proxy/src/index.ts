interface Env {
  SUPABASE_URL: string;
}

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://resumifyng.vercel.app',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, accept-encoding, accept-language, accept-profile, content-profile, x-supabase-api-version, range, prefer, x-upsert',
  'Access-Control-Expose-Headers': 'content-range, range, content-length, x-supabase-api-version',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    
    // Determine allowed origin
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[2];
    
    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          ...CORS_HEADERS,
        },
      });
    }

    const targetURL = env.SUPABASE_URL + url.pathname + url.search;

    // Copy request headers
    const headers = new Headers(request.headers);
    const supabaseHost = new URL(env.SUPABASE_URL).host;
    headers.set('Host', supabaseHost);
    
    // Remove Cloudflare headers
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

      // Create response headers with CORS
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
      Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });

      // Handle redirects
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location');
        if (location) {
          try {
            const locationUrl = new URL(location, env.SUPABASE_URL);
            if (locationUrl.host === supabaseHost) {
              locationUrl.host = url.host;
              locationUrl.protocol = url.protocol;
              responseHeaders.set('Location', locationUrl.toString());
            }
          } catch (e) {
            // Keep original location if URL parsing fails
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
            'Access-Control-Allow-Origin': allowedOrigin,
            ...CORS_HEADERS,
          },
        }
      );
    }
  },
};
