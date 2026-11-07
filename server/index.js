/**
 * FailureAI :: HTTP server
 * - Static marketing site + agent app (zero build step)
 * - /api/run, /api/campaign, /api/research, /api/image, /api/health
 * - Dynamic robots.txt / sitemap.xml / canonical URLs for real SEO
 * - Works with NO configuration at all (Local Engine), upgrades itself
 *   automatically as soon as an LLM key is present.
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeContext, TOOLS } from './data.js';
import { buildKit, mergeLiveResult } from './engine.js';
import { buildPrompt } from './prompts.js';
import { resolveProvider, generateJSON, publicStatus } from './providers.js';
import { webResearch, generateImage, researchStatus } from './research.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MIN || 40);
const TIMEOUT = Number(process.env.REQUEST_TIMEOUT_MS || 45000);
const VERSION = '1.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.woff2': 'font/woff2',
};

/* --------------------------- helpers --------------------------- */

function json(res, status, payload, extra = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  });
  res.end(body);
}

function text(res, status, body, contentType) {
  res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
  res.end(body);
  return true; // truthy signal for seoRoutes()
}

async function readBody(req, limit = 128 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('Request body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

const rateMap = new Map();
function rateLimited(req) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + 60000 });
    return false;
  }
  entry.count += 1;
  if (rateMap.size > 5000) for (const [k, v] of rateMap) if (now > v.reset) rateMap.delete(k);
  return entry.count > RATE_LIMIT;
}

function siteUrl(req) {
  const configured = (process.env.PUBLIC_SITE_URL || '').replace(/\/$/, '');
  if (configured) return configured;
  const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

async function serveStatic(req, res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  if (rel === '/app' || rel === '/app/') rel = '/app.html';
  const safe = path.normalize(decodeURIComponent(rel)).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safe);
  if (!filePath.startsWith(PUBLIC_DIR)) return text(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error('not a file');
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.html') {
      let html = await fs.readFile(filePath, 'utf8');
      html = html.replaceAll('__SITE_URL__', siteUrl(req));
      return text(res, 200, html, MIME['.html']);
    }
    const buf = await fs.readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': buf.length,
      'Cache-Control': ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico'].includes(ext) ? 'public, max-age=86400' : 'no-cache',
    });
    res.end(buf);
  } catch {
    return text(res, 404, '404 — FailureAI me ye page nahi mila. <a href="/">Home</a>', 'text/html; charset=utf-8');
  }
}

