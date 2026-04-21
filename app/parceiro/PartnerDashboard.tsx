"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import FyLoader from "@/components/FyLoader";

const PLAN_PRICES: Record<string, number> = {
  menu: 19990,
  menupro: 39990,
  business: 159900,
};

function fmtBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

type Tab = "resumo" | "indicacoes" | "cupons" | "comissoes" | "fotos" | "config";

interface Partner {
  id: string;
  name: string;
  email: string;
  commission_percent: number;
  is_photographer: boolean;
  total_earned: number;
  total_paid: number;
}

interface Referral {
  id: string;
  restaurant_id: string;
  coupon_code: string | null;
  commission_percent: number;
  status: string;
  created_at: string;
  restaurants: { name: string; plan: string; status: string } | null;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  discount_percent: number;
  trial_extra_days: number;
  current_uses: number;
  max_uses: number | null;
  is_active: boolean;
  expires_at: string | null;
}

interface Payout {
  id: string;
  amount: number;
  period_start: string;
  period_end: string;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
}

interface PhotoSession {
  id: string;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
  price_charged: number | null;
  payment_status: string | null;
  photos_delivered: boolean;
  photo_session_packages: { name: string } | null;
  photo_session_cities: { city: string; state: string } | null;
  restaurants: { name: string } | null;
}

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 16,
  padding: "20px 24px",
};

const th: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: 11,
  color: "rgba(255,255,255,0.35)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const td: React.CSSProperties = {
  padding: "11px 14px",
  fontSize: 13,
  color: "rgba(255,255,255,0.7)",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: color + "22", color }}>
      {label}
    </span>
  );
}

function statusColor(s: string) {
  if (s === "active" || s === "paid" || s === "completed") return "#00ffae";
  if (s === "pending" || s === "scheduled") return "#facc15";
  if (s === "inactive" || s === "cancelled") return "#f87171";
  return "#94a3b8";
}

