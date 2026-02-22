"use client";

import { deleteCategory, updateCategory } from "./actions";

type CategoryRowProps = {
  id: string;
  name: string;
  orderIndex: number | null;
};

export default function CategoryRow({ id, name, orderIndex }: CategoryRowProps) {
  return (
    <div
      style={{
        padding: 14,
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "white",
      }}
    >
      <form action={updateCategory} style={{ display: "flex", gap: 10 }}>
        <input type="hidden" name="id" value={id} />
        <input
          name="name"
          defaultValue={name}
          placeholder="Nome da categoria"
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            outline: "none",
          }}
          required
        />
        <button
          type="submit"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "white",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Salvar
        </button>
      </form>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          order_index: {orderIndex ?? 0}
        </div>

        <form
          action={deleteCategory}
          onSubmit={(e) => {
            const ok = confirm("Excluir esta categoria?");
            if (!ok) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,0,0,0.25)",
              background: "white",
              cursor: "pointer",
              color: "rgb(200,0,0)",
              fontWeight: 700,
            }}
          >
            Excluir
          </button>
        </form>
      </div>
    </div>
  );
}