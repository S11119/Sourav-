/**
 * FailureAI :: LLM providers. Zero dependencies, uses global fetch (Node 18+).
 * Supports OpenAI / any OpenAI-compatible gateway, Google Gemini, Anthropic.
 * A key can come from the server env or from the browser Settings (BYOK).
 */

const env = process.env;

export const ENV_KEYS = {
  openai: env.OPENAI_API_KEY || '',
  gemini: env.GEMINI_API_KEY || '',
  anthropic: env.ANTHROPIC_API_KEY || '',
};

const DEFAULT_MODELS = {
  openai: env.OPENAI_MODEL || 'gpt-4o-mini',
  gemini: env.GEMINI_MODEL || 'gemini-2.0-flash',
  anthropic: env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
};

export const DEFAULT_BASE_URL = env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

export function serverHasAnyKey() {
  return Object.values(ENV_KEYS).some(Boolean);
}

/** Decide which provider to use. Returns null => Local Engine. */
export function resolveProvider(requested = 'auto', byokKey = '') {
  if (requested === 'local') return null;
  if (requested && requested !== 'auto') {
    const key = byokKey || ENV_KEYS[requested];
    if (!key) return { error: `${requested.toUpperCase()} key nahi mili. Settings me API key daalein ya "Local Engine" chunein.` };
    return { name: requested, key, model: DEFAULT_MODELS[requested], baseUrl: DEFAULT_BASE_URL };
  }
  for (const name of ['openai', 'gemini', 'anthropic']) {
    if (ENV_KEYS[name]) return { name, key: ENV_KEYS[name], model: DEFAULT_MODELS[name], baseUrl: DEFAULT_BASE_URL };
  }
  if (byokKey) return { name: 'openai', key: byokKey, model: DEFAULT_MODELS.openai, baseUrl: DEFAULT_BASE_URL };
  return null;
}

export function publicStatus() {
  return {
    liveAI: serverHasAnyKey(),
    configured: {
      openai: Boolean(ENV_KEYS.openai),
      gemini: Boolean(ENV_KEYS.gemini),
      anthropic: Boolean(ENV_KEYS.anthropic),
    },
    webSearch: Boolean(env.SEARCH_API_KEY && env.SEARCH_PROVIDER && env.SEARCH_PROVIDER !== 'none'),
    imageGeneration: Boolean(env.IMAGE_API_KEY),
    defaultProvider: ENV_KEYS.openai ? 'openai' : ENV_KEYS.gemini ? 'gemini' : ENV_KEYS.anthropic ? 'anthropic' : 'local',
  };
}

function extractText(data, name) {
  if (name === 'openai') return data?.choices?.[0]?.message?.content ?? '';
  if (name === 'gemini') return (data?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text || '').join('');
  if (name === 'anthropic') return (data?.content ?? []).map((p) => p.text || '').join('');
  return '';
}

export function parseModelJSON(text) {
  if (!text || typeof text !== 'string') throw new Error('Model returned empty text');
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('Model output JSON nahi tha');
  raw = raw.slice(start, end + 1);
  try {
    return JSON.parse(raw);
  } catch (err) {
    // last resort: remove trailing commas and control characters
    const cleaned = raw.replace(/,\s*([}\]])/g, '$1').replace(/[\u0000-\u001F]+/g, ' ');
    return JSON.parse(cleaned);
  }
}

async function requestJSON(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`Provider returned non-JSON (HTTP ${res.status}): ${text.slice(0, 160)}`); }
    if (!res.ok) {
      const msg = data?.error?.message || data?.error || data?.message || text.slice(0, 160);
      throw new Error(`Provider HTTP ${res.status}: ${String(msg).slice(0, 220)}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAI(cfg, system, user, timeoutMs, forceNoSchema = false) {
  const body = {
    model: cfg.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.7,
    max_tokens: 8000,
  };
  if (!forceNoSchema) body.response_format = { type: 'json_object' };
  try {
    const data = await requestJSON(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify(body),
    }, timeoutMs);
    return extractText(data, 'openai');
  } catch (err) {
    // Many OpenAI-compatible gateways (Groq/Ollama/some proxies) reject response_format.
    if (!forceNoSchema && /response_format|json_object|HTTP 400/i.test(String(err.message))) {
      return callOpenAI(cfg, system, user, timeoutMs, true);
    }
    throw err;
  }
}

async function callGemini(cfg, system, user, timeoutMs) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.key)}`;
  const data = await requestJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.7, responseMimeType: 'application/json', maxOutputTokens: 8000 },
    }),
  }, timeoutMs);
  return extractText(data, 'gemini');
}

async function callAnthropic(cfg, system, user, timeoutMs) {
  const data = await requestJSON('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 8000,
      temperature: 0.7,
      system: `${system}\n\nReturn ONLY a valid JSON object, no markdown.`,
      messages: [{ role: 'user', content: user }],
    }),
  }, timeoutMs);
  return extractText(data, 'anthropic');
}

export async function generateJSON({ provider, system, user, timeoutMs = 45000 }) {
  if (!provider) return null;
  let text;
  if (provider.name === 'openai') text = await callOpenAI(provider, system, user, timeoutMs);
  else if (provider.name === 'gemini') text = await callGemini(provider, system, user, timeoutMs);
  else if (provider.name === 'anthropic') text = await callAnthropic(provider, system, user, timeoutMs);
  else throw new Error(`Unknown provider: ${provider.name}`);
  return { data: parseModelJSON(text), provider: provider.name, model: provider.model };
}
