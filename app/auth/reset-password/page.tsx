import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ code?: string; err?: string; ok?: string }>;
}) {
  const sp = (await searchParams) || {};
  const code = sp.code ? decodeURIComponent(sp.code) : "";
  const err = sp.err ? decodeURIComponent(sp.err) : "";
  const ok = sp.ok ? decodeURIComponent(sp.ok) : "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!code && user) {
    redirect("/dashboard");
  }

  async function handleResetPassword(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const email = String(formData.get("email") || "").trim();

    if (!email) {
      redirect("/auth/reset-password?err=" + encodeURIComponent("Digite seu email."));
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://fymenu.vercel.app"}/auth/reset-password`,
    });

    if (error) {
      redirect("/auth/reset-password?err=" + encodeURIComponent(error.message));
    }

    redirect(
      "/auth/reset-password?ok=" +
      encodeURIComponent("Verifique seu email para confirmar a mudança de senha.")
    );
  }

  async function handleNewPassword(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const password = String(formData.get("password") || "").trim();
    const confirmPassword = String(formData.get("confirmPassword") || "").trim();

    if (!password || !confirmPassword) {
      redirect(
        "/auth/reset-password?code=" +
        encodeURIComponent(code) +
        "&err=" +
        encodeURIComponent("Preencha ambas as senhas.")
      );
    }

    if (password !== confirmPassword) {
      redirect(
        "/auth/reset-password?code=" +
        encodeURIComponent(code) +
        "&err=" +
        encodeURIComponent("As senhas não correspondem.")
      );
    }

    if (password.length < 6) {
      redirect(
        "/auth/reset-password?code=" +
        encodeURIComponent(code) +
        "&err=" +
        encodeURIComponent("Senha deve ter pelo menos 6 caracteres.")
      );
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      redirect(
        "/auth/reset-password?code=" +
        encodeURIComponent(code) +
        "&err=" +
        encodeURIComponent(error.message)
      );
    }

    redirect(
      "/login?ok=" + encodeURIComponent("Senha alterada com sucesso! Faça login agora.")
    );
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
        .container {
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
          box-sizing: border-box;
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

        .button {
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

        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0, 255, 205, 0.4);
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error {
          background: rgba(248, 66, 51, 0.15);
          border: 1px solid rgba(248, 66, 51, 0.3);
          color: #ff9999;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .success {
          background: rgba(0, 255, 205, 0.15);
          border: 1px solid rgba(0, 255, 205, 0.3);
          color: #00ffcd;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .link {
          text-align: center;
          font-size: 13px;
          color: #00ffcd;
          text-decoration: none;
          margin-top: 16px;
          display: block;
          font-weight: 500;
        }

        .link:hover {
          text-decoration: underline;
        }
      `}</style>

      <div className="container">
        {!code ? (
          <>
            <h1 className="title">Recuperar Senha</h1>
            <p className="subtitle">Enviaremos um link para seu email</p>

            {err && <div className="error">⚠️ {err}</div>}
            {ok && <div className="success">✅ {ok}</div>}

            <form action={handleResetPassword} style={{ display: "grid", gap: 0 }}>
              <div className="form-group">
                <label>Email</label>
                <div className="input-wrapper">
                  <input
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="button">
                Enviar Link
              </button>
            </form>

            <a href="/login" className="link">
              ← Voltar ao login
            </a>
          </>
        ) : (
          <>
            <h1 className="title">Nova Senha</h1>
            <p className="subtitle">Defina uma nova senha segura</p>

            {err && <div className="error">⚠️ {err}</div>}

            <form action={handleNewPassword} style={{ display: "grid", gap: 0 }}>
              <input type="hidden" name="code" value={code} />

              <div className="form-group">
                <label>Nova Senha</label>
                <div className="input-wrapper">
                  <input
                    name="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
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
                    placeholder="Confirme a senha"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="button">
                Atualizar Senha
              </button>
            </form>

            <a href="/login" className="link">
              ← Voltar ao login
            </a>
          </>
        )}
      </div>
    </main>
  );
}
