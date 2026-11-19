import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
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
import { buildSeed, type Db } from './seed';
import type { DataStore, DeliveryFilter } from './types';

function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function matchesDelivery(d: Delivery, f: DeliveryFilter): boolean {
  if (f.date && d.date !== f.date) return false;
  if (f.from && d.date < f.from) return false;
  if (f.to && d.date > f.to) return false;
  if (f.customerId && d.customer_id !== f.customerId) return false;
  if (f.orderId && d.order_id !== f.orderId) return false;
  if (f.status && d.status !== f.status) return false;
  return true;
}

/**
 * JSON-file backed store. Zero setup: works out of the box for local dev and
 * the Arena preview. Not meant for production (single writer, no locking).
 */
export class LocalStore implements DataStore {
  readonly mode = 'local' as const;
  private cache: Db | null = null;
  private loading: Promise<Db> | null = null;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private readonly file: string) {}

  private async read(): Promise<Db> {
    if (this.cache) return this.cache;
    // Single in-flight load, so concurrent first requests cannot seed twice.
    if (!this.loading) {
      this.loading = (async () => {
        try {
          const raw = await fs.readFile(this.file, 'utf8');
          this.cache = JSON.parse(raw) as Db;
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
          this.cache = buildSeed();
          await this.persist();
        }
        return this.cache as Db;
      })().finally(() => {
        this.loading = null;
      });
    }
    return this.loading;
  }

  private async persist(): Promise<void> {
    if (!this.cache) return;
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.${randomUUID()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.cache, null, 2), 'utf8');
    await fs.rename(tmp, this.file);
  }

  private mutate<T>(fn: (db: Db) => T): Promise<T> {
    const run = async () => {
      const db = await this.read();
      const out = fn(db);
      await this.persist();
      return out;
    };
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => undefined);
    return p;
  }

  async listProducts(): Promise<Product[]> {
    const db = await this.read();
    return db.products.filter((p) => p.active);
  }

  async getCustomerByWaId(waId: string): Promise<Customer | null> {
    const db = await this.read();
    return db.customers.find((c) => c.wa_id === waId) ?? null;
  }

  async getCustomer(id: string): Promise<Customer | null> {
    const db = await this.read();
    return db.customers.find((c) => c.id === id) ?? null;
  }

  async listCustomers(): Promise<Customer[]> {
    const db = await this.read();
    return [...db.customers].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async createCustomer(input: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
    return this.mutate((db) => {
      const existing = db.customers.find((c) => c.wa_id === input.wa_id);
      if (existing) return existing;
      const customer: Customer = {
        ...input,
        id: newId('c'),
        created_at: new Date().toISOString(),
      };
      db.customers.push(customer);
      return customer;
    });
  }

  async updateCustomer(id: string, patch: Partial<Customer>): Promise<Customer | null> {
    return this.mutate((db) => {
      const customer = db.customers.find((c) => c.id === id);
      if (!customer) return null;
      Object.assign(customer, patch, { id: customer.id, wa_id: customer.wa_id });
      return customer;
    });
  }

  async createOrder(input: Omit<Order, 'id' | 'created_at'>): Promise<Order> {
    return this.mutate((db) => {
      const order: Order = { ...input, id: newId('o'), created_at: new Date().toISOString() };
      db.orders.push(order);
      return order;
    });
  }

  async listOrders(filter?: { customerId?: string; status?: Order['status'] }): Promise<Order[]> {
    const db = await this.read();
    return db.orders.filter(
      (o) =>
        (!filter?.customerId || o.customer_id === filter.customerId) &&
        (!filter?.status || o.status === filter.status)
    );
  }

  async updateOrder(id: string, patch: Partial<Order>): Promise<Order | null> {
    return this.mutate((db) => {
      const order = db.orders.find((o) => o.id === id);
      if (!order) return null;
      Object.assign(order, patch, { id: order.id });
      return order;
    });
  }

  async createDeliveries(rows: Array<Omit<Delivery, 'id'>>): Promise<Delivery[]> {
    return this.mutate((db) => {
      const created = rows.map((row) => ({ ...row, id: newId('d') }));
      db.deliveries.push(...created);
      return created;
    });
  }

  async listDeliveries(filter?: DeliveryFilter): Promise<Delivery[]> {
    const db = await this.read();
    const f = filter ?? {};
    return db.deliveries.filter((d) => matchesDelivery(d, f)).sort((a, b) => a.date.localeCompare(b.date));
  }

  async updateDelivery(id: string, patch: Partial<Delivery>): Promise<Delivery | null> {
    return this.mutate((db) => {
      const delivery = db.deliveries.find((d) => d.id === id);
      if (!delivery) return null;
      Object.assign(delivery, patch, { id: delivery.id });
      return delivery;
    });
  }

  async updateDeliveriesWhere(filter: DeliveryFilter, patch: Partial<Delivery>): Promise<number> {
    return this.mutate((db) => {
      let count = 0;
      for (const delivery of db.deliveries) {
        if (!matchesDelivery(delivery, filter)) continue;
        Object.assign(delivery, patch, { id: delivery.id });
        count += 1;
      }
      return count;
    });
  }

  async createPause(input: Omit<Pause, 'id' | 'created_at'>): Promise<Pause> {
    return this.mutate((db) => {
      const pause: Pause = { ...input, id: newId('pz'), created_at: new Date().toISOString() };
      db.pauses.push(pause);
      return pause;
    });
  }

  async listPauses(customerId?: string): Promise<Pause[]> {
    const db = await this.read();
    return db.pauses.filter((p) => !customerId || p.customer_id === customerId);
  }

  async endPauses(customerId: string, iso: string): Promise<number> {
    return this.mutate((db) => {
      let count = 0;
      for (const pause of db.pauses) {
        if (pause.customer_id !== customerId) continue;
        if (pause.end_date < iso) continue;
        pause.end_date = iso;
        count += 1;
      }
      return count;
    });
  }

  async addMessage(input: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    return this.mutate((db) => {
      const message: Message = { ...input, id: newId('m'), created_at: new Date().toISOString() };
      db.messages.push(message);
      return message;
    });
  }

  async listMessages(customerId: string, limit = 50): Promise<Message[]> {
    const db = await this.read();
    return db.messages
      .filter((m) => m.customer_id === customerId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(-limit);
  }

  async createComplaint(input: Omit<Complaint, 'id' | 'created_at'>): Promise<Complaint> {
    return this.mutate((db) => {
      const complaint: Complaint = {
        ...input,
        id: newId('cp'),
        created_at: new Date().toISOString(),
      };
      db.complaints.push(complaint);
      return complaint;
    });
  }

  async listComplaints(): Promise<Complaint[]> {
    const db = await this.read();
    return [...db.complaints].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async updateComplaint(id: string, patch: Partial<Complaint>): Promise<Complaint | null> {
    return this.mutate((db) => {
      const complaint = db.complaints.find((c) => c.id === id);
      if (!complaint) return null;
      Object.assign(complaint, patch, { id: complaint.id });
      return complaint;
    });
  }

  async getSession(waId: string): Promise<Session | null> {
    const db = await this.read();
    return db.sessions.find((s) => s.wa_id === waId) ?? null;
  }

  async saveSession(session: Session): Promise<void> {
    await this.mutate((db) => {
      const idx = db.sessions.findIndex((s) => s.wa_id === session.wa_id);
      if (idx >= 0) db.sessions[idx] = session;
      else db.sessions.push(session);
    });
  }
}
