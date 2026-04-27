"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Check, Clock, AlertTriangle, ListChecks, X } from "lucide-react";
import { listMyTasks, completeTask, type MyTaskRow, type MyTasksResult } from "@/app/colaborador-app/tarefasActions";
import { compressImage, fileToBase64 } from "@/lib/imageCompress";
import BottomNav from "../_components/BottomNav";

type Tab = "hoje" | "atrasadas" | "concluidas";

export default function TarefasClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("hoje");
  const [data, setData] = useState<MyTasksResult>({ hoje: [], atrasadas: [], concluidas: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [active, setActive] = useState<MyTaskRow | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);

  const tokenRef = useRef<string>("");

  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      let token = "";
      try { token = sessionStorage.getItem("fy_emp_token") ?? ""; } catch { /* */ }
      tokenRef.current = token;
      if (!token) {
        router.replace("/colaborador");
        return;
      }
      const result = await listMyTasks(token);
      setData(result);
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao carregar tarefas");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { reload(); }, [reload]);

  const flashToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2200);
  };

  const tasksForTab: MyTaskRow[] =
    tab === "hoje" ? data.hoje : tab === "atrasadas" ? data.atrasadas : data.concluidas;

  return (
    <div style={{
      minHeight: "100vh", background: "#fafafa",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      paddingBottom: 80,
    }}>
      {/* Header */}
      <header style={{
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "14px 16px", display: "flex", alignItems: "center", gap: 10,
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <button
          onClick={() => router.push("/colaborador/home")}
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: "1px solid #e5e7eb", background: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={18} color="#374151" />
        </button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Minhas Tarefas</span>
      </header>

      {/* Tabs */}
      <div style={{
        display: "flex", background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        position: "sticky", top: 64, zIndex: 39,
      }}>
        {([
          { id: "hoje",       label: "Hoje",        count: data.hoje.length },
          { id: "atrasadas",  label: "Atrasadas",   count: data.atrasadas.length },
          { id: "concluidas", label: "Concluídas",  count: data.concluidas.length },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            style={{
              flex: 1, padding: "12px 4px",
              background: "transparent", border: "none",
              borderBottom: tab === t.id ? "2px solid #16a34a" : "2px solid transparent",
              color: tab === t.id ? "#16a34a" : "#6b7280",
              fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span style={{
                background: tab === t.id ? "#16a34a" : "#e5e7eb",
                color: tab === t.id ? "#fff" : "#6b7280",
                fontSize: 11, fontWeight: 800, padding: "1px 7px", borderRadius: 10,
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "16px" }}>
        {err && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", fontSize: 13, marginBottom: 12 }}>
            {err}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 13 }}>Carregando tarefas…</div>
        ) : tasksForTab.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          tasksForTab.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isOverdue={tab === "atrasadas"}
              isDone={tab === "concluidas"}
              onComplete={() => setActive(task)}
            />
          ))
        )}
      </main>

      {active && (
        <CompleteModal
          task={active}
          token={tokenRef.current}
          onClose={() => setActive(null)}
          onSuccess={async () => {
            setActive(null);
            flashToast("Tarefa concluída!");
            await reload();
          }}
        />
      )}

      {showToast && (
        <div style={{
          position: "fixed", bottom: 100, left: 0, right: 0,
          display: "flex", justifyContent: "center", zIndex: 60, pointerEvents: "none",
        }}>
          <div style={{
            background: "#16a34a", color: "#fff",
            padding: "10px 20px", borderRadius: 12,
            fontSize: 13, fontWeight: 700,
            boxShadow: "0 4px 16px rgba(22,163,74,0.35)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Check size={16} strokeWidth={3} />
            {showToast}
          </div>
        </div>
      )}

      <BottomNav active="tarefas" pendingCount={data.hoje.length + data.atrasadas.length} />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: Tab }) {
  const map = {
    hoje:       { emoji: "🎉", title: "Nenhuma tarefa pendente!", desc: "Você está em dia com tudo" },
    atrasadas:  { emoji: "✅", title: "Nada atrasado!",            desc: "Continue assim" },
    concluidas: { emoji: "📋", title: "Nenhuma conclusão recente", desc: "Tarefas concluídas aparecerão aqui" },
  } as const;
  const e = map[tab];
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>{e.emoji}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 6 }}>{e.title}</div>
      <div style={{ fontSize: 13, color: "#6b7280" }}>{e.desc}</div>
    </div>
  );
}

