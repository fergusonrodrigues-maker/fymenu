"use client";

import { useState } from "react";

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
    <button
      type="button"
      onClick={handleClick}
      disabled={generating}
      title="Gerar descrição com IA"
      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 disabled:opacity-50 transition"
    >
      {generating ? (
        <>
          <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin inline-block" />
          Gerando...
        </>
      ) : (
        <>✨ IA</>
      )}
    </button>
  );
}
