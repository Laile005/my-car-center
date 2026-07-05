function getSiteUrl(context) {
  const netlifyUrl = globalThis.Netlify?.env?.get?.('URL');
  return context?.site?.url || netlifyUrl || 'https://mycarcenter.netlify.app';
}

export default async (_request, context) => {
  const target = new URL('/.netlify/functions/goo-stock', getSiteUrl(context)).toString();

  try {
    const response = await fetch(target, {
      headers: {
        'user-agent': 'MyCarCenterWarmup/1.0 (+https://mycarcenter.netlify.app/)',
        'x-mcc-warmup': '1'
      }
    });
    const body = await response.text();

    console.log(`goo-stock warmup ${response.status} ${response.headers.get('x-mcc-cache') || 'unknown'}`);

    return new Response(JSON.stringify({
      ok: response.ok,
      status: response.status,
      cache: response.headers.get('x-mcc-cache') || '',
      bytes: body.length,
      target
    }), {
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  } catch (error) {
    console.log(`goo-stock warmup failed: ${String(error)}`);
    return new Response(JSON.stringify({
      ok: false,
      error: String(error),
      target
    }), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
};

export const config = {
  schedule: '@daily'
};
