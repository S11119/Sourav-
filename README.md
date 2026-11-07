# FailureAI ⚡

> **Ek search. Poora campaign.**  
> Aapka apna all-in-one AI digital marketing agent — client ki data nikale, ads likhe, images banaye, code aur prompts de, 30-din ka plan aur SEO pack de. Sab kuch live, aapke apne domain par.

Ye repo ek **working product** hai, koi mockup nahi:

- 🌐 **Public website** — SEO-ready landing page (`/`) + live agent workspace (`/app.html`)
- 🤖 **7 agent modules** — Client Intel, Ad Factory, Creative Studio, Code Lab, Prompt Library, Calendar, SEO Pack
- 🔎 **Search → Full Campaign** — ek brand naam / URL → poora structured kit
- 🧠 **2 modes** — built-in **Local Engine** (bina API key, offline, hamesha chalega) + **Live AI** (OpenAI / Gemini / Anthropic / koi bhi OpenAI-compatible gateway)
- 🖼️ **Real images** — production-grade image prompts + "Render image" se actual image
- 📤 **Export** — JSON, Markdown, CSV, clipboard, Print/PDF; har client ka workspace history
- 🧾 **Real code** — Meta Pixel, GA4 events, UTM builder, JSON-LD, landing hero, WhatsApp follow-ups
- 🚀 **Zero dependencies** — sirf Node.js 18+. `npm install` ki zarurat hi nahi.

---

## ⚡ 60 second me chalao

```bash
git clone <this-repo>
cd Sourav-
npm start
```

Phir browser me kholo: **http://localhost:3000** → *Agent kholo* → search box me `FitZone Gym Delhi` likho → **Full campaign**.

Koi signup nahi, koi `.env` nahi, koi API key nahi. Local Engine turant 7-section kit bana dega.

```bash
npm test        # 14 smoke tests
npm run dev     # auto-reload (node --watch)
```

---

## 🧩 Agent kya kya karta hai

| Module | Output |
|---|---|
| **◎ Search → Full Campaign** | Ek query se niche ke saare 7 sections ek saath |
| **⌕ Client Intel** | Lead sheet, 3 audience segments + pains/desires, SWOT, competitors, keywords by intent, channels, quick wins, discovery questions, cold-outreach email, live sources |
| **✦ Ad Factory** | 5 platforms × 2 A/B variants = 10 ads, hooks, CTA bank, budget split, Google Ads headlines, landing page copy, 3 A/B test hypotheses, compliance notes |
| **▣ Creative Studio** | 4 detailed image prompts (Midjourney / SDXL / DALL·E), negative prompts, palette, overlay copy, brand kit, 20-sec video script + **actual image render** |
| **</> Code & Tracking** | Meta Pixel + Lead event, GA4 custom events, UTM builder (live), JSON-LD, single-CTA landing hero, 3-touch WhatsApp sequence, measurement checklist |
| **❝ Prompt Library** | Master system prompt + 8 reusable prompts + weekly workflow |
| **▦ 30-Day Calendar** | 4 weeks × 5 posts = 20 posts with caption/CTA/hashtags, budget, KPIs, weekly ritual |
| **↗ SEO Pack** | Meta title/description, slug, H1, keywords, FAQ + FAQPage JSON-LD, blog titles, internal links, technical checklist |

**Languages:** Hinglish (Roman Hindi) · हिंदी (Devanagari) · English  
**Controls:** tone (bold / friendly / premium / witty), goal (leads / sales / awareness / traffic), city, offer, audience hint, extra notes.

---

## 🧠 Do modes — apni marzi

### 1. Local Engine (default, free)
Deterministic, offline industry intelligence: 11 industry presets (restaurant, gym, clinic, real estate, D2C, coaching, SaaS, salon, travel, finance, generic), multilingual copy banks, seed-based variation. **Kabhi "API down" nahi hota** — client demo ke liye perfect.

### 2. Live AI (upgrade)
Koi bhi ek key lagao — server automatically detect kar lega:

```bash
cp .env.example .env
# .env me ek key bharo:
OPENAI_API_KEY=sk-...          # ya GEMINI_API_KEY / ANTHROPIC_API_KEY
OPENAI_BASE_URL=https://api.openai.com/v1   # Groq / OpenRouter / Together / Ollama bhi chalega
OPENAI_MODEL=gpt-4o-mini
```

