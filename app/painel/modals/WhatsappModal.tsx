"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const WA_GREEN = "#25D366";
const WA_DARK = "#128C7E";

type WaStatus = "disconnected" | "connecting" | "connected" | "banned";

interface WaInstance {
  id: string;
  status: WaStatus;
  phone_number: string | null;
  auto_notifications: boolean;
  notify_order_received: boolean;
  notify_order_preparing: boolean;
  notify_order_ready: boolean;
  notify_order_delivering: boolean;
  chatbot_enabled: boolean;
  chatbot_read_delay: number;
  chatbot_typing_delay: number;
  chatbot_show_read: boolean;
  chatbot_show_typing: boolean;
}

interface Template {
  id: string;
  name: string;
  category: string;
  body: string;
  variables: string[];
  is_default: boolean;
  is_active: boolean;
}

interface Message {
  id: string;
  phone: string;
  message: string;
  template_name: string | null;
  trigger_type: string;
  status: string;
  created_at: string;
  crm_customers?: { name: string } | null;
}

interface Customer {
  id: string;
  name: string | null;
  phone: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
}

const TABS = ["Configurações", "Templates", "Enviar", "Histórico"] as const;
type TabName = (typeof TABS)[number];

const STATUS_LABEL: Record<WaStatus, string> = {
  disconnected: "Desconectado",
  connecting:   "Conectando...",
  connected:    "Conectado",
  banned:       "Banido",
};

const STATUS_COLOR: Record<WaStatus, string> = {
  disconnected: "#ef4444",
  connecting:   "#f59e0b",
  connected:    WA_GREEN,
  banned:       "#ef4444",
};

const TRIGGER_LABELS: Record<string, string> = {
  manual:                "Manual",
  bulk:                  "Massa",
  auto_order_received:   "Auto · Recebido",
  auto_order_preparing:  "Auto · Preparo",
  auto_order_ready:      "Auto · Pronto",
  auto_order_delivering: "Auto · Saiu",
  auto_order_delivered:  "Auto · Entregue",
  auto_chatbot:          "Chatbot IA",
};

const MSG_STATUS_ICON: Record<string, string> = {
  pending:   "⏳",
  sent:      "✓",
  delivered: "✓✓",
  read:      "✓✓",
  failed:    "✗",
};

function StatusDot({ status }: { status: WaStatus }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: STATUS_COLOR[status],
      animation: status === "connected" ? "pulse 2s infinite" : "none",
      flexShrink: 0,
    }} />
  );
}

// ─── Waiting Screen (no instance yet) ───────────────────────────────────────
function WaitingScreen() {
  return (
    <div style={{ textAlign: "center", padding: "40px 24px" }}>
      <div style={{
        width: 72, height: 72, borderRadius: 22, margin: "0 auto 20px",
        background: "rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg viewBox="0 0 24 24" width="38" height="38" fill="rgba(255,255,255,0.25)">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--dash-text)", marginBottom: 10 }}>
        WhatsApp em breve
      </div>
      <div style={{ fontSize: 13, color: "var(--dash-text-muted)", lineHeight: 1.7, maxWidth: 320, margin: "0 auto 24px" }}>
        O WhatsApp da sua loja será ativado em breve.<br />
        Entre em contato com o suporte se precisar.
      </div>
      <a
        href="https://wa.me/5511999999999"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block", padding: "10px 24px", borderRadius: 12,
          background: "rgba(255,255,255,0.06)", color: "var(--dash-text-muted)",
          fontSize: 13, fontWeight: 600, textDecoration: "none",
          border: "1px solid var(--dash-border)",
        }}
      >
        Falar com suporte
      </a>
    </div>
  );
}

