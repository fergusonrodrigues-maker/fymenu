"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 12,
  border: "1px solid var(--dash-border)",
  background: "var(--dash-card-hover)",
  color: "var(--dash-text)",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const label: React.CSSProperties = {
  display: "block",
  color: "var(--dash-text-muted)",
  fontSize: 11,
  fontWeight: 700,
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

export default function CriarUnidadeModal({
  restaurantId,
  onSuccess,
  onCancel,
}: {
  restaurantId: string;
  onSuccess: (newUnitId: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-generate slug from name unless manually edited
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited]);

  const checkSlug = useCallback(async (value: string) => {
    if (value.length < 3) {
      setSlugStatus("invalid");
      return;
    }
    const re = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
    if (!re.test(value)) {
      setSlugStatus("invalid");
      return;
    }
    setSlugStatus("checking");
    const supabase = createClient();
    const { data } = await supabase
      .from("units")
      .select("id")
      .eq("slug", value)
      .maybeSingle();
    setSlugStatus(data ? "taken" : "ok");
  }, []);

  // Debounced slug check
  useEffect(() => {
    if (!slug) { setSlugStatus("idle"); return; }
    if (checkTimeout.current) clearTimeout(checkTimeout.current);
    checkTimeout.current = setTimeout(() => checkSlug(slug), 400);
    return () => { if (checkTimeout.current) clearTimeout(checkTimeout.current); };
  }, [slug, checkSlug]);

  async function handleCreate() {
    setError(null);
    if (!name.trim()) { setError("Nome da unidade é obrigatório."); return; }
    if (slugStatus !== "ok") { setError("Verifique o slug antes de continuar."); return; }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: newUnit, error: insertError } = await supabase
        .from("units")
        .insert({
          restaurant_id: restaurantId,
          name: name.trim(),
          slug: slug.trim(),
          city: city.trim() || null,
          whatsapp: whatsapp.trim() || null,
          is_published: false,
        })
        .select("id")
        .single();

      if (insertError || !newUnit) {
        setError("Erro ao criar unidade. Tente novamente.");
        return;
      }
      onSuccess(newUnit.id);
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const slugFeedback = {
    idle:     { text: "", color: "" },
    checking: { text: "Verificando...", color: "var(--dash-text-muted)" },
    ok:       { text: "✓ Disponível", color: "var(--dash-accent)" },
    taken:    { text: "✗ Já em uso", color: "var(--dash-danger)" },
    invalid:  { text: "✗ Mín. 3 caracteres, apenas letras, números e -", color: "var(--dash-danger)" },
  }[slugStatus];

  const preview = slug ? `fymenu.com/delivery/${slug}` : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 4 }}>

      {/* Nome */}
      <div>
        <span style={label}>Nome da unidade *</span>
        <input
          style={inp}
          type="text"
          placeholder="Ex: Burger King Centro"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      {/* Slug */}
      <div>
        <span style={label}>Slug (URL) *</span>
        <input
          style={{
            ...inp,
            fontFamily: "monospace",
            letterSpacing: "0.04em",
            borderColor: slugStatus === "ok" ? "var(--dash-accent)" : slugStatus === "taken" || slugStatus === "invalid" ? "var(--dash-danger)" : undefined,
          }}
          type="text"
          placeholder="ex: burgerking-centro"
          value={slug}
          onChange={(e) => {
            setSlugEdited(true);
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
          }}
        />
        {slugFeedback.text && (
          <span style={{ display: "block", fontSize: 12, marginTop: 5, color: slugFeedback.color, fontWeight: 600 }}>
            {slugFeedback.text}
          </span>
        )}
        {preview && (
          <span style={{ display: "block", fontSize: 11, marginTop: 4, color: "var(--dash-text-muted)" }}>
            Link: <span style={{ color: "var(--dash-text-secondary)" }}>{preview}</span>
          </span>
        )}
      </div>

      {/* Cidade */}
      <div>
        <span style={label}>Cidade (opcional)</span>
        <input
          style={inp}
          type="text"
          placeholder="Ex: São Paulo"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>

      {/* WhatsApp */}
      <div>
        <span style={label}>WhatsApp (opcional)</span>
        <input
          style={inp}
          type="text"
          placeholder="Ex: 11999999999"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
        />
      </div>

      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: 10,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          color: "var(--dash-danger)", fontSize: 13, fontWeight: 600,
        }}>
          {error}
        </div>
      )}

      {/* Footer actions */}
      <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            flex: 1, padding: "13px", borderRadius: 12, border: "1px solid var(--dash-border)",
            background: "transparent", color: "var(--dash-text-muted)",
            fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={loading || slugStatus !== "ok" || !name.trim()}
          style={{
            flex: 2, padding: "13px", borderRadius: 12, border: "none",
            background: "#16a34a", color: "#fff",
            fontSize: 14, fontWeight: 800, cursor: loading ? "wait" : "pointer",
            fontFamily: "inherit", opacity: (loading || slugStatus !== "ok" || !name.trim()) ? 0.55 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {loading ? "Criando..." : "Criar unidade"}
        </button>
      </div>
    </div>
  );
}
