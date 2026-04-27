import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SubComanda {
  id: string;
  order_intent_id: string;
  name: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  created_by?: string;
  created_at: string;
}

interface SplitItem {
  id: string;
  split_id: string;
  order_item_id: string;
  quantity: number;
  unit_price: number;
}

export function useSubComanda(orderIntentId?: string) {
  const [splits, setSplits] = useState<SubComanda[]>([]);
  const [splitItems, setSplitItems] = useState<Map<string, SplitItem[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchSplits = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: err } = await supabase
          .from("comanda_splits")
          .select("*")
          .eq("order_intent_id", id)
          .order("created_at", { ascending: true });

        if (err) throw err;
        setSplits(data || []);

        // Fetch items para cada split
        for (const split of data || []) {
          const { data: items, error: itemErr } = await supabase
            .from("split_items")
            .select("*")
            .eq("split_id", split.id);

          if (!itemErr) {
            setSplitItems((prev) => new Map(prev).set(split.id, items || []));
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const createSplit = useCallback(
    async (
      customerName: string,
      customerPhone?: string,
    ) => {
      if (!orderIntentId) return null;
      const trimmedName = customerName.trim();
      if (trimmedName.length < 2) {
        setError("Informe o nome de quem vai pagar este split (mín. 2 caracteres).");
        return null;
      }
      const normalizedPhone = (customerPhone ?? "").replace(/\D/g, "") || null;

      try {
        const { data, error: err } = await supabase
          .from("comanda_splits")
          .insert([
            {
              order_intent_id: orderIntentId,
              // Keep `name` populated so legacy renderers that read it still work.
              name: trimmedName,
              customer_name: trimmedName,
              customer_phone: normalizedPhone,
              subtotal: 0,
              discount: 0,
              total: 0,
            },
          ])
          .select()
          .single();

        if (err) throw err;
        setSplits((prev) => [...prev, data]);
        setSplitItems((prev) => new Map(prev).set(data.id, []));
        setError(null);
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        return null;
      }
    },
    [orderIntentId, supabase]
  );

  const addItemToSplit = useCallback(
    async (splitId: string, orderItemId: string, quantity: number, unitPrice: number) => {
      try {
        const { data, error: err } = await supabase
          .from("split_items")
          .insert([
            {
              split_id: splitId,
              order_item_id: orderItemId,
              quantity,
              unit_price: unitPrice,
            },
          ])
          .select()
          .single();

        if (err) throw err;

        setSplitItems((prev) => {
          const currentItems = prev.get(splitId) || [];
          return new Map(prev).set(splitId, [...currentItems, data]);
        });

        // Recalculate split total
        await recalculateSplitTotal(splitId);
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supabase]
  );

  const removeItemFromSplit = useCallback(
    async (splitId: string, itemId: string) => {
      try {
        const { error: err } = await supabase
          .from("split_items")
          .delete()
          .eq("id", itemId);

        if (err) throw err;

        setSplitItems((prev) => {
          const currentItems = prev.get(splitId) || [];
          return new Map(prev).set(
            splitId,
            currentItems.filter((i) => i.id !== itemId)
          );
        });

        await recalculateSplitTotal(splitId);
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supabase]
  );

  const recalculateSplitTotal = useCallback(
    async (splitId: string) => {
      setSplitItems((prevItems) => {
        const items = prevItems.get(splitId) || [];
        const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

        setSplits((prevSplits) => {
          const split = prevSplits.find((s) => s.id === splitId);
          if (!split) return prevSplits;

          const total = subtotal - (split.discount || 0);

          supabase
            .from("comanda_splits")
            .update({ subtotal, total })
            .eq("id", splitId)
            .then(({ error: err }) => {
              if (err) console.error("Error recalculating split total:", err);
            });

          return prevSplits.map((s) =>
            s.id === splitId ? { ...s, subtotal, total } : s
          );
        });

        return prevItems;
      });
    },
    [supabase]
  );

  const applyDiscountToSplit = useCallback(
    async (splitId: string, discountAmount: number) => {
      setSplits((prev) => {
        const split = prev.find((s) => s.id === splitId);
        if (!split) return prev;

        const total = split.subtotal - discountAmount;

        supabase
          .from("comanda_splits")
          .update({ discount: discountAmount, total })
          .eq("id", splitId)
          .then(({ error: err }) => {
            if (err) {
              console.error("Error applying discount:", err);
              setError(err.message);
            }
          });

        return prev.map((s) =>
          s.id === splitId ? { ...s, discount: discountAmount, total } : s
        );
      });
      return true;
    },
    [supabase]
  );

  const deleteSplit = useCallback(
    async (splitId: string) => {
      try {
        const { error: err } = await supabase
          .from("comanda_splits")
          .delete()
          .eq("id", splitId);

        if (err) throw err;

        setSplits((prev) => prev.filter((s) => s.id !== splitId));
        setSplitItems((prev) => {
          const newMap = new Map(prev);
          newMap.delete(splitId);
          return newMap;
        });
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        return false;
      }
    },
    [supabase]
  );

  return {
    splits,
    splitItems,
    loading,
    error,
    fetchSplits,
    createSplit,
    addItemToSplit,
    removeItemFromSplit,
    applyDiscountToSplit,
    deleteSplit,
  };
}
