"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Restaurant } from "../types";

const supabase = createClient();

const FYMENU_SUPPORT_WHATSAPP = "https://wa.me/5562982301642?text=Olá! Preciso de suporte com o FyMenu.";

const PLANS = [
  {
    key: "menu", name: "Menu", icon: "🍽️", units: "1 unidade",
    price: "199,90", badge: null, highlight: false,
    accent: "#a78bfa", accentRgb: "139,92,246",
    features: ["Cardápio de vídeo 9:16", "Pedidos via WhatsApp", "Link público + QR Code", "Modo TV", "Analytics básico"],
  },
  {
    key: "menupro", name: "MenuPro", icon: "⭐", units: "Até 3 unidades",
    price: "399,90", badge: "MAIS VENDIDO", highlight: true,
    accent: "#00ffae", accentRgb: "0,255,174",
    features: ["Tudo do Menu +", "Comanda Digital", "Cozinha + Garçom em tempo real", "CRM de clientes", "Analytics avançado com IA", "Relatórios em PDF", "Estoque básico"],
  },
  {
    key: "business", name: "Business", icon: "🏢", units: "Até 4 unidades",
    price: "1.599", badge: "7 DIAS GRÁTIS", highlight: false,
    accent: "#d4af37", accentRgb: "212,175,55",
    features: ["Tudo do MenuPro +", "Gestão completa de equipe + ponto", "Estoque completo com IA", "CRM com disparo de mensagens", "Financeiro com custos e margens", "Relatórios financeiros com IA", "Hub do gerente"],
  },
];

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)",
  color: "var(--dash-text)", fontSize: 13, fontWeight: 500, outline: "none", boxSizing: "border-box",
  transition: "border-color 0.2s",
};
const inputFocusHandlers = {
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "var(--dash-accent)";
    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0,255,174,0.08)";
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "var(--dash-border)";
    e.currentTarget.style.boxShadow = "none";
  },
};

