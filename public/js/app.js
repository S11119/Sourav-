/* FailureAI :: workspace controller */

import { COPY, esc, toast, writeClipboard, download, kitToMarkdown, kitToText, adsCSV, calendarCSV, slug } from './util.js';
import { render } from './render.js';

const LS_SETTINGS = 'failureai.settings.v1';
const LS_HISTORY = 'failureai.history.v1';
const DEFAULT_SETTINGS = {
  provider: 'auto', apiKey: '', language: 'hinglish', tone: 'bold', goal: 'leads',
  city: '', offer: '', audience: '', notes: '', researchEnabled: false,
  imageEndpoint: 'https://image.pollinations.ai/prompt/',
};

const $ = (id) => document.getElementById(id);
const load = (key, fallback) => { try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return { ...fallback }; } };
const persist = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };

let settings = load(LS_SETTINGS, DEFAULT_SETTINGS);
let history = (() => { try { return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'); } catch { return []; } })();
let kit = {};
let currentTool = 'overview';
let serverStatus = {};
let busy = false;

/* ---------------------------- status ---------------------------- */

function applyStatus(st) {
  serverStatus = st || {};
  const dot = $('modeDot'), title = $('modeTitle'), desc = $('modeDesc');
  const s = serverStatus.status || serverStatus;
  const byok = settings.provider !== 'local' && settings.provider !== 'auto' && Boolean(settings.apiKey);
  const live = Boolean(s.liveAI) || byok;
  dot.className = `mode-dot ${live ? 'live' : 'local'}`;
  title.textContent = live ? 'LIVE AI mode' : 'LOCAL ENGINE mode';
  desc.textContent = byok
    ? `Aapki ${settings.provider} key (BYOK) se output aa raha hai. Key browser me save hai.`
    : live
      ? `Server par ${s.defaultProvider} key hai. Settings me BYOK ya Local Engine bhi chun sakte ho.`
      : 'Bina API key ke poora kit ban raha hai. Settings me key daal kar Live AI on karo.';
  const conn = $('connectionStatus');
  if (conn) conn.innerHTML = `✅ <b>Server online</b> · FailureAI v${esc(s.version || serverStatus.version || '1.0')}<br>
    Live AI: <b>${live ? s.defaultProvider : 'off (Local Engine)'}</b><br>
    Web research: <b>${s.webSearch ? esc(s.searchProvider || 'on') : 'off'}</b> · Image API: <b>${s.imageGeneration ? 'on' : 'off (Pollinations)'}</b><br>
    <span style="color:var(--dim)">Keys sirf is server par bheji jati hain. Browser storage me bhi save hoti hain — public device par na rakhein.</span>`;
}

async function checkHealth() {
  try {
    const r = await fetch('/api/health');
    const j = await r.json();
    applyStatus(j);
    return j;
  } catch (err) {
    $('modeDot').className = 'mode-dot';
    $('modeTitle').textContent = 'Server offline?';
    $('modeDesc').textContent = 'API se connect nahi ho pa raha. npm start chalao.';
    const conn = $('connectionStatus');
    if (conn) conn.innerHTML = `❌ Connection fail: ${esc(String(err.message || err))}`;
    return null;
  }
}

/* ---------------------------- settings ---------------------------- */

function fillSettings() {
  $('setProvider').value = settings.provider;
  $('setApiKey').value = settings.apiKey;
  $('setLanguage').value = settings.language;
  $('setTone').value = settings.tone;
  $('setGoal').value = settings.goal;
  $('setCity').value = settings.city;
  $('setOffer').value = settings.offer;
  $('setAudience').value = settings.audience;
  $('setNotes').value = settings.notes;
  $('setResearch').checked = Boolean(settings.researchEnabled);
  $('setImageEndpoint').value = settings.imageEndpoint;
  $('quickLang').value = settings.language;
}

function readSettings() {
  settings = {
    provider: $('setProvider').value,
    apiKey: $('setApiKey').value.trim(),
    language: $('setLanguage').value,
    tone: $('setTone').value,
    goal: $('setGoal').value,
    city: $('setCity').value.trim(),
    offer: $('setOffer').value.trim(),
    audience: $('setAudience').value.trim(),
    notes: $('setNotes').value.trim(),
    researchEnabled: $('setResearch').checked,
    imageEndpoint: $('setImageEndpoint').value.trim() || DEFAULT_SETTINGS.imageEndpoint,
  };
  $('quickLang').value = settings.language;
  persist(LS_SETTINGS, settings);
}

function openDrawer() { $('settingsDrawer').classList.add('open'); $('drawerBackdrop').hidden = false; }
function closeDrawer() { $('settingsDrawer').classList.remove('open'); $('drawerBackdrop').hidden = true; }

/* ---------------------------- rendering ---------------------------- */

function syncContext() {
  const m = kit.meta || {};
  $('ctxBrand').textContent = m.brand ? `${m.brand} — campaign kit ready` : 'Koi campaign nahi chalayi abhi';
  $('ctxMeta').textContent = m.brand ? `${m.industry || ''} · ${m.city || ''} · ${m.mode === 'live-ai' ? 'Live AI' : 'Local Engine'}` : 'ek search se shuru karo';
  const chips = m.brand ? [m.language, m.tone, m.goal, m.tool === 'all' ? 'full kit' : m.tool, m.provider || ''] : ['Hinglish', 'Hindi', 'English', 'BYOK'];
  $('ctxChips').innerHTML = chips.filter(Boolean).map((c) => `<span class="ctx-chip">${esc(c)}</span>`).join('');
  $('historyCount').textContent = `${history.length} runs`;
}

function renderView() {
  let html;
  try {
    html = render(currentTool, kit, history);
  } catch (err) {
    // Live AI kabhi unexpected shape de de to bhi workspace blank na ho.
    console.error('[FailureAI render]', err);
    html = `<div class="page-head"><div><span class="kicker">RENDER FALLBACK</span><h1>Raw kit view</h1><p>Model ne thoda alag structure diya, isliye seedha JSON dikha raha hoon. Copy / download kaam karta hai.</p></div></div>
      <div class="note warn">${esc(String(err.message || err))}</div>
      <div class="code-card"><div class="code-head"><b>campaign-kit.json</b></div><pre><code>${esc(JSON.stringify(kit, null, 2))}</code></pre></div>`;
  }
  $('content').innerHTML = html;
  document.querySelectorAll('.tool-nav button').forEach((b) => b.classList.toggle('active', b.dataset.tool === currentTool));
  syncContext();
  initUtmBuilder();
}

function setTool(tool) {
  currentTool = tool;
  renderView();
  $('sidebar').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------------------- progress ---------------------------- */

function startProgress(tool) {
  const el = $('progress');
  const steps = tool === 'all'
    ? ['Client ka context samajh raha hoon…', 'Client data aur market scan ho raha hai…', 'Ads aur hooks likh raha hoon…', 'Creative prompts aur code bana raha hoon…', 'Calendar, SEO aur kit assemble ho raha hai…']
    : [`${tool} module run ho raha hai…`, 'Context aur industry detect ho raha hai…', 'Output structured kiya ja raha hai…'];
  let i = 0;
  el.hidden = false;
  $('progressTitle').textContent = tool === 'all' ? 'Poora campaign ban raha hai…' : `${tool} ban raha hai…`;
  $('progressLog').textContent = steps[0];
  $('progressStep').textContent = `1 / ${steps.length}`;
  $('progressFill').style.width = '8%';
  const timer = setInterval(() => {
    i = Math.min(i + 1, steps.length - 1);
    $('progressLog').textContent = steps[i];
    $('progressStep').textContent = `${i + 1} / ${steps.length}`;
    $('progressFill').style.width = `${Math.round(((i + 1) / steps.length) * 92)}%`;
  }, 900);
  return () => { clearInterval(timer); $('progressFill').style.width = '100%'; setTimeout(() => { el.hidden = true; }, 450); };
}

/* ---------------------------- run ---------------------------- */

function payloadFor(tool) {
  return {
    tool,
    query: $('queryInput').value.trim(),
    provider: settings.provider,
    apiKey: settings.apiKey,
    language: settings.language,
    tone: settings.tone,
    goal: settings.goal,
    city: settings.city,
    offer: settings.offer,
    audience: settings.audience,
    notes: settings.notes,
    researchEnabled: settings.researchEnabled,
  };
}

function saveHistory(k) {
  const m = k.meta || {};
  const entry = { id: `h${Date.now()}${Math.floor(Math.random() * 1000)}`, brand: m.brand, query: m.query, tool: m.tool, mode: m.mode, at: new Date().toISOString(), kit: k };
  history = [entry, ...history].slice(0, 12);
  while (!persist(LS_HISTORY, history) && history.length > 1) { history = history.slice(0, -1); persist(LS_HISTORY, history); }
}

async function run(tool = 'all') {
  if (busy) return;
  const query = $('queryInput').value.trim();
  if (!query) { toast('Pehle upar client ka naam ya URL likho 🙂', 'err'); $('queryInput').focus(); return; }
  busy = true;
  const stop = startProgress(tool);
  try {
    const res = await fetch('/api/run', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadFor(tool)),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
    const fresh = data.kit;
    const sameBrand = kit.meta && kit.meta.brand === fresh.meta.brand;
    kit = tool === 'all' || !sameBrand ? { ...fresh } : { ...kit, ...fresh, meta: fresh.meta };
    applyStatus(data.status ? { status: data.status } : serverStatus);
    saveHistory(tool === 'all' ? fresh : kit);
    currentTool = tool === 'all' ? 'overview' : tool;
    renderView();
    toast(fresh.meta.mode === 'live-ai' ? `✅ Live AI kit ready: ${fresh.meta.brand}` : `✅ Kit ready: ${fresh.meta.brand} (Local Engine)`);
    if (fresh.meta.fallback) toast(fresh.meta.fallback, 'err');
    if (fresh.meta.researchNote && settings.researchEnabled) toast(fresh.meta.researchNote, 'info');
  } catch (err) {
    toast(`Run fail: ${String(err.message || err).slice(0, 180)}`, 'err');
  } finally {
    busy = false;
    stop();
  }
}

/* ---------------------------- exports ---------------------------- */

function doExport(type) {
  if (!kit.meta) { toast('Pehle ek campaign run karo', 'err'); return; }
  const name = `failureai-${slug(kit.meta.brand)}-${new Date().toISOString().slice(0, 10)}`;
  switch (type) {
    case 'json': download(`${name}.json`, JSON.stringify(kit, null, 2), 'application/json'); break;
    case 'md': download(`${name}.md`, kitToMarkdown(kit), 'text/markdown;charset=utf-8'); break;
    case 'ads': download(`${name}-ads.csv`, adsCSV(kit), 'text/csv;charset=utf-8'); break;
    case 'calendar': download(`${name}-calendar.csv`, calendarCSV(kit), 'text/csv;charset=utf-8'); break;
    case 'copy': writeClipboard(kitToText(kit)).then((ok) => toast(ok ? '⧉ Poora kit clipboard me copy ho gaya' : 'Copy fail — download try karo', ok ? 'ok' : 'err')); break;
    case 'print': window.print(); break;
    default: break;
  }
  if (type !== 'copy') toast('↓ Download shuru ho gaya');
  $('exportDrop').classList.remove('open');
}

/* ---------------------------- image render ---------------------------- */

async function handleRender(prompt, btn) {
  const concept = btn.closest('.concept');
  const preview = concept?.querySelector('.preview');
  if (!preview) return;
  const original = btn.textContent;
  btn.textContent = '⏳ Rendering…';
  btn.disabled = true;
  preview.innerHTML = '<span>AI image ban rahi hai… 10–30 sec</span>';
  const show = (src, label) => {
    preview.innerHTML = `<img src="${esc(src)}" alt="AI generated creative" />`;
    const link = document.createElement('a');
    link.href = src; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.className = 'btn-mini'; link.textContent = '↗ Open / save';
    link.style.cssText = 'position:absolute;right:8px;top:8px;z-index:4;background:rgba(0,0,0,.7);color:#fff;border:1px solid rgba(255,255,255,.3);text-decoration:none';
    preview.appendChild(link);
    toast(label);
  };
  try {
    if (serverStatus?.status?.imageGeneration) {
      const r = await fetch('/api/image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, size: '1024x1024' }) });
      const j = await r.json();
      if (j.ok && (j.image || j.url)) { show(j.image || j.url, '✅ Server-side image ready'); return; }
      toast(`Image API: ${j.error || 'fallback use kar raha hoon'}`, 'info');
    }
    const endpoint = settings.imageEndpoint.replace(/\/$/, '');
    const url = `${endpoint}/${encodeURIComponent(String(prompt).slice(0, 900))}?width=768&height=960&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
    show(url, '✦ Free image endpoint par render shuru — load hone me 10–30 sec lag sakte hain');
  } catch (err) {
    preview.innerHTML = `<span style="color:var(--pink)">Render fail: ${esc(String(err.message || err).slice(0, 100))}</span>`;
    toast('Image render fail — prompt copy karke kisi bhi image model me daalein', 'err');
  } finally {
    btn.textContent = original;
    btn.disabled = false;
  }
}

/* ---------------------------- UTM builder ---------------------------- */

function initUtmBuilder() {
  const ids = ['utmBase', 'utmSource', 'utmMedium', 'utmCampaign', 'utmContent'];
  if (!ids.every((id) => $(id))) return;
  const update = () => {
    let url;
    try {
      const u = new URL($('utmBase').value.trim() || 'https://example.com');
      [['utm_source', $('utmSource').value], ['utm_medium', $('utmMedium').value], ['utm_campaign', $('utmCampaign').value], ['utm_content', $('utmContent').value]]
        .forEach(([k, v]) => { if (v.trim()) u.searchParams.set(k, v.trim()); });
      url = u.toString();
    } catch { url = '⚠ Valid base URL daalein (https://…)'; }
    $('utmOut').textContent = url;
  };
  ids.forEach((id) => $(id).addEventListener('input', update));
  $('utmCopy')?.addEventListener('click', async () => {
    const ok = await writeClipboard($('utmOut').textContent);
    toast(ok ? '⧉ UTM link copy ho gaya' : 'Copy fail', ok ? 'ok' : 'err');
  });
  update();
}

/* ---------------------------- events ---------------------------- */

$('globalSearch').addEventListener('submit', (e) => { e.preventDefault(); run('all'); });
$('newWorkspace').addEventListener('click', () => { $('queryInput').focus(); $('queryInput').select(); });
$('quickLang').addEventListener('change', (e) => { settings.language = e.target.value; $('setLanguage').value = e.target.value; persist(LS_SETTINGS, settings); syncContext(); toast(`Language: ${e.target.value}`); });
$('hamburger').addEventListener('click', () => $('sidebar').classList.toggle('open'));
$('openSettings').addEventListener('click', openDrawer);
$('openSettingsTop').addEventListener('click', openDrawer);
$('closeSettings').addEventListener('click', closeDrawer);
$('drawerBackdrop').addEventListener('click', closeDrawer);
$('saveSettings').addEventListener('click', () => { readSettings(); closeDrawer(); syncContext(); toast('✅ Settings save ho gayi. Ab campaign run karo.'); });
$('resetSettings').addEventListener('click', () => { settings = { ...DEFAULT_SETTINGS }; persist(LS_SETTINGS, settings); fillSettings(); toast('↺ Defaults restore ho gaye', 'info'); });
$('checkConnection').addEventListener('click', async () => { await checkHealth(); toast('↻ Connection check ho gaya'); });
$('exportToggle').addEventListener('click', (e) => { e.stopPropagation(); $('exportDrop').classList.toggle('open'); });
document.addEventListener('click', (e) => { if (!e.target.closest('.export-menu')) $('exportDrop').classList.remove('open'); });

document.addEventListener('click', async (e) => {
  const t = e.target;
  const runTool = t.closest('[data-run-tool]');
  if (runTool) { run(runTool.dataset.runTool); return; }
  const quick = t.closest('[data-quick]');
  if (quick) { $('queryInput').value = quick.dataset.quick; run('all'); return; }
  const tool = t.closest('[data-tool]');
  if (tool) { setTool(tool.dataset.tool); return; }
  const exportBtn = t.closest('[data-export]');
  if (exportBtn) { doExport(exportBtn.dataset.export); return; }
  const copy = t.closest('[data-copy-id]');
  if (copy) {
    const ok = await writeClipboard(COPY.get(copy.dataset.copyId) || '');
    toast(ok ? '⧉ Clipboard me copy ho gaya' : 'Copy fail hua', ok ? 'ok' : 'err');
    return;
  }
  const dl = t.closest('[data-dl-id]');
  if (dl) {
    const name = dl.dataset.dlName || 'failureai.txt';
    const mime = name.endsWith('.json') ? 'application/json' : name.endsWith('.html') ? 'text/html' : name.endsWith('.js') ? 'text/javascript' : 'text/plain';
    download(name, COPY.get(dl.dataset.dlId) || '', mime);
    toast('↓ Download shuru');
    return;
  }
  const renderBtn = t.closest('[data-render-id]');
  if (renderBtn) { handleRender(COPY.get(renderBtn.dataset.renderId) || '', renderBtn); return; }
  const loadH = t.closest('[data-load-history]');
  if (loadH) {
    const entry = history.find((h) => h.id === loadH.dataset.loadHistory);
    if (entry) { kit = entry.kit; $('queryInput').value = entry.query || entry.brand || ''; setTool('overview'); toast(`↗ ${entry.brand} ka saved kit khul gaya`); }
    return;
  }
  const delH = t.closest('[data-del-history]');
  if (delH) { history = history.filter((h) => h.id !== delH.dataset.delHistory); persist(LS_HISTORY, history); renderView(); toast('🗑 Run delete ho gaya'); return; }
  if (t.closest('#clearHistory')) { history = []; persist(LS_HISTORY, history); renderView(); toast('🗑 History clear'); }
});

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('queryInput').focus(); $('queryInput').select(); }
  if (e.key === 'Escape') { closeDrawer(); $('exportDrop').classList.remove('open'); $('sidebar').classList.remove('open'); }
});

/* ---------------------------- boot ---------------------------- */

(async function boot() {
  fillSettings();
  renderView();
  await checkHealth();
  const params = new URLSearchParams(location.search);
  const q = params.get('q');
  if (q) {
    $('queryInput').value = q;
    if (params.get('run') === '1') run('all');
    else toast(`Query set: ${q} — Full campaign dabao`, 'info');
  }
})();
