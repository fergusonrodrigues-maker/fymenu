import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CopyButton from "./CopyButton";

function cleanSlug(input: string) {
  return (input || "").trim();
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/login");
  const user = auth.user;

  // 1) Restaurante do usuário
  const { data: restaurant, error: restErr } = await supabase
    .from("restaurants")
    .select("id, name, plan, slug, owner_id")
    .eq("owner_id", user.id)
    .single();

  // 2) Unidades do restaurante
  const { data: units, error: unitsErr } = restaurant?.id
    ? await supabase
        .from("units")
        .select("id, restaurant_id, name, slug, address, instagram, whatsapp, logo_url")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  async function updateUnitAction(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const { data: auth2 } = await supabase.auth.getUser();
    if (!auth2.user) redirect("/login");

    const unitId = String(formData.get("unitId") || "").trim();
    const name = String(formData.get("name") || "").trim();
    const slug = cleanSlug(String(formData.get("slug") || ""));
    const address = String(formData.get("address") || "").trim();
    const instagram = String(formData.get("instagram") || "").trim();
    const whatsapp = String(formData.get("whatsapp") || "").trim();
    const logo_url = String(formData.get("logo_url") || "").trim();

    if (!unitId) redirect("/dashboard?err=" + encodeURIComponent("unitId vazio."));
    if (!slug) redirect("/dashboard?err=" + encodeURIComponent("Slug não pode ficar vazio."));

    // garante que o unit pertence ao dono logado (via restaurant.owner_id)
    const { data: rest, error: restErr } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", auth2.user.id)
      .single();

    if (restErr || !rest?.id) {
      redirect("/dashboard?err=" + encodeURIComponent("Restaurante não encontrado para este usuário."));
    }

    const { data: unitCheck, error: unitCheckErr } = await supabase
      .from("units")
      .select("id")
      .eq("id", unitId)
      .eq("restaurant_id", rest.id)
      .single();

    if (unitCheckErr || !unitCheck?.id) {
      redirect("/dashboard?err=" + encodeURIComponent("Unidade não pertence a este usuário."));
    }

    const { error: updErr } = await supabase
      .from("units")
      .update({
        name: name || null,
        slug,
        address: address || null,
        instagram: instagram || null,
        whatsapp: whatsapp || null,
        logo_url: logo_url || null,
      })
      .eq("id", unitId);

    if (updErr) redirect("/dashboard?err=" + encodeURIComponent(updErr.message));

    redirect("/dashboard?ok=1");
  }

  return (
    <main style={{ padding: 18, maxWidth: 820, margin: "0 auto", color: "#fff" }}>
      <h1 style={{ fontSize: 22, fontWeight: 950, margin: 0 }}>Dashboard</h1>

      <div style={{ marginTop: 10, fontSize: 14, opacity: 0.85 }}>
        Logado como: <b>{user.email}</b>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>user.id: {user.id}</div>

      <div style={{ marginTop: 16 }} />

      {/* Restaurante */}
      <section
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          padding: 16,
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>Restaurante</div>

        {!restaurant ? (
          <div style={{ opacity: 0.85 }}>
            Não achei restaurante para este usuário.
            {restErr ? <div style={{ marginTop: 8, color: "salmon" }}>Erro: {restErr.message}</div> : null}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
            <div>
              <b>{restaurant.name || "Sem nome"}</b> • Plano: <b>{restaurant.plan || "—"}</b>
            </div>
            <div style={{ opacity: 0.8 }}>slug (restaurant): {restaurant.slug || "—"}</div>
          </div>
        )}
      </section>

      <div style={{ marginTop: 14 }} />

      {/* Unidades */}
      <section
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          padding: 16,
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>Unidades</div>

        {unitsErr ? <div style={{ color: "salmon" }}>Erro: {unitsErr.message}</div> : null}

        {!units || units.length === 0 ? (
          <div style={{ opacity: 0.85 }}>Nenhuma unidade encontrada.</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {units.map((u) => {
              const publicUrl = `https://fymenu.vercel.app/u/${u.slug}`;

              return (
                <div
                  key={u.id}
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 14,
                    padding: 14,
                    background: "rgba(0,0,0,0.28)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>{u.name || "Sem nome"}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>id: {u.id}</div>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                    slug: <b>{u.slug}</b>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13, opacity: 0.75 }}>{u.address || "—"}</div>

                  {/* Ações (sem onClick aqui) */}
                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.16)",
                        background: "rgba(255,255,255,0.10)",
                        color: "#fff",
                        fontWeight: 900,
                        textDecoration: "none",
                      }}
                    >
                      Abrir cardápio
                    </a>

                    <CopyButton text={publicUrl} />
                  </div>

                  <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 10, opacity: 0.9 }}>Editar unidade</div>

                    <form action={updateUnitAction} style={{ display: "grid", gap: 10 }}>
                      <input type="hidden" name="unitId" value={u.id} />

                      <Field label="Nome">
                        <input name="name" defaultValue={u.name || ""} placeholder="Ex: Unidade Centro" style={inputStyle} />
                      </Field>

                      <Field label="Slug (público) — é o link /u/slug">
                        <input name="slug" defaultValue={u.slug || ""} placeholder="Ex: pedacci-centro" style={inputStyle} />
                        <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
                          Dica: sem espaços. Se colar de algum lugar, ele corta quebras no começo/fim automaticamente.
                        </div>
                      </Field>

                      <Field label="Endereço">
                        <input name="address" defaultValue={u.address || ""} placeholder="Rua X, nº Y - Goiânia" style={inputStyle} />
                      </Field>

                      <Field label="Instagram (link ou @)">
                        <input name="instagram" defaultValue={(u as any).instagram || ""} placeholder="https://instagram.com/..." style={inputStyle} />
                      </Field>

                      <Field label="WhatsApp (texto ou link wa.me)">
                        <input
                          name="whatsapp"
                          defaultValue={(u as any).whatsapp || ""}
                          placeholder="Ex: 62999999999 ou https://wa.me/5562999999999"
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="Logo URL (link direto da imagem)">
                        <input name="logo_url" defaultValue={(u as any).logo_url || ""} placeholder="https://.../logo.png" style={inputStyle} />
                      </Field>

                      <button style={btnStyle}>Salvar</button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* sair */}
      <form
        action={async () => {
          "use server";
          const supabase = await createClient();
          await supabase.auth.signOut();
          redirect("/login");
        }}
        style={{ marginTop: 16 }}
      >
        <button style={{ ...btnStyle, width: "auto" }}>Sair</button>
      </form>

      <div style={{ height: 30 }} />
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  outline: "none",
};

const btnStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.10)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 900,
};