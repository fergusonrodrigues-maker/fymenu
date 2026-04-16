import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ err?: string; ok?: string; pending?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/painel");
  }

  const sp = (await searchParams) || {};
  const err = sp.err ? decodeURIComponent(sp.err) : "";
  const ok = sp.ok ? decodeURIComponent(sp.ok) : "";
  const pending = sp.pending || "";

  async function loginAction(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();

    if (!email || !password) {
      redirect("/entrar?err=" + encodeURIComponent("Preencha email e senha."));
    }

    const { error, data } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      redirect("/entrar?err=" + encodeURIComponent(error.message));
    }

    redirect("/painel");
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#fafafa",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .auth-dots {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image: radial-gradient(rgba(5,5,5,0.08) 1.2px, transparent 1.2px);
          background-size: 22px 22px;
          opacity: 0.5;
          mask-image: radial-gradient(ellipse at center, transparent 20%, black 70%);
          -webkit-mask-image: radial-gradient(ellipse at center, transparent 20%, black 70%);
        }

        .glass-container {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 400px;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          background: rgba(255,255,255,0.85);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 24px;
          padding: 28px 28px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.08);
        }

        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }

        .title {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 4px;
          text-align: center;
          background: linear-gradient(135deg, #c01050, #e5391f);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: none;
        }

        .subtitle {
          font-size: 13px;
          color: rgba(0,0,0,0.55);
          text-align: center;
          margin-bottom: 20px;
          font-size: 12px;
          text-shadow: none;
        }

        .form-group {
          margin-bottom: 12px;
        }

        .form-group label {
          display: block;
          font-size: 10px;
          font-weight: 800;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: rgba(0,0,0,0.7);
          text-shadow: none;
        }

        .input-wrapper input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 14px;
          color: #111;
          font-size: 15px;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
          box-sizing: border-box;
        }

        .input-wrapper input::placeholder {
          color: rgba(0,0,0,0.4);
        }

        .input-wrapper input:focus {
          border-color: rgba(213,22,89,0.3);
          background: rgba(0,0,0,0.03);
          box-shadow: 0 0 12px rgba(213,22,89,0.06);
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          margin-top: 16px;
          background: linear-gradient(135deg, #d51659, #fe4a2c);
          border: none;
          border-radius: 14px;
          color: #fff;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(213,22,89,0.2);
          font-family: inherit;
          letter-spacing: 0.3px;
        }

        .submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(213,22,89,0.3);
        }

        .submit-btn:active {
          transform: translateY(1px);
          box-shadow: 0 2px 10px rgba(213,22,89,0.15);
        }

        .divider {
          display: flex;
          align-items: center;
          margin: 24px 0;
          gap: 12px;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(0,0,0,0.08);
        }

        .divider-text {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: rgba(0,0,0,0.2);
          text-shadow: none;
        }

        .social-btn {
          width: 100%;
          padding: 14px;
          background: rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 14px;
          color: rgba(0,0,0,0.4);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 12px;
          font-family: inherit;
          text-shadow: none;
        }

        .social-btn:hover {
          background: rgba(0,0,0,0.05);
          border-color: rgba(0,0,0,0.12);
          color: rgba(0,0,0,0.6);
        }

        .footer-text {
          text-align: center;
          font-size: 13px;
          color: rgba(0,0,0,0.55);
          margin-top: 16px;
          text-shadow: none;
        }

        .footer-text a {
          color: #c01050;
          text-decoration: none;
          font-weight: 600;
          text-shadow: none;
        }

        .footer-text a:hover {
          text-decoration: underline;
        }

        .error-message {
          background: rgba(248,66,51,0.06);
          border: 1px solid rgba(248,66,51,0.15);
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .success-message {
          background: rgba(22,163,74,0.06);
          border: 1px solid rgba(22,163,74,0.15);
          color: #16a34a;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .forgot-password {
          display: flex;
          justify-content: flex-end;
          margin-top: -4px;
          margin-bottom: 12px;
        }

        .forgot-password a {
          font-size: 13px;
          color: #c01050;
          text-decoration: none;
          font-weight: 600;
          text-shadow: none;
        }

        .forgot-password a:hover {
          text-decoration: underline;
        }
      `}</style>

      {/* Dot grid background */}
      <div className="auth-dots" />

      <div className="glass-container">
        <div className="logo">
          <img src="https://rjfbavmupiypxiqzksxo.supabase.co/storage/v1/object/public/landing/fymenu-vermelha.png" height={72} style={{ width: "auto", maxWidth: 260, objectFit: "contain" }} alt="FyMenu" />
        </div>

        <h1 className="title">Bem-vindo</h1>
        <p className="subtitle">Gerencie seu cardápio digital</p>

        {err && <div className="error-message">{err}</div>}
        {ok && <div className="success-message">{ok}</div>}
        {pending === "email" && (
          <div style={{
            padding: "14px 18px", borderRadius: 14,
            background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)",
            color: "#fbbf24", fontSize: 13, marginBottom: 16, textAlign: "center",
          }}>
            Verifique seu email para confirmar a conta. Depois faça login aqui.
          </div>
        )}

        <form action={loginAction} style={{ display: "grid", gap: 0 }}>
          <div className="form-group">
            <label>Email</label>
            <div className="input-wrapper">
              <input
                name="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Senha</label>
            <div className="input-wrapper">
              <input
                name="password"
                type="password"
                placeholder="Sua senha"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <div className="forgot-password">
            <a href="/auth/reset-password">Esqueceu a senha?</a>
          </div>

          <button type="submit" className="submit-btn">Entrar</button>
        </form>

        <div className="footer-text">
          Não tem conta? <a href="/cadastro">Criar uma agora</a>
        </div>
      </div>
    </main>
  );
}
