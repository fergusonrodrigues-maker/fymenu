"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle2, FileText, Phone } from "lucide-react";
import {
  maskCPF,
  maskCNPJ,
  maskPhone,
  detectDocumentType,
  validateCPF,
  validateCNPJ,
} from "@/lib/validators/documents";

interface Props {
  userId: string;
  restaurantId: string;
  userEmail: string;
  onComplete?: () => void;
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export default function ModalDadosDono({ restaurantId, onComplete }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [document, setDocument] = useState(""); // raw digits
  const [phone, setPhone] = useState(""); // raw digits
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const docType = detectDocumentType(document);
  const docMasked =
    docType === "cnpj" ? maskCNPJ(document) : maskCPF(document);
  const phoneMasked = maskPhone(phone);

  // Block ESC from closing anything.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    if (trimmedName.length < 3 || !trimmedName.includes(" ")) {
      setError("Informe seu nome completo (nome e sobrenome).");
      return;
    }

    if (docType === "cpf" && !validateCPF(document)) {
      setError("CPF inválido. Confira os dígitos.");
      return;
    }
    if (docType === "cnpj" && !validateCNPJ(document)) {
      setError("CNPJ inválido. Confira os dígitos.");
      return;
    }
    if (docType === null) {
      setError("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).");
      return;
    }

    if (phone.length !== 10 && phone.length !== 11) {
      setError("Telefone deve ter 10 ou 11 dígitos com DDD.");
      return;
    }

    const { firstName, lastName } = splitName(trimmedName);

    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          firstName,
          lastName,
          document,
          phone,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Erro ao salvar. Tente novamente.");
        setSaving(false);
        return;
      }
      onComplete?.();
      router.refresh();
    } catch {
      setError("Não foi possível salvar agora. Verifique sua conexão.");
      setSaving(false);
    }
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background:
          "radial-gradient(circle at center, rgba(0,255,174,0.04) 0%, rgba(10,10,10,0.92) 60%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "'Montserrat', system-ui, sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 460,
          background:
            "linear-gradient(180deg, rgba(20,20,20,0.95), rgba(12,12,12,0.95))",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: "28px 24px",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,255,174,0.08)",
          color: "#fff",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(0,255,174,0.08)",
              border: "1px solid rgba(0,255,174,0.18)",
              color: "#00ffae",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Cadastro pendente
          </div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Complete seu cadastro
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.6)",
              margin: "6px 0 0",
              lineHeight: 1.5,
            }}
          >
            Precisamos desses dados pra ativar seu painel.
          </p>
        </div>

        {/* Nome */}
        <Field icon={<UserCircle2 size={14} />} label="Nome completo">
          <input
            autoFocus
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ex: João da Silva"
            disabled={saving}
            style={inputStyle}
          />
        </Field>

        {/* Documento */}
        <Field
          icon={<FileText size={14} />}
          label="CPF ou CNPJ"
          hint={docType ? docType.toUpperCase() : null}
        >
          <input
            type="text"
            inputMode="numeric"
            value={docMasked}
            onChange={(e) =>
              setDocument(e.target.value.replace(/\D/g, "").slice(0, 14))
            }
            placeholder="000.000.000-00"
            disabled={saving}
            style={inputStyle}
          />
        </Field>

        {/* Telefone */}
        <Field icon={<Phone size={14} />} label="Telefone">
          <input
            type="tel"
            inputMode="numeric"
            value={phoneMasked}
            onChange={(e) =>
              setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
            }
            placeholder="(00) 00000-0000"
            disabled={saving}
            style={inputStyle}
          />
        </Field>

        {error && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.25)",
              color: "#fca5a5",
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            width: "100%",
            marginTop: 20,
            padding: "13px 16px",
            borderRadius: 12,
            border: "none",
            cursor: saving ? "wait" : "pointer",
            background: saving
              ? "rgba(0,255,174,0.4)"
              : "linear-gradient(180deg, #00ffae, #00cc88)",
            color: "#0a0a0a",
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: 0.2,
            transition: "opacity 0.2s",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Salvando..." : "Salvar e continuar"}
        </button>
      </form>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

function Field({
  icon,
  label,
  hint,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          {icon}
          {label}
        </label>
        {hint && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#00ffae",
              padding: "2px 8px",
              borderRadius: 999,
              background: "rgba(0,255,174,0.08)",
              border: "1px solid rgba(0,255,174,0.18)",
            }}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
