"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";

type Conversation = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  last_message_at: string;
  unread: number;
  support_staff: { name: string } | null;
};

type Message = {
  id: string;
  conversation_id?: string;
  sender_type: "client" | "staff" | "system";
  sender_name: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

const ACCENT = "#00ffae";
const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  open:           { label: "Aberto", color: "#60a5fa" },
  waiting_reply:  { label: "Aguardando resposta", color: "#fbbf24" },
  resolved:       { label: "Resolvido", color: "#6ee7b7" },
  closed:         { label: "Fechado", color: "#9ca3af" },
};

function fmtTime(s: string) {
  const d = new Date(s);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "agora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// ── Main ChatWidget ────────────────────────────────────────────────────────────
export default function ChatWidget({
  restaurantId,
  open: panelOpen,
  onOpen,
  onClose,
}: {
  restaurantId: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [view, setView] = useState<"list" | "chat" | "new">("list");
  const [subject, setSubject] = useState("");
  const [firstMsg, setFirstMsg] = useState("");
  const [inputMsg, setInputMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  // Load conversations
  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/chat/conversations");
    if (res.ok) {
      const json = await res.json();
      setConversations(json.data ?? []);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Realtime: new messages in any of the user's conversations
  useEffect(() => {
    if (conversations.length === 0) return;
    const supabase = createClient();
    const ids = conversations.map((c) => c.id);
    const channel = supabase
      .channel("client-chat-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=in.(${ids.join(",")})`,
        },
        (payload) => {
          const msg = payload.new as Message;
          // If we're viewing this conversation, append message
          if (activeConv?.id === msg.conversation_id) {
            setMessages((prev) => [...prev, msg]);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          }
          // Refresh conversation list (for unread badge + last_message_at)
          loadConversations();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations.length, activeConv?.id]);

  // Load messages for active conversation
  async function openConv(conv: Conversation) {
    setActiveConv(conv);
    setView("chat");
    setLoadingMsgs(true);
    const res = await fetch(`/api/chat/conversations/${conv.id}/messages`);
    if (res.ok) {
      const json = await res.json();
      setMessages(json.data ?? []);
      setConversations((prev) =>
        prev.map((c) => c.id === conv.id ? { ...c, unread: 0 } : c)
      );
    }
    setLoadingMsgs(false);
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      inputRef.current?.focus();
    }, 80);
  }

  async function sendMessage() {
    if (!inputMsg.trim() || !activeConv || sending) return;
    setSending(true);
    const res = await fetch(`/api/chat/conversations/${activeConv.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: inputMsg.trim() }),
    });
    if (res.ok) {
      const json = await res.json();
      setMessages((prev) => [...prev, json.data]);
      setInputMsg("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    setSending(false);
  }

  async function createConversation() {
    if (!subject.trim() || !firstMsg.trim() || creating) return;
    setCreating(true);
    const res = await fetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: subject.trim(), first_message: firstMsg.trim() }),
    });
    if (res.ok) {
      const json = await res.json();
      setSubject(""); setFirstMsg("");
      await loadConversations();
      // Find and open the new conversation
      const reloaded = await fetch("/api/chat/conversations");
      if (reloaded.ok) {
        const data = await reloaded.json();
        const newConv = (data.data as Conversation[]).find((c) => c.id === json.id);
        if (newConv) { setConversations(data.data); openConv(newConv); return; }
      }
      setView("list");
    }
    setCreating(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  // ── Slide panel ────────────────────────────────────────────────────────────
  const panelStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 0,
    right: 0,
    width: 380,
    height: "100vh",
    maxHeight: "100dvh",
    background: "#0a0a0a",
    borderLeft: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    flexDirection: "column",
    zIndex: 9000,
    transform: panelOpen ? "translateX(0)" : "translateX(100%)",
    transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .chat-panel { width: 100vw !important; }
        }
        .chat-msg-input:focus { outline: none; border-color: rgba(0,255,174,0.4) !important; }
        .chat-msg-input::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>

      {/* Floating button */}
      <button
        onClick={panelOpen ? onClose : onOpen}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 8999,
          width: 52, height: 52, borderRadius: "50%", border: "none",
          background: `linear-gradient(135deg, ${ACCENT}, #00c896)`,
          color: "#000", fontSize: 22, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 20px rgba(0,255,174,0.35)`,
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        title="Suporte"
      >
        {panelOpen ? "✕" : "💬"}
        {!panelOpen && totalUnread > 0 && (
          <span style={{
            position: "absolute", top: -2, right: -2,
            width: 18, height: 18, borderRadius: "50%",
            background: "#ef4444", color: "#fff",
            fontSize: 10, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #0a0a0a",
          }}>{totalUnread > 9 ? "9+" : totalUnread}</span>
        )}
      </button>

      {/* Backdrop on mobile */}
      {panelOpen && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 8998, background: "rgba(0,0,0,0.5)", display: "none" }}
          className="chat-backdrop"
        />
      )}
      <style>{`@media (max-width: 480px) { .chat-backdrop { display: block !important; } }`}</style>

      {/* Chat panel */}
      <div style={panelStyle} className="chat-panel">
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {view !== "list" && (
              <button onClick={() => { setView("list"); setActiveConv(null); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 18, padding: 0, marginRight: 4 }}>←</button>
            )}
            <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
              {view === "list" ? "Suporte" : view === "new" ? "Nova conversa" : activeConv?.subject ?? "Chat"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {view === "list" && (
              <button onClick={() => setView("new")} style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: `rgba(0,255,174,0.12)`, color: ACCENT, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Nova</button>
            )}
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.06)", color: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>

        {/* ── VIEW: List ─────────────────────────────────────────────────── */}
        {view === "list" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
            {conversations.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Nenhuma conversa ainda</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 20 }}>Inicie uma conversa com nossa equipe de suporte</div>
                <button onClick={() => setView("new")} style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${ACCENT}, #00c896)`, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Iniciar conversa
                </button>
              </div>
            ) : (
              conversations.map((c) => {
                const st = STATUS_LABEL[c.status] ?? STATUS_LABEL.open;
                return (
                  <button key={c.id} onClick={() => openConv(c)} style={{ width: "100%", padding: "14px 20px", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", textAlign: "left", transition: "background 0.15s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", flex: 1, marginRight: 8 }}>{c.subject}</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{fmtTime(c.last_message_at)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: st.color, fontWeight: 600 }}>{st.label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {c.support_staff && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{(c.support_staff as any).name}</span>}
                        {c.unread > 0 && (
                          <span style={{ width: 18, height: 18, borderRadius: "50%", background: ACCENT, color: "#000", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.unread}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* ── VIEW: New conversation ──────────────────────────────────────── */}
        {view === "new" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Assunto</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Problema com cardápio..."
                style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Mensagem inicial</label>
              <textarea value={firstMsg} onChange={(e) => setFirstMsg(e.target.value)} placeholder="Descreva sua dúvida ou problema..." rows={5}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <button onClick={createConversation} disabled={creating || !subject.trim() || !firstMsg.trim()}
              style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: (!subject.trim() || !firstMsg.trim() || creating) ? "rgba(0,255,174,0.2)" : `linear-gradient(135deg, ${ACCENT}, #00c896)`, color: "#000", fontSize: 14, fontWeight: 700, cursor: creating || !subject.trim() || !firstMsg.trim() ? "not-allowed" : "pointer", opacity: creating ? 0.7 : 1 }}>
              {creating ? "Enviando..." : "Enviar"}
            </button>
            <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Prefere WhatsApp?</div>
              <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#25D366", fontWeight: 600, textDecoration: "none" }}>Falar pelo WhatsApp →</a>
            </div>
          </div>
        )}

        {/* ── VIEW: Chat ─────────────────────────────────────────────────── */}
        {view === "chat" && activeConv && (
          <>
            {/* Status bar */}
            <div style={{ padding: "8px 20px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: STATUS_LABEL[activeConv.status]?.color ?? "#fff", fontWeight: 600 }}>
                {STATUS_LABEL[activeConv.status]?.label ?? activeConv.status}
              </span>
              {activeConv.support_staff && (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  Atendente: {(activeConv.support_staff as any).name}
                </span>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              {loadingMsgs ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}><LoadingSpinner size="sm" /></div>
              ) : messages.length === 0 ? (
                <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Nenhuma mensagem ainda.</p>
              ) : (
                messages.map((m) => {
                  const isClient = m.sender_type === "client";
                  const isSystem = m.sender_type === "system";
                  if (isSystem) {
                    return (
                      <div key={m.id} style={{ textAlign: "center" }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", padding: "3px 10px", borderRadius: 20 }}>{m.message}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isClient ? "flex-end" : "flex-start" }}>
                      {!isClient && (
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>{m.sender_name}</span>
                      )}
                      <div style={{
                        maxWidth: "78%", padding: "9px 14px",
                        borderRadius: isClient ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: isClient ? ACCENT : "rgba(255,255,255,0.08)",
                        color: isClient ? "#000" : "#fff",
                        fontSize: 13, lineHeight: 1.5, wordBreak: "break-word",
                      }}>
                        {m.message}
                      </div>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 3 }}>{fmtTime(m.created_at)}</span>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input — only if not closed/resolved */}
            {activeConv.status !== "closed" && activeConv.status !== "resolved" ? (
              <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
                <textarea
                  ref={inputRef}
                  className="chat-msg-input"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escreva uma mensagem..."
                  rows={1}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 13, resize: "none", fontFamily: "inherit", maxHeight: 80, overflowY: "auto" }}
                />
                <button onClick={sendMessage} disabled={sending || !inputMsg.trim()}
                  style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: inputMsg.trim() ? `linear-gradient(135deg, ${ACCENT}, #00c896)` : "rgba(255,255,255,0.1)", color: inputMsg.trim() ? "#000" : "rgba(255,255,255,0.3)", cursor: inputMsg.trim() ? "pointer" : "not-allowed", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
                  ↑
                </button>
              </div>
            ) : (
              <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.08)", textAlign: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Esta conversa foi {activeConv.status === "resolved" ? "resolvida" : "fechada"}.</span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
