"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type InviteDetails =
  | {
      success: true;
      restaurantName: string;
      restaurantId: string;
      invitedEmail: string;
      invitedByName: string;
      memberId: string;
    }
  | {
      success: false;
      error: "invalid_token" | "already_accepted" | "cancelled" | "expired";
      message: string;
    };

export async function getInviteDetails(token: string): Promise<InviteDetails> {
  if (!token) {
    return { success: false, error: "invalid_token", message: "Convite não encontrado" };
  }

  const admin = createAdminClient();

  const { data: member } = await admin
    .from("restaurant_members")
    .select("id, status, invited_email, invite_expires_at, invited_by, restaurant_id, restaurants(name)")
    .eq("invite_token", token)
    .maybeSingle();

  if (!member) {
    return { success: false, error: "invalid_token", message: "Convite não encontrado" };
  }

  if (member.status === "active") {
    return { success: false, error: "already_accepted", message: "Este convite já foi aceito" };
  }
  if (member.status === "removed") {
    return { success: false, error: "cancelled", message: "Este convite foi cancelado" };
  }
  if (member.invite_expires_at && new Date(member.invite_expires_at) < new Date()) {
    return { success: false, error: "expired", message: "Este convite expirou" };
  }

  let invitedByName = "Um administrador";
  if (member.invited_by) {
    const { data: inviter } = await admin
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", member.invited_by)
      .maybeSingle();
    if (inviter) {
      const name = [inviter.first_name, inviter.last_name].filter(Boolean).join(" ");
      if (name) invitedByName = name;
    }
  }

  return {
    success: true,
    restaurantName: (member.restaurants as any)?.name ?? "restaurante",
    restaurantId: member.restaurant_id,
    invitedEmail: member.invited_email,
    invitedByName,
    memberId: member.id,
  };
}

export async function acceptInvite(
  token: string
): Promise<{ error?: string; success?: boolean; restaurantName?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado para aceitar o convite" };

  const admin = createAdminClient();

  const { data: member } = await admin
    .from("restaurant_members")
    .select("id, status, invited_email, invite_expires_at, restaurant_id, restaurants(name)")
    .eq("invite_token", token)
    .maybeSingle();

  if (!member) return { error: "Convite não encontrado" };
  if (member.status !== "pending") return { error: "Este convite não está mais disponível" };
  if (member.invite_expires_at && new Date(member.invite_expires_at) < new Date()) {
    return { error: "Este convite expirou" };
  }
  if (member.invited_email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return { error: "Este convite foi enviado para outro email" };
  }

  // WHERE user_id IS NULL prevents double-acceptance in concurrent requests
  const { data: updated, error: updateErr } = await admin
    .from("restaurant_members")
    .update({
      status: "active",
      user_id: user.id,
      activated_at: new Date().toISOString(),
    })
    .eq("id", member.id)
    .is("user_id", null)
    .select("id")
    .maybeSingle();

  if (updateErr || !updated) {
    return { error: "Este convite já foi aceito em outra sessão" };
  }

  return { success: true, restaurantName: (member.restaurants as any)?.name ?? "restaurante" };
}

export async function declineInvite(
  token: string
): Promise<{ error?: string; success?: boolean }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("restaurant_members")
    .update({ status: "removed", removed_at: new Date().toISOString() })
    .eq("invite_token", token)
    .eq("status", "pending");

  if (error) return { error: error.message };
  return { success: true };
}