export default function ConfigModal({ profile, restaurant }: { profile: Profile; restaurant: Restaurant }) {
  const [tab, setTab] = useState<"perfil" | "plano" | "seguranca">("perfil");

  // Perfil
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Senha
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Plano
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const currentPlan = restaurant?.plan || "menu";
  const currentPlanIdx = PLANS.findIndex(p => p.key === currentPlan);

  async function handleSaveProfile() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("profiles").update({
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      phone: phone.trim() || null,
    }).eq("id", user.id);
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  }

  async function handleChangePassword() {
    setPasswordError("");
    setPasswordSuccess(false);
    if (newPassword.length < 6) { setPasswordError("Mínimo 6 caracteres"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Senhas não conferem"); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    }
    setChangingPassword(false);
  }

  async function handleChangePlan(newPlan: string) {
    try {
      const res = await fetch("/api/plan/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: restaurant.id, plan: newPlan, cycle: "monthly" }),
      });
      const json = await res.json();
      if (res.ok && json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
      } else if (res.ok) {
        alert("Plano alterado com sucesso!");
        window.location.reload();
      } else {
        alert(json.error || "Erro ao alterar plano");
      }
    } catch { alert("Erro de conexão"); }
  }

  async function handleCancelPlan() {
    setCanceling(true);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: restaurant.id }),
      });
      if (res.ok) {
        alert("Plano cancelado. Seu cardápio ficará ativo até o fim do período pago.");
        setShowCancelConfirm(false);
      } else {
        const json = await res.json();
        alert(json.error || "Erro ao cancelar");
      }
    } catch { alert("Erro de conexão"); }
    finally { setCanceling(false); }
  }

  const TABS = [
    { key: "perfil", label: "Perfil" },
    { key: "plano", label: "Plano" },
    { key: "seguranca", label: "Segurança" },
  ] as const;

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Tabs */}
      <div className="tabs-scroll" style={{ display: "flex", gap: 2, padding: 3, background: "var(--dash-card)", borderRadius: 12, marginBottom: 16, overflowX: "auto", scrollbarWidth: "none" as any }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
            background: tab === t.key ? "var(--dash-accent-soft)" : "transparent",
            color: tab === t.key ? "var(--dash-accent)" : "var(--dash-text-muted)",
            fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
            transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB PERFIL ── */}
      {tab === "perfil" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dash-text)", marginBottom: 4 }}>Informações do dono</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Nome</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} style={inp} {...inputFocusHandlers} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Sobrenome</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} style={inp} {...inputFocusHandlers} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Telefone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(62) 99999-9999" style={inp} {...inputFocusHandlers} />
          </div>

          <div>
            <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Email</label>
            <input value={profile?.email || ""} disabled
              style={{ ...inp, background: "var(--dash-card)", color: "var(--dash-text-muted)" }} />
            <span style={{ fontSize: 9, color: "var(--dash-text-muted)", marginTop: 2, display: "block" }}>Email não pode ser alterado</span>
          </div>

          <button onClick={handleSaveProfile} disabled={saving} style={{
            width: "100%", padding: 12, borderRadius: 12, border: "none", cursor: "pointer",
            background: "var(--dash-accent-soft)", color: "var(--dash-accent)",
            fontSize: 13, fontWeight: 800, fontFamily: "inherit",
            boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
            opacity: saving ? 0.5 : 1,
          }}>
            {saved ? "✅ Salvo!" : saving ? "Salvando..." : "Salvar"}
          </button>

          {/* WhatsApp */}
          <div style={{ marginTop: 8, padding: 16, borderRadius: 14, background: "rgba(37,211,102,0.06)", boxShadow: "0 1px 0 rgba(37,211,102,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 4 }}>Precisa de ajuda?</div>
            <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
              Fale com a equipe FyMenu pelo WhatsApp. Estamos prontos pra ajudar.
            </div>
            <a href={FYMENU_SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: 12, borderRadius: 14,
              background: "rgba(37,211,102,0.12)", color: "#25d366",
              fontSize: 14, fontWeight: 800, textDecoration: "none",
              boxShadow: "0 1px 0 rgba(37,211,102,0.15) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
            }}>
              💬 Suporte WhatsApp
            </a>
          </div>

          {/* Sair da conta */}
          <form action="/api/auth/signout" method="post">
            <button type="submit" style={{
              width: "100%", padding: "12px 20px", borderRadius: 14, border: "none",
              background: "var(--dash-danger-soft)", color: "var(--dash-danger)",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>
              🚪 Sair da conta
            </button>
          </form>
        </div>
      )}

      {/* ── TAB PLANO ── */}
      {tab === "plano" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <style>{`@keyframes cfgGoldSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

          {PLANS.map((plan, idx) => {
            const isCurrent = currentPlan === plan.key;
            const isUpgrade = idx > currentPlanIdx;
            const isDowngrade = idx < currentPlanIdx;
            const isGold = plan.key === "business";
            const { accent, accentRgb } = plan;

            const cardBg = plan.highlight
              ? `rgba(${accentRgb},0.06)`
              : isGold
                ? "rgba(255,255,255,0.03)"
                : "var(--dash-card)";

            const cardBorder = isCurrent
              ? `2px solid ${accent}`
              : isGold
                ? "2px solid rgba(212,175,55,0.25)"
                : `1px solid rgba(${accentRgb},0.12)`;

            const btnBg = isCurrent
              ? `rgba(${accentRgb},0.12)`
              : plan.highlight
                ? `linear-gradient(135deg, #00ffae, #00d9ff)`
                : isGold
                  ? `rgba(212,175,55,0.1)`
                  : `rgba(${accentRgb},0.12)`;

            const btnColor = isCurrent
              ? accent
              : plan.highlight
                ? "#000"
                : accent;

            const btnBorder = isCurrent
              ? `1px solid ${accent}`
              : isGold
                ? `2px solid rgba(212,175,55,0.45)`
                : plan.highlight
                  ? "none"
                  : `1px solid rgba(${accentRgb},0.3)`;

            const btnLabel = isCurrent
              ? "✓ Plano atual"
              : isUpgrade
                ? isGold ? "Testar 7 dias grátis" : `Upgrade → ${plan.name}`
                : `Downgrade → ${plan.name}`;

            return (
              <div key={plan.key} style={{
                borderRadius: 20, padding: 20,
                background: cardBg,
                backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
                border: cardBorder,
                position: "relative", overflow: "hidden",
                boxShadow: isGold
                  ? `0 0 40px rgba(212,175,55,0.04), 0 1px 0 rgba(255,255,255,0.03) inset`
                  : `0 0 40px rgba(${accentRgb},0.03), 0 1px 0 rgba(255,255,255,0.03) inset`,
              }}>
                {/* Gold animated border — Business only */}
                {isGold && (
                  <div style={{ position: "absolute", inset: -2, borderRadius: "inherit", overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
                    <div style={{
                      position: "absolute", width: "200%", height: "200%", top: "-50%", left: "-50%",
                      background: "conic-gradient(from 0deg, transparent 0%, transparent 35%, rgba(180,140,20,0.25) 42%, rgba(212,175,55,0.5) 50%, rgba(255,215,0,0.7) 51%, rgba(212,175,55,0.5) 58%, rgba(180,140,20,0.25) 65%, transparent 70%, transparent 100%)",
                      animation: "cfgGoldSpin 3.5s linear infinite",
                    }} />
                    <div style={{ position: "absolute", inset: 2, borderRadius: 18, background: "var(--dash-bg, #0a0a0a)" }} />
                  </div>
                )}

                {/* Top radial glow */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 80, pointerEvents: "none",
                  background: `radial-gradient(ellipse at top, rgba(${accentRgb},0.08) 0%, transparent 70%)`,
                }} />

                {/* Content */}
                <div style={{ position: "relative", zIndex: 2 }}>
                  {/* Badge row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, minHeight: 20 }}>
                    {plan.badge ? (
                      <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: "1px",
                        padding: "3px 8px", borderRadius: 6,
                        background: isGold ? "rgba(212,175,55,0.12)" : `rgba(${accentRgb},0.1)`,
                        color: accent,
                        border: `1px solid rgba(${accentRgb},0.2)`,
                      }}>{plan.badge}</span>
                    ) : <span />}
                    {isCurrent && (
                      <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: "0.5px",
                        padding: "3px 8px", borderRadius: 6,
                        background: `rgba(${accentRgb},0.12)`, color: accent,
                      }}>ATUAL</span>
                    )}
                  </div>

                  {/* Icon + name + subtitle */}
                  <div style={{ textAlign: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 26, marginBottom: 4 }}>{plan.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: isGold ? "#d4af37" : "var(--dash-text)" }}>{plan.name}</div>
                    <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginTop: 2 }}>{plan.units}</div>
                  </div>

                  {/* Price */}
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <span style={{ fontSize: 32, fontWeight: 900, color: isGold ? "var(--dash-text)" : accent }}>
                      R${plan.price}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--dash-text-muted)" }}>/mês</span>
                  </div>

                  {/* Features */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                    {plan.features.map((f) => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--dash-text-muted)" }}>
                        <span style={{ color: accent, fontSize: 11, flexShrink: 0 }}>✓</span>
                        {f}
                      </div>
                    ))}
                  </div>

                  {/* Action button */}
                  <button
                    onClick={isCurrent ? undefined : () => handleChangePlan(plan.key)}
                    disabled={isCurrent}
                    style={{
                      width: "100%", padding: "12px", borderRadius: 12,
                      background: btnBg, color: btnColor,
                      border: btnBorder, cursor: isCurrent ? "default" : "pointer",
                      fontSize: 13, fontWeight: 800, fontFamily: "inherit",
                      opacity: isCurrent ? 0.8 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    {btnLabel}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Cancelar plano */}
          <div style={{ marginTop: 4 }}>
            {!showCancelConfirm ? (
              <button onClick={() => setShowCancelConfirm(true)} style={{
                width: "100%", padding: 12, borderRadius: 14, border: "1px solid var(--dash-border)", cursor: "pointer",
                background: "transparent", color: "var(--dash-text-muted)",
                fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              }}>
                Cancelar plano
              </button>
            ) : (
              <div style={{ padding: 16, borderRadius: 14, background: "var(--dash-danger-soft)", boxShadow: "0 1px 0 rgba(248,113,113,0.06) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-danger)", marginBottom: 8 }}>Tem certeza?</div>
                <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
                  Ao cancelar, seu cardápio será desativado ao fim do período pago. Seus dados ficam guardados por 30 dias.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowCancelConfirm(false)} style={{
                    flex: 1, padding: 10, borderRadius: 12, border: "none", cursor: "pointer",
                    background: "var(--dash-card-hover)", color: "var(--dash-text-muted)",
                    fontSize: 12, fontFamily: "inherit",
                  }}>Manter plano</button>
                  <button onClick={handleCancelPlan} disabled={canceling} style={{
                    flex: 1, padding: 10, borderRadius: 12, border: "none", cursor: "pointer",
                    background: "var(--dash-danger-soft)", color: "var(--dash-danger)",
                    fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                    opacity: canceling ? 0.5 : 1,
                  }}>{canceling ? "Cancelando..." : "Confirmar cancelamento"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB SEGURANÇA ── */}
      {tab === "seguranca" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dash-text)" }}>Redefinir senha</div>

          <div>
            <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Nova senha</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres" style={inp} {...inputFocusHandlers} />
          </div>

          <div>
            <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Confirmar senha</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha" style={inp} {...inputFocusHandlers} />
          </div>

          {passwordError && (
            <div style={{ padding: "8px 12px", borderRadius: 10, background: "var(--dash-danger-soft)", color: "var(--dash-danger)", fontSize: 12 }}>
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div style={{ padding: "8px 12px", borderRadius: 10, background: "var(--dash-accent-soft)", color: "var(--dash-accent)", fontSize: 12 }}>
              ✅ Senha alterada com sucesso!
            </div>
          )}

          <button onClick={handleChangePassword} disabled={changingPassword || !newPassword} style={{
            width: "100%", padding: 12, borderRadius: 14, border: "none", cursor: "pointer",
            background: "var(--dash-accent-soft)", color: "var(--dash-accent)",
            fontSize: 13, fontWeight: 800, fontFamily: "inherit",
            boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
            opacity: changingPassword || !newPassword ? 0.5 : 1,
          }}>
            {changingPassword ? "Alterando..." : "Alterar senha"}
          </button>

          {/* Suporte */}
          <div style={{ marginTop: 8, padding: 16, borderRadius: 14, background: "rgba(37,211,102,0.06)", boxShadow: "0 1px 0 rgba(37,211,102,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 8 }}>Problemas com acesso?</div>
            <a href={FYMENU_SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: 10, borderRadius: 12,
              background: "rgba(37,211,102,0.1)", color: "#25d366",
              fontSize: 13, fontWeight: 700, textDecoration: "none",
            }}>
              💬 Falar com suporte
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
