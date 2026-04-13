"use client";

import { useState, useEffect, useRef } from "react";
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
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      el.style.left = e.clientX + "px";
      el.style.top = e.clientY + "px";
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

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

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
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

      {/* Dot grid background */}
      <div className="auth-dots" />

      {/* Mouse cursor glow */}
      <div
        ref={glowRef}
        style={{
          position: "fixed",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,255,174,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
          left: "-200px",
          top: "-200px",
          transform: "translate(-50%, -50%)",
          transition: "left 0.3s ease, top 0.3s ease",
          zIndex: 1,
        }}
      />

      <div className="glass-container">
        <div className="logo">FyMenu</div>

        <h1 className="title">Criar Conta</h1>
        <p className="subtitle">Cardápio digital em minutos</p>

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

        <div className="footer-text">
          Já tem conta? <a href="/entrar">Fazer login</a>
        </div>
      </div>
    </main>
  );
}
