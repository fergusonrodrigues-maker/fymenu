"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRestaurantMember } from "@/lib/tenant/isRestaurantMember";

export interface ActivityRecord {
  id: string;
  restaurant_id: string;
  unit_id: string | null;
  actor_user_id: string;
  actor_name: string;
  actor_role: string | null;
  module: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  changes: Record<string, { from: any; to: any }> | null;
  created_at: string;
}

export interface MemberOption {
  userId: string;
  displayName: string;
}

export async function listActivities(input: {
  restaurantId: string;
  actorUserId?: string;
  module?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ activities: ActivityRecord[]; hasMore: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { activities: [], hasMore: false, error: "Não autenticado" };

  const admin = createAdminClient();
  const ok = await isRestaurantMember(admin, user.id, input.restaurantId);
  if (!ok) return { activities: [], hasMore: false, error: "Sem permissão" };

  const page = input.page ?? 0;
  const pageSize = input.pageSize ?? 50;

  let query = admin
    .from("activity_log")
    .select("id, restaurant_id, unit_id, actor_user_id, actor_name, actor_role, module, action, entity_type, entity_id, entity_name, changes, created_at")
    .eq("restaurant_id", input.restaurantId)
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize);

  if (input.actorUserId) query = query.eq("actor_user_id", input.actorUserId);
  if (input.module) query = query.eq("module", input.module);
  if (input.dateFrom) query = query.gte("created_at", input.dateFrom);
  if (input.dateTo) query = query.lte("created_at", input.dateTo);
  if (input.search) query = query.ilike("entity_name", `%${input.search}%`);

  const { data, error } = await query;
  if (error) return { activities: [], hasMore: false, error: error.message };

  const activities = (data ?? []) as ActivityRecord[];
  return {
    activities: activities.slice(0, pageSize),
    hasMore: activities.length > pageSize,
  };
}

export async function listActivityMembers(restaurantId: string): Promise<MemberOption[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const ok = await isRestaurantMember(admin, user.id, restaurantId);
  if (!ok) return [];

  const { data: members } = await admin
    .from("restaurant_members")
    .select("user_id, invited_email")
    .eq("restaurant_id", restaurantId)
    .eq("status", "active");

  if (!members || members.length === 0) return [];

  const userIds = members.filter(m => m.user_id).map(m => m.user_id as string);
  let nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", userIds);
    nameMap = Object.fromEntries(
      (profiles ?? []).map(p => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ")])
    );
  }

  return members
    .filter(m => m.user_id)
    .map(m => ({
      userId: m.user_id as string,
      displayName: (m.user_id && nameMap[m.user_id]) ? nameMap[m.user_id] : (m.invited_email ?? m.user_id ?? ""),
    }));
}

export interface LastEditInfo {
  entityId: string;
  actorName: string;
  action: string;
  createdAt: string;
  entityName: string | null;
  changes: Record<string, { from: any; to: any }> | null;
}

export async function getLastEditForEntities(
  restaurantId: string,
  entityType: string,
  entityIds: string[]
): Promise<Record<string, LastEditInfo>> {
  if (entityIds.length === 0) return {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const admin = createAdminClient();
  const ok = await isRestaurantMember(admin, user.id, restaurantId);
  if (!ok) return {};

  const { data } = await admin
    .from("activity_log")
    .select("entity_id, actor_name, action, created_at, entity_name, changes")
    .eq("restaurant_id", restaurantId)
    .eq("entity_type", entityType)
    .in("entity_id", entityIds)
    .order("created_at", { ascending: false });

  const result: Record<string, LastEditInfo> = {};
  for (const row of data ?? []) {
    if (!row.entity_id) continue;
    if (!result[row.entity_id]) {
      result[row.entity_id] = {
        entityId: row.entity_id,
        actorName: row.actor_name,
        action: row.action,
        createdAt: row.created_at,
        entityName: row.entity_name,
        changes: row.changes,
      };
    }
  }
  return result;
}

export async function listActivitiesForEntity(
  restaurantId: string,
  entityType: string,
  entityId: string
): Promise<{ activities: ActivityRecord[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { activities: [], error: "Não autenticado" };

  const admin = createAdminClient();
  const ok = await isRestaurantMember(admin, user.id, restaurantId);
  if (!ok) return { activities: [], error: "Sem permissão" };

  const { data, error } = await admin
    .from("activity_log")
    .select("id, restaurant_id, unit_id, actor_user_id, actor_name, actor_role, module, action, entity_type, entity_id, entity_name, changes, created_at")
    .eq("restaurant_id", restaurantId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { activities: [], error: error.message };
  return { activities: (data ?? []) as ActivityRecord[] };
}
