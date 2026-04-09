// app/comanda/[slug]/[hash]/page.tsx
// Digital comanda view — customer scans QR and sees their table items in real-time

import { createClient } from "@/lib/supabase/server";
import ComandaClientView from "./ComandaClientView";

export const revalidate = 0;

export default async function ComandaDigitalPage({
  params,
}: {
  params: Promise<{ slug: string; hash: string }>;
}) {
  const { slug, hash } = await params;
  const supabase = await createClient();

  const { data: unit } = await supabase
    .from("units")
    .select("id, name, logo_url, google_review_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!unit) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 36 }}>🍽️</div>
        <p style={{ fontSize: 16, fontWeight: 600 }}>Estabelecimento não encontrado</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Verifique o link do QR code</p>
      </div>
    );
  }

  const { data: comanda } = await supabase
    .from("comandas")
    .select("id, table_number, hash, status, created_at, opened_by, opened_by_name")
    .eq("hash", hash)
    .eq("unit_id", unit.id)
    .maybeSingle();

  if (!comanda) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 36 }}>🧾</div>
        <p style={{ fontSize: 16, fontWeight: 600 }}>Comanda não encontrada</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>O link pode estar expirado ou inválido</p>
      </div>
    );
  }

  if (comanda.status === "canceled") {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 36 }}>✅</div>
        <p style={{ fontSize: 16, fontWeight: 600 }}>Comanda encerrada</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Obrigado pela visita!</p>
      </div>
    );
  }

  const { data: items } = await supabase
    .from("comanda_items")
    .select("id, comanda_id, product_name, quantity, unit_price, addons, notes, status")
    .eq("comanda_id", comanda.id)
    .neq("status", "canceled")
    .order("created_at", { ascending: true });

  return (
    <ComandaClientView
      comanda={comanda as any}
      initialItems={(items ?? []) as any}
      unitName={unit.name ?? ""}
      unitLogo={unit.logo_url ?? null}
      unitId={unit.id}
      googleReviewUrl={(unit as any).google_review_url ?? null}
    />
  );
}
