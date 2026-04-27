"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRestaurantMember } from "@/lib/tenant/isRestaurantMember";
import { logActivity } from "@/lib/audit/logActivity";

export interface MemberData {
  id: string;
  role: string;
  invited_email: string;
  user_id: string | null;
  status: string;
  invite_token: string | null;
  invite_expires_at: string | null;
  created_at: string;
  activated_at: string | null;
  displayName: string;
}

export async function listMembers(restaurantId: string): Promise<{
  members: MemberData[];
  currentUserId: string | null;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { members: [], currentUserId: null };

  const admin = createAdminClient();
  const ok = await isRestaurantMember(admin, user.id, restaurantId);
  if (!ok) return { members: [], currentUserId: null };

  const { data: rows } = await admin
    .from("restaurant_members")
    .select("id, role, invited_email, user_id, status, invite_token, invite_expires_at, created_at, activated_at")
    .eq("restaurant_id", restaurantId)
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: true });

  const activeUserIds = (rows ?? [])
    .filter(r => r.user_id && r.status === "active")
    .map(r => r.user_id as string);

  let nameMap: Record<string, string> = {};
  if (activeUserIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", activeUserIds);
    nameMap = Object.fromEntries(
      (profiles ?? []).map(p => [
        p.id,
        [p.first_name, p.last_name].filter(Boolean).join(" "),
      ])
    );
  }

  const members: MemberData[] = (rows ?? []).map(r => ({
    id: r.id,
    role: r.role,
    invited_email: r.invited_email,
    user_id: r.user_id,
    status: r.status,
    invite_token: r.invite_token,
    invite_expires_at: r.invite_expires_at,
    created_at: r.created_at,
    activated_at: r.activated_at,
    displayName: (r.user_id && nameMap[r.user_id]) ? nameMap[r.user_id] : r.invited_email,
  }));

  return { members, currentUserId: user.id };
}

export async function inviteMember(
  restaurantId: string,
  invitedEmail: string
): Promise<{ error?: string; token?: string; inviteUrl?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const email = invitedEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email inválido" };

  const admin = createAdminClient();
  const ok = await isRestaurantMember(admin, user.id, restaurantId);
  if (!ok) return { error: "Sem permissão" };

  const { data: existing } = await admin
    .from("restaurant_members")
    .select("id, status")
    .eq("restaurant_id", restaurantId)
    .eq("invited_email", email)
    .maybeSingle();

  if (existing?.status === "active") return { error: "Este email já é sócio ativo" };
  if (existing?.status === "pending") return { error: "Já existe um convite pendente para este email" };

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  if (existing) {
    await admin
      .from("restaurant_members")
      .update({
        status: "pending",
        invite_token: token,
        invite_expires_at: expiresAt.toISOString(),
        invited_by: user.id,
        user_id: null,
        activated_at: null,
        removed_at: null,
        removed_by: null,
      })
      .eq("id", existing.id);
  } else {
    await admin
      .from("restaurant_members")
      .insert({
        restaurant_id: restaurantId,
        invited_email: email,
        role: "partner",
        status: "pending",
        invite_token: token,
        invite_expires_at: expiresAt.toISOString(),
        invited_by: user.id,
        user_id: null,
      });
  }

  const inviteUrl = `https://fymenu.com/aceitar-convite?token=${token}`;

  await logActivity({
    restaurantId, module: 'members', action: 'invite_member',
    entityType: 'member', entityName: email,
  });

  return { token, inviteUrl };
}

export async function revokeInvite(
  memberId: string,
  restaurantId: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const admin = createAdminClient();
  const ok = await isRestaurantMember(admin, user.id, restaurantId);
  if (!ok) return { error: "Sem permissão" };

  let invitedEmail: string | null = null;
  try {
    const { data } = await admin.from("restaurant_members").select("invited_email").eq("id", memberId).single();
    invitedEmail = data?.invited_email ?? null;
  } catch {}

  await admin
    .from("restaurant_members")
    .update({ status: "removed", removed_at: new Date().toISOString(), removed_by: user.id })
    .eq("id", memberId)
    .eq("restaurant_id", restaurantId)
    .eq("status", "pending");

  await logActivity({
    restaurantId, module: 'members', action: 'revoke_invite',
    entityType: 'member', entityId: memberId, entityName: invitedEmail,
  });

  return { success: true };
}

export async function removeMember(
  memberId: string,
  restaurantId: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const admin = createAdminClient();
  const ok = await isRestaurantMember(admin, user.id, restaurantId);
  if (!ok) return { error: "Sem permissão" };

  const { data: target } = await admin
    .from("restaurant_members")
    .select("id, role, user_id, invited_email")
    .eq("id", memberId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!target) return { error: "Membro não encontrado" };
  if (target.user_id === user.id) return { error: "Você não pode remover a si mesmo" };

  if (target.role === "owner") {
    const { count } = await admin
      .from("restaurant_members")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("role", "owner")
      .eq("status", "active");

    if ((count ?? 0) <= 1) return { error: "Não é possível remover o único dono" };
  }

  await admin
    .from("restaurant_members")
    .update({ status: "removed", removed_at: new Date().toISOString(), removed_by: user.id })
    .eq("id", memberId)
    .eq("restaurant_id", restaurantId);

  await logActivity({
    restaurantId, module: 'members', action: 'remove_member',
    entityType: 'member', entityId: memberId, entityName: (target as any).invited_email ?? null,
  });

  return { success: true };
}
