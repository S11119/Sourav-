'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface Contact {
  waId: string;
  name: string | null;
  lang: string;
  address: string | null;
}

interface ChatMessage {
  id: string;
  direction: 'in' | 'out';
  body: string;
  intent: string | null;
  created_at: string;
}

const QUICK = [
  '2 litre doodh roz',
  'kal se 1 litre buffalo milk',
  '1 litre karo',
  'kal se 3 din band',
  'start',
  'bill kitna hai',
  'doodh kal nahi aaya',
  'rate kya hai',
];

function initials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function timeOf(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(
      new Date(iso)
    );
  } catch {
    return '';
  }
}

export function ChatSimulator({ contacts }: { contacts: Contact[] }) {
  const [list, setList] = useState<Contact[]>(contacts);
  const [waId, setWaId] = useState<string>(contacts[0]?.waId ?? '919820000001');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');

  const bodyRef = useRef<HTMLDivElement>(null);

  const active = list.find((c) => c.waId === waId);

  const loadHistory = useCallback(async (id: string) => {
    setFetching(true);
    try {
      const res = await fetch(`/api/simulate?waId=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = (await res.json()) as { messages?: ChatMessage[]; customer?: Contact | null };
      setMessages(data.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory(waId);
  }, [waId, loadHistory]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = useCallback(
    async (text: string) => {
      const body = text.trim();
      if (!body || loading) return;
      setInput('');
      setError(null);
      setLoading(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          direction: 'in',
          body,
          intent: null,
          created_at: new Date().toISOString(),
        },
      ]);
      try {
        const res = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ waId, text: body }),
        });
        const data = (await res.json()) as {
          reply?: string;
          intent?: string;
          error?: string;
          customer?: Contact;
        };
        if (!res.ok || !data.reply) {
          throw new Error(data.error ?? 'Agent failed to reply');
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `local-out-${Date.now()}`,
            direction: 'out',
            body: data.reply as string,
            intent: data.intent ?? null,
            created_at: new Date().toISOString(),
          },
        ]);
        if (data.customer) {
          const updated = data.customer;
          setList((prev) =>
            prev.map((c) =>
              c.waId === updated.waId
                ? { ...c, name: updated.name, lang: updated.lang, address: updated.address }
                : c
            )
          );
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [loading, waId]
  );

  function addContact(e: React.FormEvent) {
    e.preventDefault();
    const digits = newPhone.replace(/\D/g, '');
    if (digits.length < 8) {
      setError('Enter a phone number with country code, e.g. 919820000099');
      return;
    }
    const contact: Contact = {
      waId: digits,
      name: newName.trim() || null,
      lang: 'hinglish',
      address: null,
    };
    setList((prev) => [contact, ...prev.filter((c) => c.waId !== digits)]);
    setWaId(digits);
    setMessages([]);
    setNewPhone('');
    setNewName('');
    setNewOpen(false);
    setError(null);
  }

  return (
    <div className="chat-shell">
      <aside className="contact-list">
        <header>
          Chats
          <div className="chip" style={{ marginTop: 8, fontWeight: 500 }}>
            <span className="dot" /> sandbox · replies are instant
          </div>
        </header>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {list.map((c) => (
            <button
              key={c.waId}
              type="button"
              className={`contact ${c.waId === waId ? 'active' : ''}`}
              onClick={() => setWaId(c.waId)}
            >
              <span className="avatar">{initials(c.name)}</span>
              <span className="meta">
                {c.name ?? `+${c.waId}`}
                <small>+{c.waId} · {c.lang}</small>
              </span>
            </button>
          ))}
        </div>
        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          {newOpen ? (
            <form onSubmit={addContact} className="grid" style={{ gap: 8 }}>
              <input
                className="chat-input"
                style={{
                  padding: '9px 11px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  fontFamily: 'inherit',
                  fontSize: 13,
                }}
                placeholder="Phone: 919820000099"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
              <input
                style={{
                  padding: '9px 11px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  fontFamily: 'inherit',
                  fontSize: 13,
                }}
                placeholder="Name (optional)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <div className="row-actions">
                <button className="btn small" type="submit">
                  Start chat
                </button>
                <button
                  className="btn small ghost"
                  type="button"
                  onClick={() => setNewOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button className="btn small secondary" type="button" onClick={() => setNewOpen(true)}>
              + New customer
            </button>
          )}
        </div>
      </aside>

      <section className="chat-window">
        <div className="chat-head">
          <span className="avatar">{initials(active?.name ?? null)}</span>
          <div style={{ flex: 1 }}>
            <strong>{active?.name ?? (active ? `+${active.waId}` : 'New customer')}</strong>
            <small className="muted" style={{ display: 'block', fontSize: 11.5 }}>
              {active ? `+${active.waId}` : 'Send a message to create the customer'} ·{' '}
              {active?.address ?? 'address pending'}
            </small>
          </div>
          <span className="badge">Sourav Dairy</span>
        </div>

        <div className="chat-body bubbles" ref={bodyRef}>
          {fetching && <p className="muted small">Loading conversation…</p>}
          {!fetching && messages.length === 0 && (
            <div className="bubble in">
              Namaste 🙏 Main Sourav Dairy ka WhatsApp assistant hoon. Aap likh sakte hain — “2
              litre doodh roz”, “kal band”, “bill kitna hai”.
              <span className="time">now</span>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`bubble ${m.direction}`}>
              {m.body}
              <span className="time">
                {timeOf(m.created_at)}
                {m.direction === 'out' && ' ✓✓'}
              </span>
              {m.direction === 'out' && m.intent && (
                <span className="intent-tag">intent: {m.intent}</span>
              )}
            </div>
          ))}
          {loading && <div className="typing">agent is typing…</div>}
        </div>

        {error && (
          <p className="small" style={{ color: 'var(--red)', padding: '0 16px 8px' }}>
            {error}
          </p>
        )}

        <div className="quick-chips">
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => void send(q)} disabled={loading}>
              {q}
            </button>
          ))}
        </div>

        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message — Hindi, Hinglish ya English…"
            aria-label="Message"
          />
          <button className="btn" type="submit" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
