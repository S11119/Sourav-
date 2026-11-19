# Sourav Dairy — WhatsApp agent for a milk business 🥛

A working WhatsApp ordering agent for a daily dairy route. Customers chat in **Hinglish, Hindi or
English**; the agent takes subscriptions, changes quantities, pauses deliveries, answers bills and
logs complaints — and every one of those actions shows up in an **owner dashboard**.

Built with **Next.js (App Router) + TypeScript + Supabase/Postgres** and the **Meta WhatsApp Cloud
API**. No LLM key required: the NLU is a deterministic, test-covered semantic parser tuned for how
Indian dairy customers actually type (`"2 litre doodh roz"`, `"kal se 3 din band"`, `"1 litre karo"`).

---

## What you get

| Screen | What it does |
| --- | --- |
| `/` | Overview: catalogue, capabilities, connection status |
| `/chat` | WhatsApp-style **chat simulator** — same agent pipeline as production, no Meta credentials needed |
| `/dashboard` | Owner dashboard: today's route, revenue, dues, subscriptions, complaints, 6-day lookahead, one-tap “Delivered” / “Mark paid” |
| `POST /api/whatsapp/webhook` | Real Meta Cloud API webhook (signature-verified, replies via Graph API) |
| `POST /api/simulate` | Same agent, replies inline (used by the simulator) |

The dashboard is seeded with a realistic demo route — 5 customers, 8 subscriptions, a week of
delivery history, one travel pause, pending dues and a complaint — so it is not empty on first run.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

That is it. Without env vars the app runs on a **local JSON store** (`.data/db.json`, created from
the seed). Open `/chat`, pick a customer and try:

```
2 litre doodh roz
kal se 3 din band
start
1 litre karo
bill kitna hai
doodh kal nahi aaya
```

Then open `/dashboard` — the order, the pause, the dues and the complaint are all there.

Other commands:

```bash
npm test             # 17 agent/domain tests (vitest)
npm run typecheck
npm run build && npm start
```

---

## What the agent understands

| Customer says (any script) | Agent does |
| --- | --- |
| `2 litre doodh roz` · `रोज़ 2 लीटर दूध` | daily subscription from today, ₹120/day |
| `kal se 1.5 litre buffalo milk` | buffalo subscription starting tomorrow |
| `dedh litre curd alternate din` | alternating-day curd (1.5 kg) |
| `sirf kal ke liye 1 litre cow milk` | one-time delivery tomorrow |
| `1 litre karo` | changes the running subscription quantity |
| `kal se 3 din band` · `chutti 5 din` | pauses that date range; those days are not billed |
| `start` · `phir se shuru karo` | resumes deliveries and regenerates the run |
| `cancel kar do` | cancels subscription + future deliveries |
| `bill kitna hai` · `paisa baaki` | pending amount, count and UPI id |
| `rate kya hai` · `doodh ka price` | price list / single product price |
| `aaj doodh kam aaya` | logs a complaint for the owner |
| `owner se baat karni hai` | creates a call-back ticket |
| `hi` / `namaste` | welcome menu |

Language is detected per message (Devanagari → Hindi, Roman-Hindi markers → Hinglish, otherwise
English) and stored on the customer, so replies match how they wrote. Word quantities (`dedh`,
`dhai`, `aadha`, `do`…), dates (`kal`, `parso`, `15 tareekh`, `15/12`, weekdays) and durations
(`3 din`, `2 hafte`) are all parsed.

**Missing slots are asked for, not guessed:** `"doodh chahiye"` → “Kitna doodh chahiye?” → `"1.5
litre"` → order confirmed. Conversation state lives in a `sessions` table keyed by WhatsApp id.

Every order generates **7 days of deliveries** (pauses excluded), which is what the dashboard route
list and billing read from. Money is computed as `qty × product price`.

---

## Architecture

