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
    const confirmPassword = String(formData.get("confirmPassword") || "").trim();

    if (!email || !password || !confirmPassword) {
      redirect("/cadastro?err=" + encodeURIComponent("Preencha todos os campos."));
    }

    if (password !== confirmPassword) {
      redirect("/cadastro?err=" + encodeURIComponent("As senhas não correspondem."));
    }

    if (password.length < 6) {
      redirect("/cadastro?err=" + encodeURIComponent("Senha deve ter pelo menos 6 caracteres."));
    }

    const supabase = await createClient();

    // 1. Criar usuário no Auth
    const { error: signupError, data: authData } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signupError) {
      redirect("/cadastro?err=" + encodeURIComponent(signupError.message));
    }

    // 2. Criar restaurant automaticamente
    if (authData.user?.id) {
      const restaurantName = email.split("@")[0];

      const { error: restaurantError } = await supabase
        .from("restaurants")
        .insert({
          owner_id: authData.user.id,
          name: restaurantName,
          onboarding_completed: false,
        });

      if (restaurantError) {
        console.error("Erro ao criar restaurant:", restaurantError);
      }
    }

    redirect("/entrar?ok=Conta criada com sucesso. Faça login agora.");
  }

  return (
    <main style={{ 
      minHeight: "100vh",
      background: "linear-gradient(135deg, #2c2c2c 0%, #1a1a2e 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        .glass-container {
          position: relative;
          width: 100%;
          max-width: 420px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 24px;
          padding: 48px 36px;
          box-shadow: 0 8px 32px rgba(0, 255, 205, 0.1);
        }

        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -1px;
        }

        .logo-fy { color: #00ffcd; }
        .logo-circle { color: #f84233; }
        .logo-menu { color: #ffffff; }

        .title {
          font-size: 28px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 8px;
          text-align: center;
        }

        .subtitle {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          text-align: center;
          margin-bottom: 32px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .input-wrapper {
          position: relative;
        }

        .input-wrapper input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          color: #ffffff;
          font-size: 14px;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .input-wrapper input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .input-wrapper input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid #00ffcd;
          box-shadow: 0 0 0 3px rgba(0, 255, 205, 0.1);
        }

        .submit-btn {
          width: 100%;
          padding: 14px 24px;
          margin-top: 24px;
          background: linear-gradient(135deg, #00ffcd 0%, #00d9b8 100%);
          border: none;
          border-radius: 12px;
          color: #000;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 24px rgba(0, 255, 205, 0.3);
          letter-spacing: 0.5px;
        }

        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0, 255, 205, 0.4);
        }

        .submit-btn:active {
          transform: translateY(0);
          box-shadow: 0 4px 16px rgba(0, 255, 205, 0.2);
        }

        .divider {
          display: flex;
          align-items: center;
          margin: 28px 0;
          gap: 12px;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
        }

        .divider-text {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .social-btn {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          color: #ffffff;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 12px;
          backdrop-filter: blur(10px);
        }

        .social-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .footer-text {
          text-align: center;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 24px;
        }

        .footer-text a {
          color: #00ffcd;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.3s ease;
        }

        .footer-text a:hover {
          text-decoration: underline;
        }

        .error-message {
          background: rgba(248, 66, 51, 0.15);
          border: 1px solid rgba(248, 66, 51, 0.3);
          color: #ff9999;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .success-message {
          background: rgba(0, 255, 205, 0.15);
          border: 1px solid rgba(0, 255, 205, 0.3);
          color: #00ffcd;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 16px;
        }
      `}</style>

      <div className="glass-container">
        <div className="logo">
          <span className="logo-fy">f</span><span className="logo-fy">y</span><span className="logo-circle">●</span><span className="logo-menu">menu</span>
        </div>

        <h1 className="title">Criar Conta</h1>
        <p className="subtitle">Cardápio digital em minutos</p>

        {sp.err && <div className="error-message">{decodeURIComponent(sp.err)}</div>}
        {sp.ok && <div className="success-message">{decodeURIComponent(sp.ok)}</div>}

        <form action={signupAction} style={{ display: "grid", gap: 0 }}>
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
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Confirmar Senha</label>
            <div className="input-wrapper">
              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirme sua senha"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <button type="submit" className="submit-btn">Criar Conta</button>
        </form>

        <div className="divider">
          <span className="divider-text">ou</span>
        </div>

        <button className="social-btn">Continuar com Google</button>

        <div className="footer-text">
          Já tem conta? <a href="/entrar">Fazer login</a>
        </div>
      </div>
    </main>
  );
}