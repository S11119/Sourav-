/**
 * FailureAI :: Local Engine
 * Produces a complete, structured digital-marketing campaign kit from a single
 * query. Deterministic + offline. This is the guaranteed-working baseline:
 * the Live AI layer (server/providers.js) upgrades the exact same JSON shape.
 */

import {
  COPY_BANK, IDEA_BANK, INDUSTRIES, TOOLS,
  pick, pickN, tpl, slugify, hash,
} from './data.js';

const clean = (s) => String(s).replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '').slice(0, 24) || 'Brand';

function vars(ctx) {
  const bank = COPY_BANK[ctx.language];
  const pain = pick(ctx.preset.pains, ctx.seed);
  const pain2 = pick(ctx.preset.pains, ctx.seed + 7);
  const desire = pick(ctx.preset.desires, ctx.seed + 3);
  return {
    brand: ctx.brand,
    city: ctx.city,
    industry: ctx.industry,
    pain, pain2, desire,
    offer: ctx.offer,
    usp: pick(ctx.preset.usp, ctx.seed + 11),
    goal: ctx.goal,
    url: ctx.url || `https://${slugify(ctx.brand)}.com`,
    tone: ctx.tone,
    notes: ctx.notes,
    brandclean: clean(ctx.brand),
    industryclean: clean(ctx.industry.split(' ')[0]),
    cityclean: clean(ctx.city),
    _bank: bank,
  };
}

function T(str, v) {
  return tpl(str, v);
}

/* ------------------------------------------------------------------ */
/* 1. Client intelligence / data extraction                            */
/* ------------------------------------------------------------------ */

function buildIntel(ctx) {
  const v = vars(ctx);
  const s = ctx.seed;
  const p = ctx.preset;
  const segments = p.audience.length ? p.audience : INDUSTRIES.generic.audience.concat([
    { segment: 'Budget-conscious researchers', pains: p.pains, desires: p.desires },
    { segment: 'Ready-to-buy high intent', pains: p.pains, desires: p.desires },
  ]);
  const keywords = {
    primary: p.primary.map((k) => T(k, v)),
    secondary: p.secondary.map((k) => T(k, v)),
    longTail: p.longTail.map((k) => T(k, v)).concat([
      `${slugify(ctx.brand).replace(/-/g, ' ')} reviews and pricing in ${ctx.city}`,
      `is ${ctx.industry} worth it for small teams in ${ctx.city}`,
      `${ctx.brand} vs alternatives comparison 2026`,
    ]),
    negative: p.negative,
  };
  const sources = ctx.research.length ? ctx.research : [];
  return {
    brand: ctx.brand,
    website: ctx.url || '(URL nahi mila — niche daalein)',
    industry: ctx.industry,
    market: ctx.city,
    oneLinePositioning: T(`${ctx.brand} helps ${'{city}'} customers get ${'{desire}'} without ${'{pain}'} — ${'{usp}'}.`, v),
    summary: [
      `${ctx.brand} ke liye ${ctx.industry} category me ek ${ctx.goal}-focused snapshot taiyaar hai.`,
      `Core friction: ${v.pain}. Core desire: ${v.desire}.`,
      ctx.research.length
        ? `${ctx.research.length} live web sources scan kiye gaye aur niche diye gaye hain.`
        : 'Local Engine mode: structured brief banaya gaya hai; live sources ke liye Settings me Search API key daalein.',
      ctx.notes ? `Extra context: ${ctx.notes}` : 'Tip: "Notes" me pricing, USP ya competitor naam daalein to output aur tezz hoga.',
    ].join(' '),
    leadSheet: {
      company: ctx.brand,
      website: ctx.url || '—',
      industry: ctx.industry,
      location: ctx.city,
      stage: ctx.goal === 'awareness' ? 'Discovery' : 'Consideration → Decision',
      decisionMakers: ['Founder / Owner', 'Marketing Head / Manager', 'Sales / Ops lead'],
      enrichmentChecklist: [
        'Google Business Profile + review count / rating',
        'Website tech stack, page speed, top 3 landing pages',
        'Active ad platforms (Meta Ad Library, Google Ads Transparency)',
        'Social handles, posting frequency, last 10 posts',
        'Pricing / offer structure aur competitor comparison',
        'Contact: email, WhatsApp, phone, decision-maker name',
      ],
      dataGaps: ctx.url ? [] : ['Website URL missing', 'Current ad spend / CAC unknown', 'Past 90-day lead volume unknown'],
    },
    audience: segments.map((a, i) => ({
      segment: a.segment,
      pains: pickN(a.pains, 3, s + i * 13),
      desires: pickN(a.desires, 3, s + i * 17),
      messageAngle: T(pick(COPY_BANK[ctx.language].hooks, s + i * 5), v),
      funnelStage: ['Awareness', 'Consideration', 'Decision'][i % 3],
    })),
    swot: {
      strengths: [
        `Clear, single-category focus: ${ctx.industry}`,
        T('{usp}', v),
        `Local relevance in ${ctx.city} (fast trust, easy proof)`,
      ],
      weaknesses: [
        'Online proof (reviews / case studies) scattered ya incomplete',
        'Ek hi clear CTA aur tracking setup ki kami',
        'Content cadence inconsistent — authority build nahi hoti',
      ],
      opportunities: [
        `High-intent local search: "${T(pick(p.primary, s + 2), v)}"`,
        'Short-form video me competitor gap — low effort, high reach',
        'Existing leads / customers ka re-engagement (cheapest revenue)',
      ],
      threats: [
        'Aggregators / discount players price anchor todte hain',
        'Ad costs seasonally badhte hain bina first-party data ke',
        'Generic copy → sab brand ek jaise lagte hain',
      ],
    },
    competitors: p.competitors.map((name, i) => ({
      name: String(name).trim(),
      angle: pick(['Price / discounts', 'Scale & brand recall', 'Niche authority', 'Convenience & speed'], s + i * 3),
      gap: pick(['No local proof', 'Slow response time', 'Generic creative', 'No transparent pricing', 'Weak follow-up'], s + i * 7),
      yourCounter: pick(p.usp, s + i * 11),
    })),
    keywords,
    channels: p.channels.map((c) => ({ ...c, firstAction: T(pick(p.quickWins, s + c.name.length), v) })),
    quickWins: pickN(p.quickWins, 6, s + 4),
    discoveryQuestions: [
      'Pichhle 90 din me sabse zyada qualified lead kahan se aayi?',
      'Ek customer banne me kitne touchpoints aur kitne din lagte hain?',
      'Aapka #1 objection kya hai — price, trust, ya timing?',
      'Kaunsa offer sabse zyada convert karta hai aur kyun?',
      'Ad spend ka current CAC / ROAS kya hai (approx)?',
      'Kis competitor ko aap sabse zyada mention sunte hain?',
    ],
    outreach: {
      subject: T(COPY_BANK[ctx.language].outreachSubject, v),
      body: T(COPY_BANK[ctx.language].outreachBody, v),
      followUps: [
        T('Quick nudge: {brand} ke liye woh 1-page audit ready hai. Bhejoon?', v),
        T('Last one from my side — {pain} par 2-line fix note kar diya hai. Chahiye?', v),
      ],
    },
    sources,
    sourcesNote: sources.length
      ? `${sources.length} live sources niche listed hain. Claims ko publish se pehle verify karein.`
      : 'Live web research off hai. Settings → "Live web research" on karein ya Search API key set karein (README).',
  };
}

