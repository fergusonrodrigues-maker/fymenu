// FILE: /app/dashboard/unit/page.tsx
// ACTION: REPLACE ENTIRE FILE

import { createClient } from "@/lib/supabase/server";
import { updateUnit } from "../actions";
import UnitLogoUploader from "./UnitLogoUploader";

export default async function UnitPage() {
  const supabase = await createClient();

  // MVP: primeira unit
  const { data: unit, error } = await supabase
    .from("units")
    .select("id, name, slug, address, instagram, whatsapp, logo_url")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !unit) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Unidade</h1>
        <p>Erro ao carregar unidade (MVP).</p>
        {error && <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>}
      </main>
    );
  }

  return (
    <main style={{ padding: 16, display: "grid", gap: 14 }}>
      <div>
        <h1 style={{ marginBottom: 6 }}>Unidade</h1>
        <div style={{ opacity: 0.75, fontSize: 13 }}>
          Aqui você edita os dados que aparecem no público (rodapé / links / slug).
        </div>
      </div>

      {/* Upload de logo */}
      <UnitLogoUploader unitId={unit.id} initialUrl={unit.logo_url ?? ""} />

      {/* Form da unidade (server action) */}
      <form
        action={updateUnit}
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 14,
          padding: 14,
          background: "rgba(255,255,255,0.03)",
          display: "grid",
          gap: 10,
        }}
      >
        <input type="hidden" name="unit_id" value={unit.id} />

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 800 }}>Nome da empresa/unidade</div>
          <input name="name" defaultValue={unit.name ?? ""} placeholder="Ex: Pedacci" style={inputStyle} />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 800 }}>Slug (link público)</div>
          <input
            name="slug"
            defaultValue={unit.slug ?? ""}
            placeholder="Ex: pedacci-setor-oeste"
            style={inputStyle}
          />
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            Isso vira: <b>/u/{unit.slug ?? ""}</b>
          </div>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 800 }}>Endereço (ou link do Maps)</div>
          <input
            name="address"
            defaultValue={unit.address ?? ""}
            placeholder="Ex: Rua X, Setor Y, Goiânia"
            style={inputStyle}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 800 }}>Instagram</div>
          <input
            name="instagram"
            defaultValue={unit.instagram ?? ""}
            placeholder="@seuinstagram"
            style={inputStyle}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 800 }}>WhatsApp da empresa</div>
          <input
            name="whatsapp"
            defaultValue={unit.whatsapp ?? ""}
            placeholder="Ex: 62999999999"
            style={inputStyle}
          />
        </div>

        <button style={btnStyle} type="submit">
          Salvar dados da unidade
        </button>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "inherit",
  outline: "none",
};

const btnStyle: React.CSSProperties = {
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.10)",
  cursor: "pointer",
  fontWeight: 900,
};