"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner, { ContentEnter } from "@/components/LoadingSpinner";

const supabase = createClient();
const WA_GREEN = "#25D366";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CrmCustomer {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  tags: string[] | null;
  notes: string | null;
  source: string;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  created_at: string;
  is_active: boolean;
}

interface CustomerFormData {
  name: string;
  phone: string;
  address: string;
  neighborhood: string;
  city: string;
  tags: string;
  notes: string;
}

const EMPTY_FORM: CustomerFormData = { name: "", phone: "", address: "", neighborhood: "", city: "", tags: "", notes: "" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function fmtPhone(phone: string | null): string {
  if (!phone) return "";
  return maskPhone(phone);
}

function cleanPhone(s: string): string {
  return s.replace(/\D/g, "");
}

function fmtCurrency(v: number, isCentavos: boolean): string {
  const val = isCentavos ? v / 100 : v;
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

function daysSince(iso: string | null): number {
  if (!iso) return 9999;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// ─── Input styles ─────────────────────────────────────────────────────────────
const INPUT: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 10,
  background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)",
  color: "var(--dash-text)", fontSize: 13, fontFamily: "inherit", outline: "none",
  boxSizing: "border-box",
};

const LABEL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "var(--dash-text-muted)",
  textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: 5,
};

// ─── Modal overlay wrapper ────────────────────────────────────────────────────
// Uses createPortal so position:fixed escapes the parent modal's backdropFilter stacking context
function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10100,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
        borderRadius: 20, background: "var(--dash-card)",
        border: "1px solid var(--dash-border)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.5)", padding: 24,
      }}>
        {children}
      </div>
    </div>,
    document.body
  );
}

// ─── Quick WhatsApp Send Modal ────────────────────────────────────────────────
function QuickSendModal({
  customer, unitId, onClose,
}: {
  customer: CrmCustomer; unitId: string; onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<"ok" | "err" | null>(null);
  const [errMsg, setErrMsg] = useState("");

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    setResult(null);
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId, phone: customer.phone, customerId: customer.id, message: message.trim() }),
    });
    const json = await res.json();
    setSending(false);
    if (res.ok) { setResult("ok"); setMessage(""); }
    else { setResult("err"); setErrMsg(json.error ?? "Erro ao enviar"); }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${WA_GREEN}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <WaIcon size={20} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--dash-text)" }}>Enviar WhatsApp</div>
          <div style={{ fontSize: 12, color: "var(--dash-text-muted)" }}>{customer.name} · {fmtPhone(customer.phone)}</div>
        </div>
        <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--dash-text-muted)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>

      <textarea
        rows={4}
        placeholder="Digite a mensagem..."
        value={message}
        onChange={e => setMessage(e.target.value)}
        style={{ ...INPUT, resize: "vertical", marginBottom: 12 }}
        autoFocus
      />

      {result === "ok" && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: `${WA_GREEN}18`, color: WA_GREEN, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
          ✓ Mensagem enviada com sucesso!
        </div>
      )}
      {result === "err" && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.12)", color: "#ef4444", fontSize: 12, marginBottom: 12 }}>
          {errMsg}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          style={{
            flex: 1, padding: "11px", borderRadius: 12, border: "none", cursor: "pointer",
            background: sending || !message.trim() ? "var(--dash-card-hover)" : WA_GREEN,
            color: sending || !message.trim() ? "var(--dash-text-muted)" : "#fff",
            fontSize: 13, fontWeight: 700,
          }}
        >
          {sending ? "Enviando..." : "Enviar"}
        </button>
        <button onClick={onClose} style={{
          padding: "11px 18px", borderRadius: 12, border: "none", cursor: "pointer",
          background: "var(--dash-card-hover)", color: "var(--dash-text-muted)", fontSize: 13,
        }}>Fechar</button>
      </div>
    </ModalOverlay>
  );
}

