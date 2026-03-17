import type { OrderIntent } from '@/lib/types/orders';

export function buildOrderMessage(order: OrderIntent, restaurantName: string): string {
  if (!order.items || order.items.length === 0) {
    return 'Nenhum item no pedido.';
  }

  const codeName = `PED${order.id.slice(0, 8).toUpperCase()}`;
  const lines: string[] = [];

  lines.push(`*Pedido #${codeName}*`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━');

  order.items.forEach((item) => {
    const itemTotal = item.qty * item.unit_price;
    const itemName = item.code_name || `Item #${item.product_id.slice(0, 4)}`;

    lines.push(`${item.qty}x ${itemName}`);
    lines.push(`  R$ ${item.unit_price.toFixed(2).replace('.', ',')} c/u = R$ ${itemTotal.toFixed(2).replace('.', ',')}`);
  });

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━');

  if (order.discount && order.discount > 0) {
    lines.push(`Desconto: -R$ ${order.discount.toFixed(2).replace('.', ',')}`);
  }

  lines.push(`*Total: R$ ${order.total.toFixed(2).replace('.', ',')}*`);
  lines.push('');
  lines.push(restaurantName);

  return lines.join('\n');
}

export function buildWhatsAppLink(phoneNumber: string, message: string): string {
  const encodedMsg = encodeURIComponent(message);
  return `https://wa.me/${phoneNumber}?text=${encodedMsg}`;
}

export function isValidWhatsAppNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}
