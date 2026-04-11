"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface TVMedia {
  id: string;
  title: string;
  video_path: string;
  thumb_path: string | null;
  orientation: "vertical" | "horizontal";
  order_index: number;
  is_active: boolean;
}

type Props = {
  unitId: string;
  unitName: string;
  slug: string;
  initialMedia: TVMedia[];
};

const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff", fontSize: 14, boxSizing: "border-box",
  outline: "none", fontFamily: "inherit",
};

export default function TVClient({ unitId, unitName, slug, initialMedia }: Props) {
  const supabase = createClient();
  const [media, setMedia] = useState<TVMedia[]>(initialMedia);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("horizontal");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file || !title.trim()) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${unitId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("tv").upload(path, file);
      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from("tv_media")
        .insert({ unit_id: unitId, title: title.trim(), video_path: path, orientation, order_index: media.length, is_active: true })
        .select()
        .single();
      if (insertError) throw insertError;

      setMedia((prev) => [...prev, data as TVMedia]);
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao enviar vídeo");
    } finally {
      setUploading(false);
    }
  }

  async function toggleActive(item: TVMedia) {
    const { error: err } = await supabase.from("tv_media").update({ is_active: !item.is_active }).eq("id", item.id);
    if (!err) setMedia((prev) => prev.map((m) => (m.id === item.id ? { ...m, is_active: !m.is_active } : m)));
  }

  async function deleteItem(item: TVMedia) {
    if (!confirm(`Excluir "${item.title}"?`)) return;
    await supabase.storage.from("tv").remove([item.video_path]);
    if (item.thumb_path) await supabase.storage.from("tv").remove([item.thumb_path]);
    const { error: err } = await supabase.from("tv_media").delete().eq("id", item.id);
    if (!err) setMedia((prev) => prev.filter((m) => m.id !== item.id));
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,255,174,0.07) 0%, transparent 60%), #0a0a0a",
      fontFamily: "-apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif",
      color: "#fff",
    }}>
      <style>{`* { box-sizing: border-box; } input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25); }`}</style>

      {/* Header */}
      <div style={{ padding: "56px 24px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <a href="/painel" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 18 }}>←</a>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px" }}>Modo TV</div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{unitName}</div>
        </div>
        <a href={`/tv/${slug}`} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 14px", borderRadius: 12, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          Abrir display ↗
        </a>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 80px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Upload form */}
        <form onSubmit={handleUpload} style={{ borderRadius: 20, padding: "20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>Adicionar vídeo</div>
          <div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Título</div>
            <input type="text" placeholder="Ex: Promoção do dia" value={title} onChange={(e) => setTitle(e.target.value)} style={inp} required />
          </div>
          <div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Orientação</div>
            <select value={orientation} onChange={(e) => setOrientation(e.target.value as "vertical" | "horizontal")} style={{ ...inp, background: undefined as any, backgroundColor: "rgba(255,255,255,0.05)", cursor: "pointer" }}>
              <option value="horizontal">Horizontal (paisagem)</option>
              <option value="vertical">Vertical (retrato)</option>
            </select>
          </div>
          <div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Arquivo de vídeo</div>
            <div style={{ borderRadius: 12, border: "1px dashed rgba(255,255,255,0.15)", padding: "16px", textAlign: "center", cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>🎬 Clique para selecionar · MP4, MOV, WebM</div>
              <input type="file" accept="video/*" ref={fileRef} required style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { const el = e.target.parentElement?.querySelector("div") as HTMLElement; if (el) el.textContent = `📹 ${f.name}`; } }} />
            </div>
          </div>
          {error && <div style={{ borderRadius: 12, padding: "12px 14px", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", color: "#f87171", fontSize: 13 }}>{error}</div>}
          <button type="submit" disabled={uploading} style={{ padding: "14px", borderRadius: 14, border: "none", background: uploading ? "rgba(0,255,174,0.08)" : "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 15, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.7 : 1 }}>
            {uploading ? "Enviando..." : "Enviar vídeo"}
          </button>
        </form>

        {/* Media list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: 800, padding: "4px 0" }}>Vídeos cadastrados ({media.length})</div>
          {media.length === 0 && (
            <div style={{ borderRadius: 16, padding: "32px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)", fontSize: 14 }}>
              Nenhum vídeo cadastrado.
            </div>
          )}
          {media.map((item) => (
            <div key={item.id} style={{ borderRadius: 16, padding: "14px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 2, textTransform: "capitalize" }}>{item.orientation === "horizontal" ? "Horizontal" : "Vertical"}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <button onClick={() => toggleActive(item)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: item.is_active ? "rgba(0,255,174,0.12)" : "rgba(255,255,255,0.06)", color: item.is_active ? "#00ffae" : "rgba(255,255,255,0.35)" }}>
                  {item.is_active ? "Ativo" : "Inativo"}
                </button>
                <button onClick={() => deleteItem(item)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: "rgba(255,80,80,0.10)", color: "#f87171" }}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderRadius: 14, padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>🎬 Vídeos até 15 segundos · Sem som · Autoplay · Vertical ou horizontal</div>
        </div>
      </div>
    </div>
  );
}
