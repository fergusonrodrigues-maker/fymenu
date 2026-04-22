"use client";

import { useState, useEffect } from "react";
import { useProductAddons } from "@/lib/hooks/useProductAddons";
import { Trash2, Edit2, Plus } from "lucide-react";
import FyLoader from "@/components/FyLoader";

interface AddonManagerProps {
  productId: string;
  unitId: string;
  productName?: string;
}

export function AddonManager({ productId, unitId, productName }: AddonManagerProps) {
  const { addons, loading, fetchAddons, createAddon, updateAddon, deleteAddon } =
    useProductAddons({ productId, unitId });
  const [isCreating, setIsCreating] = useState(false);
  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonPrice, setNewAddonPrice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  useEffect(() => {
    fetchAddons(productId);
  }, [productId, fetchAddons]);

  const handleCreate = async () => {
    if (!newAddonName || !newAddonPrice) return;
    const price = parseFloat(newAddonPrice.replace(",", "."));
    if (isNaN(price)) return;
    const result = await createAddon(newAddonName, Math.round(price * 100));
    if (result) {
      setNewAddonName("");
      setNewAddonPrice("");
      setIsCreating(false);
    }
  };

  const handleUpdate = async (addonId: string) => {
    const price = parseFloat(editPrice.replace(",", "."));
    if (isNaN(price)) return;
    await updateAddon(addonId, { name: editName, price: Math.round(price * 100) });
    setEditingId(null);
  };

  const handleDelete = async (addonId: string) => {
    if (confirm("Tem certeza que deseja remover este adicional?")) {
      await deleteAddon(addonId);
    }
  };

  return (
    <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--dash-text-muted)", fontWeight: 500 }}>
          {productName ? `Adicionais de ${productName}` : "Adicionais"}
        </span>
        <button
          onClick={() => setIsCreating(!isCreating)}
          style={actionBtnStyle}
        >
          <Plus size={14} />
          Novo Adicional
        </button>
      </div>

      {isCreating && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 8, background: "rgba(0,255,174,0.05)", border: "1px solid rgba(0,255,174,0.2)" }}>
          <input
            placeholder="Nome do adicional (ex: Queijo Extra)"
            value={newAddonName}
            onChange={(e) => setNewAddonName(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Preço (ex: 2,50)"
            value={newAddonPrice}
            onChange={(e) => setNewAddonPrice(e.target.value)}
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleCreate}
              disabled={!newAddonName || !newAddonPrice}
              style={{ flex: 1, padding: "8px 0", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: !newAddonName || !newAddonPrice ? 0.5 : 1 }}
            >
              Salvar
            </button>
            <button
              onClick={() => setIsCreating(false)}
              style={{ flex: 1, padding: "8px 0", background: "var(--dash-card-hover)", color: "var(--dash-text-muted)", border: "1px solid var(--dash-border)", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}><FyLoader size="sm" /></div>
        ) : addons.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--dash-text-muted)", margin: 0 }}>Nenhum adicional cadastrado</p>
        ) : (
          addons.map((addon) => (
            <div
              key={addon.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: 8,
                background: "var(--dash-card)",
                border: "1px solid var(--dash-border)",
                opacity: addon.enabled ? 1 : 0.5,
              }}
            >
              {editingId === addon.id ? (
                <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    style={{ ...inputStyle, width: 80 }}
                  />
                  <button onClick={() => handleUpdate(addon.id)} style={saveBtnStyle}>Salvar</button>
                  <button onClick={() => setEditingId(null)} style={cancelBtnStyle}>Cancelar</button>
                </div>
              ) : (
                <>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--dash-text)" }}>{addon.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--dash-text-muted)" }}>
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(addon.price / 100)}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => {
                        setEditingId(addon.id);
                        setEditName(addon.name);
                        setEditPrice((addon.price / 100).toFixed(2).replace(".", ","));
                      }}
                      style={iconBtnStyle}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(addon.id)}
                      style={{ ...iconBtnStyle, color: "#f87171", borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--dash-border)",
  background: "var(--dash-input-bg)",
  color: "var(--dash-text)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  width: "100%",
};

const iconBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 30,
  height: 30,
  borderRadius: 6,
  background: "var(--dash-card-hover)",
  border: "1px solid var(--dash-border)",
  color: "var(--dash-text-muted)",
  cursor: "pointer",
};

const actionBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  background: "rgba(0,255,174,0.1)",
  color: "#00ffae",
  border: "1px solid rgba(0,255,174,0.25)",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const saveBtnStyle: React.CSSProperties = {
  padding: "6px 12px",
  background: "#10b981",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "6px 12px",
  background: "var(--dash-card-hover)",
  color: "var(--dash-text-muted)",
  border: "1px solid var(--dash-border)",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
