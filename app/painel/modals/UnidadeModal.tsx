"use client";

import { useRef, useState } from "react";
import { updateUnit, uploadCoverAction } from "../actions";
import LogoUploader from "../LogoUploader";
import DominioSection from "../components/DominioSection";
import { Unit } from "../types";
import { createClient } from "@/lib/supabase/client";

const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: "1px solid var(--dash-input-border)",
  background: "var(--dash-input-bg)",
  color: "var(--dash-text)", fontSize: 16, boxSizing: "border-box",
  outline: "none",
};

function CopyLinkRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <div style={{ borderRadius: 12, background: "var(--dash-card)", border: "1px solid var(--dash-card-border)", padding: "10px 14px" }}>
      <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ flex: 1, color: "var(--dash-text-secondary)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
        <button type="button" onClick={copy} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--dash-btn-border)", background: copied ? "rgba(0,255,174,0.15)" : "var(--dash-link-bg)", color: copied ? "#00ffae" : "var(--dash-text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
          {copied ? "Copiado ✓" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

export default function UnidadeModal({ unit, isPro, onClose }: { unit: Unit | null; isPro: boolean; onClose: () => void }) {
  const [isPublished, setIsPublished] = useState(unit?.is_published ?? false);
  const [showNewUnit, setShowNewUnit] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverUrl, setCoverUrl] = useState(unit?.cover_url ?? null);

  const [description, setDescription] = useState(unit?.description ?? "");

  if (!unit) return <div style={{ color: "var(--dash-text-muted)", paddingTop: 16 }}>Nenhuma unidade encontrada.</div>;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const unitId = unit.id;

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.currentTarget.value = "";

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      alert("A imagem deve ter no máximo 5MB.");
      return;
    }

    setUploadingCover(true);

    const reader = new FileReader();
    reader.onload = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("unitId", unitId);
      formData.append("file", file);

      const res = await uploadCoverAction(formData);
      if (!res?.ok) throw new Error(res?.message || "Falha ao enviar capa.");

      setCoverUrl(res.publicUrl ?? null);
      setCoverPreview(null);
    } catch (err) {
      console.error("Erro ao enviar capa:", err);
      setCoverPreview(null);
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleRemoveCover() {
    setCoverPreview(null);
    setCoverUrl(null);
    const supabase = createClient();
    await supabase.from("units").update({ cover_url: null }).eq("id", unitId);
  }

  async function handleDescriptionBlur() {
    const supabase = createClient();
    await supabase.from("units").update({ description }).eq("id", unitId);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>
      <DominioSection
        unitId={unit.id}
        currentDomain={unit.custom_domain}
        slug={unit.slug}
        restaurantName={unit.name}
      />

      <CopyLinkRow label="Link Delivery" url={`${origin}/delivery/${unit.slug}`} />
      <CopyLinkRow label="Link Presencial (QR Code / Mesa)" url={`${origin}/menu/${unit.slug}`} />

      <LogoUploader unitId={unit.id} currentLogoUrl={unit.logo_url} />

      {/* ── Foto de Capa ── */}
      <div style={{ borderRadius: 14, padding: 14, background: "rgba(20,20,20,0.55)", border: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Foto de Capa</div>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 12, marginTop: 0 }}>
          Aparece no topo do cardápio público. Use uma foto da fachada ou de um prato.
        </p>

        {/* Preview */}
        <div
          onClick={() => coverInputRef.current?.click()}
          style={{
            position: "relative",
            width: "100%",
            height: 140,
            borderRadius: 12,
            overflow: "hidden",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            marginBottom: 10,
            cursor: "pointer",
          }}
        >
          {coverPreview || coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverPreview || coverUrl!}
              alt="Capa"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              color: "rgba(255,255,255,0.25)",
            }}>
              <span style={{ fontSize: 28, marginBottom: 6 }}>📷</span>
              <span style={{ fontSize: 12 }}>Toque para adicionar foto de capa</span>
            </div>
          )}

          {uploadingCover && (
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 13,
            }}>
              Enviando...
            </div>
          )}
        </div>

        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleCoverUpload}
        />

        {(coverPreview || coverUrl) && (
          <button
            type="button"
            onClick={handleRemoveCover}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              background: "rgba(248,113,113,0.08)",
              border: "none",
              color: "rgba(248,113,113,0.7)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Remover capa
          </button>
        )}
      </div>

      {/* ── Descrição curta ── */}
      <div style={{ borderRadius: 14, padding: 14, background: "rgba(20,20,20,0.55)", border: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Descrição curta</div>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder="Ex: Lugar de comer porco!"
          maxLength={100}
          style={inp}
        />
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 6, display: "block" }}>
          {description.length}/100 — Aparece abaixo do nome no cardápio público
        </span>
      </div>

      <form action={updateUnit} onSubmit={() => setTimeout(onClose, 300)} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        <input type="hidden" name="unit_id" value={unit.id} />
        <input type="hidden" name="is_published" value={String(isPublished)} />

        {[
          { name: "name", label: "Nome da unidade", value: unit.name },
          { name: "address", label: "Endereço", value: unit.address },
          { name: "city", label: "Cidade", value: unit.city ?? "" },
          { name: "neighborhood", label: "Bairro", value: unit.neighborhood ?? "" },
          { name: "whatsapp", label: "WhatsApp", value: unit.whatsapp ?? "" },
          { name: "instagram", label: "Instagram", value: unit.instagram ?? "" },
          { name: "maps_url", label: "Link do Google Maps", value: unit.maps_url ?? "" },
        ].map((f) => (
          <div key={f.name}>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 4 }}>{f.label}</div>
            <input name={f.name} defaultValue={f.value} style={inp} />
          </div>
        ))}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0 4px" }}>
          <div>
            <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 600 }}>Publicar cardápio</div>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>Cardápio visível publicamente</div>
          </div>
          <button
            type="button"
            onClick={() => setIsPublished((v) => !v)}
            style={{
              width: 44, height: 26, borderRadius: 13, border: "none",
              background: isPublished ? "#00ffae" : "var(--dash-card-border)",
              position: "relative", transition: "background 0.2s",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <span style={{
              display: "block", width: 20, height: 20, borderRadius: "50%",
              background: "#fff", position: "absolute", top: 3, left: 3,
              transition: "transform 0.2s",
              transform: isPublished ? "translateX(18px)" : "translateX(0)",
            }} />
          </button>
        </div>

        <button type="submit" style={{ marginTop: 8, padding: "14px", borderRadius: 14, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Salvar unidade</button>
      </form>

      {/* ── Nova Unidade ── */}
      <div style={{ marginTop: 8, borderTop: "1px solid var(--dash-separator)", paddingTop: 16 }}>
        {!showNewUnit ? (
          <button onClick={() => setShowNewUnit(true)} style={{ width: "100%", padding: "13px", borderRadius: 14, border: "1px dashed var(--dash-btn-border)", background: "transparent", color: "var(--dash-text-muted)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            + Nova Unidade
          </button>
        ) : isPro ? (
          <div style={{ borderRadius: 14, padding: "16px", border: "1px solid var(--dash-input-border)", background: "var(--dash-card)" }}>
            <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Nova Unidade</div>
            <form action={async (fd) => {
              const { createClient: cc } = await import("@/lib/supabase/client");
              const supabase = cc();
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;
              const { data: rest } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).single();
              if (!rest) return;
              await supabase.from("units").insert({ restaurant_id: rest.id, name: String(fd.get("name")), slug: String(fd.get("slug")) });
              setShowNewUnit(false);
              window.location.reload();
            }} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input name="name" placeholder="Nome da unidade" required style={inp} />
              <input name="slug" placeholder="slug (ex: unidade-centro)" required style={inp} />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setShowNewUnit(false)} style={{ flex: 1, padding: "11px", borderRadius: 12, border: "1px solid var(--dash-btn-border)", background: "transparent", color: "var(--dash-text-dim)", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Criar</button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ borderRadius: 14, padding: "16px", border: "1px solid rgba(250,204,21,0.2)", background: "rgba(250,204,21,0.04)" }}>
            <div style={{ color: "#fbbf24", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>⭐ Recurso Pro</div>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
              Múltiplas unidades estão disponíveis no Plano Pro. Faça upgrade para adicionar novas unidades.
            </div>
            <button onClick={() => { setShowNewUnit(false); onClose(); }} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #00ffae, #00d9b8)", color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              Ver Planos →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
