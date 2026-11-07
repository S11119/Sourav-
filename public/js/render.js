/* FailureAI :: workspace renderers. Every dynamic value is HTML-escaped. */

import { esc, txt, copyBtn, dlBtn, renderBtn, chips, bullets, kv, slug, timeAgo } from './util.js';

export const TOOL_META = {
  intel: { icon: '⌕', name: 'Client Intel', hint: 'Data & research', desc: 'Audience, SWOT, competitors, keywords, lead sheet aur outreach — client ka poora brief.' },
  ads: { icon: '✦', name: 'Ad Factory', hint: 'Copy & variants', desc: '5 platforms, 10 A/B variants, hooks, budget split aur test hypotheses.' },
  creative: { icon: '▣', name: 'Creative Studio', hint: 'Images & video', desc: 'Image prompts, palette, overlay copy aur 20-second video script.' },
  code: { icon: '</>', name: 'Code & Tracking', hint: 'Pixel, UTM, JSON-LD', desc: 'Copy-paste ready tracking code, UTM builder aur structured data.' },
  prompts: { icon: '❝', name: 'Prompt Library', hint: 'Reusable prompts', desc: '8 production prompts + master system prompt + weekly workflow.' },
  calendar: { icon: '▦', name: '30-Day Calendar', hint: 'Posts & KPIs', desc: '4 weeks, 20 posts, budget split, KPIs aur weekly review ritual.' },
  seo: { icon: '↗', name: 'SEO Pack', hint: 'Meta, FAQ, schema', desc: 'Meta tags, FAQ schema, blog titles aur technical checklist.' },
};

export function pageHead(kicker, title, desc, actions = '') {
  return `<div class="page-head"><div><span class="kicker">${esc(kicker)}</span><h1>${title}</h1><p>${esc(desc)}</p></div><div class="page-actions">${actions}</div></div>`;
}

const section = (label) => `<div class="section-title">${esc(label)}</div>`;
const rereun = (tool) => `<button class="btn btn-ghost" data-run-tool="${tool}">↻ Dobara run</button>`;
const sectionActions = (tool, kit, label = 'section') => {
  const data = kit?.[tool];
  return `${rereun(tool)}${data ? copyBtn(data, '⧉ Copy JSON') + dlBtn(data, `failureai-${tool}.json`, '↓ .json') : ''}`;
};

/* ---------------------------- welcome ---------------------------- */

export function renderWelcome() {
  const examples = [
    ['FitZone Gym Delhi', 'Fitness · leads · Hinglish'],
    ['https://chaiwala.in', 'URL detect + cafe preset'],
    ['Sunrise Dental Clinic Pune', 'Healthcare · trust copy'],
    ['D2C skincare brand', 'Ecommerce · ROAS focus'],
  ];
  const steps = [
    ['01', 'Search', 'Client ka naam ya URL upar likho'],
    ['02', 'Full campaign', '7 modules ek saath run hote hain'],
    ['03', 'Client intel', 'Gaps verify karo, notes me context daalo'],
    ['04', 'Ads + creative', '2 variants chuno, images render karo'],
    ['05', 'Code + tracking', 'Pixel, UTM aur JSON-LD launch se pehle'],
    ['06', 'Calendar + SEO', '30 din ka plan aur organic growth'],
    ['07', 'Export', 'JSON / Markdown / CSV / PDF'],
  ];
  return `<div class="page-head"><div><span class="kicker">WORKSPACE / OVERVIEW</span><h1>Namaste 👋 FailureAI ready hai.</h1><p>Ek search me client research, ads, creatives, code, prompts, calendar aur SEO. Sab kuch yahin, live.</p></div></div>
  <div class="welcome">
    <div class="welcome-main">
      <span class="badge lime">● LOCAL ENGINE ACTIVE — BINA KEY KE</span>
      <h2>Ek search.<br><em>Poora campaign.</em></h2>
      <p>Upar search box me client ka naam, website ya product idea likho aur <b>Full campaign</b> dabao. Ya neeche se koi example chuno — app turant 7-section kit bana dega.</p>
      <div class="quick-grid">
        ${examples.map(([q, d]) => `<button data-quick="${esc(q)}"><b>${esc(q)}</b><small>${esc(d)}</small></button>`).join('')}
      </div>
    </div>
    <div class="pipeline">
      <h3>⚡ Agent pipeline</h3><p>Jo ek click me hota hai:</p>
      ${steps.map(([n, t, d]) => `<div class="pipe-step"><b>${n}</b><div><span>${esc(t)}</span><small>${esc(d)}</small></div></div>`).join('')}
    </div>
  </div>
  <div class="section-title">YE SAB MILTA HAI</div>
  <div class="grid g4">
    <div class="card"><h4>◎ Search → Kit</h4><p>Ek query, 7 structured sections, exportable.</p></div>
    <div class="card"><h4>⌕ Client data</h4><p>Lead sheet, enrichment checklist, live sources.</p></div>
    <div class="card"><h4>✦ Ads + images</h4><p>10 variants, 4 image prompts, actual render.</p></div>
    <div class="card"><h4>&lt;/&gt; Prompt + code</h4><p>Pixel, GA4, UTM, JSON-LD aur 8 prompts.</p></div>
  </div>`;
}

