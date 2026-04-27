"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ensureTodayTasks } from "@/lib/tarefas/ensureTodayTasks";
import { createNotification } from "@/lib/notifications/createNotification";

// Painel uses Portuguese keys ("garcom", "cozinha"), employees table uses
// English keys ("waiter", "chef"). When a task is assigned to a role from the
// painel, we expand the employee's role to its Portuguese counterpart so the
// match works. "geral" is a catch-all that matches every employee.
const EMPLOYEE_TO_PAINEL_ROLE: Record<string, string> = {
  waiter:    "garcom",
  chef:      "cozinha",
  manager:   "gerente",
  driver:    "entregador",
  cashier:   "caixa",
  cleaner:   "limpeza",
  financial: "geral",
};

function matchingPainelRoles(employeeRole: string | null | undefined): string[] {
  const mapped = employeeRole ? EMPLOYEE_TO_PAINEL_ROLE[employeeRole] : undefined;
  return mapped ? [mapped, "geral"] : ["geral"];
}

async function authenticate(token: string) {
  if (!token) throw new Error("Sessão inválida");
  const db = createAdminClient();
  const { data: session } = await db
    .from("employee_sessions")
    .select("employee_id, unit_id, expires_at, revoked_at, employees(id, name, role, is_active, unit_id)")
    .eq("token", token)
    .maybeSingle();

  if (!session || session.revoked_at) throw new Error("Sessão inválida");
  if (new Date(session.expires_at) < new Date()) throw new Error("Sessão expirada");
  const emp = (session as any).employees;
  if (!emp || !emp.is_active) throw new Error("Funcionário inativo");

  return {
    db,
    employeeId: emp.id as string,
    employeeName: emp.name as string,
    employeeRole: emp.role as string | null,
    unitId: session.unit_id as string,
  };
}

export type MyTaskRow = {
  id: string;
  name: string;
  description: string | null;
  due_date: string;
  due_time: string | null;
  requires_photo: boolean;
  status: string;
  source: string;
  template_id: string | null;
  assignment_type: string;
  completed_at?: string | null;
};

export type MyTasksResult = {
  hoje: MyTaskRow[];
  atrasadas: MyTaskRow[];
  concluidas: MyTaskRow[];
};

export async function listMyTasks(token: string): Promise<MyTasksResult> {
  const { db, employeeId, employeeRole, unitId } = await authenticate(token);

  // Make sure today's instances exist before listing.
  await ensureTodayTasks(unitId);

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const matchRoles = matchingPainelRoles(employeeRole);

  // Pending tasks: assigned to me OR to a role I match.
  const [byEmployee, byRole, completed] = await Promise.all([
    db
      .from("task_instances")
      .select("id, name, description, due_date, due_time, requires_photo, status, source, template_id, assignment_type")
      .eq("unit_id", unitId)
      .eq("status", "pending")
      .eq("assignment_type", "employee")
      .eq("assigned_employee_id", employeeId),
    db
      .from("task_instances")
      .select("id, name, description, due_date, due_time, requires_photo, status, source, template_id, assignment_type")
      .eq("unit_id", unitId)
      .eq("status", "pending")
      .eq("assignment_type", "role")
      .in("assigned_role", matchRoles),
    db
      .from("task_completions")
      .select("completed_at, task_instances!inner(id, name, description, due_date, due_time, requires_photo, status, source, template_id, assignment_type, unit_id)")
      .eq("employee_id", employeeId)
      .eq("task_instances.unit_id", unitId)
      .gte("completed_at", sevenDaysAgo.toISOString())
      .order("completed_at", { ascending: false })
      .limit(50),
  ]);

  const pending: MyTaskRow[] = [
    ...(byEmployee.data ?? []),
    ...(byRole.data ?? []),
  ];
  // Dedupe by id (shouldn't overlap, but be safe)
  const seen = new Set<string>();
  const uniquePending = pending.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));

  const hoje      = uniquePending.filter((t) => t.due_date === today);
  const atrasadas = uniquePending.filter((t) => t.due_date < today);

  const concluidas: MyTaskRow[] = (completed.data ?? []).map((c: any) => ({
    ...c.task_instances,
    completed_at: c.completed_at,
  }));

  return { hoje, atrasadas, concluidas };
}

