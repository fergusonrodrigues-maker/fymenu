import { useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface ProductAddon {
  id: string;
  product_id: string;
  unit_id: string;
  name: string;
  price: number;
  description?: string;
  enabled: boolean;
  order_index: number;
  created_at: string;
}

interface UseProductAddonsOptions {
  productId?: string;
  unitId?: string;
}

export function useProductAddons({ productId, unitId }: UseProductAddonsOptions) {
  const [addons, setAddons] = useState<ProductAddon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchAddons = useCallback(
    async (prodId: string) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("product_addons")
          .select("*")
          .eq("product_id", prodId)
          .order("order_index", { ascending: true });

        if (err) throw err;
        setAddons(data || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const createAddon = useCallback(
    async (name: string, price: number, description?: string) => {
      if (!productId || !unitId) {
        setError("Missing productId or unitId");
        return null;
      }
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("product_addons")
          .insert([
            {
              product_id: productId,
              unit_id: unitId,
              name,
              price,
              description,
              enabled: true,
              order_index: 0,
            },
          ])
          .select()
          .single();

        if (err) throw err;
        setAddons((prev) => [...prev, data]);
        return data;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
        return null;
      }
    },
    [productId, unitId, supabase]
  );

  const updateAddon = useCallback(
    async (addonId: string, updates: Partial<ProductAddon>) => {
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("product_addons")
          .update(updates)
          .eq("id", addonId)
          .select()
          .single();

        if (err) throw err;
        setAddons((prev) => prev.map((a) => (a.id === addonId ? data : a)));
        return data;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
        return null;
      }
    },
    [supabase]
  );

  const deleteAddon = useCallback(
    async (addonId: string) => {
      setError(null);
      try {
        const { error: err } = await supabase
          .from("product_addons")
          .delete()
          .eq("id", addonId);

        if (err) throw err;
        setAddons((prev) => prev.filter((a) => a.id !== addonId));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
        return false;
      }
    },
    [supabase]
  );

  return {
    addons,
    loading,
    error,
    fetchAddons,
    createAddon,
    updateAddon,
    deleteAddon,
  };
}
