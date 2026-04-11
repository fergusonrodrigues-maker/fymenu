"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Restaurant } from "../types";

const supabase = createClient();

const FYMENU_SUPPORT_WHATSAPP = "https://wa.me/5562982301642?text=Olá! Preciso de suporte com o FyMenu.";

const PLANS = [
  { key: "menu", name: "Menu", price: "R$ 199,90/mês" },
  { key: "menupro", name: "MenuPro", price: "R$ 399,90/mês" },
  { key: "business", name: "Business", price: "R$ 1.599/mês" },
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
      const res = await fetch("/api/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: restaurant.id, plan: newPlan, cycle: "monthly" }),
      });
      const json = await res.json();
      if (res.ok && json.paymentUrl) {
        window.open(json.paymentUrl, "_blank");
      } else if (res.ok) {
        alert("Plano alterado com sucesso!");
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Plano atual */}
          <div style={{ padding: 16, borderRadius: 14, background: "var(--dash-accent-soft)", boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
            <div style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>Plano atual</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--dash-text)", marginTop: 4 }}>
              {currentPlan === "menu" ? "Menu" : currentPlan === "menupro" ? "MenuPro" : currentPlan === "business" ? "Business" : currentPlan}
            </div>
            {restaurant?.free_access && <div style={{ fontSize: 11, color: "var(--dash-accent)", marginTop: 4 }}>Acesso gratuito ativo</div>}
            {restaurant?.status === "trial" && <div style={{ fontSize: 11, color: "var(--dash-warning)", marginTop: 4 }}>Período de teste</div>}
          </div>

          {/* Lista de planos */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)" }}>Alterar plano</div>

          {PLANS.map((plan, idx) => {
            const isCurrent = currentPlan === plan.key;
            const isUpgrade = idx > currentPlanIdx;
            const isDowngrade = idx < currentPlanIdx;

            return (
              <div key={plan.key} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px", borderRadius: 14,
                background: isCurrent ? "var(--dash-accent-soft)" : "var(--dash-card)",
                boxShadow: isCurrent
                  ? "0 1px 0 rgba(0,255,174,0.06) inset, 0 -1px 0 rgba(0,0,0,0.15) inset"
                  : "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
              }}>
                <div>
                  <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700 }}>{plan.name}</div>
                  <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginTop: 2 }}>{plan.price}</div>
                </div>
                {isCurrent ? (
                  <span style={{ padding: "4px 12px", borderRadius: 8, background: "var(--dash-accent-soft)", color: "var(--dash-accent)", fontSize: 11, fontWeight: 700 }}>Atual</span>
                ) : isUpgrade ? (
                  <button onClick={() => handleChangePlan(plan.key)} style={{
                    padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: "var(--dash-accent-soft)", color: "var(--dash-accent)",
                    fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                    boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
                  }}>⬆️ Upgrade</button>
                ) : isDowngrade ? (
                  <button onClick={() => handleChangePlan(plan.key)} style={{
                    padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: "var(--dash-card-hover)", color: "var(--dash-text-muted)",
                    fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  }}>⬇️ Downgrade</button>
                ) : null}
              </div>
            );
          })}

          {/* Cancelar plano */}
          <div style={{ marginTop: 8 }}>
            {!showCancelConfirm ? (
              <button onClick={() => setShowCancelConfirm(true)} style={{
                width: "100%", padding: 12, borderRadius: 14, border: "none", cursor: "pointer",
                background: "var(--dash-danger-soft)", color: "var(--dash-danger-soft)",
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
