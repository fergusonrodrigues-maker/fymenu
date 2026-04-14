"use client";

import { useState, useEffect, useCallback } from "react";

const GN = "#22c55e";  // green accent

interface Zone {
  id?: string;
  min_km: string;
  max_km: string;
  fee: string; // display as reais (R$ 0,00)
  is_active?: boolean;
  _dirty?: boolean;
  _new?: boolean;
}

interface Settings {
  delivery_enabled: boolean;
  delivery_latitude: string;
  delivery_longitude: string;
  delivery_max_km: string;
  delivery_min_order: string;
}

function fmtFee(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
function parseFee(str: string): number {
  return Math.round(parseFloat(str.replace(",", ".")) * 100) || 0;
}

const inp: React.CSSProperties = {
  background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)",
  borderRadius: 8, color: "var(--dash-text)", fontSize: 13, padding: "8px 10px",
  outline: "none", width: "100%", boxSizing: "border-box",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, color: "var(--dash-text-muted)",
  textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, marginTop: 20,
};

export default function DeliveryModal({
  unitId,
  suporteToken,
}: {
  unitId: string;
  suporteToken?: string;
}) {
  const TABS = ["Configurações", "Faixas de preço", "Testar"] as const;
  type Tab = (typeof TABS)[number];
  const [tab, setTab] = useState<Tab>("Configurações");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // ── Settings ────────────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<Settings>({
    delivery_enabled: false,
    delivery_latitude: "",
    delivery_longitude: "",
    delivery_max_km: "10",
    delivery_min_order: "0",
  });

  // ── Zones ───────────────────────────────────────────────────────────────────
  const [zones, setZones] = useState<Zone[]>([]);

  // ── Test ────────────────────────────────────────────────────────────────────
  const [testLat, setTestLat] = useState("");
  const [testLon, setTestLon] = useState("");
  const [testResult, setTestResult] = useState<{ available: boolean; distanceKm: number | null; fee: number; message: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const authHeader = useCallback(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (suporteToken) h["x-suporte-token"] = suporteToken;
    return h;
  }, [suporteToken]);

  // Load settings + zones
  useEffect(() => {
    async function load() {
      const [sRes, zRes] = await Promise.all([
        fetch(`/api/delivery/settings?unit_id=${unitId}`),
        fetch(`/api/delivery/zones?unit_id=${unitId}`),
      ]);
      if (sRes.ok) {
        const s = await sRes.json();
        setSettings({
          delivery_enabled:  s.delivery_enabled ?? false,
          delivery_latitude: s.delivery_latitude != null ? String(s.delivery_latitude) : "",
          delivery_longitude: s.delivery_longitude != null ? String(s.delivery_longitude) : "",
          delivery_max_km:   s.delivery_max_km != null ? String(s.delivery_max_km) : "10",
          delivery_min_order: s.delivery_min_order != null ? fmtFee(s.delivery_min_order) : "0,00",
        });
      }
      if (zRes.ok) {
        const z = await zRes.json();
        setZones(
          (z as any[]).map((row) => ({
            id: row.id,
            min_km: String(row.min_km),
            max_km: String(row.max_km),
            fee: fmtFee(row.fee),
            is_active: row.is_active,
          }))
        );
      }
    }
    load();
  }, [unitId]);

  function flash(text: string, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  }

  // ── Save settings ────────────────────────────────────────────────────────────
  async function saveSettings() {
    setSaving(true);
    const res = await fetch("/api/delivery/settings", {
      method: "PATCH",
      headers: authHeader(),
      body: JSON.stringify({
        unit_id: unitId,
        delivery_enabled:   settings.delivery_enabled,
        delivery_latitude:  settings.delivery_latitude !== "" ? Number(settings.delivery_latitude) : null,
        delivery_longitude: settings.delivery_longitude !== "" ? Number(settings.delivery_longitude) : null,
        delivery_max_km:    Number(settings.delivery_max_km) || 10,
        delivery_min_order: parseFee(settings.delivery_min_order),
      }),
    });
    setSaving(false);
    flash(res.ok ? "Configurações salvas!" : "Erro ao salvar", res.ok);
  }

  // ── Geolocation ──────────────────────────────────────────────────────────────
  function getMyLocation(setter?: (lat: string, lon: string) => void) {
    if (!navigator.geolocation) { flash("Geolocalização não suportada", false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(7);
        const lon = pos.coords.longitude.toFixed(7);
        if (setter) {
          setter(lat, lon);
        } else {
          setSettings((p) => ({ ...p, delivery_latitude: lat, delivery_longitude: lon }));
          flash("Localização obtida!");
        }
      },
      () => flash("Não foi possível obter a localização", false)
    );
  }

  // ── Zones CRUD ───────────────────────────────────────────────────────────────
  function addZone() {
    const last = zones[zones.length - 1];
    const nextMin = last ? last.max_km : "0";
    setZones((p) => [
      ...p,
      { min_km: nextMin, max_km: "", fee: "0,00", is_active: true, _new: true, _dirty: true },
    ]);
  }

  function updateZone(idx: number, field: keyof Zone, value: string) {
    setZones((p) => p.map((z, i) => i === idx ? { ...z, [field]: value, _dirty: true } : z));
  }

  async function saveZone(idx: number) {
    const z = zones[idx];
    if (!z._dirty) return;
    setSaving(true);
    const body = {
      unit_id: unitId,
      min_km: Number(z.min_km),
      max_km: Number(z.max_km),
      fee: parseFee(z.fee),
    };
    let res: Response;
    if (z._new || !z.id) {
      res = await fetch("/api/delivery/zones", {
        method: "POST", headers: authHeader(), body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setZones((p) => p.map((item, i) => i === idx ? { ...item, id: data.id, _new: false, _dirty: false } : item));
      }
    } else {
      res = await fetch(`/api/delivery/zones/${z.id}`, {
        method: "PATCH", headers: authHeader(),
        body: JSON.stringify({ min_km: body.min_km, max_km: body.max_km, fee: body.fee }),
      });
      if (res.ok) setZones((p) => p.map((item, i) => i === idx ? { ...item, _dirty: false } : item));
    }
    setSaving(false);
    flash(res.ok ? "Faixa salva!" : "Erro ao salvar faixa", res.ok);
  }

  async function deleteZone(idx: number) {
    const z = zones[idx];
    if (z._new || !z.id) {
      setZones((p) => p.filter((_, i) => i !== idx));
      return;
    }
    setSaving(true);
    await fetch(`/api/delivery/zones/${z.id}`, { method: "DELETE", headers: authHeader() });
    setSaving(false);
    setZones((p) => p.filter((_, i) => i !== idx));
    flash("Faixa removida");
  }

  // ── Validate zones for gaps/overlaps ─────────────────────────────────────────
  function zonesValid(): { ok: boolean; msg: string } {
    if (zones.length === 0) return { ok: true, msg: "" };
    const sorted = [...zones].sort((a, b) => Number(a.min_km) - Number(b.min_km));
    for (let i = 0; i < sorted.length; i++) {
      const min = Number(sorted[i].min_km);
      const max = Number(sorted[i].max_km);
      if (isNaN(min) || isNaN(max) || min >= max) return { ok: false, msg: `Faixa ${i + 1}: min deve ser menor que max` };
      if (i > 0) {
        const prevMax = Number(sorted[i - 1].max_km);
        if (min > prevMax) return { ok: false, msg: `Gap entre faixas ${i} e ${i + 1}` };
        if (min < prevMax) return { ok: false, msg: `Sobreposição entre faixas ${i} e ${i + 1}` };
      }
    }
    return { ok: true, msg: "" };
  }

  // ── Test ─────────────────────────────────────────────────────────────────────
  async function runTest() {
    setTestLoading(true);
    setTestResult(null);
    const res = await fetch("/api/delivery/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unit_id: unitId, latitude: Number(testLat), longitude: Number(testLon) }),
    });
    if (res.ok) setTestResult(await res.json());
    setTestLoading(false);
  }

  const zoneStatus = zonesValid();

  // ── Render ───────────────────────────────────────────────────────────────────
  const toggleStyle = (active: boolean): React.CSSProperties => ({
    width: 36, height: 20, borderRadius: 10,
    background: active ? GN : "rgba(255,255,255,0.12)",
    position: "relative", cursor: "pointer", border: "none",
    transition: "background 0.2s", flexShrink: 0,
  });

  function Toggle({ active, onChange }: { active: boolean; onChange: () => void }) {
    return (
      <button style={toggleStyle(active)} onClick={onChange} disabled={saving}>
        <span style={{
          position: "absolute", top: 2, width: 16, height: 16, borderRadius: "50%",
          background: "#fff", transition: "left 0.2s",
          left: active ? "calc(100% - 18px)" : 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </button>
    );
  }

  return (
    <div style={{ paddingTop: 4 }}>
      {/* Flash message */}
      {msg && (
        <div style={{
          padding: "8px 14px", borderRadius: 8, marginBottom: 12, fontSize: 12, fontWeight: 600,
          background: msg.ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          color: msg.ok ? GN : "#f87171",
          border: `1px solid ${msg.ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
        }}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--dash-border)", paddingBottom: 0 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 14px", border: "none", borderRadius: "8px 8px 0 0", cursor: "pointer",
            fontSize: 12, fontWeight: tab === t ? 700 : 500,
            background: tab === t ? "var(--dash-card)" : "transparent",
            color: tab === t ? GN : "var(--dash-text-muted)",
            borderBottom: tab === t ? `2px solid ${GN}` : "2px solid transparent",
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab: Configurações ─────────────────────────────────────────────── */}
      {tab === "Configurações" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Toggle ativo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--dash-border)" }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--dash-text)", fontWeight: 600 }}>Delivery ativo</div>
              <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginTop: 2 }}>Habilitar entrega nesta unidade</div>
            </div>
            <Toggle
              active={settings.delivery_enabled}
              onChange={() => setSettings((p) => ({ ...p, delivery_enabled: !p.delivery_enabled }))}
            />
          </div>

          <div style={{ opacity: settings.delivery_enabled ? 1 : 0.45, pointerEvents: settings.delivery_enabled ? "auto" : "none", transition: "opacity 0.2s" }}>
            <div style={sectionLabel}>Localização do restaurante</div>

            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 4 }}>Latitude</div>
                <input
                  style={inp} placeholder="-15.7800" value={settings.delivery_latitude}
                  onChange={(e) => setSettings((p) => ({ ...p, delivery_latitude: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 4 }}>Longitude</div>
                <input
                  style={inp} placeholder="-47.9300" value={settings.delivery_longitude}
                  onChange={(e) => setSettings((p) => ({ ...p, delivery_longitude: e.target.value }))}
                />
              </div>
            </div>

            <button
              onClick={() => getMyLocation()}
              style={{
                padding: "8px 14px", borderRadius: 8, border: `1px solid ${GN}22`,
                background: `${GN}12`, color: GN, fontSize: 12, fontWeight: 600,
                cursor: "pointer", marginBottom: 16,
              }}
            >
              📍 Usar minha localização
            </button>

            {settings.delivery_latitude && settings.delivery_longitude && (
              <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginTop: -12, marginBottom: 12 }}>
                Coordenadas: {Number(settings.delivery_latitude).toFixed(5)}, {Number(settings.delivery_longitude).toFixed(5)}
              </div>
            )}

            <div style={sectionLabel}>Limites de entrega</div>

            {/* Raio máximo slider */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "var(--dash-text)" }}>Raio máximo de entrega</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: GN }}>{settings.delivery_max_km} km</span>
              </div>
              <input
                type="range" min={1} max={30} step={0.5}
                value={Number(settings.delivery_max_km) || 10}
                onChange={(e) => setSettings((p) => ({ ...p, delivery_max_km: e.target.value }))}
                style={{ width: "100%", accentColor: GN }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--dash-text-muted)" }}>
                <span>1 km</span><span>30 km</span>
              </div>
            </div>

            {/* Pedido mínimo */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "var(--dash-text)", marginBottom: 6 }}>Pedido mínimo</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--dash-text-muted)" }}>R$</span>
                <input
                  style={{ ...inp, width: 120 }} placeholder="0,00"
                  value={settings.delivery_min_order}
                  onChange={(e) => setSettings((p) => ({ ...p, delivery_min_order: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            style={{
              padding: "10px 20px", borderRadius: 10, border: "none", cursor: saving ? "not-allowed" : "pointer",
              background: GN, color: "#000", fontSize: 13, fontWeight: 700,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Salvando..." : "Salvar configurações"}
          </button>
        </div>
      )}

      {/* ── Tab: Faixas de preço ─────────────────────────────────────────────── */}
      {tab === "Faixas de preço" && (
        <div>
          {!zoneStatus.ok && (
            <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 11, fontWeight: 600, background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
              ⚠️ {zoneStatus.msg}
            </div>
          )}

          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 32px", gap: 8, marginBottom: 8, padding: "0 4px" }}>
            {["De (km)", "Até (km)", "Taxa (R$)", ""].map((h) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--dash-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</div>
            ))}
          </div>

          {zones.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--dash-text-muted)", fontSize: 13 }}>
              Nenhuma faixa configurada. Adicione pelo menos uma faixa para ativar o delivery.
            </div>
          )}

          {zones.map((z, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 32px", gap: 8, marginBottom: 6, alignItems: "center" }}>
              <input
                style={{ ...inp, borderColor: z._dirty ? `${GN}66` : undefined }}
                type="number" step="0.1" min="0" placeholder="0"
                value={z.min_km}
                onChange={(e) => updateZone(idx, "min_km", e.target.value)}
                onBlur={() => saveZone(idx)}
              />
              <input
                style={{ ...inp, borderColor: z._dirty ? `${GN}66` : undefined }}
                type="number" step="0.1" min="0" placeholder="5"
                value={z.max_km}
                onChange={(e) => updateZone(idx, "max_km", e.target.value)}
                onBlur={() => saveZone(idx)}
              />
              <input
                style={{ ...inp, borderColor: z._dirty ? `${GN}66` : undefined }}
                placeholder="0,00"
                value={z.fee}
                onChange={(e) => updateZone(idx, "fee", e.target.value)}
                onBlur={() => saveZone(idx)}
              />
              <button
                onClick={() => deleteZone(idx)}
                disabled={saving}
                style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.08)", color: "#f87171", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                🗑
              </button>
            </div>
          ))}

          <button
            onClick={addZone}
            style={{
              marginTop: 12, padding: "8px 16px", borderRadius: 8,
              border: `1px solid ${GN}44`, background: `${GN}0e`,
              color: GN, fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            + Adicionar faixa
          </button>

          <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: 8, background: "var(--dash-card)", border: "1px solid var(--dash-border)", fontSize: 11, color: "var(--dash-text-muted)", lineHeight: 1.6 }}>
            As faixas são salvas automaticamente ao sair de cada campo. Exemplo: 0–3 km = R$ 5,00 / 3–6 km = R$ 10,00.
          </div>
        </div>
      )}

      {/* ── Tab: Testar ──────────────────────────────────────────────────────── */}
      {tab === "Testar" && (
        <div>
          <div style={sectionLabel}>Simular cálculo de taxa</div>

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 4 }}>Latitude do cliente</div>
              <input style={inp} placeholder="-15.7800" value={testLat} onChange={(e) => setTestLat(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 4 }}>Longitude do cliente</div>
              <input style={inp} placeholder="-47.9300" value={testLon} onChange={(e) => setTestLon(e.target.value)} />
            </div>
          </div>

          <button
            onClick={() => getMyLocation((lat, lon) => { setTestLat(lat); setTestLon(lon); })}
            style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${GN}22`, background: `${GN}12`, color: GN, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}
          >
            📍 Usar minha localização
          </button>

          <button
            onClick={runTest}
            disabled={testLoading || !testLat || !testLon}
            style={{
              display: "block", width: "100%", padding: "10px", borderRadius: 10, border: "none",
              background: GN, color: "#000", fontSize: 13, fontWeight: 700,
              cursor: testLoading || !testLat || !testLon ? "not-allowed" : "pointer",
              opacity: !testLat || !testLon ? 0.5 : 1, marginBottom: 16,
            }}
          >
            {testLoading ? "Calculando..." : "Calcular taxa"}
          </button>

          {testResult && (
            <div style={{
              padding: "14px 16px", borderRadius: 12,
              background: testResult.available ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${testResult.available ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: testResult.available ? GN : "#f87171", marginBottom: 8 }}>
                {testResult.available ? "✅ Entrega disponível" : "❌ Entrega indisponível"}
              </div>
              {testResult.distanceKm != null && (
                <div style={{ fontSize: 13, color: "var(--dash-text)", marginBottom: 4 }}>
                  📏 Distância: <strong>{testResult.distanceKm.toFixed(2)} km</strong>
                </div>
              )}
              {testResult.available && (
                <div style={{ fontSize: 13, color: "var(--dash-text)", marginBottom: 4 }}>
                  💰 Taxa: <strong>R$ {fmtFee(testResult.fee)}</strong>
                </div>
              )}
              <div style={{ fontSize: 12, color: "var(--dash-text-muted)", marginTop: 4 }}>{testResult.message}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