/* ------------------------------------------------------------------ */
/* 2. Ad factory                                                       */
/* ------------------------------------------------------------------ */

function variantFor(ctx, v, platform, i) {
  const bank = COPY_BANK[ctx.language];
  const s = ctx.seed + hash(platform) + i * 23;
  return {
    name: `${platform} · Variant ${i === 0 ? 'A' : 'B'}`,
    angle: pick(['Problem-first', 'Desire-first', 'Proof-first', 'Offer-first'], s),
    hook: T(pick(bank.hooks, s), v),
    primaryText: T(pick(bank.primary, s + 3), v),
    headline: T(pick(bank.headlines, s + 5), v).slice(0, 40),
    description: T(pick(bank.descriptions, s + 9), v).slice(0, 90),
    cta: pick(bank.ctas, s + 13),
    hashtags: bank.hashtags.map((h) => T(h, v)).slice(0, 4),
  };
}

function buildAds(ctx) {
  const v = vars(ctx);
  const s = ctx.seed;
  const bank = COPY_BANK[ctx.language];
  const platforms = [
    { name: 'Meta & Instagram', objective: ctx.goal === 'sales' ? 'Conversions / Sales' : 'Leads (Instant Forms + WhatsApp)', budgetPct: 40, placements: 'Feed, Reels, Stories, Advantage+', targeting: `Interest + lookalike, 15–25 km radius around ${ctx.city}` },
    { name: 'Google Search', objective: 'High-intent leads', budgetPct: 30, placements: 'Search + PMax (small budget)', targeting: `Exact/phrase high-intent keywords, ${ctx.city} radius, negative keywords on` },
    { name: 'YouTube / Reels', objective: 'Awareness → retargeting pool', budgetPct: 15, placements: 'Shorts + in-feed 15s', targeting: 'Custom audience: site visitors + 50% video viewers' },
    { name: 'LinkedIn / Email', objective: ctx.industryKey === 'saas' ? 'Qualified B2B pipeline' : 'Authority & partnerships', budgetPct: 10, placements: 'Single image + document ads / newsletter', targeting: 'Job titles, company size, 1st-degree lookalikes' },
    { name: 'Retargeting (all)', objective: 'Close the warm audience', budgetPct: 5, placements: 'DPA / dynamic + WhatsApp sequence', targeting: 'Site visitors 30d, engagers 90d, abandoned leads' },
  ];
  return {
    strategy: T(`${'{brand}'} ke liye ${'{goal}'} par focus: 70% budget proven intent channels (Meta + Search), 20% demand creation, 10% retargeting. Pehle 7 din 2 hooks × 2 creatives test karo, phir winner ko 3x scale karo. Har variant ka ek hi CTA: ${'{offer}'}.`, v),
    budgetSplit: platforms.map((p) => ({ platform: p.name, pct: p.budgetPct })),
    platforms: platforms.map((p) => ({ ...p, variants: [variantFor(ctx, v, p.name, 0), variantFor(ctx, v, p.name, 1)] })),
    hooks: pickN(bank.hooks, 6, s + 2).map((h) => T(h, v)),
    ctas: bank.ctas,
    googleAds: {
      adGroup: `${ctx.brand} · High Intent · ${ctx.city}`,
      headlines: pickN(bank.headlines, 5, s + 8).map((h) => T(h, v).slice(0, 30)),
      descriptions: pickN(bank.descriptions, 3, s + 12).map((d) => T(d, v).slice(0, 90)),
      negativeKeywords: ctx.preset.negative,
    },
    abTests: [
      { name: 'Hook test', hypothesis: 'Problem-first hook, desire-first se zyada CTR dega', variantA: 'Problem-first (Variant A)', variantB: 'Desire-first (Variant B)', metric: 'CTR (link) after 1,000 impressions' },
      { name: 'CTA test', hypothesis: `“${pick(bank.ctas, s)}” vs “${pick(bank.ctas, s + 4)}”`, variantA: pick(bank.ctas, s), variantB: pick(bank.ctas, s + 4), metric: 'Cost per lead' },
      { name: 'Landing page test', hypothesis: 'Single CTA above fold > long form', variantA: 'Short hero + WhatsApp button', variantB: 'Long form + 6 fields', metric: 'Lead → qualified %' },
    ],
    landingPage: {
      headline: T(pick(bank.headlines, s + 21), v),
      subhead: T('{desire} — bina {pain} ke. {usp}.', v),
      bullets: ctx.preset.usp.slice(0, 4),
      cta: pick(bank.ctas, s + 2),
      trustRow: ['500+ customers', '4.8★ average rating', 'Secure & transparent', 'Response in 5 min'],
    },
    compliance: [
      'Har claim ko proof / disclaimer ke saath rakho (numbers, testimonials, certifications).',
      'Health, finance ya education claims me platform-specific policy check karo.',
      'Before/after images ke liye written consent rakho.',
      'Prices, deadlines aur "limited" offers actual inventory se match karo.',
    ],
    disclaimer: bank.disclaimer,
  };
}

