import Link from 'next/link';
import { BUSINESS, CATALOG } from '@/lib/catalog';
import { formatMoney } from '@/lib/date';
import { supabaseConfigured } from '@/lib/store';
import { whatsappConfigured } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

const SAMPLE = [
  { dir: 'in' as const, text: 'Bhaiya kal se 2 litre cow milk chahiye', time: '8:12 PM' },
  {
    dir: 'out' as const,
    text: 'Namaste Rahul ji 🙏 Order confirm — #4F2A9C\n\n🥛 Cow Milk — 2 litre\n🔁 roz, kal se\n💰 ₹120/din · mahine ka approx ₹3600',
    time: '8:12 PM',
  },
  { dir: 'in' as const, text: 'Kal 3 din ke liye band kar do, ghar par nahi hain', time: '7:40 AM' },
  {
    dir: 'out' as const,
    text: 'Theek hai 🙏 Kal se 3 din delivery pause kar di. Is period ka charge nahi lagega. Wapas chahiye to "start" likh dena.',
    time: '7:40 AM',
  },
];

export default function HomePage() {
  const dataMode = supabaseConfigured() ? 'Supabase Postgres' : 'Local demo store';
  const wa = whatsappConfigured();

  return (
    <main className="page">
      <section className="hero">
        <div>
          <div className="eyebrow">
            <span className="dot" /> WhatsApp agent · doodh, dahi, paneer
          </div>
          <h1>
            Doodh ka business, <span>WhatsApp par auto-pilot</span>.
          </h1>
          <p className="lede">
            Customers order, pause and change subscriptions in Hinglish — the agent handles it,
            writes every delivery into your dashboard, and flags dues and complaints. No app, no
            call centre.
          </p>
          <div className="hero-actions">
            <Link href="/chat" className="btn">
              ▶ Try the WhatsApp demo
            </Link>
            <Link href="/dashboard" className="btn secondary">
              Open owner dashboard
            </Link>
          </div>
          <div className="chip-row" style={{ marginTop: 22 }}>
            <span className="chip">
              <span className="dot" />
              <strong>{dataMode}</strong>
            </span>
            <span className="chip">
              <span className={`dot ${wa ? '' : 'warn'}`} />
              {wa ? 'WhatsApp Cloud API connected' : 'WhatsApp API not connected yet'}
            </span>
            <span className="chip">
              <span className="dot" />
              Hinglish · हिन्दी · English
            </span>
          </div>
        </div>

        <div className="hero-card">
          <div className="phone">
            <div className="phone-top">
              <span className="avatar">SD</span>
              <div>
                <strong>{BUSINESS.name}</strong>
                <small>online · replies in seconds</small>
              </div>
            </div>
            <div className="bubbles">
              {SAMPLE.map((m, i) => (
                <div key={i} className={`bubble ${m.dir}`}>
                  {m.text}
                  <span className="time">{m.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid three">
        <div className="feature">
          <div className="icon">📝</div>
          <h3>Orders &amp; changes, understood</h3>
          <p>
            “2 litre doodh roz”, “kal se 1.5 litre buffalo”, “1 litre karo”, “kal band”, “start” —
            quantities, products, dates and Hinglish phrasing all parsed.
          </p>
        </div>
        <div className="feature">
          <div className="icon">🚚</div>
          <h3>Delivery run stays in sync</h3>
          <p>
            Every order generates the next 7 days of deliveries. Pauses skip a date range and don’t
            bill it. The dashboard shows today’s route in one list.
          </p>
        </div>
        <div className="feature">
          <div className="icon">💬</div>
          <h3>Owner never misses a thing</h3>
          <p>
            Complaints, call-back requests, pending dues and paid/unpaid deliveries all land in the
            owner dashboard — with one-tap “delivered” and “paid” actions.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Today&apos;s catalogue</h2>
          <span className="muted small">Edit in lib/catalog.ts or the products table</span>
        </div>
        <div className="grid three">
          {CATALOG.map((p) => (
            <div className="card" key={p.id}>
              <div className="card-head" style={{ marginBottom: 6 }}>
                <h3>{p.name}</h3>
                <span className="badge">{formatMoney(p.price)}/{p.unit}</span>
              </div>
              <p className="sub">{p.nameHi} · delivered {BUSINESS.deliveryWindow}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section grid two">
        <div className="card">
          <h3>What the agent can do</h3>
          <div className="divider" />
          <div className="kv">
            <span>Order / subscribe</span>
            <span>“2 litre doodh roz”, “kal se 1 litre buffalo”</span>
          </div>
          <div className="kv">
            <span>Change quantity</span>
            <span>“1 litre karo”</span>
          </div>
          <div className="kv">
            <span>Pause &amp; resume</span>
            <span>“kal se 3 din band”, “start”</span>
          </div>
          <div className="kv">
            <span>Cancel</span>
            <span>“cancel subscription”</span>
          </div>
          <div className="kv">
            <span>Dues / bill</span>
            <span>“kitna paisa baaki hai”</span>
          </div>
          <div className="kv">
            <span>Complaint / call-back</span>
            <span>“doodh kam aaya”, “owner se baat karni hai”</span>
          </div>
          <div className="kv">
            <span>Price list</span>
            <span>“rate kya hai”</span>
          </div>
        </div>

        <div className="card">
          <h3>Go live on WhatsApp</h3>
          <p className="sub" style={{ marginBottom: 12 }}>
            Two env vars and one webhook URL. Full steps in <span className="code">README.md</span>.
          </p>
          <pre className="code-block">{`WHATSAPP_TOKEN=EAA...
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_VERIFY_TOKEN=doodhwala-verify
WHATSAPP_APP_SECRET=...   # optional, enables signatures`}</pre>
          <p className="sub" style={{ marginTop: 12 }}>
            Webhook URL: <span className="code">/api/whatsapp/webhook</span>
            <br />
            Without credentials the agent still runs in the chat demo and logs every reply.
          </p>
        </div>
      </section>
    </main>
  );
}