// ─── Customer Form Modal (Add + Edit) ─────────────────────────────────────────
function CustomerFormModal({
  unitId, customer, onSaved, onDelete, onClose,
}: {
  unitId: string;
  customer: CrmCustomer | null;
  onSaved: (c: CrmCustomer) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const isEdit = !!customer;
  const [form, setForm] = useState<CustomerFormData>(() =>
    customer
      ? {
          name: customer.name ?? "",
          phone: fmtPhone(customer.phone),
          address: customer.address ?? "",
          neighborhood: customer.neighborhood ?? "",
          city: customer.city ?? "",
          tags: Array.isArray(customer.tags) ? customer.tags.join(", ") : "",
          notes: customer.notes ?? "",
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateCustomer, setDuplicateCustomer] = useState<{ id: string; name: string } | null>(null);

  function set(k: keyof CustomerFormData, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    setError(null);
    setDuplicateCustomer(null);
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Nome e telefone são obrigatórios");
      return;
    }
    const phoneClean = cleanPhone(form.phone);
    if (phoneClean.length < 10 || phoneClean.length > 11) {
      setError("Telefone inválido. Use (XX) XXXXX-XXXX");
      return;
    }
    setSaving(true);

    const tags = form.tags.trim()
      ? form.tags.split(",").map(t => t.trim()).filter(Boolean)
      : [];

    const payload = {
      name: form.name.trim(),
      phone: phoneClean,
      address: form.address.trim() || null,
      neighborhood: form.neighborhood.trim() || null,
      city: form.city.trim() || null,
      tags: tags.length ? tags : null,
      notes: form.notes.trim() || null,
    };

    const url = isEdit ? `/api/crm/customers/${customer!.id}` : "/api/crm/customers";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit ? payload : { unitId, ...payload }),
    });
    const json = await res.json();
    setSaving(false);

    if (res.status === 409) {
      setDuplicateCustomer(json.customer);
      return;
    }
    if (!res.ok) { setError(json.error ?? "Erro ao salvar"); return; }
    onSaved(json as CrmCustomer);
  }

  async function handleUpdateDuplicate() {
    if (!duplicateCustomer) return;
    setSaving(true);
    const tags = form.tags.trim()
      ? form.tags.split(",").map(t => t.trim()).filter(Boolean)
      : [];
    const res = await fetch(`/api/crm/customers/${duplicateCustomer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        address: form.address.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        city: form.city.trim() || null,
        tags: tags.length ? tags : null,
        notes: form.notes.trim() || null,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error ?? "Erro ao atualizar"); return; }
    onSaved(json as CrmCustomer);
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>
          {isEdit ? "Editar cliente" : "Adicionar cliente"}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--dash-text-muted)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>

      {/* Read-only stats when editing */}
      {isEdit && customer && (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20,
          padding: 12, borderRadius: 12, background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--dash-accent)" }}>{customer.total_orders}</div>
            <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Pedidos</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--dash-text)" }}>
              {fmtCurrency(customer.total_spent, customer.total_spent > 10000)}
            </div>
            <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Total gasto</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text-muted)" }}>
              {customer.last_order_at ? `${daysSince(customer.last_order_at)}d atrás` : "—"}
            </div>
            <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Último pedido</div>
          </div>
          <div style={{ textAlign: "center", gridColumn: "1 / -1", marginTop: 4, borderTop: "1px solid var(--dash-border)", paddingTop: 8 }}>
            <span style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>
              Fonte: <strong>{customer.source}</strong> · Cadastrado em {new Date(customer.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={LABEL}>Nome *</label>
          <input style={INPUT} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nome do cliente" autoFocus={!isEdit} />
        </div>
        <div>
          <label style={LABEL}>Telefone * (WhatsApp)</label>
          <input
            style={INPUT}
            value={form.phone}
            onChange={e => set("phone", maskPhone(e.target.value))}
            placeholder="(11) 99999-9999"
            inputMode="tel"
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={LABEL}>Endereço</label>
            <input style={INPUT} value={form.address} onChange={e => set("address", e.target.value)} placeholder="Rua, número" />
          </div>
          <div>
            <label style={LABEL}>Bairro</label>
            <input style={INPUT} value={form.neighborhood} onChange={e => set("neighborhood", e.target.value)} placeholder="Bairro" />
          </div>
        </div>
        <div>
          <label style={LABEL}>Cidade</label>
          <input style={INPUT} value={form.city} onChange={e => set("city", e.target.value)} placeholder="Cidade" />
        </div>
        <div>
          <label style={LABEL}>Tags (separadas por vírgula)</label>
          <input style={INPUT} value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="vip, frequente, aniversário..." />
        </div>
        <div>
          <label style={LABEL}>Notas</label>
          <textarea
            rows={3}
            style={{ ...INPUT, resize: "vertical" }}
            value={form.notes}
            onChange={e => set("notes", e.target.value)}
            placeholder="Observações sobre o cliente..."
          />
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.12)", color: "#ef4444", fontSize: 12 }}>
          {error}
        </div>
      )}

      {duplicateCustomer && (
        <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 6 }}>
            Cliente com esse telefone já cadastrado: <strong>{duplicateCustomer.name}</strong>
          </div>
          <button
            onClick={handleUpdateDuplicate}
            disabled={saving}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              background: "rgba(251,191,36,0.2)", color: "#f59e0b", fontSize: 12, fontWeight: 700,
            }}
          >
            Atualizar dados deste cliente
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1, padding: "12px", borderRadius: 12, border: "none", cursor: "pointer",
            background: "var(--dash-accent)", color: "#fff", fontSize: 13, fontWeight: 700,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Salvar cliente"}
        </button>
        <button onClick={onClose} style={{
          padding: "12px 18px", borderRadius: 12, border: "none", cursor: "pointer",
          background: "var(--dash-card-hover)", color: "var(--dash-text-muted)", fontSize: 13,
        }}>Cancelar</button>
      </div>

      {isEdit && onDelete && (
        <button
          onClick={onDelete}
          style={{
            width: "100%", marginTop: 10, padding: "10px", borderRadius: 12, border: "none", cursor: "pointer",
            background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 12, fontWeight: 600,
          }}
        >
          Excluir cliente
        </button>
      )}
    </ModalOverlay>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────
function DeleteConfirmModal({
  customer, onConfirm, onClose,
}: {
  customer: CrmCustomer; onConfirm: () => void; onClose: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/crm/customers/${customer.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) onConfirm();
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--dash-text)", marginBottom: 8 }}>Excluir cliente?</div>
        <div style={{ fontSize: 13, color: "var(--dash-text-muted)", marginBottom: 24 }}>
          <strong>{customer.name}</strong> será removido do CRM.<br />Esta ação pode ser revertida pelo suporte.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              flex: 1, padding: "11px", borderRadius: 12, border: "none", cursor: "pointer",
              background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 13, fontWeight: 700,
            }}
          >
            {deleting ? "Excluindo..." : "Excluir"}
          </button>
          <button onClick={onClose} style={{
            flex: 1, padding: "11px", borderRadius: 12, border: "none", cursor: "pointer",
            background: "var(--dash-card-hover)", color: "var(--dash-text-muted)", fontSize: 13,
          }}>Cancelar</button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────
interface ImportRow { name: string; phone: string; address?: string; neighborhood?: string; city?: string; }
type ColMap = { name: string; phone: string; address: string; neighborhood: string; city: string };

function ImportModal({ unitId, onImported, onClose }: { unitId: string; onImported: () => void; onClose: () => void }) {
  const [step, setStep] = useState<"upload" | "map" | "preview" | "importing" | "done">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [colMap, setColMap] = useState<ColMap>({ name: "", phone: "", address: "", neighborhood: "", city: "" });
  const [onDuplicate, setOnDuplicate] = useState<"skip" | "update">("skip");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; duplicates: number; errors: number } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFileError(null);
    try {
      const XLSX = (await import("xlsx")).default;
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
      if (data.length < 2) { setFileError("Arquivo vazio ou sem dados"); return; }
      const [hdrs, ...dataRows] = data;
      setHeaders(hdrs.map(String));
      setRows(dataRows.map(r => hdrs.map((_, i) => String(r[i] ?? ""))));
      // Auto-detect columns
      const autoMap: ColMap = { name: "", phone: "", address: "", neighborhood: "", city: "" };
      for (const h of hdrs) {
        const hl = h.toLowerCase().trim();
        if (!autoMap.name && (hl.includes("nome") || hl === "name")) autoMap.name = h;
        else if (!autoMap.phone && (hl.includes("tel") || hl.includes("phone") || hl.includes("fone") || hl.includes("celular") || hl.includes("whatsapp"))) autoMap.phone = h;
        else if (!autoMap.address && (hl.includes("endere") || hl === "address" || hl.includes("rua"))) autoMap.address = h;
        else if (!autoMap.neighborhood && (hl.includes("bairro") || hl.includes("neighborhood"))) autoMap.neighborhood = h;
        else if (!autoMap.city && (hl.includes("cidade") || hl === "city")) autoMap.city = h;
      }
      setColMap(autoMap);
      setStep("map");
    } catch {
      setFileError("Erro ao ler arquivo. Verifique se é CSV ou XLSX válido.");
    }
  }

  function buildImportRows(): ImportRow[] {
    const nameIdx = headers.indexOf(colMap.name);
    const phoneIdx = headers.indexOf(colMap.phone);
    if (nameIdx === -1 || phoneIdx === -1) return [];
    return rows
      .map(r => ({
        name: r[nameIdx] ?? "",
        phone: r[phoneIdx] ?? "",
        address: colMap.address ? (r[headers.indexOf(colMap.address)] ?? "") : undefined,
        neighborhood: colMap.neighborhood ? (r[headers.indexOf(colMap.neighborhood)] ?? "") : undefined,
        city: colMap.city ? (r[headers.indexOf(colMap.city)] ?? "") : undefined,
      }))
      .filter(r => r.name.trim() && r.phone.trim());
  }

  async function handleImport() {
    const importRows = buildImportRows();
    if (!importRows.length) return;
    setStep("importing");
    setProgress(0);

    // Simulate progress while waiting
    const interval = setInterval(() => setProgress(p => Math.min(p + 5, 90)), 400);

    const res = await fetch("/api/crm/customers/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId, customers: importRows, onDuplicate }),
    });
    clearInterval(interval);
    setProgress(100);
    const json = await res.json();
    setResult(json);
    setStep("done");
    onImported();
  }

  const previewRows = buildImportRows().slice(0, 5);

  const selectStyle: React.CSSProperties = {
    padding: "7px 10px", borderRadius: 8, border: "1px solid var(--dash-border)",
    background: "var(--dash-card-hover)", color: "var(--dash-text)", fontSize: 12,
    flex: 1,
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>Importar clientes</div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--dash-text-muted)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>

      {/* Step: upload */}
      {step === "upload" && (
        <div>
          <div style={{
            padding: "28px 20px", borderRadius: 14, border: "2px dashed var(--dash-border)",
            textAlign: "center", cursor: "pointer",
            background: "var(--dash-card)",
          }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 4 }}>Clique ou arraste o arquivo</div>
            <div style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>CSV ou XLSX</div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
          <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10, background: "var(--dash-card-hover)", fontSize: 11, color: "var(--dash-text-muted)", lineHeight: 1.8 }}>
            <strong style={{ color: "var(--dash-text)" }}>Colunas obrigatórias:</strong> nome, telefone<br />
            <strong style={{ color: "var(--dash-text)" }}>Colunas opcionais:</strong> endereco, bairro, cidade
          </div>
          {fileError && (
            <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.12)", color: "#ef4444", fontSize: 12 }}>{fileError}</div>
          )}
        </div>
      )}

      {/* Step: map columns */}
      {step === "map" && (
        <div>
          <div style={{ fontSize: 12, color: "var(--dash-text-muted)", marginBottom: 16 }}>
            {rows.length} linha{rows.length !== 1 ? "s" : ""} encontrada{rows.length !== 1 ? "s" : ""}. Confirme o mapeamento:
          </div>
          {(["name", "phone", "address", "neighborhood", "city"] as const).map(field => {
            const labels: Record<string, string> = { name: "Nome *", phone: "Telefone *", address: "Endereço", neighborhood: "Bairro", city: "Cidade" };
            return (
              <div key={field} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 90, fontSize: 11, color: "var(--dash-text-muted)", flexShrink: 0 }}>{labels[field]}</div>
                <select style={selectStyle} value={colMap[field]} onChange={e => setColMap(m => ({ ...m, [field]: e.target.value }))}>
                  <option value="">— não importar —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            );
          })}

          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>Se telefone já existe:</span>
            <select style={{ ...selectStyle, flex: "none" }} value={onDuplicate} onChange={e => setOnDuplicate(e.target.value as any)}>
              <option value="skip">Pular</option>
              <option value="update">Atualizar dados</option>
            </select>
          </div>

          <button
            onClick={() => { if (colMap.name && colMap.phone) setStep("preview"); }}
            disabled={!colMap.name || !colMap.phone}
            style={{
              width: "100%", marginTop: 16, padding: "11px", borderRadius: 12, border: "none", cursor: "pointer",
              background: colMap.name && colMap.phone ? "var(--dash-accent)" : "var(--dash-card-hover)",
              color: colMap.name && colMap.phone ? "#fff" : "var(--dash-text-muted)",
              fontSize: 13, fontWeight: 700,
            }}
          >
            Ver preview →
          </button>
        </div>
      )}

      {/* Step: preview */}
      {step === "preview" && (
        <div>
          <div style={{ fontSize: 12, color: "var(--dash-text-muted)", marginBottom: 10 }}>
            Preview das primeiras {previewRows.length} linhas ({buildImportRows().length} no total):
          </div>
          <div style={{ overflowX: "auto", marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  {["Nome", "Telefone", "Bairro", "Cidade"].map(h => (
                    <th key={h} style={{ padding: "6px 8px", textAlign: "left", color: "var(--dash-text-muted)", borderBottom: "1px solid var(--dash-border)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--dash-border)" }}>
                    <td style={{ padding: "6px 8px", color: "var(--dash-text)" }}>{r.name || "—"}</td>
                    <td style={{ padding: "6px 8px", color: "var(--dash-text-muted)" }}>{fmtPhone(r.phone) || r.phone}</td>
                    <td style={{ padding: "6px 8px", color: "var(--dash-text-muted)" }}>{r.neighborhood || "—"}</td>
                    <td style={{ padding: "6px 8px", color: "var(--dash-text-muted)" }}>{r.city || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleImport} style={{
              flex: 1, padding: "11px", borderRadius: 12, border: "none", cursor: "pointer",
              background: "var(--dash-accent)", color: "#fff", fontSize: 13, fontWeight: 700,
            }}>
              Importar {buildImportRows().length} clientes
            </button>
            <button onClick={() => setStep("map")} style={{
              padding: "11px 16px", borderRadius: 12, border: "none", cursor: "pointer",
              background: "var(--dash-card-hover)", color: "var(--dash-text-muted)", fontSize: 13,
            }}>← Voltar</button>
          </div>
        </div>
      )}

      {/* Step: importing */}
      {step === "importing" && (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ fontSize: 13, color: "var(--dash-text-muted)", marginBottom: 16 }}>Importando clientes...</div>
          <div style={{ height: 8, borderRadius: 4, background: "var(--dash-card-hover)", marginBottom: 8 }}>
            <div style={{ height: "100%", borderRadius: 4, background: "var(--dash-accent)", width: `${progress}%`, transition: "width 0.4s ease" }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>{progress}%</div>
        </div>
      )}

      {/* Step: done */}
      {step === "done" && result && (
        <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--dash-text)", marginBottom: 16 }}>Importação concluída</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
            <div style={{ padding: 12, borderRadius: 12, background: `${WA_GREEN}14`, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: WA_GREEN }}>{result.imported}</div>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Importados</div>
            </div>
            <div style={{ padding: 12, borderRadius: 12, background: "rgba(251,191,36,0.1)", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>{result.duplicates}</div>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Duplicados</div>
            </div>
            <div style={{ padding: 12, borderRadius: 12, background: "rgba(239,68,68,0.08)", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#ef4444" }}>{result.errors}</div>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Erros</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            padding: "11px 28px", borderRadius: 12, border: "none", cursor: "pointer",
            background: "var(--dash-accent)", color: "#fff", fontSize: 13, fontWeight: 700,
          }}>Fechar</button>
        </div>
      )}
    </ModalOverlay>
  );
}

// ─── WhatsApp icon ────────────────────────────────────────────────────────────
function WaIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={WA_GREEN}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

// ─── Main CRM Modal ───────────────────────────────────────────────────────────
export default function CrmModal({ unit, restaurant, onOpenImport }: { unit: any; restaurant: any; onOpenImport?: (type: string) => void }) {
  const [tab, setTab] = useState<"clientes" | "frequencia" | "delivery">("clientes");
  // CRM customers (from crm_customers table)
  const [crmCustomers, setCrmCustomers] = useState<CrmCustomer[]>([]);
  // Order-derived data for Frequência/Delivery tabs
  const [orders, setOrders] = useState<any[]>([]);
  const [derivedClients, setDerivedClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"total" | "orders" | "recent">("total");

  // Modal state
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CrmCustomer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<CrmCustomer | null>(null);
  const [waSendCustomer, setWaSendCustomer] = useState<CrmCustomer | null>(null);

  const isCentavos = crmCustomers.some(c => c.total_spent > 10000);

  function fmt(v: number) {
    return fmtCurrency(v, isCentavos);
  }

  const loadCrmCustomers = useCallback(async () => {
    const { data } = await supabase
      .from("crm_customers")
      .select("id, name, phone, address, neighborhood, city, tags, notes, source, total_orders, total_spent, last_order_at, created_at, is_active")
      .eq("unit_id", unit.id)
      .neq("is_active", false)
      .order("total_spent", { ascending: false });
    setCrmCustomers((data ?? []) as CrmCustomer[]);
  }, [unit.id]);

  const loadOrderData = useCallback(async () => {
    const [{ data: ord }] = await Promise.all([
      supabase
        .from("order_intents")
        .select("customer_name, customer_phone, total, items, source, delivery_neighborhood, created_at")
        .eq("unit_id", unit.id)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    if (ord) setOrders(ord);

    const map = new Map<string, any>();
    for (const o of ord || []) {
      const key = o.customer_phone || o.customer_name || "anon-" + o.created_at;
      const existing = map.get(key);
      const val = parseFloat(o.total || "0");
      const items = Array.isArray(o.items) ? o.items : [];

      if (existing) {
        existing.orders++;
        existing.total += val;
        existing.items.push(...items);
        if (o.created_at > existing.lastOrder) existing.lastOrder = o.created_at;
        if (o.delivery_neighborhood) existing.neighborhoods.add(o.delivery_neighborhood);
      } else {
        map.set(key, {
          name: o.customer_name || "Cliente anônimo",
          phone: o.customer_phone || "",
          orders: 1,
          total: val,
          items: [...items],
          lastOrder: o.created_at,
          firstOrder: o.created_at,
          neighborhoods: new Set(o.delivery_neighborhood ? [o.delivery_neighborhood] : []),
        });
      }
    }

    const clientList = Array.from(map.values()).map(c => {
      const d = Math.floor((Date.now() - new Date(c.lastOrder).getTime()) / 86400000);
      const itemCounts: Record<string, number> = {};
      for (const item of c.items) {
        const name = item.name || "?";
        itemCounts[name] = (itemCounts[name] || 0) + (item.qty || 1);
      }
      const topItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, qty]) => ({ name, qty }));
      return { ...c, neighborhoods: Array.from(c.neighborhoods), daysSinceLastOrder: d, topItems };
    });
    setDerivedClients(clientList);
  }, [unit.id]);

  useEffect(() => {
    Promise.all([loadCrmCustomers(), loadOrderData()]).finally(() => setLoading(false));
  }, [loadCrmCustomers, loadOrderData]);

  // ── Stats from crm_customers ──────────────────────────────────────────────
  const totalRevenue = crmCustomers.reduce((s, c) => s + (c.total_spent ?? 0), 0);
  const totalOrdersCount = crmCustomers.reduce((s, c) => s + (c.total_orders ?? 0), 0);
  const avgTicket = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
  const returningClients = crmCustomers.filter(c => c.total_orders > 1).length;
  const returnRate = crmCustomers.length > 0 ? ((returningClients / crmCustomers.length) * 100).toFixed(1) : "0";
  const inactiveCount = crmCustomers.filter(c => daysSince(c.last_order_at) > 30).length;

  // ── Neighborhood + items (from order_intents) ─────────────────────────────
  const neighborhoodCounts: Record<string, { count: number; revenue: number }> = {};
  for (const c of derivedClients) {
    for (const n of c.neighborhoods) {
      if (!neighborhoodCounts[n]) neighborhoodCounts[n] = { count: 0, revenue: 0 };
      neighborhoodCounts[n].count += c.orders;
      neighborhoodCounts[n].revenue += c.total;
    }
  }
  const topNeighborhoods = Object.entries(neighborhoodCounts).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10);

  const globalItemCounts: Record<string, number> = {};
  for (const o of orders) {
    for (const item of Array.isArray(o.items) ? o.items : []) {
      const name = item.name || "?";
      globalItemCounts[name] = (globalItemCounts[name] || 0) + (item.qty || 1);
    }
  }
  const topGlobalItems = Object.entries(globalItemCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // ── Filtered + sorted crm customers ──────────────────────────────────────
  const filtered = crmCustomers
    .filter(c => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (c.name ?? "").toLowerCase().includes(q) || (c.phone ?? "").includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "total") return (b.total_spent ?? 0) - (a.total_spent ?? 0);
      if (sortBy === "orders") return (b.total_orders ?? 0) - (a.total_orders ?? 0);
      return (b.last_order_at ?? "").localeCompare(a.last_order_at ?? "");
    });

  const TABS = [
    { key: "clientes", label: "Clientes" },
    { key: "frequencia", label: "Frequência" },
    { key: "delivery", label: "Delivery" },
  ];

  const cardStyle: React.CSSProperties = {
    padding: 12, borderRadius: 14, background: "var(--dash-card)", textAlign: "center",
    boxShadow: "var(--dash-shadow)",
  };

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--dash-accent)" }}>{crmCustomers.length}</div>
          <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Clientes</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>{fmt(avgTicket)}</div>
          <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Ticket médio</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--dash-accent)" }}>{returnRate}%</div>
          <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Recorrência</div>
        </div>
        <div style={{ ...cardStyle, background: inactiveCount > 0 ? "var(--dash-danger-soft)" : "var(--dash-card)" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: inactiveCount > 0 ? "var(--dash-danger)" : "var(--dash-text)" }}>{inactiveCount}</div>
          <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Inativos (30d+)</div>
        </div>
      </div>

      {/* Importar clientes históricos */}
      {onOpenImport && restaurant?.plan === "business" && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <button
            onClick={() => onOpenImport("crm_customers")}
            style={{ padding: "7px 14px", borderRadius: 10, border: "1px solid var(--dash-border)", background: "transparent", color: "var(--dash-text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            📥 Importar clientes históricos
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-scroll" style={{ display: "flex", gap: 2, padding: 3, background: "var(--dash-card)", borderRadius: 12, marginBottom: 16, overflowX: "auto", scrollbarWidth: "none" as any }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
            background: tab === t.key ? "var(--dash-accent-soft)" : "transparent",
            color: tab === t.key ? "var(--dash-accent)" : "var(--dash-text-muted)",
            fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><LoadingSpinner size="sm" /></div>
      ) : (
        <ContentEnter><>
          {/* === TAB CLIENTES === */}
          {tab === "clientes" && (
            <div>
              {/* Toolbar */}
              <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                <input
                  placeholder="Buscar cliente..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1, minWidth: 120, padding: "8px 12px", borderRadius: 10,
                    background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)",
                    color: "var(--dash-text)", fontSize: 12, outline: "none",
                  }}
                />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  style={{
                    padding: "8px 10px", borderRadius: 10,
                    backgroundColor: "var(--dash-card-hover)", border: "none",
                    color: "var(--dash-text)", fontSize: 11, outline: "none",
                  }}
                >
                  <option value="total">Maior gasto</option>
                  <option value="orders">Mais pedidos</option>
                  <option value="recent">Mais recente</option>
                </select>
                <button
                  onClick={() => setImportOpen(true)}
                  style={{
                    padding: "8px 12px", borderRadius: 10, border: "1px solid var(--dash-border)",
                    background: "transparent", color: "var(--dash-text-muted)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  <span style={{ fontSize: 13 }}>↑</span> Importar
                </button>
                <button
                  onClick={() => setAddOpen(true)}
                  style={{
                    padding: "8px 14px", borderRadius: 10, border: "none",
                    background: "var(--dash-accent)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Adicionar
                </button>
              </div>

              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: "var(--dash-text-muted)", fontSize: 12 }}>
                  {crmCustomers.length === 0 ? "Nenhum cliente ainda. Adicione manualmente ou importe." : "Nenhum cliente encontrado."}
                </div>
              ) : (
                filtered.slice(0, 50).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setEditCustomer(c)}
                    style={{
                      padding: "12px 14px", borderRadius: 14, background: "var(--dash-card)", marginBottom: 6,
                      boxShadow: "var(--dash-shadow)", cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--dash-card-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "var(--dash-card)")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 700 }}>{c.name ?? "—"}</span>
                          {c.source === "manual" && (
                            <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 8, background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>manual</span>
                          )}
                          {c.source === "import" && (
                            <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 8, background: "var(--dash-card-hover)", color: "var(--dash-text-muted)" }}>import</span>
                          )}
                          {Array.isArray(c.tags) && c.tags.slice(0, 2).map(tag => (
                            <span key={tag} style={{ padding: "1px 6px", borderRadius: 4, fontSize: 8, background: "var(--dash-accent-soft)", color: "var(--dash-accent)" }}>{tag}</span>
                          ))}
                        </div>
                        <div style={{ color: "var(--dash-text-muted)", fontSize: 10, marginTop: 3 }}>
                          {fmtPhone(c.phone) || "Sem telefone"} · {c.total_orders} pedido{c.total_orders !== 1 ? "s" : ""} · {c.last_order_at ? `último há ${daysSince(c.last_order_at)}d` : "sem pedidos"}
                        </div>
                        {c.neighborhood && (
                          <div style={{ fontSize: 9, color: "var(--dash-text-muted)", marginTop: 1 }}>{c.neighborhood}{c.city ? ` · ${c.city}` : ""}</div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: "var(--dash-accent)", fontSize: 14, fontWeight: 800 }}>{fmt(c.total_spent)}</div>
                          <div style={{ color: "var(--dash-text-muted)", fontSize: 10 }}>
                            TM: {c.total_orders > 0 ? fmt(c.total_spent / c.total_orders) : "—"}
                          </div>
                        </div>
                        {c.phone && (
                          <button
                            title="Enviar WhatsApp"
                            onClick={e => { e.stopPropagation(); setWaSendCustomer(c); }}
                            style={{
                              width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer",
                              background: `${WA_GREEN}18`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "background 0.15s",
                              flexShrink: 0,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = `${WA_GREEN}30`)}
                            onMouseLeave={e => (e.currentTarget.style.background = `${WA_GREEN}18`)}
                          >
                            <WaIcon size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {filtered.length > 50 && (
                <div style={{ textAlign: "center", padding: 12, fontSize: 11, color: "var(--dash-text-muted)" }}>
                  Mostrando 50 de {filtered.length} clientes. Use a busca para filtrar.
                </div>
              )}
            </div>
          )}

          {/* === TAB FREQUÊNCIA === */}
          {tab === "frequencia" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Segmentação por frequência</div>
              {[
                { label: "Fiéis (5+ pedidos)", filter: (c: CrmCustomer) => c.total_orders >= 5, color: "var(--dash-accent)", icon: "💎" },
                { label: "Recorrentes (2-4 pedidos)", filter: (c: CrmCustomer) => c.total_orders >= 2 && c.total_orders < 5, color: "var(--dash-info)", icon: "🔄" },
                { label: "Novos (1 pedido)", filter: (c: CrmCustomer) => c.total_orders === 1, color: "var(--dash-warning)", icon: "🆕" },
                { label: "Sem pedidos (manual/import)", filter: (c: CrmCustomer) => c.total_orders === 0, color: "var(--dash-text-muted)", icon: "📋" },
                { label: "Inativos (30d+ sem pedir)", filter: (c: CrmCustomer) => c.total_orders > 0 && daysSince(c.last_order_at) > 30, color: "var(--dash-danger)", icon: "💤" },
                { label: "Perdidos (90d+ sem pedir)", filter: (c: CrmCustomer) => c.total_orders > 0 && daysSince(c.last_order_at) > 90, color: "var(--dash-text-muted)", icon: "👋" },
              ].map(segment => {
                const segClients = crmCustomers.filter(segment.filter);
                const segRevenue = segClients.reduce((s, c) => s + (c.total_spent ?? 0), 0);
                return (
                  <div key={segment.label} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                    borderRadius: 14, background: "var(--dash-card)", marginBottom: 6, boxShadow: "var(--dash-shadow)",
                  }}>
                    <span style={{ fontSize: 20 }}>{segment.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 600 }}>{segment.label}</div>
                      <div style={{ color: "var(--dash-text-muted)", fontSize: 10, marginTop: 2 }}>
                        {segClients.length} clientes · {fmt(segRevenue)} faturado
                      </div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: segment.color }}>{segClients.length}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* === TAB DELIVERY === */}
          {tab === "delivery" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 12 }}>Bairros com mais pedidos</div>
              {topNeighborhoods.length === 0 ? (
                <div style={{ textAlign: "center", padding: 20, color: "var(--dash-text-muted)", fontSize: 12 }}>Sem dados de bairro nos pedidos.</div>
              ) : (
                topNeighborhoods.map(([name, data], i) => (
                  <div key={name} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    borderRadius: 12, background: "var(--dash-card)", marginBottom: 4,
                  }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: i < 3 ? "var(--dash-accent-soft)" : "var(--dash-card-hover)",
                      color: i < 3 ? "var(--dash-accent)" : "var(--dash-text-muted)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800,
                    }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "var(--dash-text)", fontSize: 12, fontWeight: 600 }}>{name}</div>
                      <div style={{ color: "var(--dash-text-muted)", fontSize: 10 }}>{data.count} pedidos</div>
                    </div>
                    <div style={{ color: "var(--dash-accent)", fontSize: 13, fontWeight: 700 }}>{fmt(data.revenue)}</div>
                  </div>
                ))
              )}

              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginTop: 20, marginBottom: 12 }}>Itens mais pedidos</div>
              {topGlobalItems.map(([name, qty], i) => (
                <div key={name} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", borderRadius: 10, background: "var(--dash-card)", marginBottom: 3,
                }}>
                  <span style={{ color: "var(--dash-text)", fontSize: 12 }}>{i + 1}. {name}</span>
                  <span style={{ color: "var(--dash-accent)", fontSize: 12, fontWeight: 700 }}>{qty}x</span>
                </div>
              ))}
            </div>
          )}
        </></ContentEnter>
      )}

      {/* ── Modals ── */}
      {addOpen && (
        <CustomerFormModal
          unitId={unit.id}
          customer={null}
          onSaved={(c) => { setCrmCustomers(prev => [c, ...prev]); setAddOpen(false); }}
          onClose={() => setAddOpen(false)}
        />
      )}

      {editCustomer && !deleteCustomer && (
        <CustomerFormModal
          unitId={unit.id}
          customer={editCustomer}
          onSaved={(c) => {
            setCrmCustomers(prev => prev.map(x => x.id === c.id ? c : x));
            setEditCustomer(null);
          }}
          onDelete={() => setDeleteCustomer(editCustomer)}
          onClose={() => setEditCustomer(null)}
        />
      )}

      {deleteCustomer && (
        <DeleteConfirmModal
          customer={deleteCustomer}
          onConfirm={() => { setCrmCustomers(prev => prev.filter(x => x.id !== deleteCustomer.id)); setDeleteCustomer(null); setEditCustomer(null); }}
          onClose={() => setDeleteCustomer(null)}
        />
      )}

      {importOpen && (
        <ImportModal
          unitId={unit.id}
          onImported={() => { loadCrmCustomers(); }}
          onClose={() => setImportOpen(false)}
        />
      )}

      {waSendCustomer && (
        <QuickSendModal
          customer={waSendCustomer}
          unitId={unit.id}
          onClose={() => setWaSendCustomer(null)}
        />
      )}
    </div>
  );
}