function TaskCard({
  task, isOverdue, isDone, onComplete,
}: {
  task: MyTaskRow; isOverdue: boolean; isDone: boolean; onComplete: () => void;
}) {
  const completedTime = task.completed_at
    ? new Date(task.completed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: 16,
      marginBottom: 12,
      borderLeft: isOverdue ? "4px solid #dc2626" : "1px solid transparent",
      border: isOverdue ? undefined : "1px solid #e5e7eb",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      opacity: isDone ? 0.65 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", lineHeight: 1.3 }}>{task.name}</div>
        </div>
        {isOverdue && (
          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color: "#dc2626", background: "#fef2f2", padding: "3px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <AlertTriangle size={11} /> Atrasada
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: task.description ? 8 : 12 }}>
        {task.due_time && (
          <span style={{ fontSize: 11, color: "#6b7280", display: "flex", alignItems: "center", gap: 3, background: "#f3f4f6", padding: "3px 8px", borderRadius: 6 }}>
            <Clock size={11} /> {task.due_time.slice(0, 5)}
          </span>
        )}
        {task.requires_photo && !isDone && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#c2410c", background: "#ffedd5", padding: "3px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <Camera size={11} /> Foto obrigatória
          </span>
        )}
      </div>

      {task.description && (
        <div style={{ fontSize: 13, color: "#666", marginBottom: 12, lineHeight: 1.5 }}>{task.description}</div>
      )}

      {isDone ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#16a34a", fontSize: 13, fontWeight: 700 }}>
          <Check size={16} strokeWidth={3} />
          {completedTime ? `Concluída às ${completedTime}` : "Concluída"}
        </div>
      ) : (
        <button
          onClick={onComplete}
          style={{
            width: "100%", padding: "13px 16px", borderRadius: 12,
            border: "none", background: "#16a34a", color: "#fff",
            fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            boxShadow: "0 2px 6px rgba(22,163,74,0.25)",
            transition: "transform 0.1s",
          }}
          onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          <Check size={16} strokeWidth={3} />
          Marcar como concluída
        </button>
      )}
    </div>
  );
}

// ── Complete Modal (bottom sheet) ──────────────────────────────────────────

function CompleteModal({
  task, token, onClose, onSuccess,
}: {
  task: MyTaskRow; token: string; onClose: () => void; onSuccess: () => void;
}) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePickPhoto(file: File) {
    setErr(null);
    try {
      setStatus("Otimizando imagem...");
      const compressed = await compressImage(file);
      setPhotoFile(compressed);
      const url = URL.createObjectURL(compressed);
      setPhotoPreview(url);
      setStatus("");
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao processar imagem");
      setStatus("");
    }
  }

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  async function handleConfirm() {
    if (task.requires_photo && !photoFile) {
      setErr("Foto obrigatória");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      let photoBase64: string | undefined;
      if (photoFile) {
        setStatus("Enviando foto...");
        photoBase64 = await fileToBase64(photoFile);
      }
      setStatus("Concluindo tarefa...");
      await completeTask(token, task.id, notes || undefined, photoBase64);
      onSuccess();
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao concluir tarefa");
      setSubmitting(false);
      setStatus("");
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div style={{
        background: "#fff", width: "100%", maxWidth: 520,
        borderRadius: "20px 20px 0 0",
        maxHeight: "92vh", overflowY: "auto",
        animation: "slideUp 0.25s ease",
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        {/* Handle bar */}
        <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#d1d5db" }} />
        </div>

        <div style={{ padding: "8px 20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Concluir tarefa
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{task.name}</div>
            </div>
            <button onClick={onClose} disabled={submitting} style={{
              width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb",
              background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: submitting ? "not-allowed" : "pointer", flexShrink: 0,
            }}>
              <X size={18} color="#6b7280" />
            </button>
          </div>

          {/* Photo section */}
          <div style={{ marginBottom: 16 }}>
            {photoPreview ? (
              <div>
                <img src={photoPreview} alt="Foto" style={{
                  width: "100%", maxHeight: 300, objectFit: "cover",
                  borderRadius: 14, border: "1px solid #e5e7eb",
                }} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                  style={{
                    marginTop: 10, width: "100%", padding: "10px",
                    borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff",
                    color: "#374151", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <Camera size={15} /> Tirar outra
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
                style={{
                  width: "100%", padding: "20px",
                  borderRadius: 14, border: task.requires_photo ? "2px dashed #c2410c" : "2px dashed #d1d5db",
                  background: task.requires_photo ? "#fff7ed" : "#f9fafb",
                  color: task.requires_photo ? "#c2410c" : "#374151",
                  fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                }}
              >
                <Camera size={32} />
                <span>{task.requires_photo ? "📷 Tirar foto (obrigatória)" : "📷 Adicionar foto (opcional)"}</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePickPhoto(f);
                e.target.value = "";
              }}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>
              Observações (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              placeholder="Algum detalhe a registrar?"
              rows={3}
              disabled={submitting}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 10,
                border: "1px solid #e5e7eb", fontSize: 14, fontFamily: "inherit",
                resize: "none", outline: "none", color: "#111827",
              }}
            />
            <div style={{ textAlign: "right", fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
              {notes.length}/500
            </div>
          </div>

          {err && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", fontSize: 13, marginBottom: 14 }}>
              {err}
            </div>
          )}

          {status && !err && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "#eff6ff", color: "#1d4ed8", fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 12, height: 12, border: "2px solid #1d4ed8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              {status}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              disabled={submitting}
              style={{
                flex: 1, padding: "13px", borderRadius: 12,
                border: "1px solid #e5e7eb", background: "#fff",
                color: "#374151", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting || (task.requires_photo && !photoFile)}
              style={{
                flex: 2, padding: "13px", borderRadius: 12,
                border: "none",
                background: submitting || (task.requires_photo && !photoFile) ? "#9ca3af" : "#16a34a",
                color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit",
                cursor: submitting || (task.requires_photo && !photoFile) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxShadow: "0 2px 6px rgba(22,163,74,0.25)",
              }}
            >
              <Check size={16} strokeWidth={3} />
              {submitting ? "Concluindo..." : "Confirmar conclusão"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