/* ------------------------------------------------------------------ */
/* 3. Creative + image prompts                                         */
/* ------------------------------------------------------------------ */

function buildCreative(ctx) {
  const v = vars(ctx);
  const s = ctx.seed;
  const vis = ctx.preset.visual;
  const ratios = ['4:5 (feed)', '9:16 (story/reel)', '1:1 (carousel)', '16:9 (YouTube / display)'];
  const names = ['Hero · Problem → Solution', 'Proof · Real Result', 'Offer · Deadline Creative', 'Brand · Trust & People'];
  const concepts = names.map((name, i) => {
    const subject = pick(vis.subjects, s + i * 7);
    const palette = [vis.palette[i % vis.palette.length], vis.palette[(i + 1) % vis.palette.length], vis.palette[2 % vis.palette.length]];
    const imagePrompt = [
      `Professional advertising photograph for ${ctx.brand}, a ${ctx.industry} brand in ${ctx.city}.`,
      `Subject: ${subject}. ${vis.direction}.`,
      `Composition: ${ratios[i]}, generous clean negative space in the upper third for bold headline text, rule of thirds, sharp focus, subtle depth of field.`,
      `Colour palette: ${palette.join(', ')}. Lighting: cinematic, high dynamic range, natural skin tones, no harsh flash.`,
      `Mood: ${ctx.tone}, trustworthy, premium, modern Indian market, authentic not stocky.`,
      'No text, no letters, no logos, no watermarks, no distorted hands, no extra limbs, no clutter.',
      `Model hint: --ar ${ratios[i].split(' ')[0]} --style raw --v 6 (Midjourney). SDXL equivalent: photorealistic, 8k, high detail, sharp focus.`,
    ].join(' ');
    return {
      name,
      ratio: ratios[i],
      artDirection: `${vis.direction} · ${subject}`,
      imagePrompt,
      negativePrompt: 'text, letters, logo, watermark, blurry, low quality, distorted hands, extra fingers, oversaturated, cluttered background, stock photo cliche, fake smile',
      overlayText: T(pick(COPY_BANK[ctx.language].headlines, s + i * 9), v),
      supportingLine: T(pick(COPY_BANK[ctx.language].descriptions, s + i * 5), v),
      cta: pick(COPY_BANK[ctx.language].ctas, s + i * 3),
      palette,
      aspectHint: `--ar ${ratios[i].split(' ')[0]} --style raw --v 6.0`,
    };
  });
  return {
    brandKit: {
      voice: `${ctx.tone} · ${ctx.language} · short sentences, proof over adjectives`,
      palette: vis.palette.map((hex, i) => ({ hex, use: ['Primary accent', 'Secondary accent', 'Base / text', 'Surface'][i % 4] })),
      fonts: ['Plus Jakarta Sans / Inter (UI & headlines)', 'Noto Sans Devanagari (Hindi copy)', 'Space Grotesk (numbers / data)'],
      logoIdea: `${ctx.brand} wordmark with a single ${vis.palette[0]} accent — ek "F" jo aage badhta hua arrow banta ho. Minimal, 1 colour, legible at 24px.`,
      doList: ['Real customers & real light', 'Ek hi focal point per creative', 'High contrast text overlay'],
      dontList: ['Stock handshakes', '5 alag CTA ek hi image me', 'Generic gradient + buzzwords'],
    },
    concepts,
    videoScript: {
      duration: '20–25 sec',
      hook: T(pick(COPY_BANK[ctx.language].hooks, s + 31), v),
      scenes: [
        { time: '0–3s', visual: `Fast close-up: ${vis.subjects[0]}`, voiceover: T(pick(COPY_BANK[ctx.language].hooks, s), v) },
        { time: '3–9s', visual: 'Show the friction / problem in one relatable shot', voiceover: T('{pain} — sabne face kiya hai.', v) },
        { time: '9–16s', visual: `${ctx.brand} solution + proof number on screen`, voiceover: T('{brand} me {usp}, isliye {desire}.', v) },
        { time: '16–22s', visual: 'Offer card with deadline + CTA button', voiceover: T('{offer} — {cta}.', { ...v, cta: pick(COPY_BANK[ctx.language].ctas, s + 2) }) },
      ],
      cta: pick(COPY_BANK[ctx.language].ctas, s + 2),
      captionStyle: 'Burned-in captions, 2 lines max, high contrast, brand accent on the number',
    },
    renderNote: 'Images ke liye: "Render image" dabao (free Pollinations endpoint), ya prompt copy karke Midjourney / DALL·E / SDXL / Ideogram me daalo. IMAGE_API_KEY set ho to server-side generation bhi available hai.',
  };
}

