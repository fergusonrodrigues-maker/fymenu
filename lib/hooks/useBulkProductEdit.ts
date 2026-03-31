import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function useBulkProductEdit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const bulkUpdate = useCallback(
    async (ids: string[], updates: Record<string, any>) => {
      setLoading(true);
      setError(null);

      try {
        const promises = ids.map((id) =>
          supabase
            .from("products")
            .update(updates)
            .eq("id", id)
        );

        const results = await Promise.all(promises);
        const hasError = results.some((r) => r.error);

        if (hasError) {
          throw new Error("Erro ao atualizar alguns produtos");
        }

        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const bulkUpdatePrice = useCallback(
    async (ids: string[], newPrice: number) => {
      return bulkUpdate(ids, { base_price: newPrice });
    },
    [bulkUpdate]
  );

  const bulkToggleActive = useCallback(
    async (ids: string[], isActive: boolean) => {
      return bulkUpdate(ids, { is_active: isActive });
    },
    [bulkUpdate]
  );

  const bulkUpdateCategory = useCallback(
    async (ids: string[], categoryId: string) => {
      return bulkUpdate(ids, { category_id: categoryId });
    },
    [bulkUpdate]
  );

  return {
    loading,
    error,
    bulkUpdate,
    bulkUpdatePrice,
    bulkToggleActive,
    bulkUpdateCategory,
  };
}