Ya **app ke andar Settings → API key** me apni key daalo (BYOK). Dono mode ka JSON shape same hai, isliye UI aur exports bilkul nahi badalte. Agar Live AI call fail ho jaye to app **apne aap Local Engine output** dikha deta hai — kabhi blank screen nahi.

---

## 🌐 Client ki "real" data (live web research)

```bash
SEARCH_PROVIDER=tavily      # tavily | serper | brave | none
SEARCH_API_KEY=...
```

Settings me **"Live web research"** on karo. Tab agent brand ke liye live sources dhundhta hai aur unhe `Client Intel → Sources` me **URL ke saath cite** karta hai. Bina key ke bhi structured lead sheet, data gaps aur enrichment checklist milti hai — **hum kabhi facts invent nahi karte** (prompts me explicitly mana kiya hai).

## 🖼️ Images

- Har concept ke saath copy-paste ready prompt (Midjourney params + SDXL equivalent + negative prompt).
- **"Render image"** button free public image endpoint (`https://image.pollinations.ai/prompt/…`) se actual image banata hai — Settings me endpoint badal sakte ho.
- Apni `IMAGE_API_KEY` set karo to server-side OpenAI Images API se generation milegi (`POST /api/image`).

---

## 🚀 Live kaise karoge (real domain ke saath)

### Option A — Render (sabse aasan)
1. Repo GitHub par push karo (ya is branch ko connect karo).
2. Render → **New → Blueprint** → repo select. `render.yaml` apne aap service bana dega.
3. Env vars me `PUBLIC_SITE_URL=https://aapka-domain.com` aur (optional) apni LLM/search keys daalo.
4. Deploy → mila `https://failureai.onrender.com` jaisa URL → apna custom domain add karo.

### Option B — Docker / VPS / Railway / Fly.io
```bash
docker build -t failureai .
docker run -p 3000:3000 -e PUBLIC_SITE_URL=https://aapka-domain.com \
  -e OPENAI_API_KEY=sk-... failureai
```
Ya bina Docker ke: `PORT=3000 HOST=0.0.0.0 PUBLIC_SITE_URL=... node server/index.js` (PM2 / systemd / Nginx reverse proxy ke saath).

> Server `0.0.0.0` par bind hota hai aur kisi host allowlist ka use nahi karta — preview aur proxies me seedha chal jata hai. Health check: `/api/health`.

### 🔍 "Agar koi search kare to mile" — SEO jo pehle se hai
- `robots.txt` + dynamic `sitemap.xml` (aapke real domain ke saath generate hota hai)
- Canonical, Open Graph / Twitter cards, `theme-color`, descriptive meta title/description
- **4 JSON-LD blocks**: `Organization`, `SoftwareApplication`, `WebSite` + `SearchAction` (Google sitelinks search box), `FAQPage`
- Real Hinglish/Hindi content, FAQ section, semantic headings, alt text
- `PUBLIC_SITE_URL` set karna **zaruri** hai taaki canonical/sitemap sahi domain bolein

