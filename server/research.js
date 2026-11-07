/**
 * FailureAI :: optional live web research for client data.
 * Provider: Tavily / Serper (Google) / Brave. No key => graceful "off" state.
 */

const env = process.env;

export function researchStatus() {
  const provider = (env.SEARCH_PROVIDER || 'none').toLowerCase();
  return { enabled: Boolean(env.SEARCH_API_KEY) && provider !== 'none', provider };
}

async function post(url, headers, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`${res.status}: ${data?.message || data?.error || 'search failed'}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function webResearch(query, timeoutMs = 15000) {
  const { enabled, provider } = researchStatus();
  if (!enabled) return { provider: 'off', results: [], note: 'Live search configured nahi hai (.env me SEARCH_API_KEY aur SEARCH_PROVIDER set karein).' };
  const q = `${query} company products customers reviews pricing competitors`;
  let results = [];
  if (provider === 'tavily') {
    const data = await post('https://api.tavily.com/search', {}, {
      api_key: env.SEARCH_API_KEY, query: q, max_results: 6, search_depth: 'basic', include_answer: false,
    }, timeoutMs);
    results = (data.results || []).map((r) => ({ title: r.title, url: r.url, snippet: String(r.content || '').slice(0, 400) }));
  } else if (provider === 'serper') {
    const data = await post('https://google.serper.dev/search', { 'X-API-KEY': env.SEARCH_API_KEY }, { q, num: 6 }, timeoutMs);
    results = (data.organic || []).map((r) => ({ title: r.title, url: r.link, snippet: String(r.snippet || '').slice(0, 400) }));
  } else if (provider === 'brave') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=6`, {
        headers: { 'X-Subscription-Token': env.SEARCH_API_KEY, Accept: 'application/json' },
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`${res.status} brave search failed`);
      results = (data.web?.results || []).map((r) => ({ title: r.title, url: r.url, snippet: String(r.description || '').slice(0, 400) }));
    } finally {
      clearTimeout(timer);
    }
  } else {
    return { provider, results: [], note: `Unknown SEARCH_PROVIDER "${provider}".` };
  }
  return { provider, results, note: `${results.length} live sources milin (${provider}).` };
}

export async function generateImage({ prompt, size = '1024x1024', timeoutMs = 90000 }) {
  if (!env.IMAGE_API_KEY) return { ok: false, error: 'IMAGE_API_KEY set nahi hai' };
  const base = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.IMAGE_API_KEY}` },
      body: JSON.stringify({ model: env.IMAGE_MODEL || 'gpt-image-1', prompt: String(prompt).slice(0, 3500), size, n: 1 }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    const item = data?.data?.[0] || {};
    if (item.b64_json) return { ok: true, image: `data:image/png;base64,${item.b64_json}` };
    if (item.url) return { ok: true, url: item.url };
    return { ok: false, error: 'Image provider ne koi image return nahi ki' };
  } catch (err) {
    return { ok: false, error: String(err.message || err).slice(0, 240) };
  } finally {
    clearTimeout(timer);
  }
}
