// app/dashboard/unit/page.tsx

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function CreateUnitPage() {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreateUnit() {
    setLoading(true);
    setError(null);

    // 1️⃣ Buscar restaurant do usuário
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!restaurant) {
      setError("Restaurante não encontrado.");
      setLoading(false);
      return;
    }

    // 2️⃣ Tentar inserir unit
    const { error: insertError } = await supabase.from("units").insert({
      name,
      slug: slug.trim().replace(/\n|\r/g, ""),
      restaurant_id: restaurant.id,
    });

    if (insertError) {
      // 🔒 Tratamento específico do plano Basic
      if (
        insertError.message.includes("Plano BASIC permite apenas 1 unidade")
      ) {
        setError(
          "Seu plano BASIC permite apenas 1 unidade. Faça upgrade para PRO para adicionar mais unidades."
        );
      } else {
        setError(insertError.message);
      }

      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="p-8 space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Criar Nova Unidade</h1>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Nome da unidade"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded p-2"
        />

        <input
          type="text"
          placeholder="Slug (ex: pedacci-bueno)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full border rounded p-2"
        />

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded">
            {error}
          </div>
        )}

        <button
          onClick={handleCreateUnit}
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded"
        >
          {loading ? "Criando..." : "Criar Unidade"}
        </button>
      </div>
    </div>
  );
}