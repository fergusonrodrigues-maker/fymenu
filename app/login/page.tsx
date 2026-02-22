import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = (await searchParams) || {};
  const err = sp.err ? decodeURIComponent(sp.err) : "";
  const ok = sp.ok ? decodeURIComponent(sp.ok) : "";

  async function loginAction(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();

    if (!email || !password) {
      redirect("/login?err=" + encodeURIComponent("Preencha email e senha."));
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      redirect("/login?err=" + encodeURIComponent(error.message));
    }

    redirect("/dashboard");
  }

  return (
    <main style={{ padding: 18, maxWidth: 420, margin: "0 auto", color: "#fff" }}>
      <h1 style={{ fontSize: 22, fontWeight: 950, margin: 0 }}>Login</h1>

      {err ? (
        <div style={{ marginTop: 12, color: "salmon", fontSize: 13, fontWeight: 800 }}>
          Erro: {err}
        </div>
      ) : null}

      {ok ? (
        <div style={{ marginTop: 12, color: "#7CFF8A", fontSize: 13, fontWeight: 800 }}>
          {ok}
        </div>
      ) : null}

      <form action={loginAction} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <input
          name="email"
          placeholder="Email"
          autoComplete="email"
          style={inputStyle}
        />
        <input
          name="password"
          placeholder="Senha"
          type="password"
          autoComplete="current-password"
          style={inputStyle}
        />

        <button style={btnStyle}>Entrar</button>
      </form>

      <div style={{ marginTop: 14, fontSize: 13, opacity: 0.8 }}>
        Não tem conta? <a href="/signup" style={{ color: "#fff", fontWeight: 900 }}>Criar conta</a>
      </div>

      <div style={{ height: 30 }} />
    </main>
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