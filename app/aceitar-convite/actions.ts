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

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invite_by_token", { p_token: token });

  if (error || !data || (data as any[]).length === 0) {
    return { success: false, error: "invalid_token", message: "Convite não encontrado" };
  }

  const row = (data as any[])[0];

  if (row.status === "active") {
    return { success: false, error: "already_accepted", message: "Este convite já foi aceito" };
  }
  if (row.status === "removed") {
    return { success: false, error: "cancelled", message: "Este convite foi cancelado" };
  }
  if (row.invite_expires_at && new Date(row.invite_expires_at) < new Date()) {
    return { success: false, error: "expired", message: "Este convite expirou" };
  }

  return {
    success: true,
    restaurantName: row.restaurant_name ?? "restaurante",
    restaurantId: row.restaurant_id,
    invitedEmail: row.invited_email,
    invitedByName: row.invited_by_email ?? "Um administrador",
    memberId: row.id,
  };
}

export async function acceptInvite(
  token: string
): Promise<{ error?: string; success?: boolean; restaurantName?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado para aceitar o convite" };

  const { data, error } = await supabase.rpc("accept_invite_by_token", { p_token: token });

  if (error) return { error: error.message };
  if (!data) return { error: "Erro ao aceitar convite" };

  const result = data as any;
  if (result.error) return { error: result.message ?? result.error };

  // Fetch restaurant name for the success UI (RPC returns restaurant_id, not name)
  let restaurantName = "";
  if (result.restaurant_id) {
    const admin = createAdminClient();
    const { data: r } = await admin
      .from("restaurants")
      .select("name")
      .eq("id", result.restaurant_id)
      .single();
    restaurantName = r?.name ?? "";
  }

  return { success: true, restaurantName };
}

export async function declineInvite(
  token: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("decline_invite_by_token", { p_token: token });

  if (error) return { error: error.message };

  const result = data as any;
  if (result?.error) return { error: result.message ?? result.error };

  return { success: true };
}
