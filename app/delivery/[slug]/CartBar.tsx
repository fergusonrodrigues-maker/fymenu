"use client";

interface CartBarProps {
  itemCount: number;
  total: number;
  onOpen: () => void;
}

function moneyBR(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function CartBar({ itemCount, total, onOpen }: CartBarProps) {
  if (itemCount === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 60,
        padding: "0 16px",
        pointerEvents: "none",
      }}
    >
      <button
        onClick={onOpen}
        style={{
          pointerEvents: "auto",
          width: "100%",
          maxWidth: 460,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderRadius: 999,
          background: "#FF6B00",
          border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 12px 40px rgba(255,107,0,0.5)",
          cursor: "pointer",
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
          transition: "transform 0.15s ease",
        }}
        className="active:scale-[0.98]"
      >
        <span
          style={{
            background: "rgba(255,255,255,0.25)",
            borderRadius: 999,
            padding: "2px 10px",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {itemCount} {itemCount === 1 ? "item" : "itens"}
        </span>
        <span>Ver Pedido</span>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.9)" }}>
          {moneyBR(total)}
        </span>
      </button>
    </div>
  );
}
