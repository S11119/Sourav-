import type {
  Complaint,
  Customer,
  Delivery,
  DeliveryStatus,
  Message,
  Order,
  Pause,
  Product,
  Session,
} from '../types';

export interface DeliveryFilter {
  date?: string;
  from?: string;
  to?: string;
  customerId?: string;
  orderId?: string;
  status?: DeliveryStatus;
}

export interface DataStore {
  /** 'local' (JSON file) or 'supabase' */
  readonly mode: 'local' | 'supabase';

  listProducts(): Promise<Product[]>;

  getCustomerByWaId(waId: string): Promise<Customer | null>;
  getCustomer(id: string): Promise<Customer | null>;
  listCustomers(): Promise<Customer[]>;
  createCustomer(input: Omit<Customer, 'id' | 'created_at'>): Promise<Customer>;
  updateCustomer(id: string, patch: Partial<Customer>): Promise<Customer | null>;

  createOrder(input: Omit<Order, 'id' | 'created_at'>): Promise<Order>;
  listOrders(filter?: { customerId?: string; status?: Order['status'] }): Promise<Order[]>;
  updateOrder(id: string, patch: Partial<Order>): Promise<Order | null>;

  createDeliveries(rows: Array<Omit<Delivery, 'id'>>): Promise<Delivery[]>;
  listDeliveries(filter?: DeliveryFilter): Promise<Delivery[]>;
  updateDelivery(id: string, patch: Partial<Delivery>): Promise<Delivery | null>;
  updateDeliveriesWhere(
    filter: DeliveryFilter,
    patch: Partial<Delivery>
  ): Promise<number>;

  createPause(input: Omit<Pause, 'id' | 'created_at'>): Promise<Pause>;
  listPauses(customerId?: string): Promise<Pause[]>;
  /** Close any pause overlapping `iso` so deliveries can restart. */
  endPauses(customerId: string, iso: string): Promise<number>;

  addMessage(input: Omit<Message, 'id' | 'created_at'>): Promise<Message>;
  listMessages(customerId: string, limit?: number): Promise<Message[]>;

  createComplaint(input: Omit<Complaint, 'id' | 'created_at'>): Promise<Complaint>;
  listComplaints(): Promise<Complaint[]>;
  updateComplaint(id: string, patch: Partial<Complaint>): Promise<Complaint | null>;

  getSession(waId: string): Promise<Session | null>;
  saveSession(session: Session): Promise<void>;
}
