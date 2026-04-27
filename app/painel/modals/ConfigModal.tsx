"use client";

import React, { useState, lazy, Suspense, useEffect } from "react";
import { UtensilsCrossed, Star, Building2, MessageCircle, LogOut, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Restaurant } from "../types";
import PasswordReqs, { passwordValid, translatePasswordError } from "@/components/PasswordReqs";
import { listMembers, inviteMember, revokeInvite, removeMember } from "../membersActions";
import type { MemberData } from "../membersActions";
import { getLastEditForEntities, LastEditInfo } from "@/app/painel/historicoActions";
import LastEditBadge from "@/components/audit/LastEditBadge";

const PaymentModal = lazy(() => import("./PaymentModal"));

const supabase = createClient();

const FYMENU_SUPPORT_WHATSAPP = "https://wa.me/5562982301642?text=Olá! Preciso de suporte com o FyMenu.";

const PLANS = [
  {
    key: "menu", name: "Menu", icon: <UtensilsCrossed size={26} />, units: "1 unidade",
    price: "199,90", badge: null, highlight: false,
    accent: "#a78bfa", accentRgb: "139,92,246",
    features: ["Cardápio de vídeo 9:16", "Pedidos via WhatsApp", "Link público + QR Code", "Modo TV", "Analytics básico"],
  },
  {
    key: "menupro", name: "MenuPro", icon: <Star size={26} />, units: "Até 3 unidades",
    price: "399,90", badge: "MAIS VENDIDO", highlight: true,
    accent: "#00ffae", accentRgb: "0,255,174",
    features: ["Tudo do Menu +", "Comanda Digital", "Cozinha + Garçom em tempo real", "CRM de clientes", "Analytics avançado com IA", "Relatórios em PDF", "Estoque básico"],
  },
  {
    key: "business", name: "Business", icon: <Building2 size={26} />, units: "Até 4 unidades",
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

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function daysUntil(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export default function ConfigModal({ profile, restaurant }: { profile: Profile; restaurant: Restaurant }) {
  const [tab, setTab] = useState<"perfil" | "plano" | "socios" | "seguranca">("perfil");

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
  const [payingForPlan, setPayingForPlan] = useState<{
    planKey: string; planName: string; accent: string; accentRgb: string;
  } | null>(null);

  // Sócios
  const [members, setMembers] = useState<MemberData[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteResult, setInviteResult] = useState<{ inviteUrl: string; email: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [memberLastEdits, setMemberLastEdits] = useState<Record<string, LastEditInfo>>({});

  const currentPlan = restaurant?.plan || "menu";
  const currentPlanIdx = PLANS.findIndex(p => p.key === currentPlan);

  useEffect(() => {
    if (tab === "socios") loadMembers();
  }, [tab]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(null), 2500);
  }

  async function loadMembers() {
    setMembersLoading(true);
    const { members: m, currentUserId: uid } = await listMembers(restaurant.id);
    setMembers(m);
    setCurrentUserId(uid);
    setMembersLoading(false);
    const ids = m.filter(mem => mem.id).map(mem => mem.id);
    if (ids.length) getLastEditForEntities(restaurant.id, "member", ids).then(setMemberLastEdits);
  }

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
      setPasswordError(translatePasswordError(error.message));
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

  async function handleInvite() {
    setInviteError("");
    if (!inviteEmail.trim()) { setInviteError("Digite o email do sócio"); return; }
    setInviting(true);
    const result = await inviteMember(restaurant.id, inviteEmail);
    if (result.error) {
      setInviteError(result.error);
      setInviting(false);
      return;
    }
    setInviting(false);
    setShowInviteModal(false);
    setInviteResult({ inviteUrl: result.inviteUrl!, email: inviteEmail.trim().toLowerCase() });
    setInviteEmail("");
  }

  async function handleCopyLink(url: string, memberId: string) {
    try {
      await navigator.clipboard.writeText(url);
      setActing(memberId);
      showToast("Link copiado!");
      setTimeout(() => setActing(null), 1500);
    } catch {
      showToast("Erro ao copiar", "error");
    }
  }

  async function handleRevoke(memberId: string) {
    setActing(memberId);
    const result = await revokeInvite(memberId, restaurant.id);
    if (result.error) { showToast(result.error, "error"); }
    else { showToast("Convite cancelado"); await loadMembers(); }
    setConfirmRevoke(null);
    setActing(null);
  }

  async function handleRemove(memberId: string) {
    setActing(memberId);
    const result = await removeMember(memberId, restaurant.id);
    if (result.error) { showToast(result.error, "error"); }
    else { showToast("Sócio removido"); await loadMembers(); }
    setConfirmRemove(null);
    setActing(null);
  }

  const TABS = [
    { key: "perfil", label: "Perfil" },
    { key: "plano", label: "Plano" },
    { key: "socios", label: "Sócios" },
    { key: "seguranca", label: "Segurança" },
  ] as const;

  return (
    <div style={{ paddingTop: 8, position: "relative" }}>
      {/* Payment modal overlay */}
      {payingForPlan && (
        <Suspense fallback={null}>
          <PaymentModal
            planKey={payingForPlan.planKey}
            planName={payingForPlan.planName}
            accent={payingForPlan.accent}
            accentRgb={payingForPlan.accentRgb}
            onClose={() => setPayingForPlan(null)}
            onSuccess={() => { setPayingForPlan(null); window.location.reload(); }}
          />
        </Suspense>
      )}

      {/* Invite modal overlay */}
      {showInviteModal && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          background: "var(--dash-modal-bg, #111)",
          borderRadius: 16, padding: 24,
          display: "flex", flexDirection: "column", gap: 14,
          overflowY: "auto",
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>Convidar novo sócio</div>
          <div style={{ fontSize: 12, color: "var(--dash-text-muted)", lineHeight: 1.6, marginTop: -8 }}>
            O sócio terá acesso total ao restaurante e a todas as unidades.
          </div>

          <div>
            <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Email do sócio</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleInvite()}
              placeholder="socio@email.com"
              style={inp}
              {...inputFocusHandlers}
            />
          </div>

          <div style={{
            padding: "10px 14px", borderRadius: 10,
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.2)",
            display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
            <span style={{ fontSize: 11, color: "var(--dash-warning, #fbbf24)", lineHeight: 1.5 }}>
              O sócio precisa criar uma conta no FyMenu (ou já ter uma) usando este mesmo email.
            </span>
          </div>

          {inviteError && (
            <div style={{ padding: "8px 12px", borderRadius: 10, background: "var(--dash-danger-soft)", color: "var(--dash-danger)", fontSize: 12 }}>
              {inviteError}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
            <button
              onClick={() => { setShowInviteModal(false); setInviteEmail(""); setInviteError(""); }}
              style={{
                flex: 1, padding: 12, borderRadius: 12, border: "none", cursor: "pointer",
                background: "var(--dash-card-hover)", color: "var(--dash-text-muted)",
                fontSize: 13, fontFamily: "inherit",
              }}
            >Cancelar</button>
            <button
              onClick={handleInvite}
              disabled={inviting}
              style={{
                flex: 2, padding: 12, borderRadius: 12, border: "none", cursor: "pointer",
                background: "#16a34a", color: "#fff",
                fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                opacity: inviting ? 0.6 : 1,
              }}
            >{inviting ? "Gerando..." : "Gerar convite"}</button>
          </div>
        </div>
      )}

      {/* Invite result overlay */}
      {inviteResult && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          background: "var(--dash-modal-bg, #111)",
          borderRadius: 16, padding: 24,
          display: "flex", flexDirection: "column", gap: 16,
          overflowY: "auto",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>Convite gerado!</div>
            <div style={{ fontSize: 12, color: "var(--dash-text-muted)", marginTop: 4 }}>
              Compartilhe este link com seu sócio:
            </div>
          </div>

          <div style={{
            display: "flex", gap: 8, alignItems: "center",
            padding: "10px 14px", borderRadius: 12,
            background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)",
          }}>
            <span style={{ fontSize: 11, color: "var(--dash-text-muted)", flex: 1, wordBreak: "break-all", lineHeight: 1.4 }}>
              {inviteResult.inviteUrl}
            </span>
            <button
              onClick={() => handleCopyLink(inviteResult.inviteUrl, "result")}
              style={{
                flexShrink: 0, padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "#16a34a", color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: "inherit",
              }}
            >Copiar</button>
          </div>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Olá! Você foi convidado para ser sócio do restaurante ${restaurant.name} no FyMenu. Acesse o link para aceitar: ${inviteResult.inviteUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: 14, borderRadius: 14,
              background: "rgba(37,211,102,0.12)", color: "#25d366",
              fontSize: 14, fontWeight: 800, textDecoration: "none",
              boxShadow: "0 1px 0 rgba(37,211,102,0.15) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
            }}
          >
            <MessageCircle size={16} /> Compartilhar via WhatsApp
          </a>

          <button
            onClick={async () => { setInviteResult(null); await loadMembers(); }}
            style={{
              width: "100%", padding: 12, borderRadius: 12, border: "1px solid var(--dash-border)",
              background: "transparent", color: "var(--dash-text-muted)",
              fontSize: 13, fontFamily: "inherit", cursor: "pointer",
            }}
          >Fechar</button>
        </div>
      )}

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
            {saved ? "Salvo!" : saving ? "Salvando..." : "Salvar"}
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
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><MessageCircle size={14} /> Suporte WhatsApp</span>
            </a>
          </div>

          {/* Sair da conta */}
          <form action="/api/auth/signout" method="post">
            <button type="submit" style={{
              width: "100%", padding: "12px 20px", borderRadius: 14, border: "none",
              background: "var(--dash-danger-soft)", color: "var(--dash-danger)",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><LogOut size={14} /> Sair da conta</span>
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
                    <div style={{ marginBottom: 4, display: "flex", justifyContent: "center", color: plan.accent }}>{plan.icon}</div>
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
                    onClick={isCurrent ? undefined : () => setPayingForPlan({
                      planKey: plan.key, planName: plan.name,
                      accent: plan.accent, accentRgb: plan.accentRgb,
                    })}
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

      {/* ── TAB SÓCIOS ── */}
      {tab === "socios" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Toast */}
          {toastMsg && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: toastType === "success" ? "var(--dash-accent-soft)" : "var(--dash-danger-soft)",
              color: toastType === "success" ? "var(--dash-accent)" : "var(--dash-danger)",
              transition: "opacity 0.3s",
            }}>{toastMsg}</div>
          )}

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dash-text)" }}>Sócios do restaurante</div>
              <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginTop: 3, lineHeight: 1.5 }}>
                Convide pessoas para gerenciar este restaurante junto com você
              </div>
            </div>
            <button
              onClick={() => { setShowInviteModal(true); setInviteError(""); setInviteEmail(""); }}
              style={{
                flexShrink: 0, padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                background: "#16a34a", color: "#fff",
                fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <Users size={13} /> + Convidar
            </button>
          </div>

          {/* Members list */}
          {membersLoading ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--dash-text-muted)", fontSize: 13 }}>
              Carregando sócios...
            </div>
          ) : members.length === 0 ? (
            <div style={{
              padding: 24, borderRadius: 14, textAlign: "center",
              background: "var(--dash-card)", border: "1px solid var(--dash-border)",
            }}>
              <Users size={28} style={{ color: "var(--dash-text-muted)", marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: "var(--dash-text-muted)" }}>Nenhum sócio cadastrado</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {members.map(member => {
                const initial = (member.displayName?.[0] ?? "?").toUpperCase();
                const isMe = member.user_id === currentUserId;
                const isConfirmingRevoke = confirmRevoke === member.id;
                const isConfirmingRemove = confirmRemove === member.id;
                const isActing = acting === member.id;
                const inviteUrl = member.invite_token
                  ? `https://fymenu.com/aceitar-convite?token=${member.invite_token}`
                  : "";

                return (
                  <div key={member.id} style={{
                    background: "#fff",
                    border: "1px solid var(--dash-border)",
                    borderRadius: 14, padding: 14,
                    display: "flex", flexDirection: "column", gap: 10,
                  }}>
                    {/* Main row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                        background: "linear-gradient(135deg, #ec4899, #f97316)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 15, fontWeight: 800,
                      }}>{initial}</div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                            {member.displayName}
                          </span>
                          {isMe && (
                            <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 6, background: "rgba(0,176,122,0.1)", color: "#00b07a", fontWeight: 700 }}>
                              Você
                            </span>
                          )}
                          <span style={{
                            fontSize: 9, padding: "2px 7px", borderRadius: 6, fontWeight: 700,
                            background: member.role === "owner" ? "rgba(212,175,55,0.12)" : "rgba(139,92,246,0.1)",
                            color: member.role === "owner" ? "#d4af37" : "#a78bfa",
                          }}>
                            {member.role === "owner" ? "Dono" : "Sócio"}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>
                          {member.status === "active"
                            ? `Ativo desde ${fmtDate(member.activated_at ?? member.created_at)}`
                            : `Convite pendente · expira em ${daysUntil(member.invite_expires_at ?? "")} dias`}
                        </div>
                        {memberLastEdits[member.id] && (
                          <LastEditBadge lastEdit={memberLastEdits[member.id]} restaurantId={restaurant.id} entityType="member" entityId={member.id} entityName={member.displayName} variant="inline" />
                        )}
                      </div>
                    </div>

                    {/* Inline confirmation — revoke */}
                    {isConfirmingRevoke && (
                      <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--dash-danger-soft)" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dash-danger)", marginBottom: 8 }}>
                          Cancelar este convite?
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => setConfirmRevoke(null)} style={{
                            flex: 1, padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                            background: "var(--dash-card-hover)", color: "var(--dash-text-muted)",
                            fontSize: 11, fontFamily: "inherit",
                          }}>Não</button>
                          <button onClick={() => handleRevoke(member.id)} disabled={isActing} style={{
                            flex: 1, padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                            background: "var(--dash-danger-soft)", color: "var(--dash-danger)",
                            fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                            opacity: isActing ? 0.5 : 1,
                          }}>{isActing ? "..." : "Cancelar convite"}</button>
                        </div>
                      </div>
                    )}

                    {/* Inline confirmation — remove */}
                    {isConfirmingRemove && (
                      <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--dash-danger-soft)" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dash-danger)", marginBottom: 4 }}>
                          Tem certeza?
                        </div>
                        <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 8, lineHeight: 1.4 }}>
                          {member.displayName} perderá acesso ao restaurante imediatamente.
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => setConfirmRemove(null)} style={{
                            flex: 1, padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                            background: "var(--dash-card-hover)", color: "var(--dash-text-muted)",
                            fontSize: 11, fontFamily: "inherit",
                          }}>Cancelar</button>
                          <button onClick={() => handleRemove(member.id)} disabled={isActing} style={{
                            flex: 1, padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                            background: "var(--dash-danger-soft)", color: "var(--dash-danger)",
                            fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                            opacity: isActing ? 0.5 : 1,
                          }}>{isActing ? "..." : "Remover"}</button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    {!isConfirmingRevoke && !isConfirmingRemove && (
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        {member.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleCopyLink(inviteUrl, member.id)}
                              style={{
                                padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                                background: "#16a34a", color: "#fff",
                                fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                                opacity: isActing ? 0.5 : 1,
                              }}
                            >{isActing ? "Copiado!" : "Copiar link"}</button>
                            <button
                              onClick={() => setConfirmRevoke(member.id)}
                              style={{
                                padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                                background: "transparent", color: "var(--dash-danger)",
                                border: "1px solid var(--dash-danger)",
                                fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                              }}
                            >Cancelar</button>
                          </>
                        )}
                        {member.status === "active" && !isMe && (
                          <button
                            onClick={() => setConfirmRemove(member.id)}
                            style={{
                              padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                              background: "transparent", color: "var(--dash-danger)",
                              border: "1px solid var(--dash-danger)",
                              fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                            }}
                          >Remover</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB SEGURANÇA ── */}
      {tab === "seguranca" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dash-text)" }}>Redefinir senha</div>

          <div>
            <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Nova senha</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres" style={inp} {...inputFocusHandlers} />
            <PasswordReqs password={newPassword} />
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
              Senha alterada com sucesso!
            </div>
          )}

          <button onClick={handleChangePassword} disabled={changingPassword || !passwordValid(newPassword)} style={{
            width: "100%", padding: 12, borderRadius: 14, border: "none", cursor: "pointer",
            background: "var(--dash-accent-soft)", color: "var(--dash-accent)",
            fontSize: 13, fontWeight: 800, fontFamily: "inherit",
            boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
            opacity: changingPassword || !passwordValid(newPassword) ? 0.5 : 1,
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
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><MessageCircle size={14} /> Falar com suporte</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
