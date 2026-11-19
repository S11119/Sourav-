import Link from 'next/link';
import { getStore } from '@/lib/store';
import { ChatSimulator, type Contact } from './chat-simulator';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const store = getStore();
  const customers = await store.listCustomers();

  const contacts: Contact[] = customers.map((c) => ({
    waId: c.wa_id,
    name: c.name,
    lang: c.lang,
    address: c.address,
  }));

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <span className="dot" /> Same agent, without WhatsApp credentials
          </div>
          <h1>WhatsApp chat demo</h1>
          <p>
            Type like a customer would — Hinglish is fine. Every order, pause and complaint you send
            here lands in the owner dashboard exactly like a real WhatsApp message.
          </p>
        </div>
        <div className="chip-row">
          <Link href="/dashboard" className="btn secondary">
            See it in the dashboard →
          </Link>
        </div>
      </div>

      <ChatSimulator contacts={contacts} />
    </main>
  );
}
