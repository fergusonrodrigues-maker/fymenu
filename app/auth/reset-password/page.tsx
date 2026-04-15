import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UpdatePasswordForm from "./UpdatePasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; ok?: string; code?: string }>;
}) {
  const sp = (await searchParams) || {};
  const error = sp.error ? decodeURIComponent(sp.error) : "";
  const ok = sp.ok ? decodeURIComponent(sp.ok) : "";
  const code = sp.code || "";

  // Se vier com code (link do email), trocar senha
  async function updatePasswordAction(formData: FormData): Promise<void> {
    "use server";
    const password = String(formData.get("password") || "").trim();
    const confirmPassword = String(formData.get("confirmPassword") || "").trim();

    if (!password || !confirmPassword) {
      redirect("/auth/reset-password?error=" + encodeURIComponent("Preencha todos os campos."));
    }

    if (password.length < 6) {
      redirect("/auth/reset-password?error=" + encodeURIComponent("Senha deve ter pelo menos 6 caracteres."));
    }

    if (password !== confirmPassword) {
      redirect("/auth/reset-password?error=" + encodeURIComponent("As senhas não correspondem."));
    }

    const supabase = await createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      redirect("/auth/reset-password?error=" + encodeURIComponent(updateError.message));
    }

    redirect("/entrar?ok=" + encodeURIComponent("Senha atualizada com sucesso. Faça login."));
  }

  // Enviar email de reset
  async function sendResetEmailAction(formData: FormData): Promise<void> {
    "use server";
    const email = String(formData.get("email") || "").trim();

    if (!email) {
      redirect("/auth/reset-password?error=" + encodeURIComponent("Informe seu email."));
    }

    const supabase = await createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://fymenu.vercel.app"}/auth/reset-password`,
    });

    if (resetError) {
      redirect("/auth/reset-password?error=" + encodeURIComponent(resetError.message));
    }

    redirect("/auth/reset-password?ok=" + encodeURIComponent("Email enviado! Verifique sua caixa de entrada."));
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #2c2c2c 0%, #1a1a2e 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .glass-container {
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
          font-size: 24px;
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
          line-height: 1.6;
        }

        .success-msg {
          background: rgba(0, 255, 205, 0.15);
          border: 1px solid rgba(0, 255, 205, 0.3);
          color: #00ffcd;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .error-msg {
          background: rgba(248, 66, 51, 0.15);
          border: 1px solid rgba(248, 66, 51, 0.3);
          color: #ff9999;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .input-group {
          margin-bottom: 16px;
        }

        .input-label {
          display: block;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 8px;
          font-weight: 500;
        }

        .input-field {
          width: 100%;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          color: #ffffff;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s;
        }

        .input-field:focus {
          border-color: #00ffcd;
          background: rgba(255, 255, 255, 0.09);
        }

        .input-field::placeholder { color: rgba(255, 255, 255, 0.3); }

        .submit-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #00ffcd, #00d4aa);
          border: none;
          border-radius: 12px;
          color: #1a1a2e;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 8px;
          transition: opacity 0.2s;
        }

        .submit-btn:hover { opacity: 0.9; }

        .back-link {
          display: block;
          text-align: center;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
          text-decoration: none;
          margin-top: 20px;
          transition: color 0.2s;
        }

        .back-link:hover { color: #00ffcd; }
      `}</style>

      <div className="glass-container">
        <div className="logo">
          <span className="logo-fy">fy</span>
          <span className="logo-circle">●</span>
          <span className="logo-menu">menu</span>
        </div>

        {code ? (
          // Formulário para definir nova senha (veio do link do email)
          <>
            <h1 className="title">Nova Senha</h1>
            <p className="subtitle">Digite e confirme sua nova senha</p>
            <UpdatePasswordForm action={updatePasswordAction} error={error} />
          </>
        ) : (
          // Formulário para enviar email de reset
          <>
            <h1 className="title">Recuperar Senha</h1>
            <p className="subtitle">
              Informe seu email e enviaremos um link para redefinir sua senha
            </p>
            {error && <div className="error-msg">⚠️ {error}</div>}
            {ok && <div className="success-msg">✅ {ok}</div>}
            {!ok && (
              <form action={sendResetEmailAction}>
                <div className="input-group">
                  <label className="input-label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    className="input-field"
                    type="email"
                    name="email"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <button type="submit" className="submit-btn">Enviar link de recuperação</button>
              </form>
            )}
          </>
        )}

        <a href="/entrar" className="back-link">← Voltar ao login</a>
      </div>
    </main>
  );
}
