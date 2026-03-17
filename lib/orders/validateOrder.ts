import type { OrderItemInput, OrderItem } from '@/lib/types/orders';

export function calculateItemTotal(qty: number, unitPrice: number): number {
  if (qty < 1 || unitPrice < 0) return 0;
  return Number((qty * unitPrice).toFixed(2));
}

export function validateOrderItem(item: OrderItemInput): OrderItem | null {
  const { qty, unit_price } = item;

  if (!item.product_id) return null;
  if (qty < 1) return null;
  if (unit_price < 0) return null;

  return {
    ...item,
    total: calculateItemTotal(qty, unit_price),
  };
}

export function calculateOrderTotals(items: OrderItem[], discount = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const total = Math.max(0, subtotal - discount);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

export function isValidOrder(items: OrderItem[], total: number): boolean {
  if (!items || items.length === 0) return false;
  if (total <= 0) return false;
  return true;
}

export function formatPrice(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}
