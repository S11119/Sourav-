import { addDays, todayISO } from './date';
import { getStore, supabaseConfigured } from './store';
import type { Complaint, Customer, DashboardStats, Delivery, Order, Product } from './types';

export interface DeliveryRow {
  delivery: Delivery;
  customer: Customer | undefined;
  product: Product | undefined;
  order: Order | undefined;
}

export interface DueRow {
  customer: Customer;
  amount: number;
  count: number;
  oldest: string;
}

export interface DashboardData {
  mode: 'local' | 'supabase';
  today: string;
  stats: DashboardStats;
  todayRows: DeliveryRow[];
  upcoming: Array<{ date: string; rows: DeliveryRow[] }>;
  duesRows: DueRow[];
  activeOrders: Array<{ order: Order; customer: Customer | undefined; product: Product | undefined }>;
  customers: Customer[];
  complaints: Array<{ complaint: Complaint; customer: Customer | undefined }>;
}

function joinRows(
  deliveries: Delivery[],
  customers: Customer[],
  products: Product[],
  orders: Order[]
): DeliveryRow[] {
  const byCustomer = new Map(customers.map((c) => [c.id, c]));
  const byProduct = new Map(products.map((p) => [p.id, p]));
  const byOrder = new Map(orders.map((o) => [o.id, o]));
  return deliveries.map((delivery) => ({
    delivery,
    customer: byCustomer.get(delivery.customer_id),
    product: byProduct.get(delivery.product_id),
    order: byOrder.get(delivery.order_id),
  }));
}

export async function loadDashboardData(): Promise<DashboardData> {
  const store = getStore();
  const today = todayISO();
  const weekAgo = addDays(today, -7);

  const [cus, prod, ords, comps, windowDeliveries] = await Promise.all([
    store.listCustomers(),
    store.listProducts(),
    store.listOrders(),
    store.listComplaints(),
    store.listDeliveries({ from: weekAgo, to: addDays(today, 6) }),
  ]);

  const customers = cus;
  const products = prod;
  const orders = ords;
  const complaints = comps;
  const todayDeliveries = windowDeliveries.filter((d) => d.date === today);

  const stats: DashboardStats = {
    date: today,
    litresToday: 0,
    revenueToday: 0,
    revenue7d: 0,
    activeSubscriptions: orders.filter((o) => o.status === 'active' || o.status === 'paused').length,
    customers: customers.length,
    dues: 0,
    openComplaints: complaints.filter((c) => c.status === 'open').length,
  };

  for (const d of windowDeliveries) {
    if (d.date === today && d.status !== 'paused' && d.status !== 'cancelled') {
      stats.litresToday += d.qty;
    }
    if (d.paid) stats.revenue7d += d.amount;
    if (d.date === today && d.status === 'delivered') stats.revenueToday += d.amount;
  }

  // Load the full unpaid history for dues (not only the 7-day window).
  const unpaid = (await store.listDeliveries({ status: 'delivered' })).filter(
    (d) => !d.paid && d.date <= today
  );
  stats.dues = Math.round(unpaid.reduce((sum, d) => sum + d.amount, 0) * 100) / 100;

  const dueMap = new Map<string, DueRow>();
  for (const d of unpaid) {
    const customer = customers.find((c) => c.id === d.customer_id);
    if (!customer) continue;
    const row = dueMap.get(customer.id) ?? { customer, amount: 0, count: 0, oldest: d.date };
    row.amount = Math.round((row.amount + d.amount) * 100) / 100;
    row.count += 1;
    if (d.date < row.oldest) row.oldest = d.date;
    dueMap.set(customer.id, row);
  }

  const upcoming: Array<{ date: string; rows: DeliveryRow[] }> = [];
  for (let i = 1; i <= 6; i += 1) {
    const date = addDays(today, i);
    const rows = joinRows(
      windowDeliveries.filter((d) => d.date === date && d.status !== 'cancelled'),
      customers,
      products,
      orders
    );
    upcoming.push({ date, rows });
  }

  return {
    mode: supabaseConfigured() ? 'supabase' : 'local',
    today,
    stats,
    todayRows: joinRows(todayDeliveries, customers, products, orders),
    upcoming,
    duesRows: [...dueMap.values()].sort((a, b) => b.amount - a.amount),
    activeOrders: orders
      .filter((o) => o.status === 'active' || o.status === 'paused')
      .map((order) => ({
        order,
        customer: customers.find((c) => c.id === order.customer_id),
        product: products.find((p) => p.id === order.product_id),
      })),
    customers,
    complaints: complaints.map((complaint) => ({
      complaint,
      customer: customers.find((c) => c.id === complaint.customer_id),
    })),
  };
}
