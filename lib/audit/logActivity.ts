import { createClient } from "@/lib/supabase/server";

type LogActivityInput = {
  restaurantId: string;
  unitId?: string | null;
  module: 'menu' | 'orders' | 'comanda' | 'financial' | 'team' | 'inventory' | 'crm' | 'settings' | 'members' | 'import' | 'plan' | 'printers' | 'whatsapp' | 'delivery' | 'tv' | 'operations';
  action: string;
  entityType?: string;
  entityId?: string | null;
  entityName?: string | null;
  changes?: Record<string, any> | null;
};

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const [memberResult, profileResult] = await Promise.all([
      supabase
        .from('restaurant_members')
        .select('role, invited_email')
        .eq('user_id', user.id)
        .eq('restaurant_id', input.restaurantId)
        .eq('status', 'active')
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    const profile = profileResult.data;
    const member = memberResult.data;

    const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
    const actorName = profileName || member?.invited_email || user.email || 'Desconhecido';

    await supabase.from('activity_log').insert({
      restaurant_id: input.restaurantId,
      unit_id: input.unitId ?? null,
      actor_user_id: user.id,
      actor_name: actorName,
      actor_role: member?.role ?? null,
      module: input.module,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      entity_name: input.entityName ?? null,
      changes: input.changes ?? null,
    });
  } catch (err) {
    console.error('logActivity failed:', err);
  }
}
