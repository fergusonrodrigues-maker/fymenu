import { createClient } from "@/lib/supabase/server";
import ColaboradorLoginClient from "./ColaboradorLoginClient";

export default async function ColaboradorLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: unit } = await supabase
    .from("units")
    .select("id, name, logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!unit) {
    return (
      <div style={{
        minHeight: "100vh", background: "#fafafa",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: 24,
      }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p style={{ fontWeight: 600, color: "#374151" }}>Unidade não encontrada</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Verifique o endereço e tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <ColaboradorLoginClient
      slug={slug}
      unitName={unit.name ?? ""}
      logoUrl={unit.logo_url ?? null}
    />
  );
}
