"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/audit/logActivity";
import { ensureTodayTasks } from "@/lib/tarefas/ensureTodayTasks";
import { revalidatePath } from "next/cache";

async function getUser(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  return user;
}

async function assertMember(supabase: any, userId: string, restaurantId: string) {
  const { data } = await supabase
    .from("restaurant_members")
    .select("id")
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId)
    .eq("status", "active")
    .maybeSingle();
  if (!data) throw new Error("Sem permissão.");
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskTemplateInput = {
  restaurantId: string;
  unitId: string;
  name: string;
  description?: string;
  frequency: "daily" | "weekly" | "monthly";
  weekdays?: number[];
  monthly_day?: number | null;
  suggested_time?: string;
  assignment_type: "role" | "employee";
  assigned_role?: string;
  assigned_employee_id?: string;
  requires_photo: boolean;
  notify_owner_on_complete: boolean;
};

export type ManualTaskInput = {
  restaurantId: string;
  unitId: string;
  name: string;
  description?: string;
  due_date: string;
  due_time?: string;
  assignment_type: "role" | "employee";
  assigned_role?: string;
  assigned_employee_id?: string;
  requires_photo: boolean;
};

export type TaskTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  weekdays: number[];
  monthly_day: number | null;
  suggested_time: string | null;
  assignment_type: string;
  assigned_role: string | null;
  assigned_employee_id: string | null;
  requires_photo: boolean;
  notify_owner_on_complete: boolean;
  is_active: boolean;
  created_at: string;
};

export type TaskInstanceRow = {
  id: string;
  name: string;
  description: string | null;
  due_date: string;
  due_time: string | null;
  assignment_type: string;
  assigned_role: string | null;
  assigned_employee_id: string | null;
  requires_photo: boolean;
  status: string;
  source: string;
  template_id: string | null;
  task_completions: Array<{
    id: string;
    completed_at: string;
    employee_id: string;
    notes: string | null;
    photo_url: string | null;
    photo_path: string | null;
  }>;
};

export type CompletionRow = {
  id: string;
  task_instance_id: string;
  employee_id: string;
  notes: string | null;
  photo_url: string | null;
  photo_path: string | null;
  signed_photo_url: string | null;
  completed_at: string;
  task_instances: { id: string; name: string; unit_id: string } | null;
  employees: { id: string; name: string } | null;
};

// ─── Template mutations ───────────────────────────────────────────────────────

export async function createTaskTemplate(input: TaskTemplateInput): Promise<void> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  await assertMember(supabase, user.id, input.restaurantId);

  const { data, error } = await supabase.from("task_templates").insert({
    unit_id: input.unitId,
    restaurant_id: input.restaurantId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    frequency: input.frequency,
    weekdays: input.weekdays ?? [],
    monthly_day: input.monthly_day ?? null,
    suggested_time: input.suggested_time || null,
    assignment_type: input.assignment_type,
    assigned_role: input.assigned_role || null,
    assigned_employee_id: input.assigned_employee_id || null,
    requires_photo: input.requires_photo,
    notify_owner_on_complete: input.notify_owner_on_complete,
    created_by: user.id,
  }).select("id").single();

  if (error) throw new Error(error.message);

  await logActivity({
    restaurantId: input.restaurantId,
    unitId: input.unitId,
    module: "team",
    action: "create_task_template",
    entityType: "task_template",
    entityId: data.id,
    entityName: input.name.trim(),
  });

  revalidatePath("/painel");
}

export async function updateTaskTemplate(id: string, input: TaskTemplateInput): Promise<void> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  await assertMember(supabase, user.id, input.restaurantId);

  const { error } = await supabase.from("task_templates").update({
    name: input.name.trim(),
    description: input.description?.trim() || null,
    frequency: input.frequency,
    weekdays: input.weekdays ?? [],
    monthly_day: input.monthly_day ?? null,
    suggested_time: input.suggested_time || null,
    assignment_type: input.assignment_type,
    assigned_role: input.assigned_role || null,
    assigned_employee_id: input.assigned_employee_id || null,
    requires_photo: input.requires_photo,
    notify_owner_on_complete: input.notify_owner_on_complete,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) throw new Error(error.message);

  await logActivity({
    restaurantId: input.restaurantId,
    unitId: input.unitId,
    module: "team",
    action: "update_task_template",
    entityType: "task_template",
    entityId: id,
    entityName: input.name.trim(),
  });

  revalidatePath("/painel");
}

export async function deleteTaskTemplate(id: string, restaurantId: string, unitId: string): Promise<void> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  await assertMember(supabase, user.id, restaurantId);

  const { data: existing } = await supabase.from("task_templates").select("name").eq("id", id).maybeSingle();

  const { error } = await supabase.from("task_templates").update({
    is_active: false,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) throw new Error(error.message);

  await logActivity({
    restaurantId,
    unitId,
    module: "team",
    action: "delete_task_template",
    entityType: "task_template",
    entityId: id,
    entityName: existing?.name ?? undefined,
  });

  revalidatePath("/painel");
}

export async function toggleTaskTemplate(
  id: string,
  isActive: boolean,
  restaurantId: string,
  unitId: string,
): Promise<void> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  await assertMember(supabase, user.id, restaurantId);

  const { data: existing } = await supabase.from("task_templates").select("name").eq("id", id).maybeSingle();

  const { error } = await supabase.from("task_templates").update({
    is_active: isActive,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) throw new Error(error.message);

  await logActivity({
    restaurantId,
    unitId,
    module: "team",
    action: isActive ? "activate_task_template" : "deactivate_task_template",
    entityType: "task_template",
    entityId: id,
    entityName: existing?.name ?? undefined,
  });

  revalidatePath("/painel");
}

