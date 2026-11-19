import { BUSINESS } from '../catalog';
import { addDays, hourNow, ORDER_CUTOFF_HOUR, todayISO } from '../date';
import { deliveryDates, frequencyLabel, isPausedOn } from '../schedule';
import type { DataStore } from '../store/types';
import type {
  AgentAction,
  AgentResult,
  Customer,
  Delivery,
  Frequency,
  Lang,
  Order,
  PendingOrder,
  Product,
  Session,
} from '../types';
import { detectLang, normalize } from './lang';
import { rx, rxStart } from './match';
import * as M from './messages';
import { parseMessage, type ParsedMessage } from './parse';

export type Intent =
  | 'greeting'
  | 'menu'
  | 'order'
  | 'modify'
  | 'pause'
  | 'resume'
  | 'cancel'
  | 'dues'
  | 'complaint'
  | 'status'
  | 'address'
  | 'human'
  | 'thanks'
  | 'help'
  | 'fallback';

export interface HandleInput {
  store: DataStore;
  waId: string;
  text: string;
  profileName?: string | null;
  now?: { today?: string; hour?: number };
}

export interface HandleOutput {
  result: AgentResult;
  customer: Customer;
}

/* ------------------------------------------------------------------ */
/* Intent classification                                               */
/* ------------------------------------------------------------------ */