export function renderEmpty(tool) {
  const m = TOOL_META[tool] || { icon: '◎', name: tool, desc: '' };
  return `${pageHead('MODULE / EMPTY', `${esc(m.icon)} ${esc(m.name)}`, m.desc)}
    <div class="empty"><div class="big">${esc(m.icon)}</div><h3>Is client ke liye abhi ${esc(m.name)} nahi bana</h3>
    <p>Upar search me client ka naam daal kar "Full campaign" chalao, ya sirf yahin module run karo.</p>
    <button class="btn btn-primary" data-run-tool="${esc(tool)}">✦ ${esc(m.name)} run karo</button></div>`;
}

/* ---------------------------- overview ---------------------------- */

export function renderOverview(kit) {
  if (!kit || !kit.intel) return renderWelcome();
  const m = kit.meta || {};
  const i = kit.intel || {};
  const adsCount = (kit.ads?.platforms || []).reduce((n, p) => n + (p.variants?.length || 0), 0);
  const posts = (kit.calendar?.weeks || []).reduce((n, w) => n + (w.posts?.length || 0), 0);
  const files = (kit.code?.files || []).length;
  const concepts = (kit.creative?.concepts || []).length;
  const prompts = (kit.prompts?.prompts || []).length;
  return `${pageHead('WORKSPACE / OVERVIEW', `Campaign kit · ${esc(m.brand || 'Client')}`, i.oneLinePositioning || i.summary || 'Poora kit taiyaar hai.',
      `<button class="btn btn-primary" data-run-tool="all">↻ Full campaign dobara</button>${copyBtn(kit, '⧉ Copy poora kit')}${dlBtn(kit, `failureai-${slug(m.brand)}-kit.json`, '↓ JSON')}`)}
  <div class="stat-grid" style="margin-bottom:20px">
    <div class="stat"><b>${(i.audience || []).length}</b><span>audience segments</span></div>
    <div class="stat"><b>${adsCount}</b><span>ad variants</span></div>
    <div class="stat"><b>${concepts}</b><span>creative concepts</span></div>
    <div class="stat"><b>${posts}</b><span>calendar posts</span></div>
  </div>
  <div class="grid g2" style="margin-bottom:20px">
    <div class="card accent"><div class="card-head"><h3>📌 Positioning</h3><span class="badge lime">${esc(m.mode || 'local')}</span></div><p style="font-size:.95rem;color:var(--text)">${txt(i.oneLinePositioning)}</p><p style="margin-top:10px">${txt(i.summary)}</p>
      <div style="margin-top:12px">${chips([i.industry, i.market, m.language, m.tone, m.goal], 'lime')}</div></div>
    <div class="card"><div class="card-head"><h3>✅ 5 quick wins</h3>${copyBtn((i.quickWins || []).join('\n'), '⧉ Copy')}</div>${bullets((i.quickWins || []).slice(0, 5))}</div>
  </div>
  <div class="section-title">MODULES — CLICK KARO KHOLNE KE LIYE</div>
  <div class="grid g4">
    ${Object.entries(TOOL_META).map(([key, v]) => `<button class="tile" data-tool="${key}"><span class="ti">${esc(v.icon)}</span><b>${esc(v.name)}</b><span>${esc(v.hint)}</span><span class="go">OPEN →</span></button>`).join('')}
    <div class="tile" style="cursor:default"><span class="ti">↓</span><b>Export kit</b><span>JSON · Markdown · CSV · PDF</span><span class="go">TOP BAR →</span></div>
  </div>
  <div class="section-title">KIT DETAILS</div>
  <div class="grid g3">
    <div class="card"><h4>📊 Data</h4>${kv({ Brand: m.brand, Industry: m.industry, City: m.city, Sources: (i.sources || []).length, Files: files, Prompts: prompts })}</div>
    <div class="card"><h4>🎯 Priority channels</h4>${bullets((i.channels || []).slice(0, 4).map((c) => `${c.name} — ${c.priority}`))}</div>
    <div class="card"><h4>🧪 First tests</h4>${bullets((kit.ads?.abTests || []).slice(0, 3).map((t) => t.name || t.hypothesis))}</div>
  </div>
  ${m.fallback ? `<div class="note warn">${esc(m.fallback)}</div>` : ''}
  ${m.note ? `<div class="note">${esc(m.note)}</div>` : ''}
  ${i.sourcesNote ? `<div class="note">${esc(i.sourcesNote)}</div>` : ''}`;
}

