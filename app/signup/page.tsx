import { signupAction } from "./actions";

export default function SignupPage() {
  return (
    <main style={{ padding: 18, maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Criar conta</h1>

      <form action={signupAction} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <input
          name="email"
          placeholder="Email"
          type="email"
          required
          style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.15)" }}
        />

        <input
          name="password"
          placeholder="Senha (mín. 6)"
          type="password"
          minLength={6}
          required
          style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.15)" }}
        />

        <button
          style={{
            padding: 12,
            borderRadius: 12,
            border: 0,
            background: "#111",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Criar conta
        </button>

        <a href="/login" style={{ fontSize: 14, opacity: 0.75 }}>
          Já tem conta? Entrar
        </a>
      </form>
    </main>
  );
}