/* ------------------------------------------------------------------ */
/* 4. Code & tracking lab                                              */
/* ------------------------------------------------------------------ */

function buildCode(ctx) {
  const v = vars(ctx);
  const campaign = slugify(`${ctx.brand}-${ctx.goal}-launch`);
  const safeBrand = ctx.brand.replace(/["<>]/g, '');
  const site = v.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const files = [
    {
      name: 'meta-pixel-and-events.html',
      language: 'html',
      purpose: 'Paste in <head>. PageView + Lead event — ad attribution ke liye minimum setup.',
      code: [
        '<!-- FailureAI · Meta Pixel base + Lead event | Replace PIXEL_ID -->',
        '<script>',
        "  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?",
        '  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;',
        "  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;",
        "  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}",
        "  (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');",
        "  fbq('init', 'PIXEL_ID');",
        "  fbq('track', 'PageView');",
        '  document.addEventListener("submit", function (e) {',
        "    if (e.target.matches('.lead-form')) fbq('track', 'Lead');",
        '  });',
        '</script>',
        `<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=PIXEL_ID&ev=PageView&noscript=1" alt="" /></noscript>`,
      ].join('\n'),
    },
    {
      name: 'ga4-events.js',
      language: 'javascript',
      purpose: 'GA4 custom events: cta_click, lead_submit, whatsapp_click. gtag load hone ke baad add karein.',
      code: [
        '// FailureAI · GA4 conversion events',
        `export const CAMPAIGN = ${JSON.stringify(campaign)};`,
        'export function track(name, params = {}) {',
        '  if (typeof window === "undefined" || typeof window.gtag !== "function") return;',
        '  window.gtag("event", name, { campaign: CAMPAIGN, ...params });',
        '}',
        "document.addEventListener('click', (e) => {",
        "  const el = e.target.closest('[data-cta]');",
        "  if (el) track('cta_click', { label: el.textContent.trim().slice(0, 60), location: location.pathname });",
        "  if (e.target.closest('a[href*=\\'wa.me\\']')) track('whatsapp_click');",
        '});',
        'document.addEventListener("submit", (e) => {',
        "  if (e.target.matches('.lead-form')) track('lead_submit', { form_id: e.target.id || 'hero' });",
        '});',
      ].join('\n'),
    },
    {
      name: 'utm-builder.js',
      language: 'javascript',
      purpose: 'Har ad ke liye unique tracking link. Browser me bhi chalao, Node me bhi.',
      code: [
        '// FailureAI · UTM link builder',
        'export function utm({ base, source, medium, campaign, content, term }) {',
        '  const u = new URL(base);',
        "  Object.entries({ utm_source: source, utm_medium: medium, utm_campaign: campaign, utm_content: content, utm_term: term })",
        '    .forEach(([k, val]) => { if (val) u.searchParams.set(k, val); });',
        '  return u.toString();',
        '}',
        '// Example:',
        `console.log(utm({ base: ${JSON.stringify(v.url)}, source: 'meta', medium: 'paid_social', campaign: ${JSON.stringify(campaign)}, content: 'variant-a-reel' }));`,
      ].join('\n'),
    },
    {
      name: 'schema-localbusiness.json',
      language: 'json',
      purpose: 'Local SEO ke liye structured data — <script type="application/ld+json"> me daalein.',
      code: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': ctx.industryKey === 'saas' ? 'SoftwareApplication' : 'LocalBusiness',
        name: safeBrand,
        url: v.url,
        description: T('{brand} — {desire} in {city}, without {pain}.', v),
        areaServed: ctx.city,
        aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: '120' },
      }, null, 2).replace('"4.8"', '"__VERIFY_RATING__"').replace('"120"', '"__VERIFY_REVIEW_COUNT__"'),
    },
    {
      name: 'landing-hero.html',
      language: 'html',
      purpose: 'Single-CTA hero section — ad click ke baad yahin land karna chahiye.',
      code: [
        `<section class="hero" data-campaign="${campaign}">`,
        `  <p class="eyebrow">${T('{industry} · {city}', v)}</p>`,
        `  <h1>${T(pick(COPY_BANK[ctx.language].headlines, ctx.seed + 21), v).replace(/[<>&]/g, '')}</h1>`,
        `  <p class="sub">${T('{desire} — bina {pain} ke. {usp}.', v).replace(/[<>&]/g, '')}</p>`,
        `  <a class="btn" data-cta href="https://wa.me/91XXXXXXXXXX?text=${encodeURIComponent(T('Hi {brand}, mujhe {offer} chahiye', v))}">${pick(COPY_BANK[ctx.language].ctas, ctx.seed + 2)}</a>`,
        '  <ul class="trust"><li>500+ customers</li><li>4.8★ rating</li><li>Response in 5 min</li></ul>',
        '</section>',
        '<style>.hero{max-width:720px;margin:0 auto;padding:64px 20px;text-align:center;font-family:system-ui}.eyebrow{letter-spacing:.12em;text-transform:uppercase;opacity:.7}h1{font-size:clamp(2rem,6vw,4rem);line-height:1.05}.sub{font-size:1.15rem;opacity:.8}.btn{display:inline-block;padding:14px 28px;border-radius:999px;background:#B8FF3C;color:#0B0D12;font-weight:700;text-decoration:none}.trust{list-style:none;display:flex;gap:18px;justify-content:center;padding:0;opacity:.7;font-size:.9rem}</style>',
      ].join('\n'),
    },
    {
      name: 'whatsapp-followup.txt',
      language: 'text',
      purpose: 'Lead aate hi 0h / 24h / 72h par bhejne wale 3 messages (copy-paste ready).',
      code: [
        `[0h] ${T('Hi! {brand} se. Aapne {offer} ke liye request ki — main yahin hoon. Ek sawaal: {pain} ya {pain2}, kaunsa zyada pareshan kar raha hai?', v)}`,
        `[24h] ${T('Quick update: {desire} ke liye hum {usp} use karte hain. 2-min me slot confirm kar dein?', v)}`,
        `[72h] ${T('Last message from {brand} 🙂 Agar abhi timing sahi nahi hai, no problem — yahan free checklist hai: bit ly / audit. Chahein tab reply kar dijiye.', v)}`,
      ].join('\n\n'),
    },
  ];
  return {
    files,
    utm: {
      source: 'meta', medium: 'paid_social', campaign,
      content: 'variant-a-reel', term: slugify(ctx.industry.split(' ')[0]),
      exampleUrl: `${v.url.replace(/\/$/, '')}/?utm_source=meta&utm_medium=paid_social&utm_campaign=${campaign}&utm_content=variant-a-reel`,
    },
    measurementChecklist: [
      'Pixel + GA4 dono par test event fire karke verify karo (Meta Test Events / GA4 DebugView).',
      'Har ad variant ka alag utm_content — warna A/B result mix ho jayega.',
      'CRM me utm_source/campaign save karo, sirf lead count nahi.',
      'Server-side / Conversions API add karo jab budget aur volume allow kare.',
      `Weekly dashboard: ${ctx.preset.kpis.join(' · ')}.`,
    ],
    stack: ['Node 18+ / static HTML', 'No build step', 'Meta Pixel', 'GA4', 'WhatsApp Click-to-Chat', 'JSON-LD'],
  };
}

