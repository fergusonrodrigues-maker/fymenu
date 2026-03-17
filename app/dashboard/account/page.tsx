import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type RestaurantRow = {
  id: string;
  owner_id: string;
  name: string | null;
  owner_first_name: string | null;
  owner_last_name: string | null;
  owner_document: string | null;
  owner_phone: string | null;
  owner_address: string | null;
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string; err?: string; pwok?: string; pwerr?: string }>;
}) {
  const sp = (await searchParams) || {};
  const ok = sp.ok ? decodeURIComponent(sp.ok) : "";
  const err = sp.err ? decodeURIComponent(sp.err) : "";
  const pwok = sp.pwok ? decodeURIComponent(sp.pwok) : "";
  const pwerr = sp.pwerr ? decodeURIComponent(sp.pwerr) : "";

  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return (
      <main style={{ padding: 16 }}>
        <p>Você precisa estar logado para ver essa página.</p>
      </main>
    );
  }

  const { data: restaurantFound, error: rErr } = await supabase
    .from("restaurants")
    .select(
      "id, owner_id, name, owner_first_name, owner_last_name, owner_document, owner_phone, owner_address"
    )
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle<RestaurantRow>();

  let restaurant = restaurantFound ?? null;

  if (!restaurant && !rErr) {
    const fallbackName =
      (user.user_metadata?.name as string | undefined) ||
      (user.email ? user.email.split("@")[0] : "Minha Empresa");

    const { data: created, error: cErr } = await supabase
      .from("restaurants")
      .insert({ owner_id: user.id, name: fallbackName })
      .select(
        "id, owner_id, name, owner_first_name, owner_last_name, owner_document, owner_phone, owner_address"
      )
      .single<RestaurantRow>();

    if (!cErr && created) restaurant = created;
  }

  async function saveAccount(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado.");

    const first = String(formData.get("owner_first_name") ?? "").trim();
    const last = String(formData.get("owner_last_name") ?? "").trim();
    const doc = String(formData.get("owner_document") ?? "").trim();
    const phone = String(formData.get("owner_phone") ?? "").trim();
    const addr = String(formData.get("owner_address") ?? "").trim();

    const { data: r } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!r?.id) {
      const fallbackName =
        (user.user_metadata?.name as string | undefined) ||
        (user.email ? user.email.split("@")[0] : "Minha Empresa");

      const { data: created, error: cErr } = await supabase
        .from("restaurants")
        .insert({ owner_id: user.id, name: fallbackName })
        .select("id")
        .single();

      if (cErr) redirect("/dashboard/account?err=" + encodeURIComponent(cErr.message));

      const { error: upErr } = await supabase
        .from("restaurants")
        .update({
          owner_first_name: first || null,
          owner_last_name: last || null,
          owner_document: doc || null,
          owner_phone: phone || null,
          owner_address: addr || null,
        })
        .eq("id", created.id);

      if (upErr) redirect("/dashboard/account?err=" + encodeURIComponent(upErr.message));
      redirect("/dashboard/account?ok=" + encodeURIComponent("Perfil salvo com sucesso!"));
    }

    const { error: updateErr } = await supabase
      .from("restaurants")
      .update({
        owner_first_name: first || null,
        owner_last_name: last || null,
        owner_document: doc || null,
        owner_phone: phone || null,
        owner_address: addr || null,
      })
      .eq("id", r.id);

    if (updateErr) redirect("/dashboard/account?err=" + encodeURIComponent(updateErr.message));
    redirect("/dashboard/account?ok=" + encodeURIComponent("Perfil salvo com sucesso!"));
  }

  async function changePassword(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const password = String(formData.get("password") ?? "").trim();
    const confirm = String(formData.get("confirm_password") ?? "").trim();

    if (!password || !confirm) {
      redirect("/dashboard/account?pwerr=" + encodeURIComponent("Preencha os dois campos."));
    }
    if (password !== confirm) {
      redirect("/dashboard/account?pwerr=" + encodeURIComponent("As senhas não correspondem."));
    }
    if (password.length < 6) {
      redirect("/dashboard/account?pwerr=" + encodeURIComponent("Senha deve ter pelo menos 6 caracteres."));
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      redirect("/dashboard/account?pwerr=" + encodeURIComponent(error.message));
    }

    redirect("/dashboard/account?pwok=" + encodeURIComponent("Senha alterada com sucesso!"));
  }

  if (rErr) {
    return (
      <main style={{ padding: 16 }}>
        <p>Erro ao carregar dados do cliente.</p>
      </main>
    );
  }

  if (!restaurant) {
    return (
      <main style={{ padding: 16 }}>
        <p>Não foi possível carregar o registro da sua conta.</p>
      </main>
    );
  }

  const incomplete =
    !restaurant.owner_first_name ||
    !restaurant.owner_last_name ||
    !restaurant.owner_document ||
    !restaurant.owner_phone;

  return (
    <main style={{ padding: 16, maxWidth: 720, display: "grid", gap: 20 }}>
      <div>
        <h1 style={{ marginBottom: 4 }}>Minha Conta</h1>
        <div style={{ opacity: 0.55, fontSize: 13 }}>
          Login: <b>{user.email}</b>
        </div>
      </div>

      {/* Banner cadastro incompleto */}
      {incomplete && (
        <div style={{
          background: "rgba(255, 180, 0, 0.12)",
          border: "1px solid rgba(255, 180, 0, 0.35)",
          borderRadius: 14,
          padding: "14px 18px",
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: "#ffcc44", fontSize: 14, marginBottom: 2 }}>
              Cadastro incompleto
            </div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
              Preencha Nome, Sobrenome, CPF/CNPJ e Telefone para completar seu perfil.
            </div>
          </div>
        </div>
      )}

      {/* Feedback salvar perfil */}
      {ok && (
        <div style={successStyle}>✅ {ok}</div>
      )}
      {err && (
        <div style={errorStyle}>⚠️ {err}</div>
      )}

      {/* Formulário perfil */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, opacity: 0.9 }}>
          Dados pessoais
        </h2>
        <form action={saveAccount} style={card}>
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Nome *">
              <input
                name="owner_first_name"
                defaultValue={restaurant.owner_first_name ?? ""}
                placeholder="Ex: Ferguson"
                style={incomplete && !restaurant.owner_first_name ? { ...input, borderColor: "rgba(255,180,0,0.5)" } : input}
              />
            </Field>

            <Field label="Sobrenome *">
              <input
                name="owner_last_name"
                defaultValue={restaurant.owner_last_name ?? ""}
                placeholder="Ex: Rodrigues"
                style={incomplete && !restaurant.owner_last_name ? { ...input, borderColor: "rgba(255,180,0,0.5)" } : input}
              />
            </Field>

            <Field label="CPF ou CNPJ *">
              <input
                name="owner_document"
                defaultValue={restaurant.owner_document ?? ""}
                placeholder="Ex: 000.000.000-00"
                style={incomplete && !restaurant.owner_document ? { ...input, borderColor: "rgba(255,180,0,0.5)" } : input}
              />
            </Field>

            <Field label="Telefone / WhatsApp *">
              <input
                name="owner_phone"
                defaultValue={restaurant.owner_phone ?? ""}
                placeholder="Ex: (62) 99999-9999"
                style={incomplete && !restaurant.owner_phone ? { ...input, borderColor: "rgba(255,180,0,0.5)" } : input}
              />
            </Field>

            <Field label="Endereço (opcional)">
              <input
                name="owner_address"
                defaultValue={restaurant.owner_address ?? ""}
                placeholder="Ex: Goiânia - GO"
                style={input}
              />
            </Field>

            <button type="submit" style={btn}>
              Salvar perfil
            </button>
          </div>
        </form>
      </section>

      {/* Trocar senha */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, opacity: 0.9 }}>
          Trocar senha
        </h2>

        {pwok && <div style={{ ...successStyle, marginBottom: 12 }}>✅ {pwok}</div>}
        {pwerr && <div style={{ ...errorStyle, marginBottom: 12 }}>⚠️ {pwerr}</div>}

        <form action={changePassword} style={card}>
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Nova senha">
              <input
                name="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                style={input}
              />
            </Field>

            <Field label="Confirmar nova senha">
              <input
                name="confirm_password"
                type="password"
                placeholder="Repita a senha"
                style={input}
              />
            </Field>

            <button type="submit" style={btn}>
              Atualizar senha
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 800, fontSize: 13, opacity: 0.9 }}>{label}</div>
      {children}
    </label>
  );
}

const card: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  padding: 14,
  background: "rgba(255,255,255,0.03)",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const btn: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.10)",
  cursor: "pointer",
  fontWeight: 900,
  color: "inherit",
  width: "100%",
};

const successStyle: React.CSSProperties = {
  background: "rgba(0,255,150,0.1)",
  border: "1px solid rgba(0,255,150,0.3)",
  color: "#00ff96",
  padding: "12px 16px",
  borderRadius: 12,
  fontSize: 13,
};

const errorStyle: React.CSSProperties = {
  background: "rgba(248,66,51,0.12)",
  border: "1px solid rgba(248,66,51,0.3)",
  color: "#ff9999",
  padding: "12px 16px",
  borderRadius: 12,
  fontSize: 13,
};
