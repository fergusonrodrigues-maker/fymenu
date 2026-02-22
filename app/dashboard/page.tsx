import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CopyLinkButton from "./CopyLinkButton";
import LogoUploader from "./LogoUploader";
import {
  updateUnitAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/login");
  const user = auth.user;

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL?.startsWith("http")
      ? process.env.VERCEL_URL
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://fymenu.com");

  // Restaurante do usuário
  const { data: restaurant, error: restErr } = await supabase
    .from("restaurants")
    .select("id, name, plan, slug, owner_id")
    .eq("owner_id", user.id)
    .single();

  // Unidades do restaurante
  const { data: units, error: unitsErr } = restaurant?.id
    ? await supabase
        .from("units")
        .select("id, restaurant_id, name, slug, address, instagram, whatsapp, logo_url")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  // Categorias por unidade (pega todas de uma vez e agrupa)
  const unitIds = (units || []).map((u) => u.id);
  const { data: categoriesAll, error: catErr } =
    unitIds.length > 0
      ? await supabase
          .from("categories")
          .select("id, unit_id, name, type, order_index, created_at")
          .in("unit_id", unitIds)
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: true })
      : { data: [], error: null };

  const categoriesByUnit = new Map<string, any[]>();
  for (const c of categoriesAll || []) {
    const arr = categoriesByUnit.get(c.unit_id) || [];
    arr.push(c);
    categoriesByUnit.set(c.unit_id, arr);
  }

  return (
    <main style={{ padding: 18, maxWidth: 920, margin: "0 auto", color: "#fff" }}>
      <h1 style={{ fontSize: 22, fontWeight: 950, margin: 0 }}>Dashboard</h1>

      <div style={{ marginTop: 10, fontSize: 14, opacity: 0.85 }}>
        Logado como: <b>{user.email}</b>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>user.id: {user.id}</div>

      <div style={{ marginTop: 16 }} />

      {/* Restaurante */}
      <section style={cardStyle}>
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
      <section style={cardStyle}>
        <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>Unidades</div>

        {unitsErr ? <div style={{ color: "salmon" }}>Erro: {unitsErr.message}</div> : null}
        {catErr ? <div style={{ color: "salmon", marginTop: 8 }}>Erro categorias: {catErr.message}</div> : null}

        {!units || units.length === 0 ? (
          <div style={{ opacity: 0.85 }}>Nenhuma unidade encontrada.</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {units.map((u) => {
              const publicUrl = `${baseUrl}/u/${u.slug}`;
              const cats = categoriesByUnit.get(u.id) || [];

              return (
                <div key={u.id} style={unitCardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>{u.name || "Sem nome"}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>id: {u.id}</div>
                  </div>

                  <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                      slug: <b>{u.slug}</b>
                    </div>

                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, opacity: 0.85, textDecoration: "underline", color: "#fff" }}
                    >
                      abrir /u/{u.slug}
                    </a>

                    <CopyLinkButton url={publicUrl} />
                  </div>

                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>{u.address || "—"}</div>

                  <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 10, opacity: 0.9 }}>
                      Editar unidade
                    </div>

                    <form action={updateUnitAction} style={{ display: "grid", gap: 10 }}>
                      <input type="hidden" name="unitId" value={u.id} />

                      <Field label="Nome">
                        <input
                          name="name"
                          defaultValue={u.name || ""}
                          placeholder="Ex: Unidade Centro"
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="Slug (público) — é o link /u/slug">
                        <input
                          name="slug"
                          defaultValue={u.slug || ""}
                          placeholder="Ex: pedacci-centro"
                          style={inputStyle}
                        />
                        <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
                          Dica: sem espaços. Se colar de algum lugar, ele corta quebras no começo/fim automaticamente.
                        </div>
                      </Field>

                      <Field label="Endereço">
                        <input
                          name="address"
                          defaultValue={u.address || ""}
                          placeholder="Rua X, nº Y - Goiânia"
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="Instagram (link ou @)">
                        <input
                          name="instagram"
                          defaultValue={(u as any).instagram || ""}
                          placeholder="@perfil ou https://instagram.com/..."
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="WhatsApp (número ou link)">
                        <input
                          name="whatsapp"
                          defaultValue={(u as any).whatsapp || ""}
                          placeholder="62999999999 ou https://wa.me/5562999999999"
                          style={inputStyle}
                        />
                        <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
                          Se você digitar só o número, eu formato para wa.me automaticamente ao salvar.
                        </div>
                      </Field>

                      <button style={btnStyle}>Salvar dados</button>
                    </form>

                    <div style={{ marginTop: 12 }}>
                      <LogoUploader unitId={u.id} currentLogoUrl={(u as any).logo_url || null} />
                    </div>

                    {/* CATEGORIAS (ETAPA 1) */}
                    <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 10, opacity: 0.9 }}>
                        Categorias
                      </div>

                      {/* Criar categoria */}
                      <form action={createCategoryAction} style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                        <input type="hidden" name="unitId" value={u.id} />

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 120px", gap: 10 }}>
                          <Field label="Nome">
                            <input name="name" placeholder="Ex: Pizzas" style={inputStyle} />
                          </Field>

                          <Field label="Tipo">
                            <select name="type" defaultValue="food" style={selectStyle}>
                              <option value="food">food</option>
                              <option value="drink">drink</option>
                              <option value="highlight">highlight</option>
                            </select>
                          </Field>

                          <Field label="Ordem">
                            <input name="order_index" placeholder="0" inputMode="numeric" style={inputStyle} />
                          </Field>
                        </div>

                        <button style={btnStyle}>Criar categoria</button>
                      </form>

                      {/* Listar/editar categorias */}
                      {cats.length === 0 ? (
                        <div style={{ opacity: 0.75, fontSize: 13 }}>Nenhuma categoria ainda.</div>
                      ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                          {cats.map((c) => (
                            <div
                              key={c.id}
                              style={{
                                border: "1px solid rgba(255,255,255,0.10)",
                                borderRadius: 12,
                                padding: 12,
                                background: "rgba(0,0,0,0.22)",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                                <div style={{ fontWeight: 900, fontSize: 13 }}>
                                  {c.name} <span style={{ opacity: 0.6, fontWeight: 700 }}>({c.type})</span>
                                </div>
                                <div style={{ fontSize: 12, opacity: 0.6 }}>ordem: {c.order_index ?? 0}</div>
                              </div>

                              <form action={updateCategoryAction} style={{ display: "grid", gap: 10 }}>
                                <input type="hidden" name="categoryId" value={c.id} />
                                <input type="hidden" name="unitId" value={u.id} />

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 120px", gap: 10 }}>
                                  <Field label="Nome">
                                    <input name="name" defaultValue={c.name || ""} style={inputStyle} />
                                  </Field>

                                  <Field label="Tipo">
                                    <select name="type" defaultValue={c.type || "food"} style={selectStyle}>
                                      <option value="food">food</option>
                                      <option value="drink">drink</option>
                                      <option value="highlight">highlight</option>
                                    </select>
                                  </Field>

                                  <Field label="Ordem">
                                    <input
                                      name="order_index"
                                      defaultValue={String(c.order_index ?? 0)}
                                      inputMode="numeric"
                                      style={inputStyle}
                                    />
                                  </Field>
                                </div>

                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                  <button style={btnStyle}>Salvar categoria</button>

                                  <form action={deleteCategoryAction}>
                                    <input type="hidden" name="categoryId" value={c.id} />
                                    <input type="hidden" name="unitId" value={u.id} />
                                    <button
                                      style={{
                                        ...btnStyle,
                                        background: "rgba(255,80,80,0.14)",
                                        border: "1px solid rgba(255,80,80,0.25)",
                                      }}
                                    >
                                      Deletar
                                    </button>
                                  </form>
                                </div>
                              </form>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 14,
  padding: 16,
  background: "rgba(255,255,255,0.04)",
};

const unitCardStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 14,
  padding: 14,
  background: "rgba(0,0,0,0.28)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
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