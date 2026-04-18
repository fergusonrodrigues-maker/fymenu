"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import PasswordReqs, { passwordValid, translatePasswordError } from "@/components/PasswordReqs";

type Modo = "login" | "criar";

interface AppliedCoupon {
  code: string;
  discount_type: string;
  trial_extra_days: number;
  label: string;
}

export default function EntrarClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [modo, setModo] = useState<Modo>(
    searchParams.get("modo") === "criar" ? "criar" : "login"
  );

  const urlErr = searchParams.get("err") ? decodeURIComponent(searchParams.get("err")!) : "";
  const urlOk = searchParams.get("ok") ? decodeURIComponent(searchParams.get("ok")!) : "";
  const urlPending = searchParams.get("pending") || "";

  // Shared fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(urlErr || null);
  const [success, setSuccess] = useState<string | null>(urlOk || null);
  const [loading, setLoading] = useState(false);

  // Signup-only fields
  const [confirmPassword, setConfirmPassword] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupons, setAppliedCoupons] = useState<AppliedCoupon[]>([]);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  function switchModo(m: Modo) {
    setModo(m);
    setError(null);
    setSuccess(null);
    router.replace(`/entrar?modo=${m}`, { scroll: false });
  }

  async function validateAndApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    if (appliedCoupons.some((c) => c.code === code)) {
      setCouponError("Cupom já adicionado");
      return;
    }
    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.valid) {
        let label = `✓ Cupom ${code} adicionado`;
        if (data.discount_type === "trial_days")
          label = `✓ ${code} (+${data.trial_extra_days}d trial)`;
        else if (data.discount_type === "percent")
          label = `✓ ${code} (${data.discount_value}% desc.)`;
        else if (data.discount_type === "fixed")
          label = `✓ ${code} (R$${data.discount_value} desc.)`;
        setAppliedCoupons((prev) => [
          ...prev,
          {
            code,
            discount_type: data.discount_type,
            trial_extra_days: data.trial_extra_days || 0,
            label,
          },
        ]);
        setCouponInput("");
      } else {
        setCouponError("Cupom inválido ou expirado");
      }
    } finally {
      setValidatingCoupon(false);
    }
  }

  function removeCoupon(code: string) {
    setAppliedCoupons((prev) => prev.filter((c) => c.code !== code));
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Preencha email e senha.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        const msg = authError.message.includes("Invalid login credentials")
          ? "Email ou senha incorretos."
          : authError.message;
        setError(msg);
        return;
      }
      router.push("/painel");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password || !confirmPassword) {
      setError("Preencha todos os campos.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não correspondem.");
      return;
    }
    if (!passwordValid(password)) {
      setError("A senha não atende aos requisitos mínimos.");
      return;
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
      if (authError) {
        setError(translatePasswordError(authError.message));
        return;
      }

      let session = authData.session;
      if (!session) {
        const { data: loginData } = await supabase.auth.signInWithPassword({ email, password });
        if (!loginData.session) {
          router.push("/entrar?pending=email");
          return;
        }
        session = loginData.session;
      }

      // Calculate extra trial days from coupons
      const trialExtraDays = appliedCoupons
        .filter((c) => c.discount_type === "trial_days")
        .reduce((sum, c) => sum + c.trial_extra_days, 0);

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7 + trialExtraDays);

      const { data: restaurant, error: restaurantError } = await supabase
        .from("restaurants")
        .insert({
          owner_id: session.user.id,
          name: restaurantName,
          status: "trial",
          trial_ends_at: trialEndsAt.toISOString(),
          onboarding_completed: true,
        })
        .select("id")
        .single();

      if (restaurantError || !restaurant) {
        setError("Erro ao criar restaurante. Tente novamente.");
        return;
      }

      // Create default unit
      const slug =
        restaurantName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "meu-restaurante";

      await supabase.from("units").insert({
        restaurant_id: restaurant.id,
        name: restaurantName,
        slug,
        is_published: false,
      });

      // Apply coupons: create partner_referrals + increment uses
      for (const coupon of appliedCoupons) {
        const { data: couponData } = await supabase
          .from("partner_coupons")
          .select("id, partner_id, current_uses")
          .ilike("code", coupon.code)
          .eq("is_active", true)
          .maybeSingle();

        if (couponData) {
          await supabase.from("partner_referrals").insert({
            partner_id: couponData.partner_id,
            restaurant_id: restaurant.id,
            coupon_id: couponData.id,
            coupon_code: coupon.code,
            status: "active",
          });
          await supabase
            .from("partner_coupons")
            .update({ current_uses: (couponData.current_uses || 0) + 1 })
            .eq("id", couponData.id);
        }
      }

      router.push("/painel");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  // CTA button disabled state depends on mode
  const ctaDisabled = loading || (modo === "criar" && !passwordValid(password));

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fafafa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
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
          padding: 28px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.08);
          height: 720px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        @media (max-width: 639px) {
          .glass-container {
            height: auto;
            overflow: visible;
          }
          .fields-area {
            flex: unset;
            overflow-y: visible;
          }
        }

        /* ── Toggle ─────────────────────────────────────── */
        .mode-toggle {
          display: flex;
          background: rgba(0,0,0,0.05);
          border-radius: 999px;
          padding: 4px;
          margin-bottom: 16px;
          gap: 2px;
          flex-shrink: 0;
        }

        .mode-btn {
          flex: 1;
          padding: 8px 16px;
          border: none;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          background: transparent;
          color: #555;
        }

        .mode-btn.active {
          background: #d51659;
          color: #fff;
          box-shadow: 0 2px 10px rgba(213,22,89,0.28);
        }

        .mode-btn:not(.active):hover {
          background: rgba(0,0,0,0.06);
          color: #333;
        }

        /* ── Logo ────────────────────────────────────────── */
        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          flex-shrink: 0;
        }

        /* ── Title / subtitle (fade swap only) ──────────── */
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
          flex-shrink: 0;
          animation: auth-fade 150ms ease-out both;
        }

        .subtitle {
          font-size: 12px;
          color: rgba(0,0,0,0.55);
          text-align: center;
          margin-bottom: 20px;
          text-shadow: none;
          flex-shrink: 0;
          animation: auth-fade 150ms ease-out both;
        }

        /* ── Fields area (slide + fade) ──────────────────── */
        .fields-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          min-height: 0;
          animation: auth-fields-in-right 220ms ease-out both;
        }

        .fields-area--login {
          justify-content: center;
          animation: auth-fields-in-left 220ms ease-out both;
        }

        .fields-area--criar {
          justify-content: flex-start;
          animation: auth-fields-in-right 220ms ease-out both;
        }

        /* ── CTA footer (always fixed at bottom) ─────────── */
        .cta-footer {
          flex-shrink: 0;
          margin-top: 16px;
        }

        /* ── Form fields ─────────────────────────────────── */
        .form-group {
          margin-bottom: 0;
          flex-shrink: 0;
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

        .input-wrapper input::placeholder { color: rgba(0,0,0,0.4); }

        .input-wrapper input:focus {
          border-color: rgba(213,22,89,0.3);
          background: rgba(0,0,0,0.03);
          box-shadow: 0 0 12px rgba(213,22,89,0.06);
        }

        /* ── Submit button ───────────────────────────────── */
        .submit-btn {
          width: 100%;
          padding: 14px;
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
          position: relative;
          overflow: hidden;
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

        /* Label inside CTA fades on swap */
        .cta-label {
          animation: auth-fade 150ms ease-out both;
        }

        /* ── Messages ────────────────────────────────────── */
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

        /* ── Forgot password ─────────────────────────────── */
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

        .forgot-password a:hover { text-decoration: underline; }

        /* ── Coupon ──────────────────────────────────────── */
        .coupon-input-mono input {
          font-family: monospace;
          letter-spacing: 0.08em;
        }

        .coupon-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }

        .coupon-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(22,163,74,0.08);
          border: 1px solid rgba(22,163,74,0.22);
          color: #16a34a;
          padding: 5px 10px 5px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }

        .coupon-pill-remove {
          background: none;
          border: none;
          cursor: pointer;
          color: #16a34a;
          font-size: 15px;
          line-height: 1;
          padding: 0;
          opacity: 0.7;
          transition: opacity 0.15s;
        }

        .coupon-pill-remove:hover { opacity: 1; }

        .coupon-error {
          background: rgba(248,66,51,0.06);
          border: 1px solid rgba(248,66,51,0.15);
          color: #dc2626;
          padding: 7px 12px;
          border-radius: 10px;
          font-size: 12px;
          margin-top: 6px;
          font-weight: 600;
        }

        /* ── Keyframes ───────────────────────────────────── */
        @keyframes auth-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes auth-fields-in-right {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0);    }
        }

        @keyframes auth-fields-in-left {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0);     }
        }

        @media (prefers-reduced-motion: reduce) {
          .title, .subtitle, .fields-area, .fields-area--login,
          .fields-area--criar, .cta-label {
            animation: none !important;
          }
        }
      `}</style>

      <div className="auth-dots" />

      <div className="glass-container">

        {/* ── FIXED: Toggle ── */}
        <div className="mode-toggle">
          <button
            type="button"
            className={`mode-btn${modo === "login" ? " active" : ""}`}
            onClick={() => switchModo("login")}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`mode-btn${modo === "criar" ? " active" : ""}`}
            onClick={() => switchModo("criar")}
          >
            Criar conta
          </button>
        </div>

        {/* ── FIXED: Logo ── */}
        <div className="logo">
          <img
            src="https://rjfbavmupiypxiqzksxo.supabase.co/storage/v1/object/public/landing/fymenu-vermelha.png"
            height={72}
            style={{ width: "auto", maxWidth: 260, objectFit: "contain" }}
            alt="FyMenu"
          />
        </div>

        {/* ── FIXED + FADE: Title / subtitle ── */}
        <h1 key={`title-${modo}`} className="title">
          {modo === "login" ? "Bem-vindo" : "Criar Conta"}
        </h1>
        <p key={`sub-${modo}`} className="subtitle">
          {modo === "login" ? "Gerencie seu cardápio digital" : "Cardápio digital em minutos"}
        </p>

        {/* ── ANIMATED: Fields area (only inputs swap) ── */}
        <div key={`fields-${modo}`} className={`fields-area fields-area--${modo}`}>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          {urlPending === "email" && (
            <div
              style={{
                padding: "14px 18px",
                borderRadius: 14,
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.15)",
                color: "#b45309",
                fontSize: 13,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              Verifique seu email para confirmar a conta. Depois faça login aqui.
            </div>
          )}

          {/* LOGIN fields (no submit button — shared CTA below) */}
          {modo === "login" && (
            <form id="auth-form" onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
                    placeholder="Sua senha"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="forgot-password">
                <a href="/auth/reset-password">Esqueceu a senha?</a>
              </div>
            </form>
          )}

          {/* SIGNUP fields (no submit button — shared CTA below) */}
          {modo === "criar" && (
            <form id="auth-form" onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
                <label>
                  {appliedCoupons.length > 0 ? "+ Adicionar outro cupom" : "Cupom (opcional)"}
                </label>
                <div className="input-wrapper coupon-input-mono">
                  <input
                    type="text"
                    placeholder="Tem um cupom?"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      setCouponError(null);
                    }}
                    onBlur={() => validateAndApplyCoupon()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        validateAndApplyCoupon();
                      }
                    }}
                  />
                </div>
                {validatingCoupon && (
                  <p style={{ color: "rgba(0,0,0,0.4)", fontSize: 12, marginTop: 6 }}>
                    Validando...
                  </p>
                )}
                {couponError && !validatingCoupon && (
                  <div className="coupon-error">✗ {couponError}</div>
                )}
                {appliedCoupons.length > 0 && (
                  <div className="coupon-pills">
                    {appliedCoupons.map((c) => (
                      <span key={c.code} className="coupon-pill">
                        {c.label}
                        <button
                          type="button"
                          className="coupon-pill-remove"
                          onClick={() => removeCoupon(c.code)}
                          aria-label={`Remover cupom ${c.code}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* ── FIXED: CTA button anchored at bottom ── */}
        <div className="cta-footer">
          <button
            type="submit"
            form="auth-form"
            className="submit-btn"
            disabled={ctaDisabled}
          >
            <span key={`cta-${loading ? "loading" : modo}`} className="cta-label">
              {modo === "login"
                ? loading ? "Entrando..." : "Entrar"
                : loading ? "Criando conta..." : "Criar Conta"}
            </span>
          </button>
        </div>

      </div>
    </main>
  );
}
