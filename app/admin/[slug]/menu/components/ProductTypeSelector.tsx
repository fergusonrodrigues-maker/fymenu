"use client";

import { useProductType, type ProductType } from "@/lib/hooks/useProductType";

interface ProductTypeSelectorProps {
  productId: string;
  initialType: ProductType;
  onTypeChange?: (type: ProductType) => void;
}

const PRODUCT_TYPES: Array<{ value: ProductType; label: string; emoji: string }> = [
  { value: "FOOD", label: "Prato", emoji: "🍽️" },
  { value: "DRINK", label: "Drink/Bebida Alcoólica", emoji: "🍹" },
  { value: "BEVERAGE", label: "Bebida", emoji: "🥤" },
];

export function ProductTypeSelector({
  productId,
  initialType,
  onTypeChange,
}: ProductTypeSelectorProps) {
  const { productType, loading, updateProductType } = useProductType({
    productId,
  });

  const handleTypeChange = async (type: ProductType) => {
    const success = await updateProductType(type);
    if (success) {
      onTypeChange?.(type);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold">Tipo de Produto</label>
      <div className="flex gap-2">
        {PRODUCT_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => handleTypeChange(type.value)}
            disabled={loading}
            className={`flex-1 py-2 px-3 rounded border transition ${
              productType === type.value
                ? "bg-blue-500 text-white border-blue-600"
                : "bg-gray-100 border-gray-300 hover:border-blue-400"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="text-lg">{type.emoji}</span>
            <div className="text-xs mt-1">{type.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
