"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildOrderMessage, buildWhatsAppLink } from "@/lib/orders/buildOrderMessage";
import { validateOrderItem, calculateOrderTotals, isValidOrder } from "@/lib/orders/validateOrder";
import type { OrderItemInput, OrderItem } from "@/lib/types/orders";

export async function createOrderIntent(input: {
  unitId: string;
  items: OrderItemInput[];
  discount?: number;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const validatedItems: OrderItem[] = [];
  for (const item of input.items) {
    const validated = validateOrderItem(item);
    if (!validated) throw new Error(`Item inválido: ${item.product_id}`);
    validatedItems.push(validated);
  }

  const { subtotal, discount, total } = calculateOrderTotals(validatedItems, input.discount ?? 0);

  if (!isValidOrder(validatedItems, total)) {
    throw new Error("Pedido inválido: nenhum item ou total <= 0");
  }

  for (const item of validatedItems) {
    if (item.variation_id) {
      const { data: variation, error } = await supabase
        .from("product_variations")
        .select("stock")
        .eq("id", item.variation_id)
        .single();

      if (error || !variation) {
        throw new Error(`Variação não encontrada: ${item.variation_id}`);
      }

      if (variation.stock < item.qty) {
        throw new Error(`Estoque insuficiente para variação ${item.variation_id}`);
      }
    } else {
      const { data: product, error } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.product_id)
        .single();

      if (error || !product) {
        throw new Error(`Produto não encontrado: ${item.product_id}`);
      }

      if (product.stock < item.qty) {
        throw new Error(`Estoque insuficiente para produto ${item.product_id}`);
      }
    }
  }

  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("restaurant_id")
    .eq("id", input.unitId)
    .single();

  if (unitError || !unit) {
    throw new Error("Unidade não encontrada");
  }

  const { data: order, error: insertError } = await supabase
    .from("order_intents")
    .insert({
      restaurant_id: unit.restaurant_id,
      unit_id: input.unitId,
      items: validatedItems,
      subtotal,
      discount,
      total,
      status: "draft",
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Erro ao criar pedido: ${insertError.message}`);
  }

  return order;
}

export async function generateOrderWhatsAppLink(orderId: string) {
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("order_intents")
    .select(`id, items, total, subtotal, discount, units(whatsapp, name), restaurants(name)`)
    .eq("id", orderId)
    .single();

  if (error || !order) {
    throw new Error("Pedido não encontrado");
  }

  const whatsappNumber = (order.units as any)?.whatsapp;
  const restaurantName = (order.restaurants as any)?.name || "Restaurante";

  if (!whatsappNumber) {
    throw new Error("WhatsApp não configurado para esta unidade");
  }

  const message = buildOrderMessage(order as any, restaurantName);
  const link = buildWhatsAppLink(whatsappNumber, message);

  return { link, message, whatsappNumber };
}

export async function markOrderAsSent(orderId: string, whatsappLink: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("order_intents")
    .update({
      status: "sent",
      whatsapp_sent_at: new Date().toISOString(),
      whatsapp_link: whatsappLink,
    })
    .eq("id", orderId);

  if (error) {
    throw new Error(`Erro ao atualizar pedido: ${error.message}`);
  }

  revalidatePath("/dashboard/orders");
  return { success: true };
}

export async function listOrdersByUnit(
  unitId: string,
  filters?: { status?: string; limit?: number; offset?: number }
) {
  const supabase = await createClient();

  let query = supabase
    .from("order_intents")
    .select("*")
    .eq("unit_id", unitId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data: orders, error } = await query;

  if (error) {
    throw new Error(`Erro ao listar pedidos: ${error.message}`);
  }

  return orders ?? [];
}

export async function getOrderById(orderId: string) {
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("order_intents")
    .select(`*, units(id, name, whatsapp, slug), restaurants(id, name)`)
    .eq("id", orderId)
    .single();

  if (error || !order) {
    throw new Error("Pedido não encontrado");
  }

  return order;
}

export async function cancelOrder(orderId: string) {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("order_intents")
    .select("status")
    .eq("id", orderId)
    .single();

  if (!order) {
    throw new Error("Pedido não encontrado");
  }

  if (order.status === "confirmed" || order.status === "expired") {
    throw new Error(`Não é possível cancelar um pedido com status '${order.status}'`);
  }

  const { error } = await supabase
    .from("order_intents")
    .update({ status: "canceled" })
    .eq("id", orderId);

  if (error) {
    throw new Error(`Erro ao cancelar pedido: ${error.message}`);
  }

  revalidatePath("/dashboard/orders");
  return { success: true };
}

export async function confirmOrder(orderId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("order_intents")
    .update({ status: "confirmed" })
    .eq("id", orderId);

  if (error) {
    throw new Error(`Erro ao confirmar pedido: ${error.message}`);
  }

  revalidatePath("/dashboard/orders");
  return { success: true };
}
