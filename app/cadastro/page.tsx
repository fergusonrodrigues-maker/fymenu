"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState<null | { valid: boolean; message: string }>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  async function validateCoupon(code: string) {
    const trimmed = code.trim();
    if (!trimmed) { setCouponStatus(null); return; }
    setValidatingCoupon(true);
    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (data.valid) {
        let msg = "Cupom válido!";
        if (data.discount_type === "trial_days") msg = `Cupom válido! +${data.trial_extra_days} dias de trial`;
        else if (data.discount_type === "percent") msg = `Cupom válido! Desconto de ${data.discount_value}%`;
        else if (data.discount_type === "fixed") msg = `Cupom válido! Desconto de R$${data.discount_value}`;
        setCouponStatus({ valid: true, message: msg });
      } else {
        setCouponStatus({ valid: false, message: "Cupom inválido ou expirado" });
      }
    } finally {
      setValidatingCoupon(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password || !confirmPassword) {
      setError("Preencha todos os campos."); return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não correspondem."); return;
    }
    if (password.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres."); return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signupError, data: authData } = await supabase.auth.signUp({ email, password });
      if (signupError) { setError(signupError.message); return; }

      if (authData.user?.id) {
        const restaurantName = email.split("@")[0];
        const { data: restaurant } = await supabase
          .from("restaurants")
          .insert({ owner_id: authData.user.id, name: restaurantName, onboarding_completed: false })
          .select("id")
          .single();

        if (couponCode.trim() && couponStatus?.valid && restaurant?.id) {
          await fetch("/api/coupon/apply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: couponCode.trim(), restaurant_id: restaurant.id }),
          });
        }
      }

      router.push("/entrar?ok=" + encodeURIComponent("Conta criada com sucesso. Faça login agora."));
    } catch (err: any) {
      setError(err.message || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
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

        .auth-glow {
          position: fixed;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
        }

        .glass-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(0,255,174,0.12);
          border-radius: 24px;
          padding: 48px 36px;
          box-shadow: 0 8px 40px rgba(0,255,174,0.06), inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
          font-size: 32px;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .logo-gradient {
          background: linear-gradient(135deg, #00ffae 0%, #00d9ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
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
        }

        .subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          text-align: center;
          margin-bottom: 32px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: linear-gradient(to right, rgba(255,255,255,0.4) 0%, #fff 10%, rgba(255,255,255,0.4) 20%);
          background-size: 180px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: textShine 3s infinite linear;
        }

        .input-wrapper input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(0,255,174,0.1);
          border-radius: 12px;
          color: #ffffff;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.3s ease;
        }

        .input-wrapper input::placeholder {
          color: rgba(255,255,255,0.25);
        }

        .input-wrapper input:focus {
          outline: none;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(0,255,174,0.35);
          box-shadow: 0 0 0 3px rgba(0,255,174,0.08), 0 0 20px rgba(0,255,174,0.05);
        }

        .submit-btn {
          width: 100%;
          padding: 14px 24px;
          margin-top: 24px;
          background: linear-gradient(135deg, #00ffae 0%, #00d9ff 100%);
          border: none;
          border-radius: 14px;
          color: #000;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(0,255,174,0.25), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.08);
          letter-spacing: 0.3px;
          font-family: inherit;
          transform: translateY(0);
        }

        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,255,174,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
        }

        .submit-btn:active {
          transform: translateY(1px);
          box-shadow: 0 2px 8px rgba(0,255,174,0.15), inset 0 2px 4px rgba(0,0,0,0.12);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
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
          background: rgba(0,255,174,0.08);
        }

        .divider-text {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          background: linear-gradient(to right, rgba(255,255,255,0.3) 0%, #fff 10%, rgba(255,255,255,0.3) 20%);
          background-size: 180px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: textShine 3s infinite linear;
        }

        .social-btn {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(0,255,174,0.1);
          border-radius: 12px;
          color: rgba(255,255,255,0.7);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 12px;
          font-family: inherit;
        }

        .social-btn:hover {
          background: rgba(0,255,174,0.04);
          border-color: rgba(0,255,174,0.2);
          color: #fff;
        }

        .footer-text {
          text-align: center;
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          margin-top: 24px;
        }

        .footer-text a {
          background: linear-gradient(135deg, #00ffae 0%, #00d9ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-decoration: none;
          font-weight: 600;
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

        .text-shine {
          background: linear-gradient(to right, rgba(255,255,255,0.4) 0%, #fff 10%, rgba(255,255,255,0.4) 20%);
          background-position: 0;
          background-size: 180px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: textShine 3s infinite linear;
        }
        @keyframes textShine {
          0% { background-position: 0; }
          60% { background-position: 180px; }
          100% { background-position: 180px; }
        }

        .coupon-badge-valid {
          background: rgba(0,255,174,0.08);
          border: 1px solid rgba(0,255,174,0.25);
          color: #00ffae;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 12px;
          margin-top: 8px;
          font-weight: 600;
        }

        .coupon-badge-invalid {
          background: rgba(248,66,51,0.08);
          border: 1px solid rgba(248,66,51,0.2);
          color: #ff9999;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 12px;
          margin-top: 8px;
          font-weight: 600;
        }
      `}</style>

      {/* Dot background + glow */}
      <div className="auth-dots" />
      <div className="auth-glow" style={{ width: 400, height: 400, background: "rgba(0,255,174,0.06)", top: "20%", left: "10%" }} />
      <div className="auth-glow" style={{ width: 300, height: 300, background: "rgba(0,217,255,0.04)", bottom: "20%", right: "10%" }} />

      <div className="glass-container">
        <div className="logo">
          <span className="logo-gradient">FyMenu</span>
        </div>

        <h1 className="title">Criar Conta</h1>
        <p className="subtitle text-shine">Cardápio digital em minutos</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 0 }}>
          <div className="form-group">
            <label>Email</label>
            <div className="input-wrapper">
              <input
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Senha</label>
            <div className="input-wrapper">
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Confirmar Senha</label>
            <div className="input-wrapper">
              <input
                type="password"
                placeholder="Confirme sua senha"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Cupom de indicação (opcional)</label>
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Ex: PARCEIRO2025"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                onBlur={(e) => validateCoupon(e.target.value)}
                style={{ fontFamily: "monospace", letterSpacing: "0.1em" }}
              />
            </div>
            {validatingCoupon && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 6 }}>Validando...</p>}
            {couponStatus && !validatingCoupon && (
              <div className={couponStatus.valid ? "coupon-badge-valid" : "coupon-badge-invalid"}>
                {couponStatus.valid ? "✓" : "✗"} {couponStatus.message}
              </div>
            )}
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Criando conta..." : "Criar Conta"}
          </button>
        </form>

        <div className="divider">
          <span className="divider-text">ou</span>
        </div>

        <button className="social-btn">Continuar com Google</button>

        <div className="footer-text text-shine">
          Já tem conta? <a href="/entrar">Fazer login</a>
        </div>
      </div>
    </main>
  );
}
