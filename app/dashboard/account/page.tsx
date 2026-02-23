// FILE: /app/dashboard/account/page.tsx
// ACTION: REPLACE ENTIRE FILE

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Minha conta</h1>
        <p>Você precisa estar logado para ver essa página.</p>
        {userErr && (
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(userErr, null, 2)}
          </pre>
        )}
      </main>
    );
  }

  // tenta achar o restaurant do dono logado
  const { data: restaurantFound, error: rErr } = await supabase
    .from("restaurants")
    .select(
      "id, owner_id, name, owner_first_name, owner_last_name, owner_document, owner_phone, owner_address"
    )
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle<RestaurantRow>();

  // se não existir ainda, cria um "base" (pra tela não ficar vazia)
  let restaurant = restaurantFound ?? null;

  if (!restaurant && !rErr) {
    const fallbackName =
      (user.user_metadata?.name as string | undefined) ||
      (user.email ? user.email.split("@")[0] : "Minha Empresa");

    const { data: created, error: cErr } = await supabase
      .from("restaurants")
      .insert({
        owner_id: user.id,
        name: fallbackName,
      })
      .select(
        "id, owner_id, name, owner_first_name, owner_last_name, owner_document, owner_phone, owner_address"
      )
      .single<RestaurantRow>();

    if (!cErr && created) restaurant = created;
  }

  async function saveAccount(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Não autenticado.");

    const first = String(formData.get("owner_first_name") ?? "").trim();
    const last = String(formData.get("owner_last_name") ?? "").trim();
    const doc = String(formData.get("owner_document") ?? "").trim();
    const phone = String(formData.get("owner_phone") ?? "").trim();
    const addr = String(formData.get("owner_address") ?? "").trim();

    // garante que existe 1 restaurant desse owner (MVP)
    const { data: r } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!r?.id) {
      // cria base e depois atualiza
      const fallbackName =
        (user.user_metadata?.name as string | undefined) ||
        (user.email ? user.email.split("@")[0] : "Minha Empresa");

      const { data: created, error: cErr } = await supabase
        .from("restaurants")
        .insert({ owner_id: user.id, name: fallbackName })
        .select("id")
        .single();

      if (cErr) throw new Error(cErr.message);

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

      if (upErr) throw new Error(upErr.message);

      revalidatePath("/dashboard/account");
      return;
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

    if (updateErr) throw new Error(updateErr.message);

    revalidatePath("/dashboard/account");
  }

  if (rErr) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Minha conta</h1>
        <p>Erro ao carregar dados do cliente.</p>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(rErr, null, 2)}</pre>
      </main>
    );
  }

  if (!restaurant) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Minha conta</h1>
        <p>Não foi possível carregar/criar o registro da sua empresa (restaurants).</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 16, maxWidth: 720 }}>
      <h1 style={{ marginBottom: 6 }}>Perfil do Cliente (Pessoa Física)</h1>
      <div style={{ opacity: 0.75, marginBottom: 16, fontSize: 13 }}>
        Login (Auth): <b>{user.email}</b>
      </div>

      <form action={saveAccount} style={card}>
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="Nome">
            <input
              name="owner_first_name"
              defaultValue={restaurant.owner_first_name ?? ""}
              placeholder="Ex: Ferguson"
              style={input}
            />
          </Field>

          <Field label="Sobrenome">
            <input
              name="owner_last_name"
              defaultValue={restaurant.owner_last_name ?? ""}
              placeholder="Ex: Rodrigues"
              style={input}
            />
          </Field>

          <Field label="CPF ou CNPJ">
            <input
              name="owner_document"
              defaultValue={restaurant.owner_document ?? ""}
              placeholder="Ex: 000.000.000-00"
              style={input}
            />
          </Field>

          <Field label="Telefone / WhatsApp">
            <input
              name="owner_phone"
              defaultValue={restaurant.owner_phone ?? ""}
              placeholder="Ex: (62) 99999-9999"
              style={input}
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
            Salvar
          </button>

          <div style={{ opacity: 0.65, fontSize: 12 }}>
            * Esses dados ficam no <b>restaurants</b> (empresa do dono logado). O e-mail vem do <b>auth</b>.
          </div>
        </div>
      </form>
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
};

const btn: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.10)",
  cursor: "pointer",
  fontWeight: 900,
};