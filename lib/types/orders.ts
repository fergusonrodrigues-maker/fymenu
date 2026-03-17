export interface OrderItem {
  product_id: string;
  variation_id?: string;
  qty: number;
  unit_price: number;
  total: number;
  status: 'available' | 'out_of_stock';
  code_name?: string;
}

export interface OrderIntent {
  id: string;
  restaurant_id: string;
  unit_id: string;
  items: OrderItem[];
  status: 'draft' | 'sent' | 'confirmed' | 'expired' | 'canceled';
  subtotal: number;
  discount: number;
  total: number;
  whatsapp_link?: string;
  whatsapp_sent_at?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export type OrderItemInput = Omit<OrderItem, 'total'> & { qty: number; unit_price: number };
