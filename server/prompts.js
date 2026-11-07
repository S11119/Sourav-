/**
 * FailureAI :: prompts for the Live AI layer.
 * The JSON shape is intentionally identical to the Local Engine output so the
 * same frontend renderer works in both modes.
 */

const SHAPES = {
  intel: `{
  brand, website, industry, market, oneLinePositioning, summary,
  leadSheet: { company, website, industry, location, stage, decisionMakers[3], enrichmentChecklist[5], dataGaps[3] },
  audience: [3 x { segment, pains[3], desires[3], messageAngle, funnelStage }],
  swot: { strengths[3], weaknesses[3], opportunities[3], threats[3] },
  competitors: [3 x { name, angle, gap, yourCounter }],
  keywords: { primary[6], secondary[8], longTail[6], negative[6] },
  channels: [5 x { name, why, priority, firstAction }],
  quickWins[6], discoveryQuestions[6],
  outreach: { subject, body, followUps[2] },
  sources: [<=5 x { title, url, snippet }], sourcesNote
}`,
  ads: `{
  strategy, budgetSplit: [5 x { platform, pct }] (pct must total 100),
  platforms: [5 x { name, objective, budgetPct, placements, targeting, variants: [2 x { name, angle, hook, primaryText, headline(<=40 chars), description(<=90), cta, hashtags[4] }] }],
  hooks[6], ctas[6],
  googleAds: { adGroup, headlines[5](<=30 chars each), descriptions[3], negativeKeywords[6] },
  abTests: [3 x { name, hypothesis, variantA, variantB, metric }],
  landingPage: { headline, subhead, bullets[4], cta, trustRow[4] },
  compliance[4], disclaimer
}`,
  creative: `{
  brandKit: { voice, palette: [4 x {hex,use}], fonts[3], logoIdea, doList[3], dontList[3] },
  concepts: [4 x { name, ratio, artDirection, imagePrompt (detailed English prompt, 60-100 words, no text/logos in image), negativePrompt, overlayText, supportingLine, cta, palette[3], aspectHint }],
  videoScript: { duration, hook, scenes: [4 x {time,visual,voiceover}], cta, captionStyle },
  renderNote
}`,
  code: `{
  files: [6 x { name, language, purpose, code }] covering: Meta Pixel base+Lead event HTML, GA4 custom events JS, UTM builder JS, JSON-LD schema, single-CTA landing hero HTML+CSS, 3-touch WhatsApp follow-up text. Code must be valid, runnable, vanilla JS/HTML/JSON with no framework. Put __VERIFY_RATING__ placeholders instead of invented statistics.
  utm: { source, medium, campaign, content, term, exampleUrl },
  measurementChecklist[5], stack[6]
}`,
  prompts: `{
  systemPrompt,
  prompts: [8 x { title, category, prompt (fully written, ready to paste, with the brand/context filled in), tip }],
  workflow[5]
}`,
  calendar: `{
  theme, cadence, mix: {education,proof,offer,brand},
  weeks: [4 x { week, theme, focusKpi, posts: [5 x { day, channel, format, idea, caption, cta, hashtags[3], funnelStage }] }],
  budget: [4 x {bucket,pct (total 100),note}],
  kpis: [4 x {name,target,cadence}], weeklyRitual[5]
}`,
  seo: `{
  metaTitle(<=60 chars), metaDescription(<=155 chars), slug, h1, primaryKeyword, secondaryKeywords[6],
  schemaType, blogTitles[5], faqs: [4 x {q,a}], internalLinks[4], technicalChecklist[5]
}`,
};

const RULES = [
  'Return ONLY one valid JSON object. No markdown, no code fences, no commentary before or after.',
  'Match the exact keys and types in the schema. Arrays must contain the requested number of items.',
  'Write customer-facing copy in the requested language (hinglish = Hindi in Latin script, hindi = Devanagari, english = plain English).',
  'Never invent numbers, testimonials, ratings, certifications, prices or statistics. If a fact is unknown, write a placeholder or mark it as an assumption.',
  'Be specific to the brand, industry, city and goal. Avoid generic marketing filler.',
  'Keep ad headlines and descriptions within the character limits mentioned in the schema.',
  'Make every item immediately usable: copy-paste ready, with a concrete next action.',
].join('\n');

export function buildPrompt(tool, ctx) {
  const keys = tool === 'all' ? Object.keys(SHAPES) : [tool];
  const shape = keys.map((k) => `"${k}": ${SHAPES[k]}`).join(',\n');
  const system = [
    'You are FailureAI, a world-class digital marketing strategist and performance creative director.',
    'You produce structured, execution-ready campaign kits for real businesses.',
    RULES,
  ].join('\n');
  const research = ctx.research.length
    ? `\n\nLIVE WEB RESEARCH (use only these facts as verified; cite URLs in intel.sources):\n${ctx.research.map((r, i) => `[${i + 1}] ${r.title} — ${r.url}\n${r.snippet}`).join('\n\n')}`
    : '\n\nNo live web research available. Clearly separate assumptions from facts; do not claim you browsed the web.';
  const user = [
    `Create the ${tool === 'all' ? 'COMPLETE campaign kit' : `"${tool}" section of the campaign kit`} for this client.`,
    '',
    `Brand / query: ${ctx.query || ctx.brand}`,
    `Brand name: ${ctx.brand}`,
    `Website: ${ctx.url || 'not provided'}`,
    `Detected industry: ${ctx.industry}`,
    `City / market: ${ctx.city}`,
    `Primary goal: ${ctx.goal}`,
    `Tone: ${ctx.tone}`,
    `Copy language: ${ctx.language}`,
    `Offer: ${ctx.offer}`,
    `Target audience hint: ${ctx.audience || 'not provided — infer 3 segments'}`,
    `Extra notes: ${ctx.notes || 'none'}`,
    research,
    '',
    'Required JSON object (top-level keys exactly these):',
    `{`,
    shape,
    `}`,
  ].join('\n');
  return { system, user, keys };
}

export default buildPrompt;
