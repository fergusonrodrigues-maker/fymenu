"use client";

import { useState } from "react";
import { createOrderIntent, generateOrderWhatsAppLink, markOrderAsSent } from "@/app/painel/orders/actions";
import type { OrderItemInput } from "@/lib/types/orders";

export function useCreateOrder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAndSendOrder = async (input: {
    unitId: string;
    items: OrderItemInput[];
    discount?: number;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const order = await createOrderIntent(input);
      const { link } = await generateOrderWhatsAppLink(order.id);
      await markOrderAsSent(order.id, link);
      window.open(link, "_blank");

      return { success: true, order, link };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido ao criar pedido";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createAndSendOrder,
  };
}