**Next steps aapke haath me:** domain → HTTPS → [Google Search Console](https://search.google.com/search-console) me property add karo → sitemap submit karo → 2–3 useful articles (`SEO Pack` me blog titles milte hain) → Google Business Profile / LinkedIn / X par launch post. Content + backlinks ke bina koi bhi tool #1 rank guarantee nahi karta — ye foundation hai, jhootha promise nahi.

---

## 🔌 API (apne product me chipkane ke liye)

Base: `http://localhost:3000`

| Method | Route | Kaam |
|---|---|---|
| GET | `/api/health` | status, configured providers, capabilities |
| POST | `/api/run` | ek ya saare modules run karo |
| POST | `/api/campaign` | shortcut = `tool:"all"` |
| POST | `/api/research` | sirf live web sources |
| POST | `/api/image` | server-side image generation (key ho to) |

```bash
curl -X POST http://localhost:3000/api/run \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "all",
    "query": "https://chaiwala.in",
    "language": "hinglish",
    "tone": "bold",
    "goal": "leads",
    "city": "Delhi",
    "offer": "free consultation",
    "provider": "auto",
    "researchEnabled": false
  }'
```

**Request fields:** `tool` (`all|intel|ads|creative|code|prompts|calendar|seo`), `query` (required), `brand`, `url`, `industry`, `language`, `tone`, `goal`, `city`, `offer`, `audience`, `notes`, `platforms`, `researchEnabled`, `provider` (`auto|local|openai|gemini|anthropic`), `apiKey`, `research[]`.

**Response:** `{ ok: true, kit: { intel, ads, creative, code, prompts, calendar, seo, meta }, status }`. `meta.mode` = `local` ya `live-ai`; `meta.fallback` tab aata hai jab Live AI fail ho.

Rate limit default **40 requests / minute / IP** (`RATE_LIMIT_PER_MIN`), body limit 128 KB.

---

## 📁 Structure

```
public/
  index.html          SEO landing (JSON-LD, OG, FAQ)
  app.html            agent workspace shell
  styles.css          landing design
  app.css             workspace design
  landing.js          landing interactions
  js/util.js          escape, copy/download, Markdown + CSV exports
  js/render.js        7 module renderers
  js/app.js           state, API calls, settings, history, image render
  assets/hero.jpg     generated hero visual
  favicon.svg
server/
  index.js            HTTP server, static, SEO routes, API, rate limit
  data.js             11 industry presets + 3-language copy banks + helpers
  engine.js           Local Engine — 7 kit builders
  prompts.js          Live AI prompts (same JSON schema as Local Engine)
  providers.js        OpenAI-compatible / Gemini / Anthropic adapters
  research.js         Tavily / Serper / Brave + image API
test/smoke.test.mjs   12 tests
Dockerfile, render.yaml, .env.example
```

### Apne hisaab se badlo
| Chahte ho | File |
|---|---|
| Nayi industry / audience / keywords | `server/data.js` → `INDUSTRIES` |
| Copy ka andaaz, Hinglish lines | `server/data.js` → `COPY_BANK`, `IDEA_BANK` |
| Naya section ya output shape | `server/engine.js` + `server/prompts.js` + `public/js/render.js` |
| Naya LLM provider | `server/providers.js` |
| UI / brand colours | `public/app.css`, `public/styles.css` `:root` vars |
| Default settings | `public/js/app.js` → `DEFAULT_SETTINGS` |

---

## 🔐 Security notes (public deploy par dhyan do)

- **API keys server `.env` me rakhein**, browser me nahi. Settings ka BYOK feature single-user / demo ke liye hai; key aapke browser localStorage me save hoti hai aur request ke saath **sirf isi server** par bheji jati hai.
- Server stateless hai: koi analytics, koi third-party tracking, koi database nahi. History/settings sirf aapke browser me.
- CORS intentionally band hai (same-origin), taaki koi doosri site aapke server key ka misuse na kar sake.
- Generated copy me **kabhi bhi numbers/testimonials/ratings invent nahi** kiye jate — placeholders (`__VERIFY_RATING__`, `PIXEL_ID`, `91XXXXXXXXXX`) hain, publish se pehle replace + verify karein.
- Health/ads claims ke liye platform policies aur legal compliance khud check karein.

---

## ✅ Tests

```bash
npm test
```

14 tests cover: health, landing SEO + canonical injection, static assets, dynamic robots/sitemap, full kit, single-tool kit, campaign alias, industry detection, 3 languages, code/calendar/creative/SEO validity, validation & 404s, graceful research fallback, all 9 workspace renderers, HTML-escaping / XSS safety, Markdown/CSV exports.

---

## 🗺️ Aage kya bana sakte ho (ideas)

Real Google Ads / Meta API se direct campaign publish · CRM sync (HubSpot / Notion) · multi-user login + Supabase · scheduled weekly reports · competitor ad-library scraper · brand asset library · WhatsApp Cloud API · analytics dashboard with real spend data. Foundation ready hai — upar chipkana hi baaki hai.

---

**Built for a digital marketer who wanted one agent that does *everything*.**  
FailureAI · zero dependencies · Node 18+ · MIT · self-hosted, aapka apna.
