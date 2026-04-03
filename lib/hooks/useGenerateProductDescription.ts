import { useState } from "react";

interface UseGenerateDescriptionOptions {
  onSuccess?: (description: string, source: "AI_GENERATED" | "HYBRID") => void;
  onError?: (error: string) => void;
}

export function useGenerateProductDescription(
  options: UseGenerateDescriptionOptions = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (
    imageUrl: string,
    productName: string,
    category: string,
    manualDescription?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ia/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          product_name: productName,
          category,
          manual_description: manualDescription,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error ?? "Failed to generate description");
      }

      const data = await response.json();
      options.onSuccess?.(data.description, data.description_source ?? "AI_GENERATED");
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      options.onError?.(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, error };
}