// ─── Instance mutations ───────────────────────────────────────────────────────

export async function createManualTaskInstance(input: ManualTaskInput): Promise<void> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  await assertMember(supabase, user.id, input.restaurantId);

  const { data, error } = await supabase.from("task_instances").insert({
    unit_id: input.unitId,
    restaurant_id: input.restaurantId,
    source: "manual",
    name: input.name.trim(),
    description: input.description?.trim() || null,
    due_date: input.due_date,
    due_time: input.due_time || null,
    assignment_type: input.assignment_type,
    assigned_role: input.assigned_role || null,
    assigned_employee_id: input.assigned_employee_id || null,
    requires_photo: input.requires_photo,
    notify_owner_on_complete: true,
    status: "pending",
    created_by: user.id,
  }).select("id").single();

  if (error) throw new Error(error.message);

  await logActivity({
    restaurantId: input.restaurantId,
    unitId: input.unitId,
    module: "team",
    action: "create_manual_task",
    entityType: "task_instance",
    entityId: data.id,
    entityName: input.name.trim(),
  });

  revalidatePath("/painel");
}

export async function updateTaskInstance(id: string, input: ManualTaskInput): Promise<void> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  await assertMember(supabase, user.id, input.restaurantId);

  const { error } = await supabase.from("task_instances").update({
    name: input.name.trim(),
    description: input.description?.trim() || null,
    due_date: input.due_date,
    due_time: input.due_time || null,
    assignment_type: input.assignment_type,
    assigned_role: input.assigned_role || null,
    assigned_employee_id: input.assigned_employee_id || null,
    requires_photo: input.requires_photo,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) throw new Error(error.message);

  await logActivity({
    restaurantId: input.restaurantId,
    unitId: input.unitId,
    module: "team",
    action: "update_manual_task",
    entityType: "task_instance",
    entityId: id,
    entityName: input.name.trim(),
  });

  revalidatePath("/painel");
}

export async function deleteTaskInstance(id: string, restaurantId: string, unitId: string): Promise<void> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  await assertMember(supabase, user.id, restaurantId);

  const { data: existing } = await supabase.from("task_instances").select("name").eq("id", id).maybeSingle();
  const { error } = await supabase.from("task_instances").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logActivity({
    restaurantId,
    unitId,
    module: "team",
    action: "delete_task_instance",
    entityType: "task_instance",
    entityId: id,
    entityName: existing?.name ?? undefined,
  });

  revalidatePath("/painel");
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listTaskInstances(
  unitId: string,
  restaurantId: string,
): Promise<TaskInstanceRow[]> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  await assertMember(supabase, user.id, restaurantId);

  // Lazy-generate today's task instances + expire old ones before listing.
  await ensureTodayTasks(unitId);

  const past = new Date();
  past.setDate(past.getDate() - 7);
  const future = new Date();
  future.setDate(future.getDate() + 7);

  const { data, error } = await supabase
    .from("task_instances")
    .select("*, task_completions(id, completed_at, employee_id, notes, photo_url, photo_path)")
    .eq("unit_id", unitId)
    .gte("due_date", past.toISOString().split("T")[0])
    .lte("due_date", future.toISOString().split("T")[0])
    .order("due_date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TaskInstanceRow[];
}

export async function listTaskTemplates(
  unitId: string,
  restaurantId: string,
): Promise<TaskTemplateRow[]> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  await assertMember(supabase, user.id, restaurantId);

  const { data, error } = await supabase
    .from("task_templates")
    .select("*")
    .eq("unit_id", unitId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TaskTemplateRow[];
}

export async function listTaskCompletions(
  unitId: string,
  restaurantId: string,
  filters?: {
    employeeId?: string;
    taskName?: string;
    fromDate?: string;
    toDate?: string;
  },
): Promise<CompletionRow[]> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  await assertMember(supabase, user.id, restaurantId);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let query = supabase
    .from("task_completions")
    .select("*, task_instances!inner(id, name, unit_id), employees(id, name)")
    .eq("task_instances.unit_id", unitId)
    .gte("completed_at", filters?.fromDate ?? thirtyDaysAgo.toISOString())
    .order("completed_at", { ascending: false })
    .limit(200);

  if (filters?.toDate) query = query.lte("completed_at", filters.toDate + "T23:59:59Z");
  if (filters?.employeeId) query = query.eq("employee_id", filters.employeeId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let result = (data ?? []) as CompletionRow[];
  if (filters?.taskName) {
    const needle = filters.taskName.toLowerCase();
    result = result.filter((c) =>
      (c.task_instances?.name ?? "").toLowerCase().includes(needle),
    );
  }

  // Batch-generate 1h signed URLs for every completion that has a photo. The
  // task-photos bucket is private; the raw photo_path stored in the row is NOT
  // a usable URL — clients must consume signed_photo_url.
  await Promise.all(
    result.map(async (c) => {
      if (c.photo_path) {
        const { data: signed } = await supabase.storage
          .from("task-photos")
          .createSignedUrl(c.photo_path, 3600);
        c.signed_photo_url = signed?.signedUrl ?? null;
      } else {
        c.signed_photo_url = null;
      }
    }),
  );

  return result;
}

export async function getCompletionPhotoUrl(photoPath: string): Promise<string | null> {
  if (!photoPath) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("task-photos").createSignedUrl(photoPath, 3600);
  return data?.signedUrl ?? null;
}
