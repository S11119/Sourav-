import { CATALOG } from '../catalog';
import { addDays, todayISO } from '../date';
import { deliveryDates, isPausedOn } from '../schedule';
import type {
  Complaint,
  Customer,
  Delivery,
  Message,
  Order,
  Pause,
  Product,
  Session,
} from '../types';

export interface Db {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  deliveries: Delivery[];
  pauses: Pause[];
  messages: Message[];
  complaints: Complaint[];
  sessions: Session[];
}

const stamp = (date: string, time: string) => `${date}T${time}:00.000Z`;

/**
 * Demo dataset so the dashboard and the chat simulator are useful on first run:
 * 5 customers, 8 subscriptions, a week of delivery history, dues and one pause.
 */
export function buildSeed(): Db {
  const today = todayISO();
  const yesterday = addDays(today, -1);

  const products = CATALOG.map((p) => ({ ...p }));
  const price = (sku: string) => products.find((p) => p.sku === sku)!.price;
  const pid = (sku: string) => products.find((p) => p.sku === sku)!.id;

  const customers: Customer[] = [
    {
      id: 'c_rahul',
      wa_id: '919820000001',
      name: 'Rahul Sharma',
      address: 'B-402, Shanti Nivas, Andheri West',
      lang: 'hinglish',
      notes: 'Prefers delivery before 6:30 AM',
      created_at: stamp(addDays(today, -30), '07:10'),
    },
    {
      id: 'c_priya',
      wa_id: '919820000002',
      name: 'Priya Mehta',
      address: '12/A, Pearl Residency, Lokhandwala',
      lang: 'hindi',
      notes: null,
      created_at: stamp(addDays(today, -45), '08:05'),
    },
    {
      id: 'c_imran',
      wa_id: '919820000003',
      name: 'Imran Khan',
      address: 'Shop 3, Crystal Plaza, Andheri West',
      lang: 'hinglish',
      notes: 'Shop delivery, please call on arrival',
      created_at: stamp(addDays(today, -60), '06:40'),
    },
    {
      id: 'c_sneha',
      wa_id: '919820000004',
      name: 'Sneha Patil',
      address: '7, Sunrise CHS, Four Bungalows',
      lang: 'english',
      notes: null,
      created_at: stamp(addDays(today, -15), '07:55'),
    },
    {
      id: 'c_vikram',
      wa_id: '919820000005',
      name: 'Vikram Rao',
      address: 'A-9, Green Meadows, Versova',
      lang: 'hinglish',
      notes: 'Pays monthly on the 1st',
      created_at: stamp(addDays(today, -21), '09:20'),
    },
  ];

  type SeedOrder = Omit<Order, 'id' | 'created_at'> & { id: string; createdOffset: number };
  const orderSeeds: SeedOrder[] = [
    { id: 'o_1', customer_id: 'c_rahul', product_id: pid('COW'), qty: 1, unit_price: price('COW'), frequency: 'daily', start_date: addDays(today, -30), status: 'active', note: null, createdOffset: -30 },
    { id: 'o_2', customer_id: 'c_rahul', product_id: pid('CURD'), qty: 0.5, unit_price: price('CURD'), frequency: 'alternate', start_date: addDays(today, -20), status: 'active', note: null, createdOffset: -20 },
    { id: 'o_3', customer_id: 'c_priya', product_id: pid('BUFFALO'), qty: 1.5, unit_price: price('BUFFALO'), frequency: 'daily', start_date: addDays(today, -45), status: 'paused', note: 'Travel pause', createdOffset: -45 },
    { id: 'o_4', customer_id: 'c_imran', product_id: pid('COW'), qty: 0.5, unit_price: price('COW'), frequency: 'daily', start_date: addDays(today, -60), status: 'active', note: null, createdOffset: -60 },
    { id: 'o_5', customer_id: 'c_imran', product_id: pid('PANEER'), qty: 0.25, unit_price: price('PANEER'), frequency: 'weekly', start_date: addDays(today, -28), status: 'active', note: 'Sunday paneer', createdOffset: -28 },
    { id: 'o_6', customer_id: 'c_sneha', product_id: pid('COW'), qty: 2, unit_price: price('COW'), frequency: 'alternate', start_date: addDays(today, -15), status: 'active', note: null, createdOffset: -15 },
    { id: 'o_7', customer_id: 'c_vikram', product_id: pid('CURD'), qty: 1, unit_price: price('CURD'), frequency: 'weekly', start_date: addDays(today, -21), status: 'active', note: null, createdOffset: -21 },
    { id: 'o_8', customer_id: 'c_vikram', product_id: pid('COW'), qty: 1, unit_price: price('COW'), frequency: 'daily', start_date: addDays(today, -12), status: 'active', note: null, createdOffset: -12 },
  ];

  const orders: Order[] = orderSeeds.map(({ createdOffset, ...o }) => ({
    ...o,
    created_at: stamp(addDays(today, createdOffset), '07:00'),
  }));

  const pauses: Pause[] = [
    {
      id: 'pz_1',
      customer_id: 'c_priya',
      start_date: yesterday,
      end_date: addDays(today, 2),
      reason: 'Out of station',
      created_at: stamp(yesterday, '08:30'),
    },
  ];

  // A week of past deliveries + upcoming ones.
  const deliveries: Delivery[] = [];
  let counter = 1;
  for (const order of orders) {
    const dates = deliveryDates(order, addDays(today, -7), addDays(today, 6));
    const customerPauses = pauses.filter((p) => p.customer_id === order.customer_id);
    for (const date of dates) {
      const past = date < today;
      const paused = isPausedOn(customerPauses, date);
      // Early-morning drops for two customers are already done by the time you open the demo.
      const doneToday =
        date === today && (order.customer_id === 'c_rahul' || order.customer_id === 'c_imran');
      const unpaid =
        ((past || doneToday) && !paused &&
          ((order.customer_id === 'c_vikram' && date >= addDays(today, -3)) ||
            (order.customer_id === 'c_sneha' && date === yesterday))) ||
        (doneToday && order.customer_id === 'c_imran');
      deliveries.push({
        id: `d_${counter++}`,
        order_id: order.id,
        customer_id: order.customer_id,
        product_id: order.product_id,
        date,
        qty: order.qty,
        amount: Math.round(order.qty * order.unit_price * 100) / 100,
        status: paused ? 'paused' : past || doneToday ? 'delivered' : 'scheduled',
        paid: past || doneToday ? !unpaid : false,
      });
    }
  }

  const messages: Message[] = [
    { id: 'm_1', customer_id: 'c_rahul', direction: 'in', body: 'Hi, kal se 2 litre cow milk chahiye', intent: 'order', created_at: stamp(addDays(today, -3), '20:12') },
    { id: 'm_2', customer_id: 'c_rahul', direction: 'out', body: 'Namaste Rahul ji! ✅ 2 litre Cow Milk kal se roz ke liye add ho gaya — ₹120/din. Kuch aur chahiye?', intent: 'order', created_at: stamp(addDays(today, -3), '20:12') },
    { id: 'm_3', customer_id: 'c_priya', direction: 'in', body: 'Kal se 3 din ke liye doodh band kar do, ghar par nahi hai', intent: 'pause', created_at: stamp(yesterday, '08:28') },
    { id: 'm_4', customer_id: 'c_priya', direction: 'out', body: 'Theek hai Priya ji 🙏 3 din ki delivery pause kar di — billing me bhi nahi lagega. Wapas aane par "start" likh dena.', intent: 'pause', created_at: stamp(yesterday, '08:29') },
    { id: 'm_5', customer_id: 'c_sneha', direction: 'in', body: 'Aaj ka doodh kam aaya, 1.5 litre hi tha', intent: 'complaint', created_at: stamp(yesterday, '07:40') },
    { id: 'm_6', customer_id: 'c_sneha', direction: 'out', body: 'Sorry Sneha ji! 😔 Complaint note kar li, aaj ke ₹30 adjust honge aur kal se poora 2 litre milega.', intent: 'complaint', created_at: stamp(yesterday, '07:41') },
  ];

  const complaints: Complaint[] = [
    {
      id: 'cp_1',
      customer_id: 'c_sneha',
      kind: 'complaint',
      body: 'Aaj ka doodh kam aaya — 2 litre ke bajaye 1.5 litre',
      status: 'open',
      created_at: stamp(yesterday, '07:40'),
    },
    {
      id: 'cp_2',
      customer_id: 'c_rahul',
      kind: 'complaint',
      body: 'Packet 6:45 baje aaya, thoda late',
      status: 'resolved',
      created_at: stamp(addDays(today, -6), '06:50'),
    },
  ];

  return {
    products,
    customers,
    orders,
    deliveries,
    pauses,
    messages,
    complaints,
    sessions: [],
  };
}