/* ---------------------------- intel ---------------------------- */

export function renderIntel(kit) {
  const i = kit.intel;
  const swot = i.swot || {};
  const kw = i.keywords || {};
  const ls = i.leadSheet || {};
  return `${pageHead('MODULE 01 / CLIENT INTEL', '⌕ Client Intelligence', 'Client ka data, audience, market aur outreach — ek structured brief.', sectionActions('intel', kit))}
  <div class="grid g2">
    <div class="card accent"><div class="card-head"><h3>${esc(i.brand || kit.meta.brand)}</h3><span class="badge lime">${esc(i.industry || '')}</span></div>
      <p style="font-size:.95rem;color:var(--text);font-weight:600">${txt(i.oneLinePositioning)}</p><p style="margin-top:10px">${txt(i.summary)}</p>
      <div class="chips">${copyBtn(i.outreach?.body || '', '⧉ Outreach email')}${copyBtn([i.summary, i.oneLinePositioning].filter(Boolean).join('\n'), '⧉ Brief')}</div></div>
    <div class="card"><div class="card-head"><h4>🗂 Lead / data sheet</h4>${copyBtn(ls, '⧉ Copy sheet')}</div>
      ${kv({ Company: ls.company || i.brand, Website: i.website || ls.website, Industry: ls.industry || i.industry, Location: ls.location || i.market, Stage: ls.stage, 'Decision makers': (ls.decisionMakers || []).join(', ') })}
      ${ls.dataGaps?.length ? `<div style="margin-top:10px"><span class="badge">Data gaps</span>${chips(ls.dataGaps, 'warn')}</div>` : ''}</div>
  </div>
  ${section('AUDIENCE SEGMENTS')}
  <div class="grid g3">${(i.audience || []).map((a) => `<div class="card"><div class="card-head"><h4>${esc(a.segment)}</h4><span class="badge cyan">${esc(a.funnelStage)}</span></div>
    <p><b style="color:var(--orange)">Pains</b></p>${bullets(a.pains)}<p style="margin-top:10px"><b style="color:var(--lime)">Desires</b></p>${bullets(a.desires)}
    ${a.messageAngle ? `<div class="note">${esc(a.messageAngle)}</div>` : ''}</div>`).join('')}</div>
  ${section('SWOT')}
  <div class="grid g4">${Object.entries(swot).map(([k, v]) => `<div class="card"><h4 style="color:${k === 'strengths' || k === 'opportunities' ? 'var(--lime)' : 'var(--orange)'}">${esc(k.toUpperCase())}</h4>${bullets(v)}</div>`).join('')}</div>
  ${section('KEYWORDS BY INTENT')}
  <div class="grid g2">
    ${Object.entries(kw).map(([k, v]) => `<div class="card"><div class="card-head"><h4>${esc(k)}</h4>${copyBtn((v || []).join('\n'), '⧉ Copy')}</div>${chips(v, k === 'negative' ? 'warn' : '')}</div>`).join('')}
  </div>
  ${section('COMPETITORS & CHANNELS')}
  <div class="table-wrap" style="margin-bottom:16px"><table><thead><tr><th>Competitor</th><th>Angle</th><th>Gap</th><th>Aapka counter</th></tr></thead><tbody>
    ${(i.competitors || []).map((c) => `<tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.angle)}</td><td>${esc(c.gap)}</td><td>${esc(c.yourCounter)}</td></tr>`).join('')}</tbody></table></div>
  <div class="table-wrap"><table><thead><tr><th>Channel</th><th>Priority</th><th>Kyun</th><th>Pehla action</th></tr></thead><tbody>
    ${(i.channels || []).map((c) => `<tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.priority)}</td><td>${esc(c.why)}</td><td>${esc(c.firstAction)}</td></tr>`).join('')}</tbody></table></div>
  ${section('ACTION & DISCOVERY')}
  <div class="grid g2">
    <div class="card"><div class="card-head"><h4>⚡ Quick wins</h4>${copyBtn(i.quickWins, '⧉ Copy')}</div>${bullets(i.quickWins)}</div>
    <div class="card"><div class="card-head"><h4>❓ Client se poocho</h4>${copyBtn(i.discoveryQuestions, '⧉ Copy')}</div>${bullets(i.discoveryQuestions)}</div>
  </div>
  ${section('COLD OUTREACH (READY TO SEND)')}
  <div class="grid g2">
    <div class="card"><div class="card-head"><h4>Email</h4>${copyBtn(`Subject: ${i.outreach?.subject || ''}\n\n${i.outreach?.body || ''}`, '⧉ Copy email')}</div>
      <p><b>Subject:</b> ${txt(i.outreach?.subject)}</p><pre style="white-space:pre-wrap;font-family:inherit;font-size:.8rem;color:var(--muted);margin:0">${esc(i.outreach?.body || '')}</pre></div>
    <div class="card"><h4>Follow-ups</h4>${bullets(i.outreach?.followUps)}
      <h4 style="margin-top:18px">Enrichment checklist</h4>${bullets(ls.enrichmentChecklist)}</div>
  </div>
  ${section('SOURCES')}
  ${(i.sources || []).length ? `<div class="table-wrap"><table><thead><tr><th>#</th><th>Source</th><th>Snippet</th></tr></thead><tbody>${i.sources.map((s, n) => `<tr><td>${n + 1}</td><td><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" style="color:var(--lime)">${esc(s.title || s.url)}</a></td><td>${esc(s.snippet)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="note">${esc(i.sourcesNote || 'Live sources off hain.')}</div>`}
  <div class="note">${esc(i.sourcesNote || '')}</div>`;
}

/* ---------------------------- ads ---------------------------- */

function variantCard(v) {
  return `<div class="variant"><div class="vhead"><b>${esc(v.name || 'Variant')}</b><span class="badge lime">${esc(v.angle || '')}</span></div>
    <p class="hook">${esc(v.hook || '')}</p><p class="copy">${esc(v.primaryText || '')}</p>
    <div class="meta"><div><b>Headline</b>${esc(v.headline || '')}</div><div><b>CTA</b>${esc(v.cta || '')}</div><div style="grid-column:1/-1"><b>Description</b>${esc(v.description || '')}</div></div>
    ${(v.hashtags || []).length ? chips(v.hashtags) : ''}
    <div class="foot">${copyBtn([v.hook, v.primaryText, v.headline, v.description, v.cta, (v.hashtags || []).join(' ')].filter(Boolean).join('\n'), '⧉ Copy ad')}<span class="badge">${esc((v.headline || '').length)}/40 chars</span></div></div>`;
}

export function renderAds(kit) {
  const a = kit.ads;
  return `${pageHead('MODULE 02 / AD FACTORY', '✦ Ad Factory', 'Platform-wise A/B copy, hooks, budget aur tests — copy-paste ready.', sectionActions('ads', kit))}
  <div class="grid g2" style="margin-bottom:16px">
    <div class="card accent"><h3>🎯 Strategy</h3><p style="color:var(--text);font-size:.9rem">${txt(a.strategy)}</p><div style="margin-top:12px">${copyBtn(a.strategy, '⧉ Copy')}</div></div>
    <div class="card"><h3>💰 Budget split</h3><div class="table-wrap" style="border:0"><table style="min-width:0"><tbody>${(a.budgetSplit || []).map((b) => `<tr><td><strong>${esc(b.platform)}</strong></td><td style="color:var(--lime)">${esc(b.pct)}%</td><td><div style="height:6px;background:var(--surface3);border-radius:6px;overflow:hidden"><div style="height:100%;width:${Math.min(100, Number(String(b.pct ?? 0).replace('%', '')) || 0)}%;background:linear-gradient(90deg,var(--violet),var(--lime))"></div></div></td></tr>`).join('')}</tbody></table></div></div>
  </div>
  ${section('PLATFORM CAMPAIGNS')}
  ${(a.platforms || []).map((p) => `<div class="platform"><div class="phead"><h3>${esc(p.name)}</h3><div><span class="badge violet">${esc(p.objective || '')}</span> <span class="badge">${esc(p.budgetPct || '')}% budget</span></div></div>
    <div class="pmeta"><span>📍 ${esc(p.placements || '')}</span><span>🎯 ${esc(p.targeting || '')}</span></div>
    <div class="grid g2">${(p.variants || []).map(variantCard).join('')}</div></div>`).join('')}
  ${section('HOOKS & CTA BANK')}
  <div class="grid g2"><div class="card"><div class="card-head"><h4>🪝 Hooks</h4>${copyBtn(a.hooks, '⧉ Copy')}</div>${bullets(a.hooks)}</div>
    <div class="card"><div class="card-head"><h4>🔘 CTAs</h4>${copyBtn(a.ctas, '⧉ Copy')}</div>${chips(a.ctas, 'lime')}</div></div>
  ${section('GOOGLE ADS + LANDING PAGE')}
  <div class="grid g2">
    <div class="card"><div class="card-head"><h4>Google Ads · ${esc(a.googleAds?.adGroup || '')}</h4>${copyBtn(a.googleAds, '⧉ Copy')}</div>
      <p><b>Headlines (≤30)</b></p>${bullets(a.googleAds?.headlines)}<p style="margin-top:10px"><b>Descriptions</b></p>${bullets(a.googleAds?.descriptions)}
      <p style="margin-top:10px"><b>Negative keywords</b></p>${chips(a.googleAds?.negativeKeywords, 'warn')}</div>
    <div class="card"><div class="card-head"><h4>Landing page hero</h4>${copyBtn(a.landingPage, '⧉ Copy')}</div>
      <h3 style="color:var(--lime)">${esc(a.landingPage?.headline || '')}</h3><p>${esc(a.landingPage?.subhead || '')}</p>${bullets(a.landingPage?.bullets)}
      <p style="margin-top:10px"><b>CTA:</b> <span class="badge lime">${esc(a.landingPage?.cta || '')}</span></p>${chips(a.landingPage?.trustRow)}</div>
  </div>
  ${section('A/B TESTS & COMPLIANCE')}
  <div class="table-wrap" style="margin-bottom:16px"><table><thead><tr><th>Test</th><th>Hypothesis</th><th>A / B</th><th>Metric</th></tr></thead><tbody>
    ${(a.abTests || []).map((t) => `<tr><td><strong>${esc(t.name)}</strong></td><td>${esc(t.hypothesis)}</td><td>${esc(t.variantA)} ↔ ${esc(t.variantB)}</td><td>${esc(t.metric)}</td></tr>`).join('')}</tbody></table></div>
  <div class="card"><h4>⚠️ Compliance</h4>${bullets(a.compliance)}</div>
  ${a.disclaimer ? `<div class="note">${esc(a.disclaimer)}</div>` : ''}`;
}

/* ---------------------------- creative ---------------------------- */

export function renderCreative(kit) {
  const c = kit.creative;
  const bk = c.brandKit || {};
  return `${pageHead('MODULE 03 / CREATIVE STUDIO', '▣ Creative Studio', 'Production-ready image prompts, brand kit aur video script. Render image button se actual image bhi banao.', sectionActions('creative', kit))}
  <div class="card violet" style="margin-bottom:16px"><div class="card-head"><h3>🎨 Brand kit</h3>${copyBtn(bk, '⧉ Copy')}</div>
    <div class="grid g2"><div><p><b>Voice:</b> ${txt(bk.voice)}</p><p><b>Logo idea:</b> ${txt(bk.logoIdea)}</p>
      <div class="swatches">${(bk.palette || []).map((p) => `<div class="swatch" style="background:${esc(p.hex || p)}" title="${esc(p.use || p.hex || p)}"></div>`).join('')}</div>
      <p style="margin-top:10px"><b>Fonts:</b> ${esc((bk.fonts || []).join(' · '))}</p></div>
      <div class="grid g2"><div><b style="color:var(--lime);font-size:.76rem">DO</b>${bullets(bk.doList)}</div><div><b style="color:var(--orange);font-size:.76rem">DON'T</b>${bullets(bk.dontList)}</div></div></div></div>
  ${section('4 CREATIVE CONCEPTS — PROMPT + ACTUAL RENDER')}
  <div class="grid g2">${(c.concepts || []).map((k, n) => `<div class="concept">
    <div class="preview" id="preview-${n}" style="--c1:${esc((k.palette || [])[0] || '#7c5cff')};--c2:${esc((k.palette || [])[1] || '#b8ff3c')}"><span>${esc(k.ratio || '')}</span></div>
    <div class="body"><div class="card-head"><h3>${esc(k.name || `Concept ${n + 1}`)}</h3><span class="badge">${esc(k.overlayText || '')}</span></div>
      <p style="font-size:.76rem;color:var(--dim)">${esc(k.artDirection || '')}</p>
      <div class="prompt">${esc(k.imagePrompt || '')}</div>
      <div class="swatches">${(k.palette || []).map((p) => `<div class="swatch" style="background:${esc(p)}"></div>`).join('')}</div>
      <div class="actions">${renderBtn(k.imagePrompt || '')}${copyBtn(k.imagePrompt || '', '⧉ Prompt')}${copyBtn(k.negativePrompt || '', '⧉ Negative')}${copyBtn(`${k.overlayText || ''}\n${k.supportingLine || ''}\n${k.cta || ''}`, '⧉ Ad copy')}</div>
      <p style="margin-top:10px;font-size:.72rem;color:var(--muted)"><b>Overlay:</b> ${esc(k.overlayText)} · ${esc(k.supportingLine)} · <span style="color:var(--lime)">${esc(k.cta)}</span></p>
    </div></div>`).join('')}</div>
  ${section('20-SECOND VIDEO SCRIPT')}
  <div class="card"><div class="card-head"><h3>🎬 ${esc(c.videoScript?.duration || '')} · hook: ${esc(c.videoScript?.hook || '')}</h3>${copyBtn(c.videoScript, '⧉ Copy script')}</div>
    <div class="table-wrap" style="border:0"><table><thead><tr><th>Time</th><th>Visual</th><th>Voiceover</th></tr></thead><tbody>${(c.videoScript?.scenes || []).map((s) => `<tr><td><strong>${esc(s.time)}</strong></td><td>${esc(s.visual)}</td><td>${esc(s.voiceover)}</td></tr>`).join('')}</tbody></table></div>
    <p style="margin-top:10px"><b>CTA:</b> ${esc(c.videoScript?.cta)} · <b>Captions:</b> ${esc(c.videoScript?.captionStyle)}</p></div>
  <div class="note">${esc(c.renderNote || '')}</div>`;
}

/* ---------------------------- code ---------------------------- */

export function renderCode(kit) {
  const c = kit.code;
  const u = c.utm || {};
  return `${pageHead('MODULE 04 / CODE LAB', '&lt;/&gt; Code & Tracking Lab', 'Launch se pehle lagane wala code. Vanilla JS/HTML/JSON, koi framework nahi.', sectionActions('code', kit))}
  <div class="utm-builder" style="margin-bottom:16px"><div class="card-head"><h3>🔗 Live UTM builder</h3>${copyBtn(u.exampleUrl || '', '⧉ Copy example')}</div>
    <div class="row">
      <label>Base URL<input id="utmBase" value="${esc((u.exampleUrl || '').split('?')[0] || 'https://example.com')}" /></label>
      <label>Source<input id="utmSource" value="${esc(u.source || 'meta')}" /></label>
      <label>Medium<input id="utmMedium" value="${esc(u.medium || 'paid_social')}" /></label>
      <label>Campaign<input id="utmCampaign" value="${esc(u.campaign || 'launch')}" /></label>
      <label>Content<input id="utmContent" value="${esc(u.content || 'variant-a')}" /></label>
    </div>
    <div class="utm-out" id="utmOut">${esc(u.exampleUrl || '')}</div>
    <div style="margin-top:10px;display:flex;gap:8px"><button class="btn btn-ghost" id="utmCopy">⧉ Copy UTM link</button><span class="badge">Har ad variant ka alag content rakho</span></div></div>
  ${section('GENERATED FILES')}
  ${(c.files || []).map((f) => `<div class="code-card"><div class="code-head"><b>${esc(f.name)}</b><div><span class="badge">${esc(f.language)}</span> ${copyBtn(f.code || '', '⧉ Copy')} ${dlBtn(f.code || '', f.name || 'snippet.txt', '↓ .txt')}</div></div>
    <pre><code>${esc(f.code || '')}</code></pre><div style="padding:0 14px 13px;color:var(--dim);font-size:.74rem">${esc(f.purpose || '')}</div></div>`).join('')}
  ${section('MEASUREMENT CHECKLIST & STACK')}
  <div class="grid g2"><div class="card"><h4>✅ Verify karo</h4>${bullets(c.measurementChecklist)}</div>
    <div class="card"><h4>🧰 Stack</h4>${chips(c.stack)}<div class="note" style="margin-top:14px">Code me <code>PIXEL_ID</code>, <code>91XXXXXXXXXX</code> aur <code>__VERIFY_RATING__</code> jaise placeholders apni real values se replace karna na bhoolein.</div></div></div>`;
}

/* ---------------------------- prompts ---------------------------- */

export function renderPrompts(kit) {
  const p = kit.prompts;
  return `${pageHead('MODULE 05 / PROMPT LIBRARY', '❝ Prompt Library', 'Har kaam ke liye ek ready prompt — ChatGPT, Claude, Gemini ya kisi bhi agent me paste karo.', sectionActions('prompts', kit))}
  <div class="card accent" style="margin-bottom:16px"><div class="card-head"><h3>🧠 Master system prompt (apna agent banane ke liye)</h3>${copyBtn(p.systemPrompt || '', '⧉ Copy')}</div>
    <pre style="white-space:pre-wrap;font-family:inherit;font-size:.84rem;color:var(--text);margin:0">${esc(p.systemPrompt || '')}</pre></div>
  ${section('8 REUSABLE PROMPTS')}
  <div class="grid g2">${(p.prompts || []).map((x) => `<div class="prompt-card"><div class="card-head"><h4>${esc(x.title)}</h4><span class="badge violet">${esc(x.category)}</span></div>
    <pre>${esc(x.prompt || '')}</pre>${x.tip ? `<div class="tip">💡 ${esc(x.tip)}</div>` : ''}
    <div style="margin-top:12px">${copyBtn(x.prompt || '', '⧉ Copy prompt')}</div></div>`).join('')}</div>
  ${section('WEEKLY WORKFLOW')}
  <div class="card">${bullets(p.workflow)}</div>`;
}

/* ---------------------------- calendar ---------------------------- */

export function renderCalendar(kit) {
  const c = kit.calendar;
  return `${pageHead('MODULE 06 / CALENDAR', '▦ 30-Day Content Calendar', '4 weeks, 20 posts, budget aur KPIs — team ko seedha de do.', sectionActions('calendar', kit))}
  <div class="grid g2" style="margin-bottom:16px"><div class="card accent"><h3>${esc(c.theme || '')}</h3><p>${esc(c.cadence || '')}</p>
      <div style="margin-top:10px">${chips(Object.entries(c.mix || {}).map(([k, v]) => `${k}: ${v}`), 'lime')}</div></div>
    <div class="card"><h3>💰 Budget allocation</h3><div class="table-wrap" style="border:0"><table style="min-width:0"><tbody>${(c.budget || []).map((b) => `<tr><td><strong>${esc(b.bucket)}</strong></td><td style="color:var(--lime)">${esc(b.pct)}%</td><td>${esc(b.note)}</td></tr>`).join('')}</tbody></table></div></div></div>
  ${section('4-WEEK PLAN')}
  ${(c.weeks || []).map((w) => `<div class="week"><div class="week-head"><b>Week ${esc(w.week)} · ${esc(w.theme || '')}</b><span>Focus KPI: ${esc(w.focusKpi || '')}</span></div>
    ${(w.posts || []).map((p) => `<div class="post"><div class="day">${esc(p.day)}</div><div class="fmt">${esc(p.channel)}<br>${esc(p.format)}<br><span class="badge">${esc(p.funnelStage || '')}</span></div>
      <div class="idea"><strong>${esc(p.idea)}</strong><small>${esc(p.caption)} <b style="color:var(--lime)">${esc(p.cta)}</b> ${esc((p.hashtags || []).join(' '))}</small></div></div>`).join('')}</div>`).join('')}
  ${section('KPIs & WEEKLY RITUAL')}
  <div class="grid g2"><div class="card"><h4>📈 KPIs</h4><div class="table-wrap" style="border:0"><table style="min-width:0"><thead><tr><th>KPI</th><th>Target</th><th>Cadence</th></tr></thead><tbody>${(c.kpis || []).map((k) => `<tr><td><strong>${esc(k.name)}</strong></td><td>${esc(k.target)}</td><td>${esc(k.cadence)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><h4>🔁 Weekly ritual</h4>${bullets(c.weeklyRitual)}</div></div>`;
}

/* ---------------------------- seo ---------------------------- */

export function renderSeo(kit) {
  const s = kit.seo;
  return `${pageHead('MODULE 07 / SEO PACK', '↗ SEO Pack', 'Meta tags, FAQ schema, blog titles aur technical checklist — search me aane ke liye.', sectionActions('seo', kit))}
  <div class="grid g2">
    <div class="card accent"><div class="card-head"><h3>🏷 Meta tags</h3>${copyBtn(`<title>${s.metaTitle || ''}</title>\n<meta name="description" content="${s.metaDescription || ''}">`, '⧉ Copy tags')}</div>
      ${kv({ 'Meta title': s.metaTitle, 'Meta description': s.metaDescription, Slug: `/${s.slug}`, H1: s.h1, 'Primary keyword': s.primaryKeyword, 'Schema type': s.schemaType })}
      <p style="margin-top:10px;font-size:.72rem;color:var(--dim)">Title: ${esc((s.metaTitle || '').length)}/60 chars · Description: ${esc((s.metaDescription || '').length)}/155 chars</p></div>
    <div class="card"><div class="card-head"><h4>🔑 Secondary keywords</h4>${copyBtn(s.secondaryKeywords, '⧉ Copy')}</div>${chips(s.secondaryKeywords)}
      <h4 style="margin-top:18px">Internal linking plan</h4>${bullets(s.internalLinks)}</div>
  </div>
  ${section('FAQ (FAQPage SCHEMA KE LIYE READY)')}
  <div class="grid g2">${(s.faqs || []).map((f) => `<div class="card"><div class="card-head"><h4>${esc(f.q)}</h4>${copyBtn(`Q: ${f.q}\nA: ${f.a}`, '⧉ Copy')}</div><p>${esc(f.a)}</p></div>`).join('')}</div>
  <div class="note">${copyBtn({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: (s.faqs || []).map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }, '⧉ Copy FAQ JSON-LD')} Inhe <code>&lt;script type="application/ld+json"&gt;</code> me daalein.</div>
  ${section('BLOG TITLES & TECHNICAL CHECKLIST')}
  <div class="grid g2"><div class="card"><h4>📝 Blog titles</h4>${bullets(s.blogTitles)}</div>
    <div class="card"><h4>⚙️ Technical SEO</h4>${bullets(s.technicalChecklist)}</div></div>`;
}

/* ---------------------------- history ---------------------------- */

export function renderHistory(history = []) {
  return `${pageHead('WORKSPACE / HISTORY', '◷ Saved Runs', 'Har campaign aapke browser me save hoti hai. Click karke dobara kholo.', history.length ? `<button class="btn btn-ghost" id="clearHistory">🗑 Sab clear karo</button>` : '')}
  ${history.length ? history.map((h) => `<div class="history-item"><div><b>${esc(h.brand || h.query || 'Untitled')}</b><small>${esc(h.query || '')} · ${esc(h.tool || 'all')} · ${esc(h.mode || 'local')} · ${esc(timeAgo(h.at))}</small></div>
    <div class="hactions"><button class="btn-mini" data-load-history="${esc(h.id)}">↗ Open</button><button class="btn-mini" data-del-history="${esc(h.id)}">✕</button></div></div>`).join('')
    : `<div class="empty"><div class="big">◷</div><h3>Abhi koi run save nahi hua</h3><p>Upar search me ek client daalo aur Full campaign chalao — history apne aap ban jayegi.</p></div>`}`;
}

/* ---------------------------- dispatch ---------------------------- */

export function render(tool, kit, history = []) {
  if (tool === 'overview') return renderOverview(kit);
  if (tool === 'history') return renderHistory(history);
  if (!kit || !kit[tool]) return renderEmpty(tool);
  const fns = { intel: renderIntel, ads: renderAds, creative: renderCreative, code: renderCode, prompts: renderPrompts, calendar: renderCalendar, seo: renderSeo };
  return (fns[tool] || renderEmpty)(kit);
}