export async function completeTask(
  token: string,
  taskInstanceId: string,
  notes?: string,
  photoBase64?: string,
): Promise<{ success: true }> {
  const { db, employeeId, employeeName, employeeRole, unitId } = await authenticate(token);
  if (!taskInstanceId) throw new Error("Tarefa inválida");

  // Load task and verify it belongs to the employee (directly or via role).
  const { data: task } = await db
    .from("task_instances")
    .select("id, name, unit_id, restaurant_id, status, requires_photo, assignment_type, assigned_role, assigned_employee_id, notify_owner_on_complete")
    .eq("id", taskInstanceId)
    .maybeSingle();

  if (!task) throw new Error("Tarefa não encontrada");
  if (task.unit_id !== unitId) throw new Error("Tarefa não pertence à sua unidade");
  if (task.status !== "pending") throw new Error("Tarefa já concluída ou expirada");

  const isMineByEmployee =
    task.assignment_type === "employee" && task.assigned_employee_id === employeeId;
  const isMineByRole =
    task.assignment_type === "role" &&
    matchingPainelRoles(employeeRole).includes(task.assigned_role ?? "");
  if (!isMineByEmployee && !isMineByRole) throw new Error("Tarefa não atribuída a você");

  if (task.requires_photo && !photoBase64) {
    throw new Error("Foto obrigatória para concluir esta tarefa");
  }

  // Photo upload (optional).
  let photoPath: string | null = null;
  if (photoBase64) {
    const buffer = Buffer.from(photoBase64, "base64");
    if (buffer.byteLength > 5 * 1024 * 1024) {
      throw new Error("Foto excede 5MB. Tente novamente com uma imagem menor.");
    }
    const ts = Date.now();
    photoPath = `${unitId}/${taskInstanceId}/${employeeId}_${ts}.jpg`;
    const { error: upErr } = await db.storage
      .from("task-photos")
      .upload(photoPath, buffer, {
        contentType: "image/jpeg",
        upsert: false,
      });
    if (upErr) throw new Error(`Falha ao enviar foto: ${upErr.message}`);
  }

  const whatsappStatus = task.notify_owner_on_complete ? "pending" : "skipped";

  const { data: completion, error: complErr } = await db
    .from("task_completions")
    .insert({
      task_instance_id: taskInstanceId,
      employee_id: employeeId,
      notes: notes?.trim() || null,
      photo_url: photoPath,
      photo_path: photoPath,
      whatsapp_notification_status: whatsappStatus,
    })
    .select("id")
    .single();

  if (complErr || !completion) {
    // Best-effort cleanup of uploaded photo if completion insert fails.
    if (photoPath) {
      try { await db.storage.from("task-photos").remove([photoPath]); } catch { /* */ }
    }
    throw new Error(complErr?.message ?? "Falha ao registrar conclusão");
  }

  const { error: updErr } = await db
    .from("task_instances")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", taskInstanceId);

  if (updErr) throw new Error(updErr.message);

  // Notify the owner (in-app log + WhatsApp). Fire-and-forget: createNotification
  // never throws and the await is bounded by the Z-API HTTP timeout.
  if (task.notify_owner_on_complete) {
    const horaAgora = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit", minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });

    await createNotification({
      restaurantId: task.restaurant_id,
      unitId: task.unit_id,
      category: "task_completed",
      title: `${employeeName} concluiu uma tarefa`,
      body: `"${task.name}" às ${horaAgora}`,
      linkUrl: "/painel?modal=tarefas&tab=historico",
      sourceType: "task_completion",
      sourceId: completion.id,
      sendWhatsapp: true,
      whatsappMessage:
        `✅ ${employeeName} concluiu a tarefa "${task.name}" às ${horaAgora}.\n\n` +
        `Ver detalhes no FyMenu: https://fymenu.com/painel`,
    });
  }

  return { success: true };
}
