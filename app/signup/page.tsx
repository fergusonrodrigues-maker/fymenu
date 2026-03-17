import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type SP = { err?: string; ok?: string };

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<SP>;
}) {
  const sp = (await searchParams) ?? {};

  async function signupAction(formData: FormData): Promise<void> {
    "use server";

    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();

    if (!email || !password) {
      redirect("/signup?err=" + encodeURIComponent("Preencha email e senha."));
    }

    if (password.length < 6) {
      redirect("/signup?err=" + encodeURIComponent("Senha deve ter pelo menos 6 caracteres."));
    }

    const supabase = await createClient();

    // 1. Criar usuário no Auth
    const { error: signupError, data: authData } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signupError) {
      redirect("/signup?err=" + encodeURIComponent(signupError.message));
    }

    // 2. NOVO: Criar restaurant automaticamente
    if (authData.user?.id) {
      const restaurantName = email.split("@")[0]; // Use email como nome base

      const { error: restaurantError } = await supabase
        .from("restaurants")
        .insert({
          owner_id: authData.user.id,
          name: restaurantName,
          onboarding_completed: false, // Começa como false
        });

      if (restaurantError) {
        console.error("Erro ao criar restaurant:", restaurantError);
        // Não interrompe o fluxo, deixa o usuário continuar
      }
    }

    redirect("/login?ok=Conta criada com sucesso. Faça login agora.");
  }

  return (
    <main style={{ padding: 18, maxWidth: 520, margin: "0 auto", color: "#fff" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Criar conta</h1>

      {sp.err ? (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 10,
            background: "rgba(220, 20, 60, 0.15)",
            border: "1px solid rgba(220, 20, 60, 0.35)",
            fontSize: 13,
          }}
        >
          Erro: {decodeURIComponent(sp.err)}
        </div>
      ) : null}

      {sp.ok ? (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 10,
            background: "rgba(0, 200, 120, 0.12)",
            border: "1px solid rgba(0, 200, 120, 0.28)",
            fontSize: 13,
          }}
        >
          ✅ {decodeURIComponent(sp.ok)}
        </div>
      ) : null}

      <form action={signupAction} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <input
          name="email"
          placeholder="Email"
          type="email"
          autoComplete="email"
          required
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.05)",
            color: "#fff",
            fontSize: 14,
          }}
        />
        <input
          name="password"
          placeholder="Senha (mínimo 6 caracteres)"
          type="password"
          autoComplete="new-password"
          required
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.05)",
            color: "#fff",
            fontSize: 14,
          }}
        />

        <button
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            background: "#fff",
            color: "#000",
            fontWeight: 900,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
          }}
        >
          Criar conta
        </button>
      </form>

      <div style={{ marginTop: 14, fontSize: 13, opacity: 0.8 }}>
        Já tem conta? <a href="/login" style={{ color: "#fff", textDecoration: "underline" }}>Faça login</a>
      </div>
    </main>
  );
}