const RE = {
  human: rx(
    'insaan|human|owner|manager|malik|call kar|phone kar|baat karni|baat karna|customer care|representative|agent se'
  ),
  complaint: rx(
    'kharab|kharaab|phatta|fata|sour|khatta|smell|badbu|badboo|bekaar|kam aaya|kam tha|kam mila|kam aayi|late|der se|jaldi nahi|galat|missing|nahi aaya|nahi aayi|complaint|shikayat|quality|leak|tuta|टूटा|खराब|शिकायत|गलत|देर'
  ),
  cancel: rx(
    'cancel|kansal|permanently|aage nahi chahiye|shift ho raha|rehne ja raha|subscription band|order band|band kar do permanently'
  ),
  pause: rx(
    'band|bandh|roko|rok do|pause|chutti|chhutti|holiday|bahar|out of station|travel|mat bhej|mat bhejo|nahi bhejna|ghar par nahi|tyohaar|tyohar|diwali|बंद|छुट्टी|बाहर'
  ),
  resume: rx('shuru|chalu|resume|phir se|firse|wapas|wapis|restart|start|शुरू'),
  dues: rx(
    'paisa|paise|payment|due|bill|hisaab|hisab|baaki|bakaya|upi|pending|khat|khata|बिल|पैसा|बाकी'
  ),
  status: rx(
    'status|mera order|meri delivery|delivery kab|kab aayega|kab aayegi|schedule|kitna litre|order kya|details'
  ),
  address: rx('address|addres|pata|naam|name|rehta hoon|rehti hoon|रहता|पता'),
  price: rx(
    'price|rate|rates|kitne ka|kitna ka|kitne ka hai|menu|list|available|milega|milta|प्राइस|रेट|कीमत'
  ),
  orderVerb: rx(
    'order|chahiye|chaiye|chahie|bhej|bhejo|bhejna|bhejdo|deliver|mangwa|mangwana|lagao|dedo|de do|add|chalu karo|ऑर्डर|चाहिए|भेज'
  ),
  modify: rx('karo|kar do|kardo|badal|badlo|badal do|change|update|kam karo|zyada karo|increase|decrease'),
  greeting: rxStart(
    'hi|hii+|hello|hey|namaste|namaskar|salaam|salam|ram ram|good morning|good evening|good afternoon|hola|yo'
  ),
  thanks: rx(
    'thanks|thank you|thanku|dhanyavad|dhanyawad|shukriya|theek hai|thik hai|ok|okay|done'
  ),
  help: rx('help|madad|kya kar sakte|kya kya kar|options|how it works'),
};
export function classify(p: ParsedMessage): Intent {
  const n = p.norm;
  const strongOrder = Boolean(p.productSku) && p.qty !== undefined;

  if (RE.human.test(n)) return 'human';
  if (RE.complaint.test(n)) return 'complaint';
  if (RE.cancel.test(n)) return 'cancel';
  if (RE.pause.test(n)) return 'pause';
  if (RE.resume.test(n) && !strongOrder) return 'resume';
  if (RE.status.test(n)) return 'status';
  if (RE.dues.test(n)) return 'dues';
  if (RE.price.test(n) && p.qty === undefined) {
    // "doodh ka rate" is a price question; "2 litre ka rate" becomes an order.
    return 'menu';
  }
  if (RE.modify.test(n) && p.qty !== undefined) return 'modify';
  if (strongOrder) return 'order';
  if (RE.orderVerb.test(n)) return 'order';
  if (p.address) return 'address';
  if (RE.address.test(n)) return 'address';
  if (p.productSku) return 'menu';
  if (RE.greeting.test(n)) return 'greeting';
  if (RE.help.test(n)) return 'help';
  if (RE.thanks.test(n)) return 'thanks';
  return 'fallback';
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function defaultStart(today: string, hour: number): string {
  return hour >= ORDER_CUTOFF_HOUR ? addDays(today, 1) : today;
}

function amountFor(qty: number, price: number): number {
  return Math.round(qty * price * 100) / 100;
}

function findProduct(products: Product[], sku?: string): Product | undefined {
  return sku ? products.find((p) => p.sku === sku) : undefined;
}

interface Ctx {
  store: DataStore;
  customer: Customer;
  products: Product[];
  parsed: ParsedMessage;
  today: string;
  hour: number;
  session: Session | null;
  pending: PendingOrder | null;
  actions: AgentAction[];
  intent: Intent;
  text: string;
}

async function ensureDeliveries(
  ctx: Ctx,
  order: Order,
  from: string,
  to: string
): Promise<Delivery[]> {
  const existing = await ctx.store.listDeliveries({ orderId: order.id, from, to });
  const have = new Set(existing.filter((d) => d.status !== 'cancelled').map((d) => d.date));
  const pauses = await ctx.store.listPauses(order.customer_id);
  const dates = deliveryDates(order, from, to).filter((d) => !have.has(d));
  if (dates.length === 0) return [];
  return ctx.store.createDeliveries(
    dates.map((date) => ({
      order_id: order.id,
      customer_id: order.customer_id,
      product_id: order.product_id,
      date,
      qty: order.qty,
      amount: amountFor(order.qty, order.unit_price),
      status: isPausedOn(pauses, date) ? ('paused' as const) : ('scheduled' as const),
      paid: false,
    }))
  );
}

function summaryLine(products: Product[], order: Order, lang: Lang): string {
  const product = products.find((p) => p.id === order.product_id);
  if (!product) return '';
  return `• ${M.productLabel(product, lang)} — ${M.qtyLabel(order.qty, product.unit)}, ${frequencyLabel(order.frequency, lang)}`;
}

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */

async function createOrderFlow(ctx: Ctx): Promise<string> {
  const { parsed, products, pending, customer, today, hour } = ctx;

  if (parsed.address) {
    ctx.customer = (await ctx.store.updateCustomer(customer.id, { address: parsed.address })) ?? customer;
    ctx.actions.push({ type: 'customer_updated', summary: 'Address saved from chat' });
  }
  if (parsed.name) {
    ctx.customer = (await ctx.store.updateCustomer(customer.id, { name: parsed.name })) ?? ctx.customer;
    ctx.actions.push({ type: 'customer_updated', summary: `Name set to ${parsed.name}` });
  }

  const product =
    findProduct(products, parsed.productSku) ??
    (pending?.productId ? products.find((p) => p.id === pending.productId) : undefined);
  const qty = parsed.qty ?? pending?.qty;

  if (!product && qty === undefined) {
    // No usable slots at all — probably a generic "I want to order".
    ctx.pending = { awaiting: ['product'] };
    return M.askProduct(parsed.lang);
  }

  if (!product) {
    ctx.pending = { qty, awaiting: ['product'] };
    return M.askProduct(parsed.lang);
  }

  if (qty === undefined || qty <= 0) {
    ctx.pending = { productId: product.id, awaiting: ['qty'] };
    return M.askQty(product, parsed.lang);
  }

  const frequency: Frequency = parsed.frequency ?? pending?.frequency ?? 'daily';
  const startDate = parsed.startDate ?? pending?.startDate ?? defaultStart(today, hour);

  const order = await ctx.store.createOrder({
    customer_id: customer.id,
    product_id: product.id,
    qty,
    unit_price: product.price,
    frequency,
    start_date: startDate,
    status: isPausedOn(await ctx.store.listPauses(customer.id), startDate) ? 'paused' : 'active',
    note: null,
  });

  const windowEnd = addDays(startDate, frequency === 'once' ? 0 : BUSINESS.generateDays - 1);
  await ensureDeliveries(ctx, order, startDate, windowEnd);

  ctx.pending = null;
  ctx.actions.push({
    type: 'order_created',
    summary: `${qty} ${product.unit} ${product.name} ${frequency} from ${startDate}`,
    id: order.id,
  });

  return M.orderConfirmed({
    orderId: order.id,
    product,
    qty,
    frequency,
    startDate,
    amountPerDay: amountFor(qty, product.price),
    address: ctx.customer.address,
    lang: parsed.lang,
    customerName: ctx.customer.name,
  });
}

async function modifyOrderFlow(ctx: Ctx): Promise<string> {
  const { parsed, products, customer } = ctx;
  if (parsed.qty === undefined) return M.fallback(parsed.lang);

  const active = await ctx.store.listOrders({ customerId: customer.id, status: 'active' });
  if (active.length === 0) return createOrderFlow(ctx);

  const productForSku = findProduct(products, parsed.productSku);
  const target =
    (productForSku && active.find((o) => o.product_id === productForSku.id)) ||
    [...active].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const product = products.find((p) => p.id === target.product_id);
  if (!product) return M.fallback(parsed.lang);

  const qty = parsed.qty;
  await ctx.store.updateOrder(target.id, { qty });
  await ctx.store.updateDeliveriesWhere(
    { orderId: target.id, from: ctx.today, status: 'scheduled' },
    { qty, amount: amountFor(qty, target.unit_price) }
  );
  ctx.actions.push({
    type: 'order_created',
    summary: `Updated ${product.name} to ${qty} ${product.unit}`,
    id: target.id,
  });
  ctx.pending = null;
  return M.modifyConfirmed(product, qty, amountFor(qty, target.unit_price), parsed.lang);
}

async function pauseFlow(ctx: Ctx): Promise<string> {
  const { parsed, customer, today } = ctx;
  const from = parsed.pauseFrom ?? today;
  const to = parsed.pauseTo && parsed.pauseTo >= from ? parsed.pauseTo : from;

  const active = await ctx.store.listOrders({ customerId: customer.id, status: 'active' });
  if (active.length === 0) {
    ctx.pending = null;
    return M.noActiveOrder(parsed.lang);
  }

  await ctx.store.updateDeliveriesWhere(
    { customerId: customer.id, from, to, status: 'scheduled' },
    { status: 'paused' }
  );
  const pause = await ctx.store.createPause({
    customer_id: customer.id,
    start_date: from,
    end_date: to,
    reason: ctx.text.slice(0, 120),
  });
  if (from <= today) {
    for (const order of active) {
      await ctx.store.updateOrder(order.id, { status: 'paused' });
    }
  }
  ctx.pending = null;
  ctx.actions.push({
    type: 'pause_created',
    summary: `Paused ${from} → ${to}`,
    id: pause.id,
  });
  const days = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1);
  return M.pauseConfirmed(from, to, days, addDays(to, 1), parsed.lang);
}

