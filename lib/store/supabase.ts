import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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
import type { DataStore, DeliveryFilter } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`Supabase ${what} failed: ${error?.message ?? 'unknown error'}`);
}

/** Postgres-backed store. Used when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set. */
export class SupabaseStore implements DataStore {
  readonly mode = 'supabase' as const;
  private sb: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.sb = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async listProducts(): Promise<Product[]> {
    const { data, error } = await this.sb
      .from('products')
      .select('*')
      .eq('active', true)
      .order('price', { ascending: true });
    if (error) fail('listProducts', error);
    return (data ?? []) as Product[];
  }

  async getCustomerByWaId(waId: string): Promise<Customer | null> {
    const { data, error } = await this.sb
      .from('customers')
      .select('*')
      .eq('wa_id', waId)
      .maybeSingle();
    if (error) fail('getCustomerByWaId', error);
    return (data as Customer) ?? null;
  }

  async getCustomer(id: string): Promise<Customer | null> {
    const { data, error } = await this.sb.from('customers').select('*').eq('id', id).maybeSingle();
    if (error) fail('getCustomer', error);
    return (data as Customer) ?? null;
  }

  async listCustomers(): Promise<Customer[]> {
    const { data, error } = await this.sb
      .from('customers')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) fail('listCustomers', error);
    return (data ?? []) as Customer[];
  }

  async createCustomer(input: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
    const existing = await this.getCustomerByWaId(input.wa_id);
    if (existing) return existing;
    const { data, error } = await this.sb.from('customers').insert(input).select('*').single();
    if (error) fail('createCustomer', error);
    return data as Customer;
  }

  async updateCustomer(id: string, patch: Partial<Customer>): Promise<Customer | null> {
    const { id: _ignored, wa_id: _wa, ...rest } = patch;
    const { data, error } = await this.sb
      .from('customers')
      .update(rest)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) fail('updateCustomer', error);
    return (data as Customer) ?? null;
  }

  async createOrder(input: Omit<Order, 'id' | 'created_at'>): Promise<Order> {
    const { data, error } = await this.sb.from('orders').insert(input).select('*').single();
    if (error) fail('createOrder', error);
    return data as Order;
  }

  async listOrders(filter?: { customerId?: string; status?: Order['status'] }): Promise<Order[]> {
    let query = this.sb.from('orders').select('*');
    if (filter?.customerId) query = query.eq('customer_id', filter.customerId);
    if (filter?.status) query = query.eq('status', filter.status);
    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) fail('listOrders', error);
    return (data ?? []) as Order[];
  }

  async updateOrder(id: string, patch: Partial<Order>): Promise<Order | null> {
    const { id: _ignored, ...rest } = patch;
    const { data, error } = await this.sb
      .from('orders')
      .update(rest)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) fail('updateOrder', error);
    return (data as Order) ?? null;
  }

  async createDeliveries(rows: Array<Omit<Delivery, 'id'>>): Promise<Delivery[]> {
    if (rows.length === 0) return [];
    const { data, error } = await this.sb.from('deliveries').insert(rows).select('*');
    if (error) fail('createDeliveries', error);
    return (data ?? []) as Delivery[];
  }

  private deliveryQuery(filter?: DeliveryFilter) {
    let query = this.sb.from('deliveries').select('*');
    if (filter?.date) query = query.eq('date', filter.date);
    if (filter?.from) query = query.gte('date', filter.from);
    if (filter?.to) query = query.lte('date', filter.to);
    if (filter?.customerId) query = query.eq('customer_id', filter.customerId);
    if (filter?.orderId) query = query.eq('order_id', filter.orderId);
    if (filter?.status) query = query.eq('status', filter.status);
    return query;
  }

  async listDeliveries(filter?: DeliveryFilter): Promise<Delivery[]> {
    const { data, error } = await this.deliveryQuery(filter).order('date', { ascending: true });
    if (error) fail('listDeliveries', error);
    return (data ?? []) as Delivery[];
  }

  async updateDelivery(id: string, patch: Partial<Delivery>): Promise<Delivery | null> {
    const { id: _ignored, ...rest } = patch;
    const { data, error } = await this.sb
      .from('deliveries')
      .update(rest)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) fail('updateDelivery', error);
    return (data as Delivery) ?? null;
  }

  async updateDeliveriesWhere(filter: DeliveryFilter, patch: Partial<Delivery>): Promise<number> {
    const { id: _ignored, ...rest } = patch;
    let query = this.sb.from('deliveries').update(rest);
    if (filter.date) query = query.eq('date', filter.date);
    if (filter.from) query = query.gte('date', filter.from);
    if (filter.to) query = query.lte('date', filter.to);
    if (filter.customerId) query = query.eq('customer_id', filter.customerId);
    if (filter.orderId) query = query.eq('order_id', filter.orderId);
    if (filter.status) query = query.eq('status', filter.status);
    const { data, error } = await query.select('id');
    if (error) fail('updateDeliveriesWhere', error);
    return (data ?? []).length;
  }

  async createPause(input: Omit<Pause, 'id' | 'created_at'>): Promise<Pause> {
    const { data, error } = await this.sb.from('pauses').insert(input).select('*').single();
    if (error) fail('createPause', error);
    return data as Pause;
  }

  async listPauses(customerId?: string): Promise<Pause[]> {
    let query = this.sb.from('pauses').select('*');
    if (customerId) query = query.eq('customer_id', customerId);
    const { data, error } = await query;
    if (error) fail('listPauses', error);
    return (data ?? []) as Pause[];
  }

  async endPauses(customerId: string, iso: string): Promise<number> {
    const { data, error } = await this.sb
      .from('pauses')
      .update({ end_date: iso })
      .eq('customer_id', customerId)
      .gte('end_date', iso)
      .select('id');
    if (error) fail('endPauses', error);
    return (data ?? []).length;
  }

  async addMessage(input: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    const { data, error } = await this.sb.from('messages').insert(input).select('*').single();
    if (error) fail('addMessage', error);
    return data as Message;
  }

  async listMessages(customerId: string, limit = 50): Promise<Message[]> {
    const { data, error } = await this.sb
      .from('messages')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) fail('listMessages', error);
    return ((data ?? []) as Message[]).reverse();
  }

  async createComplaint(input: Omit<Complaint, 'id' | 'created_at'>): Promise<Complaint> {
    const { data, error } = await this.sb.from('complaints').insert(input).select('*').single();
    if (error) fail('createComplaint', error);
    return data as Complaint;
  }

  async listComplaints(): Promise<Complaint[]> {
    const { data, error } = await this.sb
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) fail('listComplaints', error);
    return (data ?? []) as Complaint[];
  }

  async updateComplaint(id: string, patch: Partial<Complaint>): Promise<Complaint | null> {
    const { id: _ignored, ...rest } = patch;
    const { data, error } = await this.sb
      .from('complaints')
      .update(rest)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) fail('updateComplaint', error);
    return (data as Complaint) ?? null;
  }

  async getSession(waId: string): Promise<Session | null> {
    const { data, error } = await this.sb
      .from('sessions')
      .select('*')
      .eq('wa_id', waId)
      .maybeSingle();
    if (error) fail('getSession', error);
    return (data as Session) ?? null;
  }

  async saveSession(session: Session): Promise<void> {
    const { error } = await this.sb.from('sessions').upsert(session, { onConflict: 'wa_id' });
    if (error) fail('saveSession', error);
  }
}
