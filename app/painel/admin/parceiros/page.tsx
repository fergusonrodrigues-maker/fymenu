import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fmtBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function AdminParceirosPage() {
  // Auth check — only admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/painel");

  const admin = createAdminClient();

  const [{ data: partners }, { data: coupons }, { data: referrals }] = await Promise.all([
    admin.from("partners").select("id, name, email, commission_percent, is_active, total_earned, total_paid").eq("is_active", true).order("name"),
    admin.from("partner_coupons").select("id, partner_id, code, discount_type, discount_value, discount_percent, trial_extra_days, current_uses, max_uses, is_active, expires_at"),
    admin.from("partner_referrals").select("id, partner_id, coupon_code, commission_percent, status, created_at, restaurants(name, plan)").order("created_at", { ascending: false }),
  ]);

  const couponsByPartner = (coupons ?? []).reduce<Record<string, any[]>>((acc, c) => {
    (acc[c.partner_id] ??= []).push(c);
    return acc;
  }, {});

  const referralsByPartner = (referrals ?? []).reduce<Record<string, any[]>>((acc, r) => {
    (acc[r.partner_id] ??= []).push(r);
    return acc;
  }, {});

  const cell: React.CSSProperties = {
    padding: "10px 14px", fontSize: 12, color: "rgba(255,255,255,0.65)",
    borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "middle",
  };
  const head: React.CSSProperties = {
    padding: "10px 14px", fontSize: 10, color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase", letterSpacing: "0.06em",
    borderBottom: "1px solid rgba(255,255,255,0.07)", textAlign: "left",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", padding: "32px 24px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <a href="/painel" style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textDecoration: "none" }}>← Voltar ao painel</a>
          <h1 style={{ margin: "12px 0 4px", fontSize: 22, fontWeight: 800 }}>Parceiros</h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.35)", fontSize: 13 }}>{partners?.length ?? 0} parceiros ativos</p>
        </div>

        {/* Partners */}
        {(partners ?? []).map((partner) => {
          const pCoupons = couponsByPartner[partner.id] ?? [];
          const pReferrals = referralsByPartner[partner.id] ?? [];
          const activeReferrals = pReferrals.filter((r: any) => r.status === "active").length;
          const balance = (partner.total_earned ?? 0) - (partner.total_paid ?? 0);

          return (
            <div key={partner.id} style={{
              marginBottom: 28, background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, overflow: "hidden",
            }}>
              {/* Partner header */}
              <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{partner.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{partner.email} · {partner.commission_percent}% comissão</div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#00ffae", fontWeight: 700, fontSize: 15 }}>{activeReferrals}</div>
                    <div style={{ color: "rgba(255,255,255,0.3)" }}>Ativos</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 15 }}>{fmtBRL(balance)}</div>
                    <div style={{ color: "rgba(255,255,255,0.3)" }}>Saldo</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: 15 }}>{fmtBRL(partner.total_earned ?? 0)}</div>
                    <div style={{ color: "rgba(255,255,255,0.3)" }}>Total ganho</div>
                  </div>
                </div>
              </div>

              {/* Coupons */}
              {pCoupons.length > 0 && (
                <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Cupons</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {pCoupons.map((c: any) => (
                      <div key={c.id} style={{
                        padding: "6px 14px", borderRadius: 10,
                        background: c.is_active ? "rgba(0,255,174,0.06)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${c.is_active ? "rgba(0,255,174,0.15)" : "rgba(255,255,255,0.06)"}`,
                        fontSize: 13,
                      }}>
                        <span style={{ color: c.is_active ? "#00ffae" : "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.05em" }}>{c.code}</span>
                        <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
                          {c.current_uses}{c.max_uses ? `/${c.max_uses}` : ""} usos
                          {c.discount_percent ? ` · ${c.discount_percent}% off` : ""}
                          {c.trial_extra_days ? ` · +${c.trial_extra_days}d trial` : ""}
                          {c.expires_at ? ` · exp. ${fmtDate(c.expires_at)}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Referrals */}
              {pReferrals.length > 0 && (
                <div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Restaurante", "Plano", "Cupom usado", "Comissão", "Status", "Data"].map(h => (
                          <th key={h} style={head}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pReferrals.slice(0, 10).map((r: any) => (
                        <tr key={r.id}>
                          <td style={{ ...cell, fontWeight: 600, color: "#fff" }}>{(r.restaurants as any)?.name ?? "—"}</td>
                          <td style={cell}>{(r.restaurants as any)?.plan ?? "—"}</td>
                          <td style={{ ...cell, fontFamily: "monospace", color: "#00ffae" }}>{r.coupon_code ?? "—"}</td>
                          <td style={cell}>{r.commission_percent}%</td>
                          <td style={cell}>
                            <span style={{
                              padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                              background: r.status === "active" ? "rgba(0,255,174,0.1)" : r.status === "canceled" ? "rgba(248,113,113,0.1)" : "rgba(255,255,255,0.04)",
                              color: r.status === "active" ? "#00ffae" : r.status === "canceled" ? "#f87171" : "rgba(255,255,255,0.4)",
                            }}>{r.status}</span>
                          </td>
                          <td style={cell}>{fmtDate(r.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {pCoupons.length === 0 && pReferrals.length === 0 && (
                <div style={{ padding: "20px 24px", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Sem cupons ou indicações ainda.</div>
              )}
            </div>
          );
        })}

        {(partners ?? []).length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>Nenhum parceiro ativo.</div>
        )}
      </div>
    </div>
  );
}
