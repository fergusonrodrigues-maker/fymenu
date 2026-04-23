"use client";

import React, { useState } from "react";
import { Pencil, Lock, AlertTriangle, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const MAIN_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN ?? "fymenu.com";

const RESERVED = ["admin", "api", "www", "mail", "ftp", "cdn", "smtp", "imap", "app", "dev", "staging"];

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export default function DominioSection({
  unitId,
  currentDomain,
  slug,
  restaurantName,
  hasActivePlan = true,
  onOpenPlans,
}: {
  unitId: string;
  currentDomain: string | null;
  slug: string;
  restaurantName: string;
  hasActivePlan?: boolean;
  onOpenPlans?: () => void;
}) {
  const supabase = createClient();
  const activeDomain = currentDomain ?? slug;

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(activeDomain);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const loadSuggestions = async () => {
    setLoadingSug(true);
    try {
      const res = await fetch("/api/units/domain-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantName }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    } catch { /* silently ignore */ }
    setLoadingSug(false);
  };

  const handleEdit = () => {
    if (!hasActivePlan) { onOpenPlans?.(); return; }
    setEditing(true);
    setError("");
    setSaved(false);
    loadSuggestions();
  };

  const handleSave = async () => {
    setError("");
    if (!value) { setError("Domínio não pode estar vazio"); return; }
    if (RESERVED.includes(value)) { setError("Este domínio é reservado"); return; }
    if (!DOMAIN_REGEX.test(value)) {
      setError("Use apenas letras minúsculas, números e hífens. Comece e termine com letra ou número.");
      return;
    }

    setSaving(true);
    const { error: err } = await supabase
      .from("units")
      .update({ custom_domain: value })
      .eq("id", unitId);

    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
      setEditing(false);
    }
    setSaving(false);
  };

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--dash-card-border)" }}>
      {/* Header row */}
      <div style={{
        padding: "14px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--dash-card)",
      }}>
        <div>
          <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 2 }}>Domínio público</div>
          <div style={{ color: saved ? "#00ffae" : "var(--dash-text)", fontSize: 14, fontWeight: 700, letterSpacing: "-0.2px" }}>
            {saved ? value : activeDomain}.{MAIN_DOMAIN}
          </div>
          {saved && (
            <div style={{ color: "#00ffae", fontSize: 11, marginTop: 2 }}>✓ Salvo — ativo em instantes</div>
          )}
        </div>
        {!editing && (
          hasActivePlan ? (
            <button
              onClick={handleEdit}
              style={{
                padding: "7px 14px", borderRadius: 10, border: "1px solid var(--dash-btn-border)",
                background: "transparent", color: "var(--dash-text-dim)", fontSize: 12, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Pencil size={12} /> Editar</span>
            </button>
          ) : (
            <button
              onClick={onOpenPlans}
              style={{
                padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(251,191,36,0.2)",
                background: "rgba(251,191,36,0.06)", color: "#fbbf24",
                fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Lock size={10} /> Assinar</span>
            </button>
          )
        )}
      </div>

      {/* Aviso sem plano */}
      {!hasActivePlan && (
        <div style={{
          padding: "10px 16px",
          background: "rgba(251,191,36,0.04)",
          borderTop: "1px solid rgba(251,191,36,0.08)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <AlertTriangle size={13} style={{ flexShrink: 0, color: "#fbbf24" }} />
          <span style={{ fontSize: 11, color: "#fbbf24", flex: 1 }}>
            Assine um plano pra personalizar e publicar seu cardápio
          </span>
          {onOpenPlans && (
            <button onClick={onOpenPlans} style={{
              padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
              background: "rgba(251,191,36,0.12)", color: "#fbbf24",
              fontSize: 10, fontWeight: 700, flexShrink: 0,
            }}>
              Ver planos
            </button>
          )}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div style={{ padding: "16px", background: "var(--dash-input-bg)", borderTop: "1px solid var(--dash-card-border)" }}>
          {/* Input */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 6 }}>
            <input
              value={value}
              onChange={(e) => { setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setError(""); }}
              placeholder="meu-restaurante"
              style={{
                flex: 1, padding: "10px 12px", borderRadius: "10px 0 0 10px",
                border: "1px solid var(--dash-input-border)", borderRight: "none",
                background: "var(--dash-card)", color: "var(--dash-text)", fontSize: 14,
                outline: "none",
              }}
            />
            <div style={{
              padding: "10px 12px", borderRadius: "0 10px 10px 0",
              background: "rgba(255,255,255,0.04)", border: "1px solid var(--dash-input-border)",
              color: "var(--dash-text-muted)", fontSize: 13, whiteSpace: "nowrap",
            }}>
              .{MAIN_DOMAIN}
            </div>
          </div>
          <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 14 }}>
            Letras minúsculas, números e hífens. Máx. 63 caracteres.
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: "10px 12px", borderRadius: 10, marginBottom: 12,
              background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
              color: "#f87171", fontSize: 12,
            }}>
              {error}
            </div>
          )}

          {/* Suggestions */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Sugestões disponíveis
              </div>
              <button
                onClick={loadSuggestions}
                disabled={loadingSug}
                style={{ background: "none", border: "none", color: "#00ffae", fontSize: 11, cursor: "pointer", opacity: loadingSug ? 0.5 : 1 }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><RefreshCw size={11} /> Recarregar</span>
              </button>
            </div>
            {loadingSug ? (
              <div style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>Gerando sugestões...</div>
            ) : suggestions.length === 0 ? (
              <div style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>Nenhuma sugestão</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setValue(s)}
                    style={{
                      padding: "10px 14px", borderRadius: 10, textAlign: "left", cursor: "pointer",
                      background: value === s ? "rgba(0,255,174,0.08)" : "var(--dash-card)",
                      border: `1px solid ${value === s ? "rgba(0,255,174,0.3)" : "var(--dash-card-border)"}`,
                      color: value === s ? "#00ffae" : "var(--dash-text)",
                      fontSize: 13, fontWeight: value === s ? 700 : 500,
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{s}</span>
                    <span style={{ color: "var(--dash-text-muted)", fontWeight: 400 }}>.{MAIN_DOMAIN}</span>
                    <span style={{ marginLeft: 8, color: "#00ffae", fontSize: 11 }}>✓ disponível</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1, padding: "11px", borderRadius: 10, border: "none",
                background: "var(--dash-accent-soft)", color: "var(--dash-accent)",
                fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
                boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
                transition: "all 0.2s",
              }}
            >
              {saving ? "Salvando..." : "✓ Salvar domínio"}
            </button>
            <button
              onClick={() => { setEditing(false); setValue(activeDomain); setError(""); }}
              style={{
                padding: "11px 16px", borderRadius: 10,
                border: "1px solid var(--dash-btn-border)",
                background: "transparent", color: "var(--dash-text-dim)",
                fontSize: 13, cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
