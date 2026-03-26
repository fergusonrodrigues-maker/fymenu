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
    <button
      onClick={handleClick}
      disabled={generating}
      type="button"
      style={{
        padding: "5px 12px", borderRadius: 20,
        background: generating ? "rgba(0,217,184,0.1)" : "linear-gradient(135deg, #00d9b8, #00ffae)",
        border: "none", color: generating ? "#00ffae" : "#000",
        fontSize: 12, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", gap: 5,
        opacity: generating ? 0.7 : 1,
        transition: "opacity 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {generating ? "⏳ Gerando..." : "✨ Gerar descrição"}
    </button>
  );
}
