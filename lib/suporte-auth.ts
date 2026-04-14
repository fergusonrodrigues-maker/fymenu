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
  if (staff.role === "super_admin" || staff.role === "admin") return true;
  return !!staff.permissions?.[perm];
}
