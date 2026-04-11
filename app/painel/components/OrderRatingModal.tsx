"use client";

import { useState } from "react";

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface OrderRatingModalProps {
  orderId: string;
  employees: Employee[];
  onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  waiter: "Garçom",
  deliverer: "Entregador",
  kitchen: "Cozinha",
  cashier: "Caixa",
  manager: "Gerente",
};

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            fontSize: 32, lineHeight: 1,
            color: star <= (hovered || value) ? "#fbbf24" : "#444",
            transition: "color 0.1s, transform 0.1s",
            transform: star <= (hovered || value) ? "scale(1.15)" : "scale(1)",
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function OrderRatingModal({ orderId, employees, onClose }: OrderRatingModalProps) {
  const [ratings, setRatings] = useState<Record<string, { rating: number; comment: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setRating(employeeId: string, rating: number) {
    setRatings((prev) => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], rating, comment: prev[employeeId]?.comment ?? "" },
    }));
  }

  function setComment(employeeId: string, comment: string) {
    setRatings((prev) => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], comment, rating: prev[employeeId]?.rating ?? 0 },
    }));
  }

  async function handleSubmit() {
    const toRate = Object.entries(ratings).filter(([, v]) => v.rating > 0);
    if (toRate.length === 0) {
      setError("Avalie pelo menos um funcionário.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await Promise.all(
        toRate.map(([employeeId, { rating, comment }]) =>
          fetch("/api/ratings/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_intent_id: orderId,
              employee_id: employeeId,
              rating,
              comment: comment || undefined,
            }),
          })
        )
      );
      setSubmitted(true);
    } catch {
      setError("Erro ao enviar avaliação. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
  };

  const sheet: React.CSSProperties = {
    width: "100%", maxWidth: 480,
    background: "#111", borderRadius: "24px 24px 0 0",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "20px 24px 40px",
    maxHeight: "85vh", overflowY: "auto",
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ color: "#00ffae", fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Obrigado!</div>
            <div style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>Sua avaliação foi enviada com sucesso.</div>
            <button
              onClick={onClose}
              style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: "var(--dash-accent-soft)", color: "var(--dash-accent)", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset", transition: "all 0.2s" }}
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>Como foi o atendimento?</h2>
            <p style={{ color: "#888", fontSize: 14, margin: "0 0 24px" }}>Avalie os funcionários que te atenderam</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {employees.map((emp) => {
                const empRating = ratings[emp.id];
                return (
                  <div key={emp.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(0,255,174,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                        {emp.role === "deliverer" ? "🚴" : "🧑‍🍳"}
                      </div>
                      <div>
                        <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{emp.name}</div>
                        <div style={{ color: "#888", fontSize: 12 }}>{ROLE_LABELS[emp.role] ?? emp.role}</div>
                      </div>
                    </div>

                    <StarRating
                      value={empRating?.rating ?? 0}
                      onChange={(v) => setRating(emp.id, v)}
                    />

                    {empRating?.rating > 0 && (
                      <textarea
                        placeholder="Deixe um comentário (opcional)"
                        value={empRating.comment}
                        onChange={(e) => setComment(emp.id, e.target.value)}
                        rows={2}
                        style={{
                          width: "100%", marginTop: 12, padding: "10px 12px",
                          borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
                          background: "rgba(255,255,255,0.05)", color: "#fff",
                          fontSize: 14, resize: "none", boxSizing: "border-box", fontFamily: "inherit",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 13 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={onClose}
                style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#888", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Agora não
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", background: "var(--dash-accent-soft)", color: "var(--dash-accent)", fontSize: 14, fontWeight: 800, cursor: submitting ? "not-allowed" : "pointer", boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset", transition: "all 0.2s" }}
              >
                {submitting ? "Enviando..." : "Enviar avaliação"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
