import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MouseGlow from "@/app/components/MouseGlow";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ err?: string; ok?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/painel");
  }

  const sp = (await searchParams) || {};
  const err = sp.err ? decodeURIComponent(sp.err) : "";
  const ok = sp.ok ? decodeURIComponent(sp.ok) : "";

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
      background: "#050505",
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
          background-image: radial-gradient(rgba(0,255,174,0.25) 1.2px, transparent 1.2px);
          background-size: 22px 22px;
          filter: drop-shadow(0 0 3px rgba(0,255,174,0.25));
          opacity: 0.7;
        }

        .glass-container {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 400px;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px;
          padding: 40px 32px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }

        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 28px;
          font-size: 36px;
          font-weight: 900;
          font-style: italic;
          letter-spacing: -1px;
          color: #00ffae;
          text-shadow: 0 0 30px rgba(0,255,174,0.3), 0 0 60px rgba(0,255,174,0.1);
        }

        .title {
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 8px;
          text-align: center;
          background: linear-gradient(135deg, #00ffae 0%, #00d9ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: none;
          filter: drop-shadow(0 0 12px rgba(0,255,174,0.2));
        }

        .subtitle {
          font-size: 13px;
          color: rgba(255,255,255,0.35);
          text-align: center;
          margin-bottom: 32px;
          text-shadow: none;
        }

        .form-group {
          margin-bottom: 18px;
        }

        .form-group label {
          display: block;
          font-size: 10px;
          font-weight: 800;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: rgba(255,255,255,0.5);
          text-shadow: none;
        }

        .input-wrapper input {
          width: 100%;
          padding: 14px 18px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          color: #ffffff;
          font-size: 15px;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
          box-sizing: border-box;
        }

        .input-wrapper input::placeholder {
          color: rgba(255,255,255,0.2);
        }

        .input-wrapper input:focus {
          border-color: rgba(0,255,174,0.3);
          background: rgba(255,255,255,0.05);
          box-shadow: 0 0 12px rgba(0,255,174,0.08);
        }

        .submit-btn {
          width: 100%;
          padding: 16px;
          margin-top: 24px;
          background: linear-gradient(135deg, #00ffae 0%, #00d9ff 100%);
          border: none;
          border-radius: 14px;
          color: #000;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 0 20px rgba(0,255,174,0.15), 0 0 40px rgba(0,255,174,0.05), inset 0 1px 0 rgba(0,255,174,0.12), inset 0 -1px 0 rgba(0,0,0,0.2);
          font-family: inherit;
          letter-spacing: 0.3px;
        }

        .submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 30px rgba(0,255,174,0.25), 0 0 60px rgba(0,255,174,0.1), inset 0 1px 0 rgba(0,255,174,0.15), inset 0 -1px 0 rgba(0,0,0,0.2);
        }

        .submit-btn:active {
          transform: translateY(1px);
          box-shadow: 0 0 10px rgba(0,255,174,0.1), inset 0 2px 4px rgba(0,0,0,0.12);
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
          background: rgba(255,255,255,0.06);
        }

        .divider-text {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: rgba(255,255,255,0.2);
          text-shadow: none;
        }

        .social-btn {
          width: 100%;
          padding: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          color: rgba(255,255,255,0.4);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 12px;
          font-family: inherit;
          text-shadow: none;
        }

        .social-btn:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.6);
        }

        .footer-text {
          text-align: center;
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          margin-top: 24px;
          text-shadow: none;
        }

        .footer-text a {
          color: #00ffae;
          text-decoration: none;
          font-weight: 600;
          text-shadow: none;
        }

        .footer-text a:hover {
          text-decoration: underline;
        }

        .error-message {
          background: rgba(248,66,51,0.08);
          border: 1px solid rgba(248,66,51,0.2);
          color: #ff9999;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .success-message {
          background: rgba(0,255,174,0.06);
          border: 1px solid rgba(0,255,174,0.15);
          color: #00ffae;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .forgot-password {
          display: flex;
          justify-content: flex-end;
          margin-top: -6px;
          margin-bottom: 24px;
        }

        .forgot-password a {
          font-size: 13px;
          color: #00ffae;
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

      {/* Mouse cursor glow */}
      <MouseGlow />

      <div className="glass-container">
        <div className="logo">FyMenu</div>

        <h1 className="title">Bem-vindo</h1>
        <p className="subtitle">Gerencie seu cardápio digital</p>

        {err && <div className="error-message">{err}</div>}
        {ok && <div className="success-message">{ok}</div>}

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

        <div className="divider">
          <span className="divider-text">ou</span>
        </div>

        <button className="social-btn">Continuar com Google</button>

        <div className="footer-text">
          Não tem conta? <a href="/cadastro">Criar uma agora</a>
        </div>
      </div>
    </main>
  );
}
