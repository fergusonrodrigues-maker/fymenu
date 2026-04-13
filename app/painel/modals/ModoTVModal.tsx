"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function ModoTVModal({ unit, onClose }: { unit: any; onClose: () => void }) {
  const [config, setConfig] = useState({
    orientation: "horizontal" as "horizontal" | "vertical",
    rotation: 0,
    autoplay: true,
    interval: 8,
    showPrices: true,
    showDescriptions: false,
    showLogo: true,
    categories: [] as string[],
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("units")
      .select("tv_config")
      .eq("id", unit.id)
      .single()
      .then(({ data }) => {
        if (data?.tv_config) setConfig(prev => ({ ...prev, ...data.tv_config }));
      });

    supabase
      .from("categories")
      .select("id, name")
      .eq("unit_id", unit.id)
      .eq("is_active", true)
      .order("order_index")
      .then(({ data }) => { if (data) setCategories(data); });
  }, [unit.id]);

  async function saveConfig(newConfig: typeof config) {
    setConfig(newConfig);
    setSaving(true);
    await supabase.from("units").update({ tv_config: newConfig }).eq("id", unit.id);
    setSaving(false);
  }

  function openTV() {
    const params = new URLSearchParams();
    if (config.orientation === "vertical") params.set("orientation", "vertical");
    if (config.rotation !== 0) params.set("rotation", String(config.rotation));
    if (config.interval !== 8) params.set("interval", String(config.interval));
    if (!config.showPrices) params.set("prices", "0");
    if (config.showDescriptions) params.set("desc", "1");
    if (config.categories.length > 0) params.set("cats", config.categories.join(","));
    const url = `/delivery/${unit.slug}/tv${params.toString() ? "?" + params.toString() : ""}`;
    window.open(url, "_blank");
  }

  return (
    <div style={{ paddingTop: 8 }}>

      {/* Preview visual da orientação */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <div style={{
          width: config.orientation === "horizontal" ? 160 : 90,
          height: config.orientation === "horizontal" ? 90 : 160,
          borderRadius: 8, border: "2px solid var(--dash-border)",
          background: "var(--dash-card)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.3s ease",
          transform: `rotate(${config.rotation}deg)`,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ fontSize: 28 }}>📺</div>
          <div style={{
            position: "absolute", bottom: 4, left: 0, right: 0,
            textAlign: "center", fontSize: 8, color: "var(--dash-text-muted)",
          }}>
            {config.orientation === "horizontal" ? "16:9" : "9:16"}
          </div>
        </div>
      </div>

      {/* Orientação */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--dash-text-muted)", marginBottom: 8 }}>Orientação da tela</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { key: "horizontal", label: "Horizontal (16:9)", icon: "🖥️" },
            { key: "vertical", label: "Vertical (9:16)", icon: "📱" },
          ].map(opt => (
            <button key={opt.key} onClick={() => saveConfig({ ...config, orientation: opt.key as "horizontal" | "vertical", rotation: 0 })} style={{
              flex: 1, padding: "12px 10px", borderRadius: 12, border: "none", cursor: "pointer",
              background: config.orientation === opt.key ? "var(--dash-accent-soft)" : "var(--dash-card)",
              color: config.orientation === opt.key ? "var(--dash-accent)" : "var(--dash-text-muted)",
              fontSize: 12, fontWeight: 600, boxShadow: "var(--dash-shadow)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>{opt.icon} {opt.label}</button>
          ))}
        </div>
      </div>

      {/* Rotação */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--dash-text-muted)", marginBottom: 8 }}>Rotação (se a TV estiver montada girada)</div>
        <div style={{ display: "flex", gap: 4 }}>
          {[0, 90, 180, 270].map(deg => (
            <button key={deg} onClick={() => saveConfig({ ...config, rotation: deg })} style={{
              flex: 1, padding: "8px 6px", borderRadius: 10, border: "none", cursor: "pointer",
              background: config.rotation === deg ? "var(--dash-accent-soft)" : "var(--dash-card)",
              color: config.rotation === deg ? "var(--dash-accent)" : "var(--dash-text-muted)",
              fontSize: 11, fontWeight: 600, boxShadow: "var(--dash-shadow)",
            }}>{deg}°</button>
          ))}
        </div>
      </div>

      {/* Intervalo */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--dash-text-muted)", marginBottom: 8 }}>
          Tempo por produto: {config.interval}s
        </div>
        <input
          type="range" min={3} max={20} value={config.interval}
          onChange={(e) => setConfig(prev => ({ ...prev, interval: Number(e.target.value) }))}
          onMouseUp={() => saveConfig(config)}
          onTouchEnd={() => saveConfig(config)}
          style={{ width: "100%", accentColor: "var(--dash-accent)" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--dash-text-muted)" }}>
          <span>3s</span><span>20s</span>
        </div>
      </div>

      {/* Opções de exibição */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--dash-text-muted)", marginBottom: 8 }}>Exibição</div>
        {[
          { key: "showPrices", label: "Mostrar preços" },
          { key: "showDescriptions", label: "Mostrar descrições" },
          { key: "showLogo", label: "Mostrar logo" },
          { key: "autoplay", label: "Autoplay de vídeos" },
        ].map(opt => (
          <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer" }}>
            <button onClick={() => {
              const updated = { ...config, [opt.key]: !(config as any)[opt.key] };
              saveConfig(updated as typeof config);
            }} style={{
              width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer",
              background: (config as any)[opt.key] ? "rgba(0,200,120,0.15)" : "rgba(128,128,128,0.15)",
              color: (config as any)[opt.key] ? "#00c878" : "rgba(128,128,128,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700,
            }}>{(config as any)[opt.key] ? "✓" : ""}</button>
            <span style={{ fontSize: 12, color: "var(--dash-text-secondary)" }}>{opt.label}</span>
          </label>
        ))}
      </div>

      {/* Categorias */}
      {categories.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--dash-text-muted)", marginBottom: 8 }}>
            Categorias no TV {config.categories.length === 0 ? "(todas)" : `(${config.categories.length} selecionadas)`}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button onClick={() => saveConfig({ ...config, categories: [] })} style={{
              padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer",
              background: config.categories.length === 0 ? "var(--dash-accent-soft)" : "var(--dash-card)",
              color: config.categories.length === 0 ? "var(--dash-accent)" : "var(--dash-text-muted)",
              fontSize: 10, fontWeight: 600,
            }}>Todas</button>
            {categories.map(cat => {
              const isSelected = config.categories.includes(cat.id);
              return (
                <button key={cat.id} onClick={() => {
                  const updated = isSelected
                    ? config.categories.filter(id => id !== cat.id)
                    : [...config.categories, cat.id];
                  saveConfig({ ...config, categories: updated });
                }} style={{
                  padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: isSelected ? "var(--dash-accent-soft)" : "var(--dash-card)",
                  color: isSelected ? "var(--dash-accent)" : "var(--dash-text-muted)",
                  fontSize: 10, fontWeight: 600,
                }}>{cat.name}</button>
              );
            })}
          </div>
        </div>
      )}

      {/* Botão abrir TV */}
      <button onClick={openTV} style={{
        width: "100%", padding: 16, borderRadius: 14, border: "none", cursor: "pointer",
        background: "var(--dash-accent-soft)", color: "var(--dash-accent)",
        fontSize: 15, fontWeight: 800,
        boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
        marginBottom: 8,
      }}>
        📺 Abrir Modo TV
      </button>

      <div style={{ textAlign: "center", fontSize: 10, color: "var(--dash-text-muted)" }}>
        fymenu.com/delivery/{unit.slug}/tv
      </div>

      {saving && (
        <div style={{ textAlign: "center", fontSize: 10, color: "var(--dash-accent)", marginTop: 4 }}>
          Salvando...
        </div>
      )}
    </div>
  );
}
