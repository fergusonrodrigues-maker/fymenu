"use client";

import { useRef, useState } from "react";
import { updateUnit, uploadCoverAction } from "../actions";
import LogoUploader from "../LogoUploader";
import DominioSection from "../components/DominioSection";
import { Unit } from "../types";
import { createClient } from "@/lib/supabase/client";

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1px solid var(--dash-border)",
  background: "var(--dash-card-hover)",
  color: "var(--dash-text)", fontSize: 13, fontWeight: 500, boxSizing: "border-box",
  outline: "none", transition: "border-color 0.2s",
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
        <button type="button" onClick={copy} style={{ padding: "5px 10px", borderRadius: 8, border: "none", background: copied ? "var(--dash-accent-soft)" : "var(--dash-card-hover)", color: copied ? "var(--dash-accent)" : "var(--dash-text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, boxShadow: "var(--dash-shadow)" }}>
          {copied ? "Copiado ✓" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

export default function UnidadeModal({ unit, isPro, onClose, onOpenPlans }: { unit: Unit | null; isPro: boolean; onClose: () => void; onOpenPlans?: () => void }) {
  const [isPublished, setIsPublished] = useState(unit?.is_published ?? false);
  const [showNewUnit, setShowNewUnit] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverUrl, setCoverUrl] = useState(unit?.cover_url ?? null);

  const [description, setDescription] = useState(unit?.description ?? "");
  const [pixelId, setPixelId] = useState(unit?.facebook_pixel_id || "");
  const [ifoodUrl, setIfoodUrl] = useState(unit?.ifood_url || "");
  const [ifoodPlatform, setIfoodPlatform] = useState(unit?.ifood_platform || "ifood");
  const [googleReviewUrl, setGoogleReviewUrl] = useState((unit as any)?.google_review_url || "");
  const [businessHours, setBusinessHours] = useState<any[]>(
    unit?.business_hours || [
      { day: "seg", open: "11:00", close: "23:00", enabled: true },
      { day: "ter", open: "11:00", close: "23:00", enabled: true },
      { day: "qua", open: "11:00", close: "23:00", enabled: true },
      { day: "qui", open: "11:00", close: "23:00", enabled: true },
      { day: "sex", open: "11:00", close: "00:00", enabled: true },
      { day: "sab", open: "11:00", close: "00:00", enabled: true },
      { day: "dom", open: "11:00", close: "22:00", enabled: true },
    ]
  );
  const [forceStatus, setForceStatus] = useState(unit?.force_status || "auto");

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

      {/* SEÇÃO 1 — Informações da unidade */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--dash-text-muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>
          Informações da unidade
        </div>

        <DominioSection
          unitId={unit.id}
          currentDomain={unit.custom_domain}
          slug={unit.slug}
          restaurantName={unit.name}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <CopyLinkRow label="Link Delivery" url={`${origin}/delivery/${unit.slug}`} />
          <CopyLinkRow label="Link Presencial (QR Code / Mesa)" url={`${origin}/menu/${unit.slug}`} />
        </div>

        <div style={{ marginTop: 8 }}>
          <LogoUploader unitId={unit.id} currentLogoUrl={unit.logo_url} />
        </div>

        {/* ── Foto de Capa ── */}
        <div style={{ borderRadius: 14, padding: 14, background: "var(--dash-card)", border: "1px solid var(--dash-section-border)", marginTop: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dash-text)", marginBottom: 10 }}>Foto de Capa</div>
          <p style={{ color: "var(--dash-text-muted)", fontSize: 12, marginBottom: 12, marginTop: 0 }}>
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
              background: "var(--dash-card-hover)",
              border: "1px solid var(--dash-border)",
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
                color: "var(--dash-text-subtle)",
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
                color: "var(--dash-text)", fontSize: 13,
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
                background: "var(--dash-danger-soft)",
                border: "none",
                color: "var(--dash-danger)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Remover capa
            </button>
          )}
        </div>

        {/* ── Descrição curta ── */}
        <div style={{ borderRadius: 14, padding: 14, background: "var(--dash-card)", border: "1px solid var(--dash-section-border)", marginTop: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dash-text)", marginBottom: 10 }}>Descrição curta</div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="Ex: Lugar de comer porco!"
            maxLength={100}
            style={inp}
          />
          <span style={{ color: "var(--dash-text-subtle)", fontSize: 11, marginTop: 6, display: "block" }}>
            {description.length}/100 — Aparece abaixo do nome no cardápio público
          </span>
        </div>
      </div>

      {/* Divisor */}
      <div style={{ height: 1, background: "var(--dash-section-border)", marginBottom: 16 }} />

      {/* SEÇÃO 2 — Dados do estabelecimento */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--dash-text-muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>
          Dados do estabelecimento
        </div>

        <form action={updateUnit} onSubmit={() => setTimeout(onClose, 300)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                background: isPublished ? "var(--dash-accent)" : "var(--dash-card-hover)",
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

          <button type="submit" style={{ marginTop: 8, padding: "14px", borderRadius: 14, border: "none", background: "var(--dash-accent-soft)", color: "var(--dash-accent)", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "var(--dash-shadow)" }}>Salvar unidade</button>
        </form>
      </div>

      {/* Divisor */}
      <div style={{ height: 1, background: "var(--dash-section-border)", marginBottom: 16 }} />

      {/* SEÇÃO 3 — Configurações avançadas */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--dash-text-muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>
          Configurações avançadas
        </div>

        {/* ── Integrações ── */}
        <div style={{ borderRadius: 14, padding: 14, background: "var(--dash-card)", border: "1px solid var(--dash-section-border)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dash-text)", marginBottom: 10 }}>Integrações</div>
          {/* Facebook Pixel */}
          <div style={{ marginTop: 0 }}>
            <label style={{ color: "var(--dash-text-muted)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Facebook Pixel ID</label>
            <input
              type="text"
              placeholder="Ex: 123456789012345"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              onBlur={async () => {
                const supabase = createClient();
                await supabase.from("units").update({ facebook_pixel_id: pixelId.trim() || null }).eq("id", unit.id);
              }}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 12,
                background: "var(--dash-card-hover)", border: "none",
                color: "var(--dash-text)", fontSize: 14, outline: "none", boxSizing: "border-box",
              }}
            />
            <span style={{ color: "var(--dash-text-subtle)", fontSize: 10, marginTop: 4, display: "block" }}>
              Rastreia conversões do cardápio no Facebook/Instagram Ads
            </span>
          </div>
          {/* iFood / Plataforma externa */}
          <div style={{ marginTop: 16 }}>
            <label style={{ color: "var(--dash-text-muted)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Plataforma de Delivery</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <select
                value={ifoodPlatform}
                onChange={async (e) => {
                  setIfoodPlatform(e.target.value);
                  const supabase = createClient();
                  await supabase.from("units").update({ ifood_platform: e.target.value }).eq("id", unit.id);
                }}
                style={{
                  padding: "10px 12px", borderRadius: 12,
                  backgroundColor: "var(--dash-card-hover)", border: "none",
                  color: "var(--dash-text)", fontSize: 13, outline: "none", width: 120,
                }}
              >
                <option value="ifood">iFood</option>
                <option value="rappi">Rappi</option>
                <option value="uber_eats">Uber Eats</option>
                <option value="aiqfome">AiQFome</option>
                <option value="outro">Outro</option>
              </select>
              <input
                type="url"
                placeholder="Cole o link da sua loja na plataforma"
                value={ifoodUrl}
                onChange={(e) => setIfoodUrl(e.target.value)}
                onBlur={async () => {
                  const supabase = createClient();
                  await supabase.from("units").update({ ifood_url: ifoodUrl.trim() || null }).eq("id", unit.id);
                }}
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 12,
                  background: "var(--dash-card-hover)", border: "none",
                  color: "var(--dash-text)", fontSize: 13, outline: "none",
                }}
              />
            </div>
            <span style={{ color: "var(--dash-text-subtle)", fontSize: 10, display: "block" }}>
              Só contabiliza cliques — vendas são processadas na plataforma externa.
            </span>
          </div>
          {/* Google Reviews */}
          <div style={{ marginTop: 16 }}>
            <label style={{ color: "var(--dash-text-muted)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Link do Google Reviews</label>
            <input
              type="url"
              placeholder="Cole o link do Google Reviews do seu restaurante"
              value={googleReviewUrl}
              onChange={(e) => setGoogleReviewUrl(e.target.value)}
              onBlur={async () => {
                const supabase = createClient();
                await supabase.from("units").update({ google_review_url: googleReviewUrl.trim() || null }).eq("id", unit.id);
              }}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 12,
                background: "var(--dash-card-hover)", border: "none",
                color: "var(--dash-text)", fontSize: 13, outline: "none", boxSizing: "border-box",
              }}
            />
            <span style={{ color: "var(--dash-text-subtle)", fontSize: 10, marginTop: 4, display: "block" }}>
              Clientes que dão 4-5 estrelas são redirecionados pra avaliar no Google
            </span>
          </div>
        </div>

        {/* ── Horário de funcionamento ── */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Horário de funcionamento</div>

          {/* Override manual */}
          <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
            {[
              { key: "auto", label: "Automático", icon: "🕐" },
              { key: "open", label: "Forçar aberto", icon: "🟢" },
              { key: "closed", label: "Forçar fechado", icon: "🔴" },
            ].map(opt => (
              <button key={opt.key} type="button" onClick={() => {
                setForceStatus(opt.key);
                const supabase = createClient();
                supabase.from("units").update({ force_status: opt.key }).eq("id", unit.id);
              }} style={{
                flex: 1, padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer",
                background: forceStatus === opt.key ? "var(--dash-accent-soft)" : "var(--dash-card)",
                color: forceStatus === opt.key ? "var(--dash-accent)" : "var(--dash-text-muted)",
                fontSize: 11, fontWeight: 600,
                boxShadow: "var(--dash-shadow)",
              }}>{opt.icon} {opt.label}</button>
            ))}
          </div>

          {/* Grid de dias */}
          {forceStatus === "auto" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {businessHours.map((h, i) => (
                <div key={h.day} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", borderRadius: 10,
                  background: h.enabled ? "var(--dash-card)" : "transparent",
                  opacity: h.enabled ? 1 : 0.4,
                }}>
                  {/* Toggle dia */}
                  <button type="button" onClick={() => {
                    const updated = [...businessHours];
                    updated[i] = { ...updated[i], enabled: !updated[i].enabled };
                    setBusinessHours(updated);
                    const supabase = createClient();
                    supabase.from("units").update({ business_hours: updated }).eq("id", unit.id);
                  }} style={{
                    width: 20, height: 20, borderRadius: 6, border: "none", cursor: "pointer",
                    background: h.enabled ? "var(--dash-accent-soft)" : "var(--dash-card)",
                    color: h.enabled ? "var(--dash-accent)" : "var(--dash-text-muted)",
                    fontSize: 10, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{h.enabled ? "✓" : ""}</button>

                  {/* Nome do dia */}
                  <span style={{
                    width: 32, fontSize: 11, fontWeight: 700,
                    color: h.enabled ? "var(--dash-text)" : "var(--dash-text-muted)",
                    textTransform: "capitalize",
                  }}>{h.day}</span>

                  {/* Horários */}
                  {h.enabled ? (
                    <>
                      <input type="time" value={h.open} onChange={(e) => {
                        const updated = [...businessHours];
                        updated[i] = { ...updated[i], open: e.target.value };
                        setBusinessHours(updated);
                      }} onBlur={() => {
                        const supabase = createClient();
                        supabase.from("units").update({ business_hours: businessHours }).eq("id", unit.id);
                      }}
                        style={{ padding: "4px 6px", borderRadius: 6, background: "var(--dash-card-hover)", border: "none", color: "var(--dash-text)", fontSize: 11, outline: "none" }} />
                      <span style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>até</span>
                      <input type="time" value={h.close} onChange={(e) => {
                        const updated = [...businessHours];
                        updated[i] = { ...updated[i], close: e.target.value };
                        setBusinessHours(updated);
                      }} onBlur={() => {
                        const supabase = createClient();
                        supabase.from("units").update({ business_hours: businessHours }).eq("id", unit.id);
                      }}
                        style={{ padding: "4px 6px", borderRadius: 6, background: "var(--dash-card-hover)", border: "none", color: "var(--dash-text)", fontSize: 11, outline: "none" }} />
                    </>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>Fechado</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Divisor */}
      <div style={{ height: 1, background: "var(--dash-section-border)", marginBottom: 16 }} />

      {/* SEÇÃO 4 — Nova unidade */}
      <div>
        {!showNewUnit ? (
          <button onClick={() => setShowNewUnit(true)} style={{ width: "100%", padding: "13px", borderRadius: 14, border: "1px solid var(--dash-section-border)", background: "transparent", color: "var(--dash-text-muted)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            + Nova Unidade
          </button>
        ) : isPro ? (
          <div style={{ borderRadius: 14, padding: "16px", border: "1px solid var(--dash-border)", background: "var(--dash-card)" }}>
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
                <button type="button" onClick={() => setShowNewUnit(false)} style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: "var(--dash-card-hover)", color: "var(--dash-text-muted)", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: "var(--dash-accent-soft)", color: "var(--dash-accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "var(--dash-shadow)" }}>Criar</button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ borderRadius: 14, padding: "16px", border: "1px solid rgba(250,204,21,0.2)", background: "var(--dash-warning-soft)" }}>
            <div style={{ color: "var(--dash-warning)", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>⭐ Recurso Pro</div>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
              Múltiplas unidades estão disponíveis no Plano Pro. Faça upgrade para adicionar novas unidades.
            </div>
            <button onClick={() => { setShowNewUnit(false); onClose(); onOpenPlans?.(); }} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: "var(--dash-accent-soft)", color: "var(--dash-accent)", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "var(--dash-shadow)" }}>
              Ver Planos →
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
