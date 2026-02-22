import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type SP = { err?: string; ok?: string };

export default async function SignupPage({
  searchParams,
}: {
  // Next 16: searchParams pode vir como Promise
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

    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      redirect("/signup?err=" + encodeURIComponent(error.message));
    }

    // Se estiver com "Confirm email" ligado no Supabase:
    // o usuário precisa confirmar no email antes de logar.
    redirect("/login?ok=1");
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
          Conta criada. Confira seu email para confirmar (se estiver habilitado) e faça login.
        </div>
      ) : null}

      <form action={signupAction} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <input
          name="email"
          placeholder="Email"
          type="email"
          autoComplete="email"
          required
          style={inputStyle}
        />
        <input
          name="password"
          placeholder="Senha"
          type="password"
          autoComplete="new-password"
          required
          style={inputStyle}
        />

        <button style={btnStyle}>Criar conta</button>
      </form>

      <div style={{ marginTop: 14, fontSize: 13, opacity: 0.8 }}>
        Já tem conta? <a href="/login" style={{ color: "#fff", fontWeight: 900 }}>Entrar</a>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  outline: "none",
};

const btnStyle: React.CSSProperties = {
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.10)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 900,
};