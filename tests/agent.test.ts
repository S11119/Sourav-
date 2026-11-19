import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { handleMessage } from '../lib/agent';
import { parseMessage } from '../lib/agent/parse';
import { addDays, todayISO } from '../lib/date';
import { LocalStore } from '../lib/store/local';

const TODAY = todayISO();
const NOW = { today: TODAY, hour: 10 };

function newStore(): LocalStore {
  return new LocalStore(path.join(os.tmpdir(), `dairy-test-${randomUUID()}.json`));
}

let seq = 0;
function newWa(): string {
  seq += 1;
  return `9199${String(70000000 + seq)}`;
}

async function chat(store: LocalStore, waId: string, text: string, profileName?: string) {
  return handleMessage({ store, waId, text, now: NOW, profileName });
}

describe('entity parsing', () => {
  it('parses Hindi-word quantities and Hinglish dates', () => {
    const parsed = parseMessage('dedh litre doodh kal se', { today: TODAY });
    expect(parsed.qty).toBe(1.5);
    expect(parsed.productSku).toBe('COW');
    expect(parsed.startDate).toBe(addDays(TODAY, 1));
  });

  it('parses Devanagari quantity + unit', () => {
    const parsed = parseMessage('कल से 2 लीटर दूध रोज़', { today: TODAY });
    expect(parsed.lang).toBe('hindi');
    expect(parsed.qty).toBe(2);
    expect(parsed.productSku).toBe('COW');
    expect(parsed.frequency).toBe('daily');
  });

  it('does not read a date as a quantity', () => {
    const parsed = parseMessage('15/12 se 1 litre doodh', { today: TODAY });
    expect(parsed.qty).toBe(1);
    expect(parsed.startDate).toBe(`${TODAY.slice(0, 4)}-12-15`);
  });

  it('understands alternate-day subscriptions', () => {
    const parsed = parseMessage('1 litre buffalo alternate din', { today: TODAY });
    expect(parsed.productSku).toBe('BUFFALO');
    expect(parsed.frequency).toBe('alternate');
  });
});

describe('ordering', () => {
  it('creates a daily subscription with a 7-day delivery run', async () => {
    const store = newStore();
    const waId = newWa();
    const { result, customer } = await chat(store, waId, '2 litre doodh roz');

    expect(result.intent).toBe('order');
    expect(result.reply).toContain('Order confirm');
    expect(result.reply).toContain('₹120');

    const orders = await store.listOrders({ customerId: customer.id });
    expect(orders).toHaveLength(1);
    expect(orders[0].qty).toBe(2);
    expect(orders[0].frequency).toBe('daily');
    expect(orders[0].start_date).toBe(TODAY);

    const deliveries = await store.listDeliveries({ orderId: orders[0].id });
    expect(deliveries).toHaveLength(7);
    expect(deliveries[0].amount).toBe(120);
  });

  it('asks for the missing quantity and then completes the order', async () => {
    const store = newStore();
    const waId = newWa();

    const first = await chat(store, waId, 'doodh chahiye');
    expect(first.result.reply.toLowerCase()).toContain('kitna');

    const second = await chat(store, waId, '1.5 litre');
    expect(second.result.intent).toBe('order');
    const orders = await store.listOrders({ customerId: second.customer.id });
    expect(orders).toHaveLength(1);
    expect(orders[0].qty).toBe(1.5);
  });

  it('changes the quantity of the running subscription', async () => {
    const store = newStore();
    const waId = newWa();
    await chat(store, waId, '2 litre doodh roz');
    const { result, customer } = await chat(store, waId, '1 litre karo');

    expect(result.intent).toBe('modify');
    expect(result.reply).toContain('1 litre');

    const orders = await store.listOrders({ customerId: customer.id });
    expect(orders[0].qty).toBe(1);
  });

  it('books a one-time order when the customer says "sirf kal"', async () => {
    const store = newStore();
    const waId = newWa();
    const { result, customer } = await chat(store, waId, 'sirf kal ke liye 1 litre cow milk');

    expect(result.intent).toBe('order');
    const orders = await store.listOrders({ customerId: customer.id });
    expect(orders[0].frequency).toBe('once');
    const deliveries = await store.listDeliveries({ orderId: orders[0].id });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].date).toBe(addDays(TODAY, 1));
  });
});

