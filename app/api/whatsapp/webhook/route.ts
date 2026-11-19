import { NextResponse, type NextRequest } from 'next/server';
import { handleMessage } from '@/lib/agent';
import { getStore } from '@/lib/store';
import { sendWhatsAppText, verifySignature } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

/**
 * Meta webhook verification handshake.
 * Set WHATSAPP_VERIFY_TOKEN in the Meta app dashboard to the same value.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');
  const expected = process.env.WHATSAPP_VERIFY_TOKEN || 'doodhwala-verify';

  if (mode === 'subscribe' && token === expected) {
    return new NextResponse(challenge ?? 'ok', { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

interface WhatsAppMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  button?: { text: string };
  interactive?: { button_reply?: { title: string }; list_reply?: { title: string } };
}

interface WebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: WhatsAppMessage[];
      };
    }>;
  }>;
}

function messageText(message: WhatsAppMessage): string | null {
  if (message.type === 'text') return message.text?.body ?? null;
  if (message.type === 'button') return message.button?.text ?? null;
  if (message.type === 'interactive') {
    return (
      message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title ?? null
    );
  }
  return null; // images, audio, location … not handled yet
}

/**
 * Inbound messages from WhatsApp.
 * 1. verify signature (when WHATSAPP_APP_SECRET is set)
 * 2. run the agent for every text message
 * 3. reply through the Graph API (skipped when credentials are missing)
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    const signature = req.headers.get('x-hub-signature-256');
    if (!verifySignature(raw, signature, appSecret)) {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(raw) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const store = getStore();
  const handled: Array<{ waId: string; intent: string; sent: boolean }> = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      for (const message of value?.messages ?? []) {
        const text = messageText(message);
        if (!text) continue;
        const profileName = value?.contacts?.[0]?.profile?.name ?? null;
        try {
          const { result } = await handleMessage({
            store,
            waId: message.from,
            text,
            profileName,
          });
          const send = await sendWhatsAppText(message.from, result.reply);
          handled.push({ waId: message.from, intent: result.intent, sent: send.sent });
        } catch (err) {
          console.error('[whatsapp] agent failed', err);
        }
      }
    }
  }

  // Meta needs a fast 200 or it retries delivery.
  return NextResponse.json({ received: true, handled: handled.length, details: handled });
}
