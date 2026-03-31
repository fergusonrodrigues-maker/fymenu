import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type ProductType = "FOOD" | "DRINK" | "BEVERAGE";

interface UseProductTypeOptions {
  productId?: string;
}

export function useProductType({ productId }: UseProductTypeOptions) {
  const [productType, setProductType] = useState<ProductType>("FOOD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const updateProductType = useCallback(
    async (type: ProductType) => {
      if (!productId) return false;

      setLoading(true);
      setError(null);

      try {
        const { error: err } = await supabase
          .from("products")
          .update({ product_type: type })
          .eq("id", productId);

        if (err) throw err;
        setProductType(type);
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [productId, supabase]
  );

  return { productType, loading, error, updateProductType };
}
