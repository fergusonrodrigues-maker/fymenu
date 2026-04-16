"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import PasswordReqs, { passwordValid, translatePasswordError } from "@/components/PasswordReqs";

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
      const restaurantName = email.split("@")[0];

      const { error: authError, data: authData } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { restaurant_name: restaurantName } },
      });
      if (authError) { setError(translatePasswordError(authError.message)); return; }

      // Garantir sessão ativa — signUp com autoConfirm retorna sessão imediatamente,
      // mas se confirmação de email estiver ativa, session é null.
      let session = authData.session;

      if (!session) {
        const { data: loginData } = await supabase.auth.signInWithPassword({ email, password });
        if (!loginData.session) {
          // Email precisa ser confirmado — salvar pendência e mostrar aviso
          localStorage.setItem("fy_pending_restaurant", JSON.stringify({
            name: restaurantName,
            coupon: couponCode.trim() || null,
          }));
          router.push("/entrar?pending=email");
          return;
        }
        session = loginData.session;
      }

      const userId = session.user.id;

      const { data: restaurant, error: restaurantError } = await supabase
        .from("restaurants")
        .insert({ owner_id: userId, name: restaurantName, status: "pending", onboarding_completed: false })
        .select("id")
        .single();

      if (restaurantError || !restaurant) {
        console.error("Erro ao criar restaurante:", restaurantError);
        setError("Erro ao criar restaurante. Tente novamente.");
        return;
      }

      const slug = restaurantName.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "meu-restaurante";

      const { error: unitError } = await supabase.from("units").insert({
        restaurant_id: restaurant.id,
        name: restaurantName,
        slug,
        is_published: false,
      });
      if (unitError) console.error("Erro ao criar unidade:", unitError);

      if (couponCode.trim() && restaurant.id) {
        const { data: coupon } = await supabase
          .from("partner_coupons")
          .select("id, partner_id, code, current_uses")
          .eq("code", couponCode.toUpperCase().trim())
          .eq("is_active", true)
          .maybeSingle();

        if (coupon) {
          await supabase.from("partner_referrals").insert({
            partner_id: coupon.partner_id,
            restaurant_id: restaurant.id,
            coupon_id: coupon.id,
            coupon_code: coupon.code,
            status: "active",
          });
          await supabase.from("partner_coupons").update({
            current_uses: (coupon.current_uses || 0) + 1,
          }).eq("id", coupon.id);
        }
      }

      router.push("/painel");
    } catch (err: any) {
      setError(err.message || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
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

        .coupon-badge-valid {
          background: rgba(22,163,74,0.06);
          border: 1px solid rgba(22,163,74,0.15);
          color: #16a34a;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 12px;
          margin-top: 8px;
          font-weight: 600;
        }

        .coupon-badge-invalid {
          background: rgba(248,66,51,0.06);
          border: 1px solid rgba(248,66,51,0.15);
          color: #dc2626;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 12px;
          margin-top: 8px;
          font-weight: 600;
        }
      `}</style>

      {/* Dot grid background */}
      <div className="auth-dots" />

      <div className="glass-container">
        <div className="logo">
          <img src="https://rjfbavmupiypxiqzksxo.supabase.co/storage/v1/object/public/landing/logo-verrm.png" height={72} style={{ width: "auto", maxWidth: 260, objectFit: "contain" }} alt="FyMenu" />
        </div>

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
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <PasswordReqs password={password} />
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
            {validatingCoupon && <p style={{ color: "rgba(0,0,0,0.4)", fontSize: 12, marginTop: 6 }}>Validando...</p>}
            {couponStatus && !validatingCoupon && (
              <div className={couponStatus.valid ? "coupon-badge-valid" : "coupon-badge-invalid"}>
                {couponStatus.valid ? "✓" : "✗"} {couponStatus.message}
              </div>
            )}
          </div>

          <button type="submit" className="submit-btn" disabled={loading || !passwordValid(password)}>
            {loading ? "Criando conta..." : "Criar Conta"}
          </button>
        </form>

        <div className="footer-text">
          Já tem conta? <a href="/entrar">Fazer login</a>
        </div>
      </div>
    </main>
  );
}
