import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from '../server/index.js';
import { detectIndustry, normalizeContext, brandFrom, slugify } from '../server/data.js';
import { buildKit } from '../server/engine.js';
import { kitToMarkdown, adsCSV, calendarCSV } from '../public/js/util.js';
import { render } from '../public/js/render.js';

let server;
let base;

test.before(async () => {
  server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => new Promise((r) => server.close(r)));

const post = (path, body) => fetch(`${base}${path}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('GET /api/health reports product, tools and capabilities', async () => {
  const r = await fetch(`${base}/api/health`);
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.ok, true);
  assert.equal(j.product, 'FailureAI');
  assert.ok(j.tools.includes('creative') && j.tools.includes('seo'));
  assert.equal(typeof j.status.liveAI, 'boolean');
});

test('landing page is served with SEO tags and a replaced canonical', async () => {
  const r = await fetch(`${base}/`);
  const html = await r.text();
  assert.equal(r.status, 200);
  assert.match(html, /FailureAI/);
  assert.match(html, /rel="canonical" href="http:\/\/127\.0\.0\.1:\d+\/"/);
  assert.match(html, /application\/ld\+json/);
  assert.doesNotMatch(html, /__SITE_URL__/);
});

test('agent app, CSS and JS modules are served', async () => {
  for (const p of ['/app.html', '/app.css', '/styles.css', '/js/app.js', '/js/render.js', '/js/util.js', '/favicon.svg', '/assets/hero.jpg']) {
    const r = await fetch(`${base}${p}`);
    assert.equal(r.status, 200, `${p} should be 200`);
  }
  const app = await (await fetch(`${base}/app.html`)).text();
  assert.match(app, /queryInput/);
});

test('robots.txt and sitemap.xml are generated from the live host', async () => {
  const robots = await (await fetch(`${base}/robots.txt`)).text();
  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  assert.match(robots, /Sitemap: http:\/\/127\.0\.0\.1:\d+\/sitemap\.xml/);
  assert.match(sitemap, /<urlset/);
  assert.match(sitemap, /app\.html/);
});

test('POST /api/run with tool=all returns all 7 sections', async () => {
  const r = await post('/api/run', { tool: 'all', query: 'FitZone Gym Delhi', language: 'hinglish', provider: 'local' });
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.ok, true);
  for (const key of ['intel', 'ads', 'creative', 'code', 'prompts', 'calendar', 'seo']) {
    assert.ok(j.kit[key], `missing ${key}`);
  }
  assert.equal(j.kit.meta.mode, 'local');
  assert.equal(j.kit.meta.brand, 'FitZone Gym Delhi');
  assert.equal(detectIndustry('gym membership delhi').key, 'fitness');
});

test('POST /api/run with a single tool returns only that section', async () => {
  const r = await post('/api/run', { tool: 'ads', query: 'Chai Wala Cafe Pune' });
  const j = await r.json();
  assert.deepEqual(Object.keys(j.kit).sort(), ['ads', 'meta']);
  assert.equal(j.kit.ads.platforms.length, 5);
  assert.equal(j.kit.ads.platforms[0].variants.length, 2);
});

test('POST /api/campaign is an alias for the full kit', async () => {
  const r = await post('/api/campaign', { query: 'Sunrise Dental Clinic' });
  const j = await r.json();
  assert.ok(j.kit.intel && j.kit.calendar && j.kit.code);
});

test('industry presets, languages and URL brand detection are wired', () => {
  assert.equal(detectIndustry('best dentist near me').key, 'health');
  assert.equal(detectIndustry('2 bhk flat in pune').key, 'realestate');
  assert.equal(brandFrom('https://www.chaiwala.in/menu'), 'Chaiwala');
  assert.equal(slugify('FitZone Gym — Delhi!'), 'fitzone-gym-delhi');
  const hindi = buildKit(normalizeContext({ query: 'FitZone Gym', language: 'hindi' }), 'ads');
  assert.match(JSON.stringify(hindi.ads), /[\u0900-\u097F]/, 'Hindi output should contain Devanagari');
  const english = buildKit(normalizeContext({ query: 'FitZone Gym', language: 'english' }), 'ads');
  assert.doesNotMatch(JSON.stringify(english.ads), /[\u0900-\u097F]/);
});

test('every generated kit has valid tracking code, prompts, calendar and SEO data', () => {
  const ctx = normalizeContext({ query: 'https://chaiwala.in', goal: 'sales', tone: 'premium', city: 'Pune' });
  const kit = buildKit(ctx, 'all');
  assert.equal(kit.code.files.length, 6);
  assert.ok(kit.code.files.every((f) => typeof f.code === 'string' && f.code.length > 60));
  assert.match(kit.code.files[0].code, /fbq\('track', 'PageView'\)/);
  assert.equal(kit.prompts.prompts.length, 8);
  assert.equal(kit.calendar.weeks.length, 4);
  assert.equal(kit.calendar.weeks.reduce((n, w) => n + w.posts.length, 0), 20);
  assert.equal(kit.creative.concepts.length, 4);
  assert.ok(kit.creative.concepts.every((c) => /--ar/.test(c.imagePrompt) && !/等效/.test(c.imagePrompt)));
  assert.ok(kit.seo.metaTitle.length <= 60);
  assert.ok(kit.seo.metaDescription.length <= 158);
  assert.equal(kit.ads.budgetSplit.reduce((n, b) => n + b.pct, 0), 100);
  assert.equal(kit.calendar.budget.reduce((n, b) => n + b.pct, 0), 100);
});

test('blank query is rejected, unknown tool falls back to all, unknown API is 404', async () => {
  const bad = await post('/api/run', { tool: 'all', query: '' });
  assert.equal(bad.status, 400);
  const odd = await post('/api/run', { tool: 'does-not-exist', query: 'Demo Brand' });
  const j = await odd.json();
  assert.ok(j.ok && j.kit.intel);
  const missing = await fetch(`${base}/api/nope`);
  assert.equal(missing.status, 404);
});

test('POST /api/research degrades gracefully without a search key', async () => {
  const r = await post('/api/research', { query: 'FitZone Gym' });
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(j.results));
  assert.ok(typeof j.note === 'string');
});

test('every workspace renderer produces HTML without throwing', () => {
  const kit = buildKit(normalizeContext({ query: 'FitZone Gym Delhi' }), 'all');
  for (const tool of ['overview', 'intel', 'ads', 'creative', 'code', 'prompts', 'calendar', 'seo', 'history']) {
    const html = render(tool, kit, [{ id: 'h1', brand: 'FitZone', query: 'FitZone', at: new Date().toISOString(), kit }]);
    assert.equal(typeof html, 'string');
    assert.ok(html.length > 400, `${tool} output too small`);
    assert.match(html, /page-head|welcome/);
  }
  assert.match(render('overview', {}, []), /Poora campaign/);
  assert.match(render('ads', {}, []), /run karo/);
});

test('renderers escape model/user supplied HTML (no script injection)', () => {
  const kit = buildKit(normalizeContext({ query: 'Demo Brand' }), 'all');
  kit.intel.summary = '</div><script>alert(1)</script>';
  kit.ads.platforms[0].variants[0].primaryText = '<img src=x onerror=alert(2)>';
  const html = render('intel', kit, []) + render('ads', kit, []);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(html, /<img src=x onerror=/);
  assert.match(html, /&lt;script&gt;/);
});

test('export helpers produce usable Markdown / CSV', () => {
  const kit = buildKit(normalizeContext({ query: 'FitZone Gym Delhi' }), 'all');
  const md = kitToMarkdown(kit);
  assert.match(md, /# FailureAI Campaign Kit/);
  assert.match(md, /## Ad Factory/);
  assert.ok(md.length > 6000);
  const ads = adsCSV(kit).trim().split('\n');
  assert.equal(ads.length, 11); // header + 5 platforms × 2 variants
  const cal = calendarCSV(kit).trim().split('\n');
  assert.equal(cal.length, 21); // header + 20 posts
});