/* ------------------------------------------------------------------ */
/* 5. Prompt library                                                   */
/* ------------------------------------------------------------------ */

function buildPrompts(ctx) {
  const v = vars(ctx);
  const q = ctx.brand;
  return {
    systemPrompt: [
      `You are FailureAI, a senior digital marketing strategist for ${q} (${ctx.industry}, ${ctx.city}).`,
      `Audience language: ${ctx.language}. Tone: ${ctx.tone}. Primary goal: ${ctx.goal}.`,
      'Always output: a clear recommendation, the reasoning in 2 lines, an executable artifact (copy, code, or prompt), and one measurable KPI.',
      'Never invent facts, numbers, testimonials, or certifications. Mark assumptions explicitly. Give short, concrete answers.',
    ].join(' '),
    prompts: [
      {
        title: 'Client Deep-Research Prompt',
        category: 'Research',
        prompt: `Act as a market researcher. Build a client brief for ${q} (${ctx.industry}, ${ctx.city}). Cover: 3 audience segments with pains/desires, SWOT, 3 competitor archetypes and their gaps, 10 search keywords split by intent, 5 channel recommendations with why, and 8 discovery questions I should ask the client. Separate "verified fact" from "assumption". Return a compact table + bullets.`,
        tip: 'Live web research on ho to sources bhi maango, aur har claim ke saath URL.',
      },
      {
        title: 'High-Converting Ad Copy Prompt',
        category: 'Ads',
        prompt: `Write 5 ad variants for ${q}: goal ${ctx.goal}, tone ${ctx.tone}, language ${ctx.language}, offer "${ctx.offer}", core pain "${v.pain}", core desire "${v.desire}". Each variant: hook (≤12 words), primary text (≤90 words), headline (≤30 chars), description, CTA, and 3 hashtags. Include 2 angles: problem-first and proof-first. No fake statistics. Add 3 A/B test hypotheses with the metric to watch.`,
        tip: 'Meta 30-char headline aur Google 30-char headline limit yaad rakho.',
      },
      {
        title: 'Image Generation Prompt (Midjourney / SDXL)',
        category: 'Creative',
        prompt: `Create 4 distinct image prompts for ${q} ad creatives. For each: subject, composition and aspect ratio, lighting, colour palette (hex), mood, negative prompt, and reserved empty space for headline text. Direction: ${ctx.preset.visual.direction}. No text or logos in the image. Append Midjourney parameters and an SDXL equivalent.`,
        tip: 'Creative Studio me bane prompts ko seedha "Render image" se test karo.',
      },
      {
        title: '30-Day Content Calendar Prompt',
        category: 'Planning',
        prompt: `Build a 4-week content calendar for ${q}: 5 posts/week across Instagram, Meta, LinkedIn, Website, WhatsApp. Columns: day, channel, format, idea, caption (in ${ctx.language}), CTA, hashtags, and the funnel stage (Awareness / Consideration / Decision). Balance 40% education, 30% proof, 20% offer, 10% brand. End with 4 KPIs and a weekly review ritual.`,
        tip: 'Har week ka ek "hero" post fix karo, baaki usi ke around reuse karo.',
      },
      {
        title: 'SEO + Local Search Prompt',
        category: 'SEO',
        prompt: `For ${q} (${ctx.industry}, ${ctx.city}), write: meta title (≤60 chars), meta description (≤155), URL slug, 5 blog titles mapped to search intent, 4 FAQ Q&As, an internal linking plan, and JSON-LD schema type recommendation. Prioritise long-tail high-intent queries. No keyword stuffing.`,
        tip: 'FAQ schema directly landing page me daalne se SERP me extra space milta hai.',
      },
      {
        title: 'Cold Outreach / DM Prompt',
        category: 'Sales',
        prompt: `Write a 3-touch outreach sequence for ${q} targeting ${ctx.industry} decision-makers in ${ctx.city}. Touch 1: one observed gap + one useful insight (no pitch), touch 2: a free 1-page audit, touch 3: polite close-the-loop. Each ≤70 words, language ${ctx.language}, with subject lines. Do not claim results you cannot prove.`,
        tip: 'Intel section me ready-made outreach email bhi milta hai — usi ko personalise karo.',
      },
      {
        title: 'Tracking & Analytics Code Prompt',
        category: 'Code',
        prompt: `Generate production-ready tracking snippets for ${q}: Meta Pixel base + Lead event, GA4 custom events (cta_click, lead_submit, whatsapp_click), a UTM builder function, and JSON-LD structured data. Use vanilla JS + HTML, no frameworks. Explain where to paste each snippet and how to verify with Test Events / DebugView.`,
        tip: 'Code & Prompt Lab me ye snippets pehle se generate hoke milte hain.',
      },
      {
        title: 'Weekly Report / Optimisation Prompt',
        category: 'Reporting',
        prompt: `Here are my last 7 days of campaign data for ${q}: [PASTE spend, impressions, CTR, CPC, leads, CPL, conversions, ROAS]. Diagnose the weakest funnel stage, give 3 specific actions for next week (with expected impact and effort), 2 tests to launch, 1 thing to pause, and a 5-line client-ready summary in ${ctx.language}. Flag any data that looks wrong.`,
        tip: 'Har Monday same prompt chalao — decisions comparable ho jate hain.',
      },
    ],
    workflow: [
      '1 · Search me client ka naam / URL daalo → Full Campaign run karo',
      '2 · Client Intel me gaps verify karo, notes update karke dobara run karo',
      '3 · Ad Factory se 2 variants chuno → Creative Studio me unka visual banao',
      '4 · Code Lab se pixel + UTM lagao (launch se pehle, hamesha)',
      '5 · Calendar follow karo, har Monday reporting prompt se optimise karo',
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 6. 30-day calendar                                                  */
/* ------------------------------------------------------------------ */

function buildCalendar(ctx) {
  const v = vars(ctx);
  const s = ctx.seed;
  const bank = COPY_BANK[ctx.language];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const weeks = [1, 2, 3, 4].map((w) => ({
    week: w,
    theme: ['Foundation & awareness', 'Proof & trust', 'Offer & conversion', 'Retarget & referral'][w - 1],
    focusKpi: ctx.preset.kpis[(w - 1) % ctx.preset.kpis.length],
    posts: Array.from({ length: 5 }, (_, d) => {
      const idea = IDEA_BANK[(s + (w - 1) * 5 + d) % IDEA_BANK.length];
      return {
        day: `Week ${w} · ${dayNames[d]}`,
        channel: idea.channel,
        format: idea.format,
        idea: T(idea.idea, v),
        caption: T(pick(bank.hooks, s + w * 17 + d * 3), v) + ' ' + T(pick(bank.descriptions, s + w * 5 + d), v),
        cta: pick(bank.ctas, s + w * 7 + d),
        hashtags: pickN(bank.hashtags, 3, s + w + d),
        funnelStage: w === 1 ? 'Awareness' : w === 2 ? 'Consideration' : w === 3 ? 'Decision' : 'Retention',
      };
    }),
  }));
  return {
    theme: T('{brand} · 30-day {goal} sprint in {city}', v),
    cadence: '5 posts/week · 1 weekly review · 2 paid tests/week',
    mix: { education: '40%', proof: '30%', offer: '20%', brand: '10%' },
    weeks,
    budget: [
      { bucket: 'Paid acquisition', pct: 60, note: 'Meta + Google, only after pixel verification' },
      { bucket: 'Creative production', pct: 20, note: '4 concepts × 2 variants, 1 shoot / month' },
      { bucket: 'Content & SEO', pct: 10, note: '2 long-tail articles / month' },
      { bucket: 'Tools & testing reserve', pct: 10, note: 'Landing page tests, research credits' },
    ],
    kpis: ctx.preset.kpis.map((k) => ({ name: k, target: 'Baseline week 1 → +20% by week 4', cadence: 'Weekly' })),
    weeklyRitual: [
      'Monday: pichhle week ka data pull karo, weakest funnel stage mark karo',
      'Tuesday: 2 new hooks + 1 new creative launch karo',
      'Wednesday: losers pause karo (clear threshold pehle set karo)',
      'Thursday: winner ka budget 20–30% badhao, sudden 3x nahi',
      'Friday: 5-line client summary + next week ka plan bhejo',
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 7. SEO pack                                                         */
/* ------------------------------------------------------------------ */

function buildSeo(ctx) {
  const v = vars(ctx);
  const kws = ctx.preset.primary.map((k) => T(k, v));
  return {
    metaTitle: `${ctx.brand} — ${T('{desire} in {city}', v)} | ${ctx.industry}`.slice(0, 60),
    metaDescription: T('{brand}: {usp}. {desire} without {pain}. {offer} — book a free consultation in {city} today.', v).slice(0, 158),
    slug: slugify(`${ctx.brand}-${ctx.industry}-${ctx.city}`),
    h1: T('{desire}, bina {pain} ke — {city} me {brand}', v),
    primaryKeyword: kws[0],
    secondaryKeywords: kws.slice(1).concat(ctx.preset.secondary.slice(0, 3).map((k) => T(k, v))),
    schemaType: ctx.industryKey === 'saas' ? 'SoftwareApplication' : 'LocalBusiness + FAQPage',
    blogTitles: ctx.preset.longTail.map((k) => T(k, v)).concat([
      `${ctx.brand} vs alternatives: ek honest comparison (2026)`,
      `${ctx.city} me ${ctx.industry} choose karne se pehle 7 sawaal`,
      `Cost of ${ctx.industry} in ${ctx.city}: real numbers, no surprises`,
    ]),
    faqs: [
      { q: `${ctx.brand} kya offer karta hai?`, a: T('{brand} {city} me {industry} services deta hai, jisme {usp} aur {offer} shaamil hai.', v) },
      { q: 'Price / cost kya hai?', a: 'Exact pricing scope par depend karti hai. Transparent quote ke liye free consultation book karein — koi hidden charge nahi.' },
      { q: 'Kitne time me result milta hai?', a: 'Quick wins (tracking, profile, offers) 7 din me; paid acquisition ka stable baseline 2–4 weeks me. Hum koi guaranteed number nahi bolte.' },
      { q: `${ctx.city} me service available hai?`, a: T('Haan, {brand} {city} aur aas-paas ke areas serve karta hai. Exact coverage ke liye message karein.', v) },
    ],
    internalLinks: ['/ → /services', '/services → /pricing', '/blog → /case-studies', '/case-studies → /contact'],
    technicalChecklist: ['Core Web Vitals (LCP < 2.5s)', 'Canonical + sitemap.xml + robots.txt', 'FAQPage + LocalBusiness JSON-LD', 'Google Business Profile weekly update', 'UTM-tagged conversion URLs'],
  };
}

/* ------------------------------------------------------------------ */
/* public API                                                          */
/* ------------------------------------------------------------------ */

const BUILDERS = {
  intel: buildIntel,
  ads: buildAds,
  creative: buildCreative,
  code: buildCode,
  prompts: buildPrompts,
  calendar: buildCalendar,
  seo: buildSeo,
};

export function buildKit(ctx, tool = 'all') {
  const started = Date.now();
  const selected = TOOLS.includes(tool) ? tool : 'all';
  const keys = selected === 'all' ? Object.keys(BUILDERS) : [selected];
  const kit = {};
  for (const key of keys) kit[key] = BUILDERS[key](ctx);
  const meta = {
    product: 'FailureAI',
    version: '1.0.0',
    mode: 'local',
    tool: selected,
    brand: ctx.brand,
    query: ctx.query,
    language: ctx.language,
    tone: ctx.tone,
    goal: ctx.goal,
    industry: ctx.industry,
    city: ctx.city,
    generatedAt: new Date().toISOString(),
    latencyMs: Date.now() - started,
    sourcesUsed: ctx.research.length,
    note: COPY_BANK[ctx.language].disclaimer,
  };
  return { ...kit, meta };
}

export function mergeLiveResult(localKit, live, tool, ctx) {
  const keys = tool === 'all' ? Object.keys(BUILDERS) : [tool];
  const out = { ...localKit };
  for (const key of keys) {
    const candidate = live?.[key];
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate) && Object.keys(candidate).length) {
      out[key] = candidate;
    }
  }
  out.meta = {
    ...localKit.meta,
    mode: 'live-ai',
    note: `Live AI output · ${ctx.language} · ${ctx.tone}. Publish se pehle facts verify karein.`,
  };
  return out;
}
