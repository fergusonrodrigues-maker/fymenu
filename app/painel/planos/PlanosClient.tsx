"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLAN_PRICES: Record<string, Record<string, number>> = {
  menu:     { MONTHLY: 19990, QUARTERLY: 53970, SEMIANNUALLY: 95940 },
  menupro:  { MONTHLY: 39990, QUARTERLY: 107970, SEMIANNUALLY: 191940 },
  business: { MONTHLY: 159900, QUARTERLY: 419700, SEMIANNUALLY: 719400 },
};

const CYCLES = [
  { key: "MONTHLY", label: "Mensal" },
  { key: "QUARTERLY", label: "Trimestral" },
  { key: "SEMIANNUALLY", label: "Semestral" },
];

const SAVINGS: Record<string, string> = {
  QUARTERLY: "10% off",
  SEMIANNUALLY: "20% off",
};

const PLANS = [
  {
    key: "menu",
    label: "Menu",
    description: "1 unidade · Cardápio digital com link público",
    features: ["Cardápio de vídeo 9:16", "Pedidos via WhatsApp", "Link público + QR Code", "Modo TV", "Analytics básico"],
  },
  {
    key: "menupro",
    label: "MenuPro",
    description: "Até 3 unidades · Ferramentas profissionais",
    features: ["Tudo do Menu +", "Comanda Digital", "Cozinha + Garçom em tempo real", "CRM de clientes", "Analytics avançado com IA", "Relatórios em PDF", "Equipe (garçom + avaliações)", "Estoque básico"],
    highlight: true,
  },
  {
    key: "business",
    label: "Business",
    description: "Até 4 unidades · Solução completa",
    features: ["Tudo do MenuPro +", "Gestão completa de equipe + ponto", "Estoque completo com IA", "CRM com disparo de mensagens", "Financeiro com custos e margens", "Relatórios financeiros com IA", "Hub do gerente"],
    trial: true,
  },
];

