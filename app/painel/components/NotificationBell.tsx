"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, X, CheckCheck, Package, Users, Star, Settings, Info, ListChecks, AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  listNotifications, markAsRead, markAllAsRead,
  type NotificationRow,
} from "../notificationsActions";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  task_completed: ListChecks,
  task_overdue:   AlertCircle,
  order:          Package,
  member:         Users,
  review:         Star,
  system:         Settings,
  custom:         Info,
};

const CATEGORY_COLORS: Record<string, string> = {
  task_completed: "#16a34a",
  task_overdue:   "#dc2626",
  order:          "#2563eb",
  member:         "#7c3aed",
  review:         "#eab308",
  system:         "#6b7280",
  custom:         "#6b7280",
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "agora";
  if (diff < 3600)  return `há ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

export default function NotificationBell({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await listNotifications(restaurantId, { limit: 20 });
      setItems(result.items);
      setUnreadCount(result.unreadCount);
      setUserId(result.userId);
    } catch { /* silent */ }
  }, [restaurantId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime — update on INSERT
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-bell-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => { refresh(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, refresh]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleClickItem(n: NotificationRow) {
    if (userId && !(n.read_by ?? []).includes(userId)) {
      // Optimistic update
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, read_by: [...(x.read_by ?? []), userId] } : x));
      setUnreadCount((c) => Math.max(0, c - 1));
      try { await markAsRead(n.id, restaurantId); } catch { /* */ }
    }
    setOpen(false);
    if (n.link_url) router.push(n.link_url);
  }

  async function handleMarkAllAsRead() {
    if (!userId) return;
    setItems((prev) => prev.map((n) => ({ ...n, read_by: [...(n.read_by ?? []), userId] })));
    setUnreadCount(0);
    try { await markAllAsRead(restaurantId); } catch { /* */ }
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 36, height: 36, borderRadius: 12,
          background: unreadCount > 0 ? "var(--dash-accent-soft)" : "var(--dash-card)",
          border: "1px solid var(--dash-border)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, position: "relative",
          color: "var(--dash-text)",
        }}
        aria-label="Notificações"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <div style={{
            position: "absolute", top: -2, right: -2,
            minWidth: 18, height: 18, padding: "0 5px",
            borderRadius: 10, background: "var(--dash-accent)", color: "#000",
            fontSize: 10, fontWeight: 800, lineHeight: "18px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: 44, right: 0,
          width: 360, maxWidth: "92vw", maxHeight: 480,
          borderRadius: 16, overflow: "hidden",
          background: "var(--dash-modal-bg)",
          border: "1px solid var(--dash-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          zIndex: 9999,
          display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", borderBottom: "1px solid var(--dash-border)",
          }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--dash-text)" }}>
              Notificações{unreadCount > 0 ? ` · ${unreadCount} nova${unreadCount !== 1 ? "s" : ""}` : ""}
            </span>
            <button onClick={() => setOpen(false)} className="btn-close-x" aria-label="Fechar">
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Mark all as read */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              style={{
                padding: "9px 16px", border: "none", background: "transparent",
                color: "var(--dash-accent)", fontSize: 12, fontWeight: 700,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                borderBottom: "1px solid var(--dash-border)",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <CheckCheck size={13} /> Marcar todas como lidas
            </button>
          )}

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
            {items.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: "var(--dash-text-muted)", fontSize: 12 }}>
                Nenhuma notificação ainda.
              </div>
            ) : (
              items.map((n) => {
                const Icon = CATEGORY_ICONS[n.category] ?? Info;
                const color = CATEGORY_COLORS[n.category] ?? "#6b7280";
                const isRead = userId ? (n.read_by ?? []).includes(userId) : true;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClickItem(n)}
                    style={{
                      display: "flex", gap: 10, padding: "10px 12px",
                      borderRadius: 10, marginBottom: 4,
                      background: isRead ? "transparent" : "var(--dash-accent-soft)",
                      cursor: n.link_url ? "pointer" : "default",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--dash-card-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isRead ? "transparent" : "var(--dash-accent-soft)"; }}
                  >
                    <span style={{
                      flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 30, height: 30, borderRadius: 8,
                      background: `${color}1f`, color,
                    }}>
                      <Icon size={15} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: "var(--dash-text)", fontSize: 13,
                        fontWeight: isRead ? 600 : 800,
                        lineHeight: 1.3,
                      }}>{n.title}</div>
                      {n.body && (
                        <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginTop: 2, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {n.body}
                        </div>
                      )}
                      <div style={{ color: "var(--dash-text-muted)", fontSize: 10, marginTop: 4 }}>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                    {!isRead && (
                      <span style={{ flexShrink: 0, width: 8, height: 8, borderRadius: "50%", background: "var(--dash-accent)", marginTop: 11 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div style={{
              padding: "10px 16px", borderTop: "1px solid var(--dash-border)",
              textAlign: "center",
            }}>
              <button
                onClick={() => { setOpen(false); router.push("/painel/notificacoes"); }}
                style={{
                  background: "transparent", border: "none",
                  color: "var(--dash-text-muted)", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Ver tudo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
