import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string; error?: string; message?: string }>;
}) {
  const sp = (await searchParams) || {};
  const token = sp.token ? decodeURIComponent(sp.token) : "";
  const error = sp.error ? decodeURIComponent(sp.error) : "";
  const message = sp.message ? decodeURIComponent(sp.message) : "";

  const supabase = await createClient();

  // Se houver token, confirmar email
  if (token) {
    const { error: err } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: "email",
    });

    if (err) {
      redirect(`/auth/confirm-email?error=${encodeURIComponent(err.message)}`);
    }

    redirect("/dashboard?verified=true");
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
          line-height: 1.6;
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

        .error {
          background: rgba(248, 66, 51, 0.15);
          border: 1px solid rgba(248, 66, 51, 0.3);
          color: #ff9999;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .info {
          background: rgba(0, 150, 255, 0.15);
          border: 1px solid rgba(0, 150, 255, 0.3);
          color: #80c8ff;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .icon {
          font-size: 48px;
          text-align: center;
          margin-bottom: 16px;
          display: block;
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
        {error ? (
          <>
            <span className="icon">❌</span>
            <h1 className="title">Erro ao Verificar Email</h1>
            <p className="subtitle">Houve um problema ao confirmar seu email</p>
            <div className="error">⚠️ {error}</div>
            <a href="/signup" className="link">← Voltar ao cadastro</a>
          </>
        ) : (
          <>
            <span className="icon">📧</span>
            <h1 className="title">Verifique seu Email</h1>
            <p className="subtitle">
              Enviamos um link de confirmação para o seu email
            </p>
            {message && <div className="info">ℹ️ {message}</div>}
            <div className="success">
              ✅ Acesse seu email e clique no link para ativar sua conta
            </div>
            <a href="/login" className="link">← Voltar ao login</a>
          </>
        )}
      </div>
    </main>
  );
}
