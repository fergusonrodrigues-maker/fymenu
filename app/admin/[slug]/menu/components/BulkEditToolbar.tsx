"use client";

import { useState } from "react";
import { useBulkProductEdit } from "@/lib/hooks/useBulkProductEdit";

interface BulkEditToolbarProps {
  selectedIds: string[];
  categories: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export function BulkEditToolbar({
  selectedIds,
  categories,
  onSuccess,
}: BulkEditToolbarProps) {
  const { bulkUpdatePrice, bulkToggleActive, bulkUpdateCategory, loading } =
    useBulkProductEdit();
  const [action, setAction] = useState<"price" | "status" | "category">("price");
  const [value, setValue] = useState("");

  const handleApply = async () => {
    let success = false;

    if (action === "price") {
      success = await bulkUpdatePrice(selectedIds, parseFloat(value));
    } else if (action === "status") {
      success = await bulkToggleActive(selectedIds, value === "active");
    } else if (action === "category") {
      success = await bulkUpdateCategory(selectedIds, value);
    }

    if (success) {
      onSuccess?.();
      setValue("");
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="p-3 bg-blue-50 border rounded-lg flex gap-2 items-center">
      <span className="text-sm font-semibold">{selectedIds.length} selecionados</span>

      <select
        value={action}
        onChange={(e) => setAction(e.target.value as "price" | "status" | "category")}
        className="p-1 border rounded text-sm"
      >
        <option value="price">Atualizar Preço</option>
        <option value="status">Ativar/Desativar</option>
        <option value="category">Mudar Categoria</option>
      </select>

      {action === "price" && (
        <input
          type="number"
          placeholder="Novo preço"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="p-1 border rounded text-sm"
        />
      )}

      {action === "status" && (
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="p-1 border rounded text-sm"
        >
          <option value="active">Ativar</option>
          <option value="inactive">Desativar</option>
        </select>
      )}

      {action === "category" && (
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="p-1 border rounded text-sm"
        >
          <option value="">Selecionar categoria...</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      )}

      <button
        onClick={handleApply}
        disabled={loading || !value}
        className="px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:opacity-50"
      >
        Aplicar
      </button>
    </div>
  );
}
