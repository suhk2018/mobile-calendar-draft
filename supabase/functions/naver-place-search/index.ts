const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

function cleanText(value: unknown) {
  return String(value || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const clientId = Deno.env.get('NAVER_SEARCH_CLIENT_ID');
  const clientSecret = Deno.env.get('NAVER_SEARCH_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return Response.json({ error: 'NAVER_SEARCH_NOT_CONFIGURED' }, { status: 503, headers: corsHeaders });
  }

  const query = new URL(request.url).searchParams.get('query')?.trim();
  if (!query) return Response.json({ items: [] }, { headers: corsHeaders });

  const endpoint = new URL('https://openapi.naver.com/v1/search/local.json');
  endpoint.searchParams.set('query', query.slice(0, 100));
  endpoint.searchParams.set('display', '5');
  endpoint.searchParams.set('sort', 'random');
  const response = await fetch(endpoint, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });
  if (!response.ok) {
    return Response.json({ error: 'NAVER_SEARCH_FAILED' }, { status: response.status, headers: corsHeaders });
  }

  const payload = await response.json();
  const items = (payload.items || []).map((item: Record<string, unknown>) => ({
    title: cleanText(item.title),
    category: cleanText(item.category),
    roadAddress: cleanText(item.roadAddress),
    jibunAddress: cleanText(item.address),
    x: Number(item.mapx) / 10000000,
    y: Number(item.mapy) / 10000000,
    link: String(item.link || ''),
  })).filter((item: { x: number; y: number }) => Number.isFinite(item.x) && Number.isFinite(item.y));

  return Response.json({ items }, {
    headers: { ...corsHeaders, 'Cache-Control': 'public, max-age=300' },
  });
});
