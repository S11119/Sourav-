import { NextResponse, type NextRequest } from 'next/server';
import { handleMessage } from '@/lib/agent';
import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** Demo customers + their transcript, used by the chat simulator page. */
export async function GET(req: NextRequest) {
  const store = getStore();
  const waId = req.nextUrl.searchParams.get('waId');

  if (!waId) {
    const customers = await store.listCustomers();
    const withLast = await Promise.all(
      customers.slice(0, 12).map(async (customer) => {
        const messages = await store.listMessages(customer.id, 1);
        return { ...customer, lastMessage: messages[0]?.body ?? null };
      })
    );
    return NextResponse.json({ customers: withLast });
  }

  const customer = await store.getCustomerByWaId(waId);
  const messages = customer ? await store.listMessages(customer.id, 100) : [];
  const products = await store.listProducts();
  return NextResponse.json({ customer, messages, products });
}

interface SimulateBody {
  waId?: string;
  text?: string;
  name?: string;
}

/** Same agent pipeline as the real webhook, but replies inline instead of via Meta. */
export async function POST(req: NextRequest) {
  let body: SimulateBody;
  try {
    body = (await req.json()) as SimulateBody;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const waId = (body.waId ?? '').replace(/\D/g, '');
  const text = (body.text ?? '').trim();
  if (waId.length < 8 || waId.length > 15) {
    return NextResponse.json({ error: 'waId must be 8–15 digits' }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const store = getStore();
  try {
    const { result, customer } = await handleMessage({
      store,
      waId,
      text,
      profileName: body.name ?? null,
    });
    return NextResponse.json({ ...result, customer });
  } catch (err) {
    console.error('[simulate] agent failed', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