async function resumeFlow(ctx: Ctx): Promise<string> {
  const { parsed, customer, today, products } = ctx;
  const resumeFrom =
    parsed.startDate && parsed.startDate >= today ? parsed.startDate : today;

  await ctx.store.endPauses(customer.id, addDays(resumeFrom, -1));

  const paused = await ctx.store.listOrders({ customerId: customer.id, status: 'paused' });
  const active = await ctx.store.listOrders({ customerId: customer.id, status: 'active' });

  if (paused.length === 0 && active.length === 0) {
    ctx.pending = null;
    return M.noActiveOrder(parsed.lang);
  }

  for (const order of paused) {
    await ctx.store.updateOrder(order.id, { status: 'active' });
  }

  await ctx.store.updateDeliveriesWhere(
    { customerId: customer.id, from: resumeFrom, to: addDays(resumeFrom, BUSINESS.generateDays - 1), status: 'paused' },
    { status: 'scheduled' }
  );

  const all = [...active, ...paused].map((o) => ({ ...o, status: 'active' as const }));
  for (const order of all) {
    await ensureDeliveries(
      ctx,
      order,
      resumeFrom,
      addDays(resumeFrom, BUSINESS.generateDays - 1)
    );
  }

  const upcoming = await ctx.store.listDeliveries({
    customerId: customer.id,
    from: resumeFrom,
    status: 'scheduled',
  });
  const nextDate = upcoming[0]?.date ?? resumeFrom;
  const summary = all
    .filter((o) => o.status === 'active')
    .map((o) => summaryLine(products, o, parsed.lang))
    .filter(Boolean)
    .join('\n');

  ctx.pending = null;
  ctx.actions.push({ type: 'resumed', summary: `Resumed from ${resumeFrom}` });
  return M.resumed(nextDate, summary, parsed.lang);
}

