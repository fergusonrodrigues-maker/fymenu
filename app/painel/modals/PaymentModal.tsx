"use client";
import { useState, useEffect, useRef } from "react";

type CycleKey = "monthly" | "quarterly" | "semiannual";
type Step = "cycle" | "method" | "pix" | "card";

const CYCLE_INFO: Record<string, Record<CycleKey, {
  label: string; perMonth: string; total: string; totalCents: number; savings: string | null;
}>> = {
  menu: {
    monthly:    { label: "Mensal",     perMonth: "199,90", total: "199,90",   totalCents: 19990,  savings: null },
    quarterly:  { label: "Trimestral", perMonth: "179,90", total: "539,70",   totalCents: 53970,  savings: "10%" },
    semiannual: { label: "Semestral",  perMonth: "159,90", total: "959,40",   totalCents: 95940,  savings: "20%" },
  },
  menupro: {
    monthly:    { label: "Mensal",     perMonth: "399,90", total: "399,90",   totalCents: 39990,  savings: null },
    quarterly:  { label: "Trimestral", perMonth: "359,90", total: "1.079,70", totalCents: 107970, savings: "10%" },
    semiannual: { label: "Semestral",  perMonth: "319,90", total: "1.919,40", totalCents: 191940, savings: "20%" },
  },
  business: {
    monthly:    { label: "Mensal",     perMonth: "1.599", total: "1.599",   totalCents: 159900, savings: null },
    quarterly:  { label: "Trimestral", perMonth: "1.399", total: "4.197",   totalCents: 419700, savings: "13%" },
    semiannual: { label: "Semestral",  perMonth: "1.199", total: "7.194",   totalCents: 719400, savings: "25%" },
  },
};

interface Props {
  planKey: string;
  planName: string;
  accent: string;
  accentRgb: string;
  onClose: () => void;
  onSuccess: () => void;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function maskCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function maskExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10, outline: "none",
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
  transition: "border-color 0.2s",
};

