// Tipos alinhados com o schema real do Supabase (order_intents, payments, kitchen_events)

export type WaiterStatus = 'pending' | 'preparing' | 'ready' | 'delivered';
export type KitchenStatus = 'waiting' | 'preparing' | 'ready';
export type PaymentMethod = 'cash' | 'card' | 'pix';
export type PaymentStatus = 'pending' | 'confirmed' | 'failed';
export type KitchenEventType = 'order_received' | 'prep_started' | 'ready' | 'served';

export interface OrderIntent {
  id: string;
  restaurant_id: string;
  unit_id: string;
  items: OrderItem[];
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  table_number: number | null;
  notes: string | null;
  waiter_status: WaiterStatus;
  kitchen_status: KitchenStatus;
  payment_method: PaymentMethod | null;
  paid_at: string | null;
  kitchen_printed_at: string | null;
  waiter_confirmed_at: string | null;
  whatsapp_link: string | null;
  whatsapp_sent_at: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  variation?: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  processed_at: string;
  created_at: string;
}

export interface KitchenEvent {
  id: string;
  order_id: string;
  event_type: KitchenEventType;
  created_at: string;
}

// Agrupamento por coluna do Kanban
export interface KanbanColumn {
  id: KitchenStatus;
  label: string;
  color: string;
  orders: OrderIntent[];
}