// ─── QR Screen (instance exists but disconnected) ────────────────────────────
function QrScreen({
  unitId,
  onConnected,
}: {
  unitId: string;
  onConnected: (instance: WaInstance) => void;
}) {
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQr = useCallback(async () => {
    setQrError(null);
    const res = await fetch(`/api/whatsapp/qrcode?unit_id=${unitId}`);
    const json = await res.json();
    if (!res.ok) { setQrError(json.error ?? "Erro ao buscar QR Code"); return; }
    setQrcode(json.qrcode ?? null);
  }, [unitId]);

  useEffect(() => {
    fetchQr();

    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/whatsapp/status?unit_id=${unitId}`);
      const json = await res.json();
      if (json.status === "connected") {
        clearInterval(pollRef.current!);
        setConnected(true);
        const supabase = createClient();
        const { data } = await supabase
          .from("whatsapp_instances")
          .select("*")
          .eq("unit_id", unitId)
          .single();
        if (data) onConnected(data as WaInstance);
      }
    }, 5000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [unitId, fetchQr, onConnected]);

  if (connected) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: WA_GREEN }}>Conectado!</div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "32px 24px" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--dash-text)", marginBottom: 6 }}>
        Escaneie o QR Code
      </div>
      <div style={{ fontSize: 12, color: "var(--dash-text-muted)", marginBottom: 20 }}>
        Conecte seu WhatsApp para ativar as notificações
      </div>

      {qrError ? (
        <div style={{ padding: "16px", borderRadius: 12, background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 13, marginBottom: 16 }}>
          {qrError}
          <br />
          <button onClick={fetchQr} style={{
            marginTop: 10, padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 12, fontWeight: 600,
          }}>Tentar novamente</button>
        </div>
      ) : qrcode ? (
        <div style={{
          width: 220, height: 220, margin: "0 auto 20px",
          borderRadius: 16, background: "#fff", padding: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
        }}>
          <img src={`data:image/png;base64,${qrcode}`} alt="QR Code WhatsApp" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      ) : (
        <div style={{ width: 220, height: 220, margin: "0 auto 20px", borderRadius: 16, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 12, color: "var(--dash-text-muted)" }}>Carregando QR...</span>
        </div>
      )}

      <div style={{ fontSize: 12, color: "var(--dash-text-muted)", lineHeight: 1.8, maxWidth: 300, margin: "0 auto 16px" }}>
        1. Abra o WhatsApp no celular<br />
        2. Toque em <strong>Configurações → Aparelhos conectados</strong><br />
        3. Toque em <strong>Conectar aparelho</strong><br />
        4. Aponte a câmera para o QR code
      </div>

      <div style={{ fontSize: 12, color: "var(--dash-text-muted)" }}>
        Aguardando conexão<span style={{ animation: "pulse 1.5s infinite" }}>...</span>
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({
  unitId,
  instance,
  onUpdated,
}: {
  unitId: string;
  instance: WaInstance;
  onUpdated: (partial: Partial<WaInstance>) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState({ ...instance });

  async function save(updates: Partial<WaInstance>) {
    setSaving(true);
    await fetch("/api/whatsapp/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId, ...updates }),
    });
    setSaving(false);
    onUpdated(updates);
  }

  function toggle(key: keyof WaInstance) {
    const newVal = !local[key];
    setLocal((p) => ({ ...p, [key]: newVal }));
    save({ [key]: newVal } as Partial<WaInstance>);
  }

  async function handleDisconnect() {
    setSaving(true);
    await fetch("/api/whatsapp/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId }),
    });
    setSaving(false);
    onUpdated({ status: "disconnected", phone_number: null });
  }

  async function handleReconnect() {
    setSaving(true);
    const qrRes = await fetch(`/api/whatsapp/qrcode?unit_id=${unitId}`);
    setSaving(false);
    if (!qrRes.ok) return;
    onUpdated({ status: "connecting" });
  }

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    width: 36, height: 20, borderRadius: 10,
    background: active ? WA_GREEN : "rgba(255,255,255,0.12)",
    position: "relative", cursor: "pointer", border: "none",
    transition: "background 0.2s", flexShrink: 0,
  });

  const Toggle = ({ field, label }: { field: keyof WaInstance; label: string }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--dash-border)" }}>
      <span style={{ fontSize: 13, color: "var(--dash-text)" }}>{label}</span>
      <button style={toggleStyle(!!local[field])} onClick={() => toggle(field)} disabled={saving}>
        <span style={{
          position: "absolute", top: 2,
          left: local[field] ? "calc(100% - 18px)" : 2,
          width: 16, height: 16, borderRadius: "50%",
          background: "#fff", transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </button>
    </div>
  );

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Status card */}
      <div style={{
        padding: "16px", borderRadius: 14, marginBottom: 20,
        background: local.status === "connected" ? `${WA_GREEN}14` : "rgba(239,68,68,0.08)",
        border: `1px solid ${local.status === "connected" ? `${WA_GREEN}30` : "rgba(239,68,68,0.2)"}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatusDot status={local.status as WaStatus} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLOR[local.status as WaStatus] }}>
              {STATUS_LABEL[local.status as WaStatus]}
            </div>
            {local.phone_number && (
              <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginTop: 2 }}>{local.phone_number}</div>
            )}
          </div>
          {local.status === "connected" ? (
            <button onClick={handleDisconnect} disabled={saving} style={{
              padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 12, fontWeight: 600,
            }}>
              Desconectar
            </button>
          ) : (
            <button onClick={handleReconnect} disabled={saving} style={{
              padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              background: `${WA_GREEN}22`, color: WA_GREEN, fontSize: 12, fontWeight: 600,
            }}>
              Reconectar
            </button>
          )}
        </div>
      </div>

      {/* Notification toggles */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dash-text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
        Notificações automáticas
      </div>
      <Toggle field="auto_notifications" label="Ativar notificações automáticas" />
      <div style={{ opacity: local.auto_notifications ? 1 : 0.4, pointerEvents: local.auto_notifications ? "auto" : "none", transition: "opacity 0.2s" }}>
        <Toggle field="notify_order_received" label="Pedido recebido" />
        <Toggle field="notify_order_preparing" label="Pedido em preparo" />
        <Toggle field="notify_order_ready" label="Pedido pronto" />
        <Toggle field="notify_order_delivering" label="Saiu para entrega" />
      </div>

      {/* Chatbot IA */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dash-text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8, marginTop: 24 }}>
        Chatbot IA
      </div>
      <Toggle field="chatbot_enabled" label="Chatbot IA ativo" />

      <div style={{ opacity: local.chatbot_enabled ? 1 : 0.4, pointerEvents: local.chatbot_enabled ? "auto" : "none", transition: "opacity 0.2s" }}>
        <div style={{ fontSize: 11, color: "var(--dash-text-muted)", lineHeight: 1.6, padding: "8px 0 12px" }}>
          O assistente virtual responde automaticamente perguntas sobre cardápio, preços e horários usando IA.
        </div>

        {/* Behavior section */}
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--dash-text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 12 }}>
          Comportamento do chatbot
        </div>

        {/* Read delay slider */}
        <div style={{ padding: "10px 0", borderBottom: "1px solid var(--dash-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--dash-text)" }}>Tempo para visualizar</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: WA_GREEN }}>{local.chatbot_read_delay}s</span>
          </div>
          <input
            type="range" min={1} max={10} step={1}
            value={local.chatbot_read_delay}
            disabled={saving}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLocal((p) => ({ ...p, chatbot_read_delay: v }));
            }}
            onMouseUp={(e) => save({ chatbot_read_delay: Number((e.target as HTMLInputElement).value) })}
            onTouchEnd={(e) => save({ chatbot_read_delay: Number((e.target as HTMLInputElement).value) })}
            style={{ width: "100%", accentColor: WA_GREEN }}
          />
        </div>

        {/* Typing delay slider */}
        <div style={{ padding: "10px 0", borderBottom: "1px solid var(--dash-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--dash-text)" }}>Tempo para começar a digitar</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: WA_GREEN }}>{local.chatbot_typing_delay}s</span>
          </div>
          <input
            type="range" min={1} max={10} step={1}
            value={local.chatbot_typing_delay}
            disabled={saving}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLocal((p) => ({ ...p, chatbot_typing_delay: v }));
            }}
            onMouseUp={(e) => save({ chatbot_typing_delay: Number((e.target as HTMLInputElement).value) })}
            onTouchEnd={(e) => save({ chatbot_typing_delay: Number((e.target as HTMLInputElement).value) })}
            style={{ width: "100%", accentColor: WA_GREEN }}
          />
        </div>

        <Toggle field="chatbot_show_read"   label='Mostrar "visualizado" antes de responder' />
        <Toggle field="chatbot_show_typing" label='Mostrar "digitando..." antes de responder' />
      </div>
    </div>
  );
}