function fmt(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = {
  currentPlan: string;
  currentStatus: string;
  freeAccess: boolean;
  activeSubscription: { plan: string; cycle: string; status: string; next_due_date: string } | null;
};

export default function PlanosClient({ currentPlan, currentStatus, freeAccess, activeSubscription }: Props) {
  const router = useRouter();
  const [cycle, setCycle] = useState<"MONTHLY" | "QUARTERLY" | "SEMIANNUALLY">("MONTHLY");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [step, setStep] = useState<"idle" | "choose-payment" | "pix" | "done">("idle");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedBilling, setSelectedBilling] = useState<"PIX" | "CREDIT_CARD" | null>(null);
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string } | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canPix = (plan: string, c: string) =>
    plan !== "business" && c === "MONTHLY";

  function handleAssinar(planKey: string) {
    setSelectedPlan(planKey);
    setError(null);
    if (canPix(planKey, cycle)) {
      setStep("choose-payment");
    } else {
      setStep("choose-payment");
      setSelectedBilling("CREDIT_CARD");
    }
  }

  async function handleConfirm(billing: "PIX" | "CREDIT_CARD") {
    if (!selectedPlan) return;
    setSelectedBilling(billing);
    setLoading(selectedPlan);
    setError(null);

    try {
      const res = await fetch("/api/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, cycle, billingType: billing }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao criar assinatura");
        setLoading(null);
        return;
      }

      if (billing === "PIX" && data.pixData) {
        setPixData(data.pixData);
        setStep("pix");
      } else if (data.paymentLink) {
        window.location.href = data.paymentLink;
      } else {
        setStep("done");
        router.refresh();
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(null);
    }
  }

  function closeModal() {
    setStep("idle");
    setSelectedPlan(null);
    setSelectedBilling(null);
    setPixData(null);
    setPaymentLink(null);
    setCopied(false);
    setError(null);
  }

  async function copyPix() {
    if (!pixData) return;
    await navigator.clipboard.writeText(pixData.copyPaste);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0a 0%, #111 100%)",
      fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: "48px 16px 80px",
      color: "#fff",
    }}>
      {/* Back */}
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <button
          onClick={() => router.push("/painel")}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14, fontWeight: 600, marginBottom: 32, padding: 0, display: "flex", alignItems: "center", gap: 6 }}
        >
          ← Voltar ao painel
        </button>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: "0 0 8px", background: "linear-gradient(135deg, #00ffae, #00d9ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Escolha seu plano
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, margin: 0 }}>
            Publique seu cardápio e comece a receber pedidos
          </p>
        </div>

        {/* Cycle toggle */}
        <div style={{ display: "flex", justifyContent: "center", gap: 0, marginBottom: 40, background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 4, width: "fit-content", margin: "0 auto 40px" }}>
          {CYCLES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCycle(c.key as any)}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
                fontFamily: "inherit",
                background: cycle === c.key ? "rgba(0,255,174,0.15)" : "transparent",
                color: cycle === c.key ? "#00ffae" : "rgba(255,255,255,0.45)",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {c.label}
              {SAVINGS[c.key] && (
                <span style={{ background: "#00ffae", color: "#000", borderRadius: 6, padding: "2px 6px", fontSize: 10, fontWeight: 800 }}>
                  {SAVINGS[c.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, maxWidth: 900, margin: "0 auto" }}>
          {PLANS.map((plan) => {
            const price = PLAN_PRICES[plan.key][cycle];
            const isActive = activeSubscription?.plan === plan.key && activeSubscription?.status === "active";

            return (
              <div
                key={plan.key}
                style={{
                  borderRadius: 20,
                  padding: "28px 24px",
                  background: plan.highlight
                    ? "linear-gradient(135deg, rgba(0,255,174,0.08), rgba(0,217,255,0.04))"
                    : "rgba(255,255,255,0.03)",
                  border: plan.highlight
                    ? "1.5px solid rgba(0,255,174,0.35)"
                    : "1px solid rgba(255,255,255,0.08)",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {plan.highlight && (
                  <div style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    background: "linear-gradient(135deg, #00ffae, #00d9ff)",
                    color: "#000", fontWeight: 800, fontSize: 11, padding: "4px 14px",
                    borderRadius: 20, letterSpacing: "0.5px",
                  }}>
                    MAIS VENDIDO
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>{plan.label}</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>{plan.description}</div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: plan.highlight ? "#00ffae" : "#fff" }}>
                    {fmt(price)}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginLeft: 6 }}>
                    /{cycle === "MONTHLY" ? "mês" : cycle === "QUARTERLY" ? "trim." : "sem."}
                  </span>
                  {cycle !== "MONTHLY" && (
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>
                      {fmt(Math.round(price / (cycle === "QUARTERLY" ? 3 : 6)))}/mês
                    </div>
                  )}
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                      <span style={{ color: plan.highlight ? "#00ffae" : "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 16 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.key === "business" && cycle !== "MONTHLY" && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 12, textAlign: "center" }}>
                    Apenas cartão de crédito
                  </div>
                )}
                {plan.key !== "business" && cycle !== "MONTHLY" && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 12, textAlign: "center" }}>
                    Apenas cartão de crédito
                  </div>
                )}

                <button
                  disabled={isActive || loading === plan.key}
                  onClick={() => handleAssinar(plan.key)}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: 12,
                    border: "none",
                    cursor: isActive || loading === plan.key ? "default" : "pointer",
                    fontWeight: 800,
                    fontSize: 15,
                    fontFamily: "inherit",
                    background: isActive
                      ? "rgba(0,255,174,0.08)"
                      : plan.highlight
                        ? "var(--dash-accent-soft)"
                        : "rgba(255,255,255,0.08)",
                    color: isActive ? "#00ffae" : plan.highlight ? "var(--dash-accent)" : "#fff",
                    opacity: loading === plan.key ? 0.6 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  {isActive
                    ? "Plano ativo"
                    : loading === plan.key
                      ? "Aguarde..."
                      : plan.trial
                        ? "Começar grátis por 7 dias"
                        : "Assinar"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {step !== "idle" && step !== "done" && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
          <div style={{
            background: "#1a1a1a",
            borderRadius: 20,
            padding: "28px 24px",
            width: "100%",
            maxWidth: 400,
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            {step === "choose-payment" && (
              <>
                <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>
                  Forma de pagamento
                </h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 24 }}>
                  {selectedPlan && PLAN_PRICES[selectedPlan][cycle]
                    ? `${fmt(PLAN_PRICES[selectedPlan][cycle])} · ${cycle === "MONTHLY" ? "Mensal" : cycle === "QUARTERLY" ? "Trimestral" : "Semestral"}`
                    : ""}
                </p>

                {error && (
                  <div style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {selectedPlan && canPix(selectedPlan, cycle) && (
                    <button
                      onClick={() => handleConfirm("PIX")}
                      disabled={!!loading}
                      style={{
                        padding: "14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.04)", color: "#fff",
                        fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        opacity: loading ? 0.6 : 1,
                      }}
                    >
                      📱 PIX
                    </button>
                  )}
                  <button
                    onClick={() => handleConfirm("CREDIT_CARD")}
                    disabled={!!loading}
                    style={{
                      padding: "14px", borderRadius: 12, border: "none",
                      background: "var(--dash-accent-soft)",
                      color: "var(--dash-accent)", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      opacity: loading ? 0.6 : 1,
                      boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
                      transition: "all 0.2s",
                    }}
                  >
                    💳 Cartão de crédito
                  </button>
                </div>

                <button
                  onClick={closeModal}
                  style={{ width: "100%", marginTop: 12, background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 14, fontFamily: "inherit", padding: "8px 0" }}
                >
                  Cancelar
                </button>
              </>
            )}

            {step === "pix" && pixData && (
              <>
                <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>Pague via PIX</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 24 }}>
                  Escaneie o QR code ou copie o código
                </p>

                {pixData.qrCode && (
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <img
                      src={`data:image/png;base64,${pixData.qrCode}`}
                      alt="QR Code PIX"
                      style={{ width: 200, height: 200, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </div>
                )}

                <button
                  onClick={copyPix}
                  style={{
                    width: "100%", padding: "12px", borderRadius: 12,
                    border: "1px solid rgba(0,255,174,0.3)",
                    background: copied ? "rgba(0,255,174,0.15)" : "rgba(255,255,255,0.04)",
                    color: "#00ffae", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                    marginBottom: 12, transition: "all 0.2s",
                  }}
                >
                  {copied ? "✓ Copiado!" : "Copiar código PIX"}
                </button>

                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, textAlign: "center", marginBottom: 16 }}>
                  Após o pagamento, seu cardápio será ativado automaticamente
                </p>

                <button
                  onClick={() => { closeModal(); router.push("/painel"); }}
                  style={{ width: "100%", background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 14, fontFamily: "inherit", padding: "8px 0" }}
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
