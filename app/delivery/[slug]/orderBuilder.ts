import { Product, ProductVariation } from "./menuTypes";

export interface UpsellItem {
  id: string;
  name: string;
  price: number;
}

export interface OrderPayload {
  product: Product;
  variation?: ProductVariation;
  upsells: UpsellItem[];
  total: number;
}

export function buildOrderPayload(
  product: Product,
  variation: ProductVariation | undefined,
  upsells: UpsellItem[]
): OrderPayload {
  const basePrice = variation?.price ?? product.base_price ?? 0;
  const upsellTotal = upsells.reduce((sum, u) => sum + u.price, 0);
  const total = Number(basePrice) + upsellTotal;

  return {
    product,
    variation,
    upsells,
    total,
  };
}

export function buildWhatsAppMessage(
  payload: OrderPayload,
  whatsapp: string,
  customerName?: string,
  customerPhone?: string
): string {
  const lines: string[] = [];

  lines.push("Olá! Quero fazer um pedido:");
  lines.push("");
  lines.push(`*${payload.product.name}*`);

  if (payload.variation) {
    lines.push(`   Opção: ${payload.variation.name}`);
  }

  if (payload.upsells.length > 0) {
    lines.push("");
    lines.push("Adicionais:");
    payload.upsells.forEach((u) => {
      lines.push(`   + ${u.name} — R$${Number(u.price).toFixed(2).replace(".", ",")}`);
    });
  }

  lines.push("");
  lines.push(
    `Total estimado: R$${Number(payload.total).toFixed(2).replace(".", ",")}`
  );

  if (customerName?.trim()) {
    lines.push("");
    lines.push(`Nome: ${customerName.trim()}`);
  }
  if (customerPhone && customerPhone.replace(/\D/g, "").length >= 10) {
    lines.push(`Tel: ${customerPhone}`);
  }

  const text = encodeURIComponent(lines.join("\n"));
  const phone = whatsapp.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${text}`;
}

export function buildExternalLink(
  orderLink: string,
  _payload: OrderPayload
): string {
  return orderLink;
}

export function formatPrice(value: number): string {
  return `R$${Number(value).toFixed(2).replace(".", ",")}`;
}

// Multi-item cart WhatsApp message
export interface CartOrderItem {
  name: string;
  qty: number;
  unit_price: number;
}

export function buildCartWhatsAppMessage(
  items: CartOrderItem[],
  whatsapp: string,
  customerName?: string,
  customerPhone?: string
): string {
  const lines: string[] = [];
  lines.push("Olá! Quero fazer um pedido:");
  lines.push("");

  items.forEach((item) => {
    lines.push(`*${item.name}*  x${item.qty}  —  R$${(item.unit_price * item.qty).toFixed(2).replace(".", ",")}`);
  });

  const total = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  lines.push("");
  lines.push(`Total estimado: R$${total.toFixed(2).replace(".", ",")}`);

  if (customerName?.trim()) {
    lines.push("");
    lines.push(`Nome: ${customerName.trim()}`);
  }
  if (customerPhone && customerPhone.replace(/\D/g, "").length >= 10) {
    lines.push(`Tel: ${customerPhone}`);
  }

  const text = encodeURIComponent(lines.join("\n"));
  const phone = whatsapp.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${text}`;
}
