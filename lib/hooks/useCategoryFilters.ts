import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface CategoryWithType {
  id: string;
  name: string;
  product_type: string;
}

export function useCategoryFilters(unitId?: string) {
  const [categories, setCategories] = useState<CategoryWithType[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetchCategoriesByType = useCallback(
    async (productType: string) => {
      if (!unitId) return [];

      setLoading(true);

      try {
        const { data, error: err } = await supabase
          .from("categories")
          .select("id, name, product_type")
          .eq("unit_id", unitId)
          .eq("product_type", productType);

        if (err) throw err;
        setCategories(data || []);
        return data || [];
      } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [unitId, supabase]
  );

  return { categories, loading, fetchCategoriesByType };
}