function seoRoutes(req, res, pathname) {
  const base = siteUrl(req);
  const today = new Date().toISOString().slice(0, 10);
  if (pathname === '/robots.txt') {
    return text(res, 200, [
      'User-agent: *', 'Allow: /', `Sitemap: ${base}/sitemap.xml`, '',
    ].join('\n'), 'text/plain; charset=utf-8');
  }
  if (pathname === '/sitemap.xml') {
    const pages = [
      { loc: '/', priority: '1.0', changefreq: 'weekly' },
      { loc: '/app.html', priority: '0.9', changefreq: 'weekly' },
      { loc: '/#features', priority: '0.7', changefreq: 'monthly' },
      { loc: '/#how-it-works', priority: '0.6', changefreq: 'monthly' },
      { loc: '/#faq', priority: '0.6', changefreq: 'monthly' },
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
      .map((p) => `  <url><loc>${base}${p.loc}</loc><lastmod>${today}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`)
      .join('\n')}\n</urlset>`;
    return text(res, 200, xml, 'application/xml; charset=utf-8');
  }
  return false;
}

/* --------------------------- API --------------------------- */

async function handleRun(req, res, body, forcedTool) {
  const tool = TOOLS.includes(forcedTool || body.tool) ? (forcedTool || body.tool) : 'all';
  if (!String(body.query ?? '').trim()) return json(res, 400, { ok: false, error: 'Pehle client ka naam ya URL daalein.' });
  const ctx = normalizeContext(body);

  let researchInfo = null;
  if (body.researchEnabled) {
    try {
      researchInfo = await webResearch(ctx.query || ctx.brand);
      ctx.research = researchInfo.results;
      ctx.researchNote = researchInfo.note;
    } catch (err) {
      ctx.researchNote = `Live search fail: ${String(err.message || err).slice(0, 160)}`;
    }
  }

  const localKit = buildKit(ctx, tool);
  localKit.meta.researchNote = ctx.researchNote || 'Live web research off.';

  const choice = resolveProvider(String(body.provider || 'auto'), String(body.apiKey || ''));
  if (choice && choice.error) return json(res, 400, { ok: false, error: choice.error });

  if (choice) {
    const { system, user } = buildPrompt(tool, ctx);
    try {
      const { data, provider, model } = await generateJSON({ provider: choice, system, user, timeoutMs: TIMEOUT });
      const kit = mergeLiveResult(localKit, data, tool, ctx);
      kit.meta.provider = provider;
      kit.meta.model = model;
      kit.meta.researchNote = localKit.meta.researchNote;
      return json(res, 200, { ok: true, kit, status: publicStatus() });
    } catch (err) {
      localKit.meta.fallback = `Live AI call fail hui (${String(err.message || err).slice(0, 180)}). Neeche Local Engine ka output hai — app chalna band nahi hua.`;
    }
  }
  return json(res, 200, { ok: true, kit: localKit, status: publicStatus() });
}

async function handleApi(req, res, pathname) {
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (rateLimited(req)) return json(res, 429, { ok: false, error: 'Rate limit cross ho gaya. 1 minute baad try karein.' });

  if (pathname === '/api/health' && req.method === 'GET') {
    return json(res, 200, {
      ok: true, product: 'FailureAI', version: VERSION,
      status: { ...publicStatus(), webSearch: researchStatus().enabled, searchProvider: researchStatus().provider },
      tools: TOOLS, uptimeSec: Math.round(process.uptime()),
    });
  }

  if ((pathname === '/api/run' || pathname === '/api/campaign') && req.method === 'POST') {
    const body = await readBody(req);
    return handleRun(req, res, body, pathname === '/api/campaign' ? 'all' : undefined);
  }

  if (pathname === '/api/research' && req.method === 'POST') {
    const body = await readBody(req);
    const q = String(body.query || '').trim().slice(0, 240);
    if (!q) return json(res, 400, { ok: false, error: 'Query empty hai.' });
    try {
      const info = await webResearch(q);
      return json(res, 200, { ok: true, ...info });
    } catch (err) {
      return json(res, 200, { ok: false, provider: researchStatus().provider, results: [], note: String(err.message || err).slice(0, 200) });
    }
  }

  if (pathname === '/api/image' && req.method === 'POST') {
    const body = await readBody(req);
    const result = await generateImage({ prompt: String(body.prompt || ''), size: String(body.size || '1024x1024') });
    return json(res, result.ok ? 200 : 400, result);
  }

  return json(res, 404, { ok: false, error: 'Unknown API route' });
}

/* --------------------------- server --------------------------- */

export function createServer() {
  return http.createServer(async (req, res) => {
    let pathname = '/';
    try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { /* keep default */ }
    try {
      if (pathname.startsWith('/api/')) return await handleApi(req, res, pathname);
      if (seoRoutes(req, res, pathname)) return;
      if (req.method !== 'GET' && req.method !== 'HEAD') return text(res, 405, 'Method not allowed', 'text/plain; charset=utf-8');
      return await serveStatic(req, res, pathname);
    } catch (err) {
      console.error('[FailureAI]', err);
      if (!res.headersSent) return json(res, 500, { ok: false, error: String(err.message || err).slice(0, 240) });
      res.end();
    }
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  createServer().listen(PORT, HOST, () => {
    const status = publicStatus();
    console.log(`\n  ██ FailureAI v${VERSION}`);
    console.log(`  → http://${HOST}:${PORT}  (landing + app)`);
    console.log(`  → Live AI: ${status.liveAI ? status.defaultProvider : 'OFF (Local Engine active)'}`);
    console.log(`  → Web research: ${researchStatus().enabled ? researchStatus().provider : 'OFF'}`);
    console.log(`  → Image API: ${status.imageGeneration ? 'ON' : 'OFF (Pollinations fallback)'}\n`);
  });
}

export default createServer;
