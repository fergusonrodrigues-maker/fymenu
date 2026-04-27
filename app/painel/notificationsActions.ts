"use server";

import { createClient } from "@/lib/supabase/server";

async function authMember(restaurantId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: member } = await supabase
    .from("restaurant_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurantId)
    .eq("status", "active")
    .maybeSingle();
  if (!member) throw new Error("Sem permissão.");

  return { supabase, userId: user.id };
}

export type NotificationRow = {
  id: string;
  restaurant_id: string;
  unit_id: string | null;
  category: string;
  title: string;
  body: string | null;
  link_url: string | null;
  source_type: string | null;
  source_id: string | null;
  read_by: string[] | null;
  whatsapp_status: string | null;
  created_at: string;
};

export type ListNotificationsResult = {
  items: NotificationRow[];
  unreadCount: number;
  userId: string;
};

export async function listNotifications(
  restaurantId: string,
  options?: { limit?: number },
): Promise<ListNotificationsResult> {
  const { supabase, userId } = await authMember(restaurantId);

  const { data, error } = await supabase
    .from("notifications")
    .select("id, restaurant_id, unit_id, category, title, body, link_url, source_type, source_id, read_by, whatsapp_status, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 20);

  if (error) throw new Error(error.message);

  const items = (data ?? []) as NotificationRow[];
  const unreadCount = items.filter((n) => !(n.read_by ?? []).includes(userId)).length;

  return { items, unreadCount, userId };
}

export async function countUnread(restaurantId: string): Promise<number> {
  const { supabase, userId } = await authMember(restaurantId);
  // We fetch read_by only and filter client-side; for a personal "unread" count
  // this is fine — typical restaurant sees < 200 lifetime notifications.
  const { data } = await supabase
    .from("notifications")
    .select("read_by")
    .eq("restaurant_id", restaurantId);
  if (!data) return 0;
  return data.filter((n: any) => !(n.read_by ?? []).includes(userId)).length;
}

export async function markAsRead(
  notificationId: string,
  restaurantId: string,
): Promise<void> {
  const { supabase, userId } = await authMember(restaurantId);

  const { data: row } = await supabase
    .from("notifications")
    .select("read_by, restaurant_id")
    .eq("id", notificationId)
    .maybeSingle();

  if (!row || row.restaurant_id !== restaurantId) return;
  const readBy: string[] = row.read_by ?? [];
  if (readBy.includes(userId)) return;

  await supabase
    .from("notifications")
    .update({ read_by: [...readBy, userId] })
    .eq("id", notificationId);
}

export async function markAllAsRead(restaurantId: string): Promise<void> {
  const { supabase, userId } = await authMember(restaurantId);

  const { data } = await supabase
    .from("notifications")
    .select("id, read_by")
    .eq("restaurant_id", restaurantId);

  const unread = (data ?? []).filter((n: any) => !(n.read_by ?? []).includes(userId));
  if (unread.length === 0) return;

  // PostgREST doesn't have a per-row update batch; we issue one update per row.
  // Volume is bounded (< 200) so this is acceptable.
  await Promise.all(
    unread.map((row: any) =>
      supabase
        .from("notifications")
        .update({ read_by: [...(row.read_by ?? []), userId] })
        .eq("id", row.id),
    ),
  );
}