async function cancelFlow(ctx: Ctx): Promise<string> {
  const { customer, today, parsed } = ctx;
  const orders = await ctx.store.listOrders({ customerId: customer.id });
  const live = orders.filter((o) => o.status === 'active' || o.status === 'paused');
  if (live.length === 0) {
    ctx.pending = null;
    return M.noActiveOrder(parsed.lang);
  }
  for (const order of live) {
    await ctx.store.updateOrder(order.id, { status: 'cancelled' });
  }
  for (const status of ['scheduled', 'paused'] as const) {
    await ctx.store.updateDeliveriesWhere(
      { customerId: customer.id, from: today, status },
      { status: 'cancelled' }
    );
  }
  ctx.pending = null;
  ctx.actions.push({ type: 'cancelled', summary: `Cancelled ${live.length} order(s)` });
  return M.cancelled(parsed.lang);
}

async function duesFlow(ctx: Ctx): Promise<string> {
  const { customer, today, parsed } = ctx;
  const unpaid = (
    await ctx.store.listDeliveries({ customerId: customer.id, status: 'delivered' })
  ).filter((d) => !d.paid && d.date <= today);

  const amount = Math.round(unpaid.reduce((sum, d) => sum + d.amount, 0) * 100) / 100;
  const oldest = unpaid.length ? unpaid[0].date : undefined;
  return M.dues({ amount, count: unpaid.length, oldest }, parsed.lang, customer.name);
}

