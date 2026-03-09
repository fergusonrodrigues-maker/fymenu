"use client";

import { useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export type MenuEventType =
  | "menu_view"
  | "category_view"
  | "product_view"
  | "product_click"
  | "product_order_click"
  | "variation_select"
  | "upsell_view"
  | "upsell_accept"
  | "upsell_decline"
  | "whatsapp_click"
  | "ifood_click"
  | "external_click";

export interface TrackPayload {
  event: MenuEventType;
  unit_id: string;
  product_id?: string;
  category_id?: string;
  variation_id?: string;
  upsell_product_id?: string;
  meta?: Record<string, unknown>;
}

export function useTrack(unitId: string) {
  // Previne duplicata de menu_view por sessão
  const trackedMenuView = useRef(false);

  const track = useCallback(
    async (payload: Omit<TrackPayload, "unit_id">) => {
      // Evita disparar menu_view múltiplas vezes na mesma sessão
      if (payload.event === "menu_view") {
        if (trackedMenuView.current) return;
        trackedMenuView.current = true;
      }

      try {
        const supabase = createClient();
        await supabase.from("menu_events").insert({
          event: payload.event,
          unit_id: unitId,
          product_id: payload.product_id ?? null,
          category_id: payload.category_id ?? null,
          variation_id: payload.variation_id ?? null,
          upsell_product_id: payload.upsell_product_id ?? null,
          meta: payload.meta ?? null,
          created_at: new Date().toISOString(),
        });
      } catch {
        // Tracking nunca pode quebrar o fluxo principal
      }
    },
    [unitId]
  );

  return { track };
}
