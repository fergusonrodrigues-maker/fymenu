import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";

export type SuporteStaff = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  permissions: Record<string, boolean>;
};

// ── Role permission hierarchy ─────────────────────────────────────────────────
const VIEWER_PERMS = [
  "ver_restaurantes", "ver_unidades", "ver_pedidos", "ver_cardapios",
];
const SUPORTE_PERMS = [
  ...VIEWER_PERMS, "ver_crm", "responder_tickets",
];
const MODERADOR_PERMS = [
  ...SUPORTE_PERMS, "editar_produtos", "gerenciar_features", "ver_analytics", "ver_financeiro_unidade",
];
const GERENTE_PERMS = [
  ...MODERADOR_PERMS, "gerenciar_planos", "ver_financeiro_global", "aprovar_solicitacoes",
];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  viewer:    VIEWER_PERMS,
  suporte:   SUPORTE_PERMS,
  support:   SUPORTE_PERMS,    // English alias
  moderador: MODERADOR_PERMS,
  moderator: MODERADOR_PERMS,  // English alias
  gerente:   GERENTE_PERMS,
  manager:   GERENTE_PERMS,    // English alias
  admin:     ["*"],
  super_admin: ["*"],
};

// English → Portuguese aliases for backward compatibility with stored permissions
const PERM_ALIASES: Record<string, string> = {
  view_restaurants:  "ver_restaurantes",
  view_units:        "ver_unidades",
  view_orders:       "ver_pedidos",
  view_products:     "ver_cardapios",
  edit_products:     "editar_produtos",
  view_crm:          "ver_crm",
  manage_features:   "gerenciar_features",
  view_analytics:    "ver_analytics",
  view_financeiro:   "ver_financeiro_unidade",
  manage_plans:      "gerenciar_planos",
  manage_staff:      "gerenciar_staff",
};

export async function validateSuporteToken(req: NextRequest): Promise<SuporteStaff | null> {
  const token = req.headers.get("x-suporte-token");
  if (!token) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("support_staff")
    .select("id, name, email, role, is_active, permissions")
    .eq("current_token", token)
    .single();

  if (!data || !data.is_active) return null;
  return data as SuporteStaff;
}

export function hasPermission(staff: SuporteStaff, perm: string): boolean {
  const rolePerms = ROLE_PERMISSIONS[staff.role];

  // Role has wildcard (admin/super_admin)
  if (rolePerms?.includes("*")) return true;

  // Normalize to Portuguese name
  const normPerm = PERM_ALIASES[perm] ?? perm;

  // Check role-based permission map
  if (rolePerms) {
    if (rolePerms.includes(perm) || rolePerms.includes(normPerm)) return true;
  }

  // Fall back to individual JSONB overrides (backward compat)
  return !!(staff.permissions?.[perm] || staff.permissions?.[normPerm]);
}