```
app/
  page.tsx                     marketing / status page
  chat/                        WhatsApp simulator (client component + API)
  dashboard/                   owner dashboard + server actions
  api/whatsapp/webhook/        Meta verification + inbound messages
  api/simulate/                same agent for the browser demo
  api/reset/                   re-seed the local store
lib/
  agent/
    parse.ts                   qty / product / date / frequency / duration parsing
    lang.ts                    language detection + normalisation
    index.ts                   intent classification + handlers + side effects
    messages.ts                Hinglish / Hindi / English reply templates
    match.ts                   Unicode-aware regex helper (Devanagari-safe `\b`)
  schedule.ts                  which dates a subscription delivers, pause overlaps
  store/                       DataStore interface + local JSON and Supabase adapters
  dashboard.ts                 route/dues/complaint aggregation
  whatsapp.ts                  Graph API send + webhook signature check
db/schema.sql                  Postgres tables, indexes, catalogue seed, RLS
tests/agent.test.ts            intent, parsing, ordering, pause/resume/cancel, i18n tests
```

The `DataStore` interface (`lib/store/types.ts`) is the seam: `LocalStore` (JSON file, zero setup)
and `SupabaseStore` (Postgres) implement exactly the same methods, so the agent code never knows
which one it is talking to.

---

## Going live on WhatsApp (Meta Cloud API)

1. Create a Meta app at <https://developers.facebook.com> → add the **WhatsApp** product.
2. Note the **Phone number ID** and create a **permanent access token** (System user → WhatsApp
   permissions).
3. Put them in `.env.local`:
   ```bash
   WHATSAPP_TOKEN=EAA...
   WHATSAPP_PHONE_NUMBER_ID=1234567890
   WHATSAPP_VERIFY_TOKEN=doodhwala-verify
   WHATSAPP_APP_SECRET=...        # optional, enables signature checks
   ```
4. Expose the app (`ngrok http 3000` or deploy it) and set the callback URL:
   ```
   https://<your-domain>/api/whatsapp/webhook
   ```
   Use the same verify token. Subscribe to the **messages** field.
5. Message the WhatsApp test number. The webhook verifies the signature, runs the agent, stores the
   conversation and sends the reply through the Graph API.

Without credentials the webhook still runs — it just skips sending and returns the handled intents
in the JSON response, which is handy for testing with `curl`:

```bash
curl -s localhost:3000/api/whatsapp/webhook \
  -H 'content-type: application/json' \
  -d '{"entry":[{"changes":[{"value":{"contacts":[{"profile":{"name":"Test"}}],
       "messages":[{"from":"919820000099","id":"wamid.1","type":"text",
       "text":{"body":"2 litre doodh roz"}}]}}]}]}'
```

This project uses the **Cloud API** only. If your business is on a BSP (Twilio, Gupshup, 360dialog),
point their webhook at a small adapter that maps their payload to the same `handleMessage` call —
the agent itself is provider-agnostic.

---

## Supabase setup (optional, recommended for production)

1. Create a project, then run `db/schema.sql` in the SQL editor (creates tables, indexes, RLS and
   the product catalogue).
2. Add to `.env.local`:
   ```bash
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
3. Restart. The dashboard chip switches from “Local demo store” to “Supabase”; all reads/writes go
   through Postgres. The service-role key is server-side only — never expose it to the browser.

Note: the seeded demo customers only exist in the local store. With Supabase you start with an
empty customer list and the catalogue from `db/schema.sql`; `/chat` creates customers as you type.

---

## Customising

- **Prices / products:** `lib/catalog.ts` (local) or the `products` table (Supabase). The agent reads
  from the store, so both work.
- **Business details** (name, delivery window, cut-off, UPI, phone): `BUSINESS` in
  `lib/catalog.ts`.
- **Tone/language:** reply templates in `lib/agent/messages.ts` — each message has Hinglish, Hindi
  and English variants side by side.
- **New intent:** add a regex to `RE` in `lib/agent/index.ts`, a handler, and a test.
- **More delivery days:** `BUSINESS.generateDays`.

---

## Design notes & limits

- **Deterministic NLU, not an LLM.** Fast, free, predictable and testable — but it will not handle
  free-form chit-chat beyond the fallback menu. A good next step is an LLM fallback only for
  `fallback` intents, with the same tool calls.
- **One agent per business.** Multi-tenant routing (many dairies, one deployment) would mean adding
  a `business_id` to every table and to `getStore()`.
- **Payments** are tracked as cash/UPI paid-or-not per delivery; there is no payment gateway
  integration. UPI intent strings are the honest next step.
- **Local store is single-writer.** Fine for demos, not for concurrent production traffic — use
  Supabase there.
- Images, voice notes and location messages are ignored (text, button and interactive replies are
  handled).
