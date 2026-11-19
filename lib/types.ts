export type Lang = 'hinglish' | 'hindi' | 'english';

export type Frequency = 'daily' | 'alternate' | 'weekly' | 'once';

export type DeliveryStatus = 'scheduled' | 'delivered' | 'paused' | 'cancelled';

export type OrderStatus = 'active' | 'paused' | 'cancelled' | 'completed';

export interface Product {
  id: string;
  sku: string;
  name: string;
  nameHi: string;
  unit: string;
  price: number;
  active: boolean;
}

export interface Customer {
  id: string;
  wa_id: string;
  name: string | null;
  address: string | null;
  lang: Lang;
  notes: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  product_id: string;
  qty: number;
  unit_price: number;
  frequency: Frequency;
  start_date: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
}

export interface Delivery {
  id: string;
  order_id: string;
  customer_id: string;
  product_id: string;
  date: string;
  qty: number;
  amount: number;
  status: DeliveryStatus;
  paid: boolean;
}

export interface Pause {
  id: string;
  customer_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  customer_id: string;
  direction: 'in' | 'out';
  body: string;
  intent: string | null;
  created_at: string;
}

export type ComplaintStatus = 'open' | 'resolved';

export interface Complaint {
  id: string;
  customer_id: string;
  kind: 'complaint' | 'handoff';
  body: string;
  status: ComplaintStatus;
  created_at: string;
}

export interface PendingOrder {
  productId?: string;
  qty?: number;
  frequency?: Frequency;
  startDate?: string;
  awaiting: Array<'qty' | 'product' | 'address'>;
}

export interface Session {
  wa_id: string;
  customer_id: string;
  pending: PendingOrder | null;
  last_intent: string | null;
  updated_at: string;
}

export interface AgentAction {
  type:
    | 'order_created'
    | 'pause_created'
    | 'resumed'
    | 'cancelled'
    | 'complaint_logged'
    | 'handoff'
    | 'customer_updated'
    | 'none';
  summary: string;
  id?: string;
}

export interface AgentResult {
  reply: string;
  intent: string;
  lang: Lang;
  actions: AgentAction[];
}

export interface DashboardStats {
  date: string;
  litresToday: number;
  revenueToday: number;
  revenue7d: number;
  activeSubscriptions: number;
  customers: number;
  dues: number;
  openComplaints: number;
}
