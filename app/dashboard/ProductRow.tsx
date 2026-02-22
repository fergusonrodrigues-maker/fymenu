"use client";

import { deleteProduct, updateProduct } from "./actions";

type ProductRowProps = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
};

export default function ProductRow({
  id,
  name,
  description,
  price,
  thumbnailUrl,
  videoUrl,
}: ProductRowProps) {
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
      <form action={updateProduct} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="hidden" name="id" value={id} />

        <input
          name="name"
          defaultValue={name}
          placeholder="Nome do produto"
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            outline: "none",
            fontWeight: 600,
          }}
          required
        />

        <textarea
          name="description"
          defaultValue={description ?? ""}
          placeholder="Descrição (opcional)"
          rows={2}
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            outline: "none",
            resize: "vertical",
          }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <input
            name="price"
            defaultValue={price != null ? String(price).replace(".", ",") : ""}
            placeholder="Preço (ex: 29,90)"
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              outline: "none",
            }}
            inputMode="decimal"
          />
          <button
            type="submit"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
              cursor: "pointer",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            Salvar
          </button>
        </div>

        <input
          name="thumbnail_url"
          defaultValue={thumbnailUrl ?? ""}
          placeholder="Thumbnail URL (opcional)"
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            outline: "none",
          }}
        />

        <input
          name="video_url"
          defaultValue={videoUrl ?? ""}
          placeholder="Vídeo URL (opcional)"
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            outline: "none",
          }}
        />
      </form>

      <form
        action={deleteProduct}
        onSubmit={(e) => {
          const ok = confirm("Excluir este produto?");
          if (!ok) e.preventDefault();
        }}
        style={{ display: "flex", justifyContent: "flex-end" }}
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
            fontWeight: 800,
          }}
        >
          Excluir
        </button>
      </form>
    </div>
  );
}