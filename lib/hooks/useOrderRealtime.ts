import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useKitchenAlertContext } from "@/lib/context/KitchenAlertContext";

interface UseOrderRealtimeOptions {
  unitId: string;
  onNewOrder?: (order: any) => void;
}

export function useOrderRealtime({
  unitId,
  onNewOrder,
}: UseOrderRealtimeOptions) {
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { playAlert } = useKitchenAlertContext();
  const onNewOrderRef = useRef(onNewOrder);
  onNewOrderRef.current = onNewOrder;

  useEffect(() => {
    if (!unitId) return;

    const channel = supabase
      .channel(`orders:${unitId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_intents",
          filter: `unit_id=eq.${unitId}`,
        },
        (payload) => {
          console.log("New order received:", payload.new);
          playAlert();
          onNewOrderRef.current?.(payload.new);
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unitId, playAlert]);

  return null;
}