// ─── Templates Tab ────────────────────────────────────────────────────────────
function TemplatesTab({ unitId }: { unitId: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [newMode, setNewMode] = useState(false);
  const [form, setForm] = useState({ name: "", category: "marketing", body: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/whatsapp/templates?unit_id=${unitId}`);
    const data = await res.json();
    setTemplates(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [unitId]);

  useEffect(() => { load(); }, [load]);

  async function saveNew() {
    if (!form.name || !form.body) return;
    setSaving(true);
    const vars = [...form.body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
    await fetch("/api/whatsapp/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId, ...form, variables: vars }),
    });
    setSaving(false);
    setNewMode(false);
    setForm({ name: "", category: "marketing", body: "" });
    load();
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const vars = [...editing.body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
    await fetch(`/api/whatsapp/templates/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editing.name, category: editing.category, body: editing.body, variables: vars }),
    });
    setSaving(false);
    setEditing(null);
    load();
  }

  async function deactivate(id: string) {
    await fetch(`/api/whatsapp/templates/${id}`, { method: "DELETE" });
    load();
  }

  const CATEGORY_LABELS: Record<string, string> = {
    marketing:    "Marketing",
    order_status: "Status do pedido",
    utility:      "Utilidade",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--dash-border)",
    background: "rgba(255,255,255,0.04)", color: "var(--dash-text)", fontSize: 13, fontFamily: "inherit",
  };

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dash-text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
          Templates ({templates.length})
        </div>
        {!newMode && !editing && (
          <button onClick={() => setNewMode(true)} style={{
            padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
            background: `${WA_GREEN}22`, color: WA_GREEN, fontSize: 12, fontWeight: 700,
          }}>+ Novo</button>
        )}
      </div>

      {(newMode || editing) && (
        <div style={{ padding: 16, borderRadius: 14, border: "1px solid var(--dash-border)", background: "var(--dash-card-subtle)", marginBottom: 16 }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Nome</label>
            <input
              style={inputStyle}
              value={editing ? editing.name : form.name}
              onChange={(e) => editing ? setEditing({ ...editing, name: e.target.value }) : setForm({ ...form, name: e.target.value })}
              placeholder="ex: promoção_semana"
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Categoria</label>
            <select
              style={{ ...inputStyle }}
              value={editing ? editing.category : form.category}
              onChange={(e) => editing ? setEditing({ ...editing, category: e.target.value }) : setForm({ ...form, category: e.target.value })}
            >
              <option value="marketing">Marketing</option>
              <option value="order_status">Status do pedido</option>
              <option value="utility">Utilidade</option>
            </select>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>
              Mensagem — variáveis: {"{{nome}}"} {"{{pedido_id}}"} {"{{total}}"} {"{{restaurante}}"}
            </label>
            <textarea
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
              value={editing ? editing.body : form.body}
              onChange={(e) => editing ? setEditing({ ...editing, body: e.target.value }) : setForm({ ...form, body: e.target.value })}
              placeholder="Olá {{nome}}! Sua promoção..."
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={editing ? saveEdit : saveNew} disabled={saving} style={{
              padding: "8px 20px", borderRadius: 10, border: "none", cursor: "pointer",
              background: WA_GREEN, color: "#fff", fontSize: 13, fontWeight: 700,
            }}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button onClick={() => { setNewMode(false); setEditing(null); }} style={{
              padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.06)", color: "var(--dash-text-muted)", fontSize: 13,
            }}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: "var(--dash-text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>Carregando...</div>
      ) : templates.length === 0 ? (
        <div style={{ color: "var(--dash-text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>Nenhum template</div>
      ) : (
        templates.map((t) => (
          <div key={t.id} style={{
            padding: "14px", borderRadius: 12, border: "1px solid var(--dash-border)",
            background: "var(--dash-card-subtle)", marginBottom: 8,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)" }}>{t.name}</span>
                {t.is_default && (
                  <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: `${WA_GREEN}22`, color: WA_GREEN }}>PADRÃO</span>
                )}
                <span style={{ marginLeft: 6, fontSize: 10, color: "var(--dash-text-muted)" }}>{CATEGORY_LABELS[t.category] ?? t.category}</span>
              </div>
              {!t.is_default && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setEditing(t); setNewMode(false); }} style={{
                    padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                    background: "rgba(255,255,255,0.06)", color: "var(--dash-text-muted)", fontSize: 11,
                  }}>Editar</button>
                  <button onClick={() => deactivate(t.id)} style={{
                    padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                    background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 11,
                  }}>Remover</button>
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--dash-text-muted)", lineHeight: 1.5 }}>{t.body}</div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Send Tab ─────────────────────────────────────────────────────────────────
function SendTab({ unitId }: { unitId: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filter, setFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState<string>("");
  const [freeMessage, setFreeMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ total: number; sent: number; failed: number } | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("crm_customers")
      .select("id, name, phone, total_orders, total_spent, last_order_at")
      .eq("unit_id", unitId)
      .not("phone", "is", null)
      .order("total_orders", { ascending: false })
      .limit(500)
      .then(({ data }) => setCustomers((data ?? []) as Customer[]));

    fetch(`/api/whatsapp/templates?unit_id=${unitId}`)
      .then((r) => r.json())
      .then((d) => setTemplates(Array.isArray(d) ? d : []));
  }, [unitId]);

  const filtered = customers.filter((c) => {
    if (!c.phone) return false;
    if (filter === "all") return true;
    if (filter === "recorrentes") return (c.total_orders ?? 0) >= 3;
    if (filter === "inativos") {
      if (!c.last_order_at) return true;
      return Date.now() - new Date(c.last_order_at).getTime() > 30 * 86400000;
    }
    return true;
  });

  const withPhone = filtered.filter((c) => !!c.phone);

  function toggleAll() {
    if (selectedIds.size === withPhone.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(withPhone.map((c) => c.id)));
  }

  async function handleSend() {
    if (selectedIds.size === 0) return;
    const msg = templateId ? undefined : freeMessage.trim();
    if (!templateId && !msg) return;

    setSending(true);
    setProgress(0);
    setResult(null);

    const ids = [...selectedIds];
    // Streaming progress via polling
    const totalIds = ids.length;
    let done = 0;

    // We fire the bulk request and poll progress via increments
    const interval = setInterval(() => {
      done = Math.min(done + 1, totalIds);
      setProgress(Math.round((done / totalIds) * 100));
    }, 3100);

    const res = await fetch("/api/whatsapp/send-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId, customerIds: ids, message: msg, templateId: templateId || undefined }),
    });
    clearInterval(interval);
    setProgress(100);
    const json = await res.json();
    setResult(json);
    setSending(false);
  }

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const previewMsg = selectedTemplate
    ? selectedTemplate.body.replace(/\{\{nome\}\}/g, "João").replace(/\{\{pedido_id\}\}/g, "ABC123").replace(/\{\{restaurante\}\}/g, "Seu Restaurante")
    : freeMessage;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--dash-border)",
    background: "rgba(255,255,255,0.04)", color: "var(--dash-text)", fontSize: 13, fontFamily: "inherit",
  };

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Filter */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dash-text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
          Público alvo
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { key: "all", label: "Todos" },
            { key: "recorrentes", label: "Recorrentes (3+)" },
            { key: "inativos", label: "Inativos (30d+)" },
          ].map((g) => (
            <button key={g.key} onClick={() => { setFilter(g.key); setSelectedIds(new Set()); }} style={{
              padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              background: filter === g.key ? `${WA_GREEN}22` : "rgba(255,255,255,0.06)",
              color: filter === g.key ? WA_GREEN : "var(--dash-text-muted)",
              fontSize: 12, fontWeight: 600,
            }}>{g.label}</button>
          ))}
        </div>
      </div>

      {/* Customer list */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: "var(--dash-text-muted)" }}>
            {selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""} de {withPhone.length} com telefone
          </div>
          <button onClick={toggleAll} style={{
            padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
            background: "rgba(255,255,255,0.06)", color: "var(--dash-text-muted)", fontSize: 11,
          }}>{selectedIds.size === withPhone.length ? "Desmarcar todos" : "Selecionar todos"}</button>
        </div>
        <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {withPhone.slice(0, 50).map((c) => (
            <label key={c.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
              borderRadius: 8, cursor: "pointer",
              background: selectedIds.has(c.id) ? `${WA_GREEN}14` : "rgba(255,255,255,0.02)",
              border: `1px solid ${selectedIds.has(c.id) ? `${WA_GREEN}30` : "transparent"}`,
            }}>
              <input type="checkbox" checked={selectedIds.has(c.id)}
                onChange={() => {
                  const next = new Set(selectedIds);
                  if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                  setSelectedIds(next);
                }}
                style={{ accentColor: WA_GREEN, width: 14, height: 14 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dash-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name ?? "—"}</div>
                <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>{c.phone} · {c.total_orders ?? 0} pedido{c.total_orders !== 1 ? "s" : ""}</div>
              </div>
            </label>
          ))}
          {withPhone.length > 50 && (
            <div style={{ fontSize: 11, color: "var(--dash-text-muted)", textAlign: "center", padding: 6 }}>
              + {withPhone.length - 50} clientes (use "Selecionar todos")
            </div>
          )}
        </div>
      </div>

      {/* Message */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dash-text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Mensagem</div>
        <select style={{ ...inputStyle, marginBottom: 8 }} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          <option value="">Mensagem livre</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {!templateId && (
          <textarea rows={3} style={{ ...inputStyle, resize: "vertical" }}
            value={freeMessage} onChange={(e) => setFreeMessage(e.target.value)}
            placeholder="Olá! Temos uma promoção especial..."
          />
        )}
        {previewMsg && (
          <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 10, background: `${WA_GREEN}14`, border: `1px solid ${WA_GREEN}30` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: WA_GREEN, marginBottom: 4 }}>PREVIEW</div>
            <div style={{ fontSize: 12, color: "var(--dash-text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{previewMsg}</div>
          </div>
        )}
      </div>

      {/* Progress */}
      {sending && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--dash-text-muted)" }}>Enviando...</span>
            <span style={{ fontSize: 12, color: WA_GREEN }}>{progress}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)" }}>
            <div style={{ height: "100%", borderRadius: 3, background: WA_GREEN, width: `${progress}%`, transition: "width 0.5s ease" }} />
          </div>
        </div>
      )}

      {result && !sending && (
        <div style={{ marginBottom: 14, padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid var(--dash-border)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 6 }}>Resultado</div>
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ fontSize: 12, color: WA_GREEN }}>✓ Enviadas: {result.sent}</span>
            {result.failed > 0 && <span style={{ fontSize: 12, color: "#ef4444" }}>✗ Falhas: {result.failed}</span>}
          </div>
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={sending || selectedIds.size === 0 || (!templateId && !freeMessage.trim())}
        style={{
          width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: "pointer",
          background: sending || selectedIds.size === 0 ? "rgba(255,255,255,0.06)" : WA_GREEN,
          color: sending || selectedIds.size === 0 ? "var(--dash-text-muted)" : "#fff",
          fontSize: 14, fontWeight: 700, transition: "all 0.2s",
        }}
      >
        {sending ? "Enviando..." : `Enviar para ${selectedIds.size} cliente${selectedIds.size !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ unitId }: { unitId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("30");

  const load = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams({ unit_id: unitId, page: String(page), period });
    if (status) sp.set("status", status);
    const res = await fetch(`/api/whatsapp/messages?${sp}`);
    const data = await res.json();
    setMessages(data.messages ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [unitId, page, status, period]);

  useEffect(() => { load(); }, [load]);

  const PAGE_SIZE = 30;

  const msgStatusColor: Record<string, string> = {
    pending:   "var(--dash-text-muted)",
    sent:      "var(--dash-text-muted)",
    delivered: "var(--dash-text-muted)",
    read:      "#3b82f6",
    failed:    "#ef4444",
  };

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <select value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1); }} style={{
          padding: "7px 10px", borderRadius: 8, border: "1px solid var(--dash-border)",
          background: "rgba(255,255,255,0.04)", color: "var(--dash-text)", fontSize: 12,
        }}>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{
          padding: "7px 10px", borderRadius: 8, border: "1px solid var(--dash-border)",
          background: "rgba(255,255,255,0.04)", color: "var(--dash-text)", fontSize: 12,
        }}>
          <option value="">Todos status</option>
          <option value="sent">Enviada</option>
          <option value="delivered">Entregue</option>
          <option value="read">Lida</option>
          <option value="failed">Falhou</option>
        </select>
      </div>

      {loading ? (
        <div style={{ color: "var(--dash-text-muted)", fontSize: 13, textAlign: "center", padding: 30 }}>Carregando...</div>
      ) : messages.length === 0 ? (
        <div style={{ color: "var(--dash-text-muted)", fontSize: 13, textAlign: "center", padding: 30 }}>Nenhuma mensagem</div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {messages.map((m) => (
              <div key={m.id} style={{
                padding: "10px 12px", borderRadius: 10,
                background: "var(--dash-card-subtle)", border: "1px solid var(--dash-border)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dash-text)" }}>
                      {m.crm_customers?.name ?? m.phone}
                    </span>
                    <span style={{ marginLeft: 6, fontSize: 10, color: "var(--dash-text-muted)" }}>{m.phone}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>
                      {TRIGGER_LABELS[m.trigger_type] ?? m.trigger_type}
                    </span>
                    <span style={{ fontSize: 12, color: msgStatusColor[m.status] ?? "var(--dash-text-muted)" }}
                      title={m.status}>
                      {MSG_STATUS_ICON[m.status] ?? "?"}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--dash-text-muted)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.message}
                </div>
                <div style={{ fontSize: 9, color: "var(--dash-text-muted)", marginTop: 4 }}>
                  {new Date(m.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "rgba(255,255,255,0.06)", color: "var(--dash-text-muted)", fontSize: 12,
              }}>← Anterior</button>
              <span style={{ padding: "6px 14px", fontSize: 12, color: "var(--dash-text-muted)" }}>
                {page} / {Math.ceil(total / PAGE_SIZE)}
              </span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / PAGE_SIZE)} style={{
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "rgba(255,255,255,0.06)", color: "var(--dash-text-muted)", fontSize: 12,
              }}>Próxima →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function WhatsappModal({ unit }: { unit: { id: string; name: string } }) {
  const [instance, setInstance] = useState<WaInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabName>("Configurações");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("unit_id", unit.id)
      .single()
      .then(({ data }) => {
        setInstance(data as WaInstance | null);
        setLoading(false);
      });
  }, [unit.id]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--dash-text-muted)" }}>Carregando...</div>;
  }

  if (!instance) {
    return <WaitingScreen />;
  }

  if (instance.status !== "connected") {
    return (
      <QrScreen
        unitId={unit.id}
        onConnected={(inst) => setInstance(inst)}
      />
    );
  }

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: `${WA_GREEN}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill={WA_GREEN}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>WhatsApp</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <StatusDot status={instance.status} />
            <span style={{ fontSize: 12, color: STATUS_COLOR[instance.status] }}>
              {STATUS_LABEL[instance.status]}
              {instance.phone_number ? ` · ${instance.phone_number}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: "3px", background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 9, border: "none", cursor: "pointer",
            background: activeTab === tab ? "rgba(255,255,255,0.08)" : "transparent",
            color: activeTab === tab ? "var(--dash-text)" : "var(--dash-text-muted)",
            fontSize: 11, fontWeight: activeTab === tab ? 700 : 500,
            transition: "all 0.15s",
          }}>{tab}</button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "Configurações" && (
        <SettingsTab unitId={unit.id} instance={instance} onUpdated={(p) => setInstance((i) => i ? { ...i, ...p } : i)} />
      )}
      {activeTab === "Templates" && <TemplatesTab unitId={unit.id} />}
      {activeTab === "Enviar" && <SendTab unitId={unit.id} />}
      {activeTab === "Histórico" && <HistoryTab unitId={unit.id} />}
    </div>
  );
}