export default function PartnerDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("resumo");
  const [partner, setPartner] = useState<Partner | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [photoSessions, setPhotoSessions] = useState<PhotoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Change password state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("partner_token");
    if (!token) { router.replace("/parceiro/login"); return; }

    fetch("/api/parceiro/data", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) { router.replace("/parceiro/login"); return; }
        setPartner(json.partner);
        setReferrals(json.referrals ?? []);
        setCoupons(json.coupons ?? []);
        setPayouts(json.payouts ?? []);
        setPhotoSessions(json.photoSessions ?? []);
      })
      .catch(() => setError("Erro ao carregar dados."))
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    sessionStorage.removeItem("partner_token");
    sessionStorage.removeItem("partner_id");
    sessionStorage.removeItem("partner_name");
    router.replace("/parceiro/login");
  }

  async function handleChangePw() {
    setPwError(""); setPwSuccess(false);
    if (newPw.length < 6) { setPwError("Mínimo 6 caracteres"); return; }
    if (newPw !== confirmPw) { setPwError("Senhas não conferem"); return; }
    setChangingPw(true);
    try {
      const res = await fetch("/api/parceiro/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId: partner!.id, currentPassword: currentPw, newPassword: newPw }),
      });
      const json = await res.json();
      if (!res.ok) { setPwError(json.error || "Erro ao alterar senha"); }
      else { setPwSuccess(true); setCurrentPw(""); setNewPw(""); setConfirmPw(""); setTimeout(() => setPwSuccess(false), 3000); }
    } catch { setPwError("Erro de conexão"); }
    finally { setChangingPw(false); }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <FyLoader size="md" />
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#f87171", fontSize: 14 }}>{error ?? "Sessão expirada."}</p>
      </div>
    );
  }

  // Metrics
  const activeReferrals = referrals.filter((r) => r.status === "active");
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyCommission = activeReferrals.reduce((sum, r) => {
    const plan = r.restaurants?.plan ?? "";
    const price = PLAN_PRICES[plan] ?? 0;
    return sum + Math.round(price * (r.commission_percent / 100));
  }, 0);

  const pendingPayout = payouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  const tabs: { key: Tab; label: string }[] = [
    { key: "resumo", label: "Resumo" },
    { key: "indicacoes", label: "Indicações" },
    { key: "cupons", label: "Cupons" },
    { key: "comissoes", label: "Comissões" },
    ...(partner.is_photographer ? [{ key: "fotos" as Tab, label: "Sessões de Fotos" }] : []),
    { key: "config", label: "Configurações" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #00ffae, #00d9ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤝</div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{partner.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                Parceiro FyMenu · {partner.commission_percent}% comissão
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{ padding: "7px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 2 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "14px 18px",
                fontSize: 13,
                fontWeight: 600,
                background: "transparent",
                border: "none",
                borderBottom: tab === t.key ? "2px solid #00ffae" : "2px solid transparent",
                color: tab === t.key ? "#00ffae" : "rgba(255,255,255,0.4)",
                cursor: "pointer",
                transition: "color 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* RESUMO */}
        {tab === "resumo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Metric cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {[
                { label: "Indicados", value: String(referrals.length), sub: "restaurantes", color: "#00ffae" },
                { label: "Ativos", value: String(activeReferrals.length), sub: "com plano ativo", color: "#00d9ff" },
                { label: "Comissão Estimada", value: fmtBRL(monthlyCommission), sub: "mês atual", color: "#a78bfa" },
                { label: "Total Recebido", value: fmtBRL(partner.total_paid ?? 0), sub: "histórico", color: "#facc15" },
              ].map((m) => (
                <div key={m.label} style={card}>
                  <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</p>
                  <p style={{ margin: "8px 0 2px", fontSize: 26, fontWeight: 800, color: m.color }}>{m.value}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{m.sub}</p>
                </div>
              ))}
            </div>

            {/* Cupons */}
            {coupons.length > 0 && (
              <div style={card}>
                <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700 }}>Seus cupons</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {coupons.map((c) => (
                    <div key={c.id} style={{ padding: "6px 14px", borderRadius: 10, background: "rgba(0,255,174,0.08)", border: "1px solid rgba(0,255,174,0.2)", fontSize: 13, color: "#00ffae", fontWeight: 700, letterSpacing: "0.05em" }}>
                      {c.code}
                      <span style={{ marginLeft: 8, fontWeight: 400, color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                        {c.current_uses}{c.max_uses ? `/${c.max_uses}` : ""} usos
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Últimas indicações */}
            {referrals.length > 0 && (
              <div style={card}>
                <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700 }}>Últimas indicações</p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Restaurante", "Plano", "Status", "Cupom", "Data"].map((h) => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.slice(0, 5).map((r) => (
                        <tr key={r.id}>
                          <td style={td}>{r.restaurants?.name ?? "—"}</td>
                          <td style={td}>{r.restaurants?.plan ?? "—"}</td>
                          <td style={td}><Badge label={r.status} color={statusColor(r.status)} /></td>
                          <td style={{ ...td, fontFamily: "monospace", color: "#00ffae" }}>{r.coupon_code ?? "—"}</td>
                          <td style={td}>{fmtDate(r.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* INDICAÇÕES */}
        {tab === "indicacoes" && (
          <div style={card}>
            <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Indicações</p>
            {referrals.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Nenhuma indicação ainda.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Restaurante", "Plano", "Status Restaurante", "Meu Status", "Cupom", "Comissão %", "Data"].map((h) => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((r) => (
                      <tr key={r.id}>
                        <td style={{ ...td, fontWeight: 600, color: "#fff" }}>{r.restaurants?.name ?? "—"}</td>
                        <td style={td}>{r.restaurants?.plan ?? "—"}</td>
                        <td style={td}><Badge label={r.restaurants?.status ?? "—"} color={statusColor(r.restaurants?.status ?? "")} /></td>
                        <td style={td}><Badge label={r.status} color={statusColor(r.status)} /></td>
                        <td style={{ ...td, fontFamily: "monospace", color: "#00ffae" }}>{r.coupon_code ?? "—"}</td>
                        <td style={td}>{r.commission_percent}%</td>
                        <td style={td}>{fmtDate(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CUPONS */}
        {tab === "cupons" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>Seus Cupons</p>
            {coupons.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Nenhum cupom cadastrado.</p>
            ) : (
              coupons.map((c) => (
                <div key={c.id} style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 800, color: "#00ffae", letterSpacing: "0.08em" }}>{c.code}</span>
                    <Badge label={c.is_active ? "Ativo" : "Inativo"} color={c.is_active ? "#00ffae" : "#f87171"} />
                  </div>
                  <div style={{ display: "flex", gap: 24, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                    <span>
                      Desconto:{" "}
                      <span style={{ color: "#fff" }}>
                        {c.discount_type === "percent"
                          ? `${c.discount_percent}%`
                          : c.discount_type === "fixed"
                          ? fmtBRL(c.discount_value)
                          : c.trial_extra_days > 0
                          ? `+${c.trial_extra_days} dias trial`
                          : "—"}
                      </span>
                    </span>
                    <span>Usos: <span style={{ color: "#fff" }}>{c.current_uses}{c.max_uses ? `/${c.max_uses}` : ""}</span></span>
                    {c.expires_at && <span>Expira: <span style={{ color: "#fff" }}>{fmtDate(c.expires_at)}</span></span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* COMISSÕES */}
        {tab === "comissoes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Resumo */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              {[
                { label: "Estimativa Mensal", value: fmtBRL(monthlyCommission), color: "#00ffae" },
                { label: "Total Recebido", value: fmtBRL(partner.total_paid ?? 0), color: "#00d9ff" },
                { label: "Pendente", value: fmtBRL(pendingPayout), color: "#facc15" },
              ].map((m) => (
                <div key={m.label} style={card}>
                  <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</p>
                  <p style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 800, color: m.color }}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Tabela de pagamentos */}
            <div style={card}>
              <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700 }}>Histórico de Pagamentos</p>
              {payouts.length === 0 ? (
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Nenhum pagamento registrado.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Período", "Valor", "Status", "Método", "Pago em"].map((h) => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((p) => (
                        <tr key={p.id}>
                          <td style={td}>{fmtDate(p.period_start)} – {fmtDate(p.period_end)}</td>
                          <td style={{ ...td, fontWeight: 700, color: "#00ffae" }}>{fmtBRL(p.amount)}</td>
                          <td style={td}><Badge label={p.status} color={statusColor(p.status)} /></td>
                          <td style={td}>{p.payment_method ?? "—"}</td>
                          <td style={td}>{fmtDate(p.paid_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONFIGURAÇÕES */}
        {tab === "config" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Dados do parceiro */}
            <div style={card}>
              <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700 }}>Seus dados</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                <div>Nome: <span style={{ color: "#fff", fontWeight: 600 }}>{partner.name}</span></div>
                <div>Email: <span style={{ color: "#fff" }}>{partner.email}</span></div>
                <div>Comissão: <span style={{ color: "#00ffae", fontWeight: 700 }}>{partner.commission_percent}%</span></div>
              </div>
            </div>

            {/* Alterar senha */}
            <div style={card}>
              <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700 }}>Alterar senha</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                  placeholder="Senha atual"
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const }}
                />
                <input
                  type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                  placeholder="Nova senha (mín. 6 caracteres)"
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const }}
                />
                <input
                  type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Confirmar nova senha"
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const }}
                />
              </div>
              {pwError && (
                <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(248,113,113,0.08)", color: "#f87171", fontSize: 13 }}>
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(0,255,174,0.06)", color: "#00ffae", fontSize: 13 }}>
                  ✅ Senha alterada com sucesso!
                </div>
              )}
              <button
                onClick={handleChangePw}
                disabled={changingPw || !currentPw || !newPw || !confirmPw}
                style={{
                  marginTop: 14, width: "100%", padding: 14, borderRadius: 12, border: "none",
                  background: "rgba(0,255,174,0.1)", color: "#00ffae",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                  opacity: changingPw || !currentPw || !newPw || !confirmPw ? 0.4 : 1,
                }}
              >
                {changingPw ? "Alterando..." : "Alterar senha"}
              </button>
            </div>

            {/* Suporte */}
            <a
              href="https://wa.me/5562982301642?text=Olá! Sou parceiro FyMenu e preciso de suporte."
              target="_blank" rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: 16, borderRadius: 16, border: "1px solid rgba(37,211,102,0.2)",
                background: "rgba(37,211,102,0.04)", color: "#25d366",
                fontSize: 14, fontWeight: 700, textDecoration: "none",
              }}
            >
              💬 Canal de suporte do parceiro
            </a>
          </div>
        )}

        {/* FOTOS */}
        {tab === "fotos" && partner.is_photographer && (
          <div style={card}>
            <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Sessões de Fotos</p>
            {photoSessions.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Nenhuma sessão atribuída.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Restaurante", "Pacote", "Cidade", "Status", "Agendado", "Valor", "Fotos"].map((h) => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {photoSessions.map((s) => (
                      <tr key={s.id}>
                        <td style={{ ...td, fontWeight: 600, color: "#fff" }}>{s.restaurants?.name ?? "—"}</td>
                        <td style={td}>{s.photo_session_packages?.name ?? "—"}</td>
                        <td style={td}>{s.photo_session_cities ? `${s.photo_session_cities.city}/${s.photo_session_cities.state}` : "—"}</td>
                        <td style={td}><Badge label={s.status} color={statusColor(s.status)} /></td>
                        <td style={td}>{fmtDate(s.scheduled_at)}</td>
                        <td style={{ ...td, color: "#00ffae" }}>{s.price_charged ? fmtBRL(s.price_charged) : "—"}</td>
                        <td style={td}>{s.photos_delivered ? <Badge label="Entregue" color="#00ffae" /> : <Badge label="Pendente" color="#facc15" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