export default function PaymentModal({ planKey, planName, accent, accentRgb, onClose, onSuccess }: Props) {
  const cycleMap = CYCLE_INFO[planKey] || CYCLE_INFO.menu;
  const [step, setStep] = useState<Step>("cycle");
  const [cycle, setCycle] = useState<CycleKey>("monthly");

  // PIX
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null);
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [pixExpiration, setPixExpiration] = useState<string | null>(null);
  const [pixStatus, setPixStatus] = useState("PENDING");
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Card
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [holderEmail, setHolderEmail] = useState("");
  const [holderCpf, setHolderCpf] = useState("");
  const [holderCep, setHolderCep] = useState("");
  const [holderPhone, setHolderPhone] = useState("");
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardSuccess, setCardSuccess] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!pixExpiration) return;
    const expMs = new Date(pixExpiration).getTime();
    const tick = () => setTimeLeft(Math.max(0, Math.floor((expMs - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pixExpiration]);

  // PIX polling every 5s
  useEffect(() => {
    if (step !== "pix" || !pixPaymentId || pixStatus === "CONFIRMED" || pixStatus === "RECEIVED") return;
    pollingRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/billing/payment-status?paymentId=${pixPaymentId}`);
        const d = await r.json();
        if (d.status === "CONFIRMED" || d.status === "RECEIVED") {
          setPixStatus(d.status);
          if (pollingRef.current) clearInterval(pollingRef.current);
          setTimeout(onSuccess, 2000);
        }
      } catch {}
    }, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pixPaymentId]);

  // Scroll sheet to top on every step change (and on mount)
  useEffect(() => {
    sheetRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  async function generatePix() {
    setPixLoading(true);
    setPixError(null);
    try {
      const r = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: planKey, cycle, paymentMethod: "PIX" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro ao gerar PIX");
      setPixPaymentId(d.paymentId);
      setPixQrCode(d.pixQrCode);
      setPixPayload(d.pixPayload);
      setPixExpiration(d.expirationDate);
    } catch (e: any) {
      setPixError(e.message);
    } finally {
      setPixLoading(false);
    }
  }

  async function payWithCard() {
    if (!cardHolder || !cardNumber || !cardExpiry || !cardCvv || !holderCpf || !holderCep || !holderPhone) {
      setCardError("Preencha todos os campos obrigatórios");
      return;
    }
    setCardLoading(true);
    setCardError(null);
    const [em, ey] = cardExpiry.split("/");
    try {
      const r = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: planKey, cycle, paymentMethod: "CREDIT_CARD",
          creditCard: {
            holderName: cardHolder,
            number: cardNumber.replace(/\s/g, ""),
            expiryMonth: em?.trim(),
            expiryYear: ey?.trim().length === 2 ? `20${ey.trim()}` : ey?.trim(),
            ccv: cardCvv,
          },
          creditCardHolderInfo: {
            name: cardHolder, email: holderEmail,
            cpfCnpj: holderCpf, postalCode: holderCep, phone: holderPhone,
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro ao processar pagamento");
      if (d.status === "CONFIRMED" || d.status === "RECEIVED") {
        setCardSuccess(true);
        setTimeout(onSuccess, 2000);
      } else {
        setCardError(`Pagamento com status: ${d.status}. Verifique os dados ou tente outro cartão.`);
      }
    } catch (e: any) {
      setCardError(e.message);
    } finally {
      setCardLoading(false);
    }
  }

  const stepNum = step === "cycle" ? 1 : step === "method" ? 2 : 3;
  const cInfo = cycleMap[cycle];
  const isPaid = pixStatus === "CONFIRMED" || pixStatus === "RECEIVED";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} />

      {/* Sheet */}
      <div ref={sheetRef} style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 480,
        maxHeight: "92dvh", overflowY: "auto",
        background: "rgba(12,12,12,0.98)",
        backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
        borderRadius: "24px 24px 0 0",
        border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
        padding: "24px 20px",
        paddingBottom: "max(28px, env(safe-area-inset-bottom, 28px))",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>Assinar {planName}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Pagamento seguro via Asaas</div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer",
            background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800,
                background: n <= stepNum ? accent : "rgba(255,255,255,0.06)",
                color: n <= stepNum ? "#000" : "rgba(255,255,255,0.3)",
                transition: "all 0.3s",
              }}>{n}</div>
              {n < 3 && <div style={{ width: 24, height: 2, borderRadius: 1, background: n < stepNum ? accent : "rgba(255,255,255,0.1)", transition: "background 0.3s" }} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Cycle ── */}
        {step === "cycle" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 12, textAlign: "center" }}>
              Escolha o ciclo de cobrança
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {(["monthly", "quarterly", "semiannual"] as CycleKey[]).map((c) => {
                const info = cycleMap[c];
                const selected = cycle === c;
                return (
                  <div key={c} onClick={() => setCycle(c)} style={{
                    padding: "14px 16px", borderRadius: 14, cursor: "pointer",
                    background: selected ? `rgba(${accentRgb},0.08)` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selected ? accent : "rgba(255,255,255,0.08)"}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    transition: "all 0.2s",
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: selected ? accent : "#fff" }}>{info.label}</div>
                      {info.savings && (
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                          R${info.total} total
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: selected ? accent : "#fff" }}>
                        R${info.perMonth}<span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>/mês</span>
                      </div>
                      {info.savings && (
                        <div style={{
                          fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 5,
                          background: `rgba(${accentRgb},0.15)`, color: accent, marginTop: 4, display: "inline-block",
                        }}>-{info.savings}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setStep("method")} style={{
              width: "100%", padding: 14, borderRadius: 12, border: "none", cursor: "pointer",
              background: `linear-gradient(135deg, ${accent}, #00d9ff)`,
              color: "#000", fontSize: 14, fontWeight: 900, fontFamily: "inherit",
            }}>
              Continuar →
            </button>
          </div>
        )}

        {/* ── STEP 2: Method ── */}
        {step === "method" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 4, textAlign: "center" }}>
              Como prefere pagar?
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textAlign: "center", marginBottom: 20 }}>
              R${cInfo.total} {cInfo.savings ? `— economia de ${cInfo.savings}` : ""}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              <button onClick={() => { setStep("pix"); generatePix(); }} style={{
                padding: "16px 20px", borderRadius: 14, border: "1px solid rgba(0,255,174,0.2)", cursor: "pointer",
                background: "rgba(0,255,174,0.06)",
                display: "flex", alignItems: "center", gap: 14,
                fontFamily: "inherit",
              }}>
                <span style={{ fontSize: 28 }}>🟩</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#00ffae" }}>PIX</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Aprovação instantânea · QR Code</div>
                </div>
              </button>
              <button onClick={() => setStep("card")} style={{
                padding: "16px 20px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
                background: "rgba(255,255,255,0.03)",
                display: "flex", alignItems: "center", gap: 14,
                fontFamily: "inherit",
              }}>
                <span style={{ fontSize: 28 }}>💳</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Cartão de Crédito</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Visa, Mastercard, Elo · Processamento imediato</div>
                </div>
              </button>
            </div>
            <button onClick={() => setStep("cycle")} style={{
              width: "100%", padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
              background: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}>← Voltar</button>
          </div>
        )}

        {/* ── STEP 3a: PIX ── */}
        {step === "pix" && (
          <div style={{ textAlign: "center" }}>
            {pixLoading && (
              <div style={{ padding: "40px 0", color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                Gerando QR Code PIX...
              </div>
            )}

            {pixError && (
              <div>
                <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(248,113,113,0.1)", color: "#f87171", fontSize: 13, marginBottom: 16 }}>
                  {pixError}
                </div>
                <button onClick={generatePix} style={{
                  padding: "10px 24px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                }}>Tentar novamente</button>
              </div>
            )}

            {!pixLoading && !pixError && pixQrCode && (
              <>
                {isPaid ? (
                  <div style={{ padding: "32px 0" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#00ffae", marginBottom: 4 }}>Pagamento confirmado!</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Ativando seu plano...</div>
                  </div>
                ) : (
                  <>
                    {/* QR Code */}
                    <div style={{
                      display: "inline-block", padding: 16, borderRadius: 16,
                      background: "#fff", marginBottom: 16,
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`data:image/png;base64,${pixQrCode}`} alt="QR Code PIX" width={180} height={180} style={{ display: "block" }} />
                    </div>

                    {/* Timer */}
                    {timeLeft !== null && timeLeft > 0 && (
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
                        Expira em <span style={{ color: timeLeft < 120 ? "#f87171" : "#00ffae", fontWeight: 700 }}>{fmt(timeLeft)}</span>
                      </div>
                    )}
                    {timeLeft === 0 && (
                      <div style={{ fontSize: 12, color: "#f87171", marginBottom: 12, fontWeight: 700 }}>QR Code expirado</div>
                    )}

                    {/* Pix copia e cola */}
                    {pixPayload && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>Pix copia e cola</div>
                        <div style={{
                          display: "flex", gap: 6, alignItems: "center",
                          padding: "10px 12px", borderRadius: 10,
                          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                        }}>
                          <div style={{
                            flex: 1, fontSize: 11, color: "rgba(255,255,255,0.5)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            textAlign: "left",
                          }}>{pixPayload}</div>
                          <button onClick={() => {
                            navigator.clipboard.writeText(pixPayload).then(() => {
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            });
                          }} style={{
                            padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                            background: copied ? "rgba(0,255,174,0.2)" : "rgba(255,255,255,0.08)",
                            color: copied ? "#00ffae" : "#fff",
                            fontSize: 11, fontWeight: 700, fontFamily: "inherit", flexShrink: 0,
                            transition: "all 0.2s",
                          }}>{copied ? "✓ Copiado" : "Copiar"}</button>
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
                      Aguardando confirmação do pagamento...
                    </div>

                    <button onClick={() => setStep("method")} style={{
                      padding: "8px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
                      background: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                    }}>← Voltar</button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── STEP 3b: Card ── */}
        {step === "card" && (
          <div>
            {cardSuccess ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#00ffae", marginBottom: 4 }}>Pagamento confirmado!</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Ativando seu plano...</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 16, textAlign: "center" }}>
                  Dados do cartão
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Nome no cartão *</label>
                    <input value={cardHolder} onChange={e => setCardHolder(e.target.value.toUpperCase())}
                      placeholder="NOME COMO NO CARTÃO" style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Número do cartão *</label>
                    <input value={cardNumber} onChange={e => setCardNumber(maskCard(e.target.value))}
                      placeholder="0000 0000 0000 0000" inputMode="numeric" style={inp} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Validade *</label>
                      <input value={cardExpiry} onChange={e => setCardExpiry(maskExpiry(e.target.value))}
                        placeholder="MM/AA" inputMode="numeric" style={inp} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>CVV *</label>
                      <input value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="000" inputMode="numeric" type="password" style={inp} />
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Dados do titular</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>E-mail *</label>
                        <input value={holderEmail} onChange={e => setHolderEmail(e.target.value)}
                          placeholder="email@exemplo.com" type="email" style={inp} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>CPF / CNPJ *</label>
                        <input value={holderCpf} onChange={e => setHolderCpf(e.target.value)}
                          placeholder="000.000.000-00" inputMode="numeric" style={inp} />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>CEP *</label>
                          <input value={holderCep} onChange={e => setHolderCep(e.target.value.replace(/\D/g, "").slice(0, 8))}
                            placeholder="00000-000" inputMode="numeric" style={inp} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Telefone *</label>
                          <input value={holderPhone} onChange={e => setHolderPhone(e.target.value)}
                            placeholder="(00) 00000-0000" inputMode="tel" style={inp} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {cardError && (
                  <div style={{
                    padding: "10px 14px", borderRadius: 10, marginBottom: 12,
                    background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.15)",
                    color: "#f87171", fontSize: 12,
                  }}>{cardError}</div>
                )}

                <button onClick={payWithCard} disabled={cardLoading} style={{
                  width: "100%", padding: 14, borderRadius: 12, border: "none", cursor: cardLoading ? "default" : "pointer",
                  background: cardLoading ? "rgba(255,255,255,0.1)" : `linear-gradient(135deg, ${accent}, #00d9ff)`,
                  color: "#000", fontSize: 14, fontWeight: 900, fontFamily: "inherit",
                  opacity: cardLoading ? 0.6 : 1, transition: "all 0.2s", marginBottom: 10,
                }}>
                  {cardLoading ? "Processando..." : `Pagar R$${cInfo.total}`}
                </button>

                <button onClick={() => setStep("method")} style={{
                  width: "100%", padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
                  background: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                }}>← Voltar</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
