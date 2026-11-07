/* FailureAI :: shared frontend utilities */

export const COPY = new Map();
let uid = 0;

export function esc(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((v) => esc(v)).join(', ');
  if (typeof value === 'object') return esc(JSON.stringify(value));
  return String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function txt(value, fallback = '—') {
  const s = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
  return s.trim() ? esc(s) : `<span class="dim">${esc(fallback)}</span>`;
}

function store(content, prefix) {
  const id = `${prefix}${++uid}`;
  COPY.set(id, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  return id;
}

export function copyBtn(content, label = '⧉ Copy') {
  return `<button class="btn-mini" data-copy-id="${store(content, 'c')}">${esc(label)}</button>`;
}

export function dlBtn(content, filename, label = '↓ Download') {
  const id = store(typeof content === 'string' ? content : JSON.stringify(content, null, 2), 'd');
  return `<button class="btn-mini" data-dl-id="${id}" data-dl-name="${esc(filename)}">${esc(label)}</button>`;
}

export function copyTextButton(text, label) {
  return copyBtn(text, label);
}

export function renderBtn(prompt, label = '✦ Render image') {
  return `<button class="btn-mini" data-render-id="${store(prompt, 'r')}">${esc(label)}</button>`;
}

export function chips(items = [], cls = '') {
  if (!Array.isArray(items) || !items.length) return '<span class="dim">—</span>';
  return `<div class="chips">${items.map((i) => `<span class="chip ${cls}">${esc(i)}</span>`).join('')}</div>`;
}

export function bullets(items = []) {
  if (!Array.isArray(items) || !items.length) return '<span class="dim">—</span>';
  return `<ul class="clean">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
}

export function kv(rows = {}) {
  return `<dl class="kv">${Object.entries(rows).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
}

export function toast(message, kind = 'ok') {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = `toast ${kind === 'ok' ? '' : kind}`;
  el.textContent = String(message).slice(0, 260);
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(20px)'; }, 3600);
  setTimeout(() => el.remove(), 4100);
}

export async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
    return ok;
  }
}

export function download(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* -------------------- exports -------------------- */

function mdValue(value, depth = 0) {
  const pad = '  '.repeat(depth);
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    if (!value.length) return `${pad}- _(empty)_\n`;
    return value.map((item) => {
      if (typeof item === 'object' && item !== null) return `${pad}-\n${mdValue(item, depth + 1)}`;
      return `${pad}- ${String(item).replace(/\n/g, ' ')}\n`;
    }).join('');
  }
  if (typeof value === 'object') {
    return Object.entries(value).map(([k, v]) => {
      if (typeof v === 'object' && v !== null) return `${pad}- **${k}**\n${mdValue(v, depth + 1)}`;
      return `${pad}- **${k}:** ${String(v ?? '').replace(/\n/g, ' ')}\n`;
    }).join('');
  }
  return `${pad}${String(value).replace(/\n/g, '\n' + pad)}\n`;
}

const SECTION_TITLES = {
  intel: 'Client Intelligence & Data Sheet',
  ads: 'Ad Factory — Copy, Variants & Tests',
  creative: 'Creative Studio — Image Prompts & Video',
  code: 'Code & Tracking Lab',
  prompts: 'Prompt Library & Agent System Prompt',
  calendar: '30-Day Content Calendar & KPIs',
  seo: 'SEO Pack',
};

export function kitToMarkdown(kit = {}) {
  const meta = kit.meta || {};
  const lines = [
    `# FailureAI Campaign Kit — ${meta.brand || 'Client'}`,
    '',
    `> ${meta.query || ''} · ${meta.industry || ''} · ${meta.city || ''} · ${meta.language || ''} / ${meta.tone || ''} / ${meta.goal || ''}`,
    `> Generated: ${meta.generatedAt || new Date().toISOString()} · Mode: ${meta.mode || 'local'}${meta.provider ? ` (${meta.provider} / ${meta.model})` : ''}`,
    '',
  ];
  for (const [key, title] of Object.entries(SECTION_TITLES)) {
    if (!kit[key]) continue;
    lines.push(`---`, '', `## ${title}`, '');
    lines.push(mdValue(kit[key], 0));
    lines.push('');
  }
  if (meta.note) lines.push('---', '', `> Note: ${meta.note}`, '');
  if (meta.fallback) lines.push(`> Fallback: ${meta.fallback}`, '');
  lines.push('---', '', '_Built with FailureAI — ek search, poora campaign._');
  return lines.join('\n');
}

export function kitToText(kit) { return kitToMarkdown(kit); }

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;

export function adsCSV(kit = {}) {
  const rows = [['Platform', 'Variant', 'Angle', 'Hook', 'Primary text', 'Headline', 'Description', 'CTA', 'Hashtags']];
  for (const p of kit?.ads?.platforms || []) {
    for (const v of p.variants || []) {
      rows.push([p.name, v.name, v.angle, v.hook, v.primaryText, v.headline, v.description, v.cta, (v.hashtags || []).join(' ')]);
    }
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

export function calendarCSV(kit = {}) {
  const rows = [['Week', 'Day', 'Channel', 'Format', 'Idea', 'Caption', 'CTA', 'Hashtags', 'Funnel stage']];
  for (const w of kit?.calendar?.weeks || []) {
    for (const p of w.posts || []) {
      rows.push([w.week, p.day, p.channel, p.format, p.idea, p.caption, p.cta, (p.hashtags || []).join(' '), p.funnelStage]);
    }
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

export function slug(s) { return String(s || 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50); }

export function timeAgo(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'abhi';
  if (sec < 3600) return `${Math.floor(sec / 60)} min pehle`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} ghante pehle`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