describe('pausing, resuming and cancelling', () => {
  it('pauses a date range and resumes it', async () => {
    const store = newStore();
    const waId = newWa();
    const created = await chat(store, waId, '2 litre doodh roz');
    const customerId = created.customer.id;

    const paused = await chat(store, waId, 'kal se 3 din band kar do');
    expect(paused.result.intent).toBe('pause');

    const pausedRows = await store.listDeliveries({ customerId, status: 'paused' });
    expect(pausedRows).toHaveLength(3);
    expect(pausedRows[0].date).toBe(addDays(TODAY, 1));
    expect(pausedRows[2].date).toBe(addDays(TODAY, 3));

    const resumed = await chat(store, waId, 'start');
    expect(resumed.result.intent).toBe('resume');
    const stillPaused = await store.listDeliveries({ customerId, status: 'paused' });
    expect(stillPaused).toHaveLength(0);
  });

  it('cancels the subscription and stops future deliveries', async () => {
    const store = newStore();
    const waId = newWa();
    const created = await chat(store, waId, '1 litre doodh roz');
    const customerId = created.customer.id;

    const { result } = await chat(store, waId, 'cancel kar do');
    expect(result.intent).toBe('cancel');

    const orders = await store.listOrders({ customerId });
    expect(orders[0].status).toBe('cancelled');
    const scheduled = await store.listDeliveries({ customerId, status: 'scheduled' });
    expect(scheduled).toHaveLength(0);
  });
});

describe('language handling', () => {
  it('replies in Hindi to Devanagari messages', async () => {
    const store = newStore();
    const { result } = await chat(store, newWa(), 'कल से 2 लीटर दूध रोज़');
    expect(result.lang).toBe('hindi');
    expect(result.reply).toContain('ऑर्डर कन्फर्म');
  });

  it('replies in English to English messages', async () => {
    const store = newStore();
    const { result } = await chat(store, newWa(), '2 litre milk daily please');
    expect(result.lang).toBe('english');
    expect(result.reply).toContain('Order confirmed');
  });

  it('switches language when the customer does', async () => {
    const store = newStore();
    const waId = newWa();
    const first = await chat(store, waId, 'doodh chahiye bhai');
    expect(first.result.lang).toBe('hinglish');
    const second = await chat(store, waId, 'भैंस का दूध चाहिए');
    expect(second.result.lang).toBe('hindi');
    expect(second.result.reply).toContain('कितना');
  });
});

describe('dues, complaints and hand-off', () => {
  it('shows the pending dues of a seeded customer', async () => {
    const store = newStore();
    const { result } = await chat(store, '919820000005', 'bill kitna hai');
    expect(result.intent).toBe('dues');
    expect(result.reply).toContain('pending');
    expect(result.reply).toMatch(/₹\d/);
  });

  it('logs a complaint for the owner dashboard', async () => {
    const store = newStore();
    const waId = newWa();
    const { result, customer } = await chat(store, waId, 'aaj ka doodh kharab tha, smell aa rahi thi');
    expect(result.intent).toBe('complaint');
    const complaints = await store.listComplaints();
    expect(complaints.some((c) => c.customer_id === customer.id && c.kind === 'complaint')).toBe(
      true
    );
  });

  it('creates a call-back ticket when the customer asks for the owner', async () => {
    const store = newStore();
    const { result, customer } = await chat(store, newWa(), 'owner se baat karni hai');
    expect(result.intent).toBe('human');
    const complaints = await store.listComplaints();
    expect(complaints.some((c) => c.customer_id === customer.id && c.kind === 'handoff')).toBe(
      true
    );
  });

  it('falls back with helpful options for unknown text', async () => {
    const store = newStore();
    const { result } = await chat(store, newWa(), 'zxcvbnm');
    expect(result.intent).toBe('fallback');
    expect(result.reply.length).toBeGreaterThan(20);
  });
});