async function statusFlow(ctx: Ctx): Promise<string> {
  const { customer, today, products, parsed } = ctx;
  const active = await ctx.store.listOrders({ customerId: customer.id, status: 'active' });
  const items = active
    .map((o) => {
      const product = products.find((p) => p.id === o.product_id);
      if (!product) return null;
      return {
        product,
        qty: o.qty,
        unit: product.unit,
        price: amountFor(o.qty, o.unit_price),
        frequency: frequencyLabel(o.frequency, parsed.lang),
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const upcoming = await ctx.store.listDeliveries({
    customerId: customer.id,
    from: today,
    status: 'scheduled',
  });
  return M.orderStatus(items, upcoming[0]?.date ?? null, parsed.lang);
}

async function complaintFlow(ctx: Ctx): Promise<string> {
  const { customer, parsed } = ctx;
  const complaint = await ctx.store.createComplaint({
    customer_id: customer.id,
    kind: 'complaint',
    body: ctx.text.slice(0, 400),
    status: 'open',
  });
  ctx.pending = null;
  ctx.actions.push({
    type: 'complaint_logged',
    summary: ctx.text.slice(0, 80),
    id: complaint.id,
  });
  return M.complaintLogged(M.orderRef(complaint.id), parsed.lang, customer.name);
}

async function humanFlow(ctx: Ctx): Promise<string> {
  const { customer, parsed } = ctx;
  const ticket = await ctx.store.createComplaint({
    customer_id: customer.id,
    kind: 'handoff',
    body: ctx.text.slice(0, 400),
    status: 'open',
  });
  ctx.pending = null;
  ctx.actions.push({ type: 'handoff', summary: 'Owner callback requested', id: ticket.id });
  return M.handoff(parsed.lang);
}

async function addressFlow(ctx: Ctx): Promise<string> {
  const { customer, parsed } = ctx;
  const patch: Partial<Customer> = {};
  if (parsed.address) patch.address = parsed.address;
  if (parsed.name) patch.name = parsed.name;
  if (Object.keys(patch).length === 0) {
    return M.fallback(parsed.lang);
  }
  ctx.customer = (await ctx.store.updateCustomer(customer.id, patch)) ?? customer;
  ctx.actions.push({
    type: 'customer_updated',
    summary: parsed.address ? 'Address saved' : 'Name saved',
  });
  return M.addressSaved(ctx.customer.address ?? parsed.address ?? '', parsed.lang);
}

async function menuFlow(ctx: Ctx): Promise<string> {
  const { products, parsed } = ctx;
  const product = findProduct(products, parsed.productSku);
  return product ? M.productPrice(product, parsed.lang) : M.priceList(products, parsed.lang);
}

/* ------------------------------------------------------------------ */
/* Main entry                                                          */
/* ------------------------------------------------------------------ */

export async function handleMessage(input: HandleInput): Promise<HandleOutput> {
  const { store, waId, text } = input;
  const today = input.now?.today ?? todayISO();
  const hour = input.now?.hour ?? hourNow();

  let customer = await store.getCustomerByWaId(waId);
  if (!customer) {
    customer = await store.createCustomer({
      wa_id: waId,
      name: input.profileName ?? null,
      address: null,
      lang: detectLang(text, 'hinglish'),
      notes: null,
    });
  }

  const products = await store.listProducts();
  const parsed = parseMessage(text, { today, fallbackLang: customer.lang });
  if (parsed.lang !== customer.lang && !parsed.isBareNumber) {
    customer = (await store.updateCustomer(customer.id, { lang: parsed.lang })) ?? customer;
  }

  const session = await store.getSession(waId);
  let intent = classify(parsed);

  // Continue an unfinished order ("...kitna?" → "2 litre").
  if (
    session?.pending &&
    (intent === 'fallback' || intent === 'order' || intent === 'menu')
  ) {
    intent = 'order';
  }

  const ctx: Ctx = {
    store,
    customer,
    products,
    parsed,
    today,
    hour,
    session,
    pending: session?.pending ?? null,
    actions: [],
    intent,
    text,
  };

  let reply: string;
  switch (intent) {
    case 'order':
      reply = await createOrderFlow(ctx);
      break;
    case 'modify':
      reply = await modifyOrderFlow(ctx);
      break;
    case 'pause':
      reply = await pauseFlow(ctx);
      break;
    case 'resume':
      reply = await resumeFlow(ctx);
      break;
    case 'cancel':
      reply = await cancelFlow(ctx);
      break;
    case 'dues':
      reply = await duesFlow(ctx);
      break;
    case 'status':
      reply = await statusFlow(ctx);
      break;
    case 'complaint':
      reply = await complaintFlow(ctx);
      break;
    case 'human':
      reply = await humanFlow(ctx);
      break;
    case 'address':
      reply = await addressFlow(ctx);
      break;
    case 'menu':
      reply = await menuFlow(ctx);
      break;
    case 'greeting':
      ctx.pending = null;
      reply = M.greeting(customer.name, parsed.lang);
      break;
    case 'thanks':
      reply = M.thanks(parsed.lang);
      break;
    case 'help':
    case 'fallback':
    default:
      intent = intent === 'help' ? 'help' : 'fallback';
      if (ctx.pending) {
        reply = await createOrderFlow(ctx);
        if (reply === M.fallback(parsed.lang)) ctx.pending = null;
      } else {
        reply = M.fallback(parsed.lang);
      }
      break;
  }

  await store.addMessage({
    customer_id: customer.id,
    direction: 'in',
    body: text,
    intent,
  });
  await store.addMessage({
    customer_id: customer.id,
    direction: 'out',
    body: reply,
    intent,
  });

  const nextSession: Session = {
    wa_id: waId,
    customer_id: customer.id,
    pending: ctx.pending,
    last_intent: intent,
    updated_at: new Date().toISOString(),
  };
  await store.saveSession(nextSession);

  const result: AgentResult = {
    reply,
    intent,
    lang: parsed.lang,
    actions: ctx.actions,
  };
  return { result, customer: ctx.customer };
}

export { normalize };
