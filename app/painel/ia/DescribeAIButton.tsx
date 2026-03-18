"use client";

import { useState } from "react";
import AIButton from "@/components/AIButton";

interface UseDescribeAIReturn {
  generating: boolean;
  generate: (
    name: string,
    category?: string,
    existingDescription?: string
  ) => Promise<string | null>;
}

export function useDescribeAI(): UseDescribeAIReturn {
  const [generating, setGenerating] = useState(false);

  async function generate(
    name: string,
    category?: string,
    existingDescription?: string
  ): Promise<string | null> {
    setGenerating(true);
    try {
      const res = await fetch("/api/ia/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          existing_description: existingDescription || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.description as string;
    } catch {
      return null;
    } finally {
      setGenerating(false);
    }
  }

  return { generating, generate };
}

interface DescribeAIButtonProps {
  productName: string;
  categoryName?: string;
  currentDescription?: string;
  onGenerated: (description: string) => void;
}

export function DescribeAIButton({
  productName,
  categoryName,
  currentDescription,
  onGenerated,
}: DescribeAIButtonProps) {
  const { generating, generate } = useDescribeAI();

  async function handleClick() {
    const result = await generate(productName, categoryName, currentDescription);
    if (result) onGenerated(result);
  }

  return (
    <AIButton onClick={handleClick} isLoading={generating} variant="secondary">
      ✨ Gerar descrição
    </AIButton>
  );
}
