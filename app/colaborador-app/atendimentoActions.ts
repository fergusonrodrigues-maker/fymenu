"use server";

import { createAdminClient } from "@/lib/supabase/admin";

const WAITER_ROLES = new Set(["waiter", "manager"]);

async function authenticate(token: string) {
  if (!token) throw new Error("Sessão inválida");
  const db = createAdminClient();
  const { data: session } = await db
    .from("employee_sessions")
    .select("employee_id, unit_id, expires_at, revoked_at, employees(id, name, role, is_active)")
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

function assertWaiterRole(role: string | null) {
  if (!role || !WAITER_ROLES.has(role)) throw new Error("Acesso restrito a garçons e gerentes.");
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type MesaWithStatus = {
  id: string;
  number: number;
  label: string | null;
  capacity: number | null;
  status: string;
  current_comanda_id: string | null;
  has_pending_call: boolean;
  comanda: {
    id: string;
    customer_name: string | null;
    opened_at: string;
    total: number;
  } | null;
};

export type MesasResult = {
  mesas: MesaWithStatus[];
  openComandasCount: number;
  pendingCallsCount: number;
  unitRequiresPhone: boolean;
};

export type OpenComandaSummary = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  mesa_id: string | null;
  mesa_number: number | null;
  table_number: number | null;
  total: number;
  guest_count: number | null;
  created_at: string;
  itemCount: number;
};

export type AtendimentoCounts = {
  mesasOccupied: number;
  comandasOpen: number;
  callsPending: number;
};

export type AvailableMesa = {
  id: string;
  number: number;
  label: string | null;
};

export type ComandaDetailResult = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  mesa_number: number | null;
  table_number: number | null;
  total: number;
  guest_count: number | null;
  notes: string | null;
  status: string;
  short_code: string | null;
  created_at: string;
  opened_by_name: string | null;
};

export type CreateComandaInput = {
  source: "mesa" | "balcao";
  mesaId?: string;
  customerName: string;
  customerPhone?: string;
  guestCount?: number;
  notes?: string;
};

// ─── Read actions ────────────────────────────────────────────────────────────

export async function listMesasWithStatus(token: string): Promise<MesasResult> {
  const { db, employeeRole, unitId } = await authenticate(token);
  assertWaiterRole(employeeRole);

  const [mesasRes, comandasRes, callsRes, unitRes] = await Promise.all([
    db.from("mesas")
      .select("id, number, label, capacity, status, current_comanda_id")
      .eq("unit_id", unitId).eq("is_active", true).order("number"),
    db.from("comandas")
      .select("id, mesa_id, customer_name, created_at, total")
      .eq("unit_id", unitId).eq("status", "open"),
    db.from("table_calls")
      .select("id, mesa_id")
      .eq("unit_id", unitId).eq("status", "pending"),
    db.from("units")
      .select("comanda_require_phone").eq("id", unitId).maybeSingle(),
  ]);

  const comandaByMesa = new Map<string, any>();
  (comandasRes.data ?? []).forEach((c: any) => { if (c.mesa_id) comandaByMesa.set(c.mesa_id, c); });
  const callMesaIds = new Set<string>(
    (callsRes.data ?? []).map((c: any) => c.mesa_id).filter(Boolean),
  );

  const mesas: MesaWithStatus[] = (mesasRes.data ?? []).map((m: any) => {
    const c = comandaByMesa.get(m.id);
    return {
      id: m.id, number: m.number, label: m.label,
      capacity: m.capacity ?? null,
      status: m.status,
      current_comanda_id: m.current_comanda_id,
      has_pending_call: callMesaIds.has(m.id),
      comanda: c ? {
        id: c.id,
        customer_name: c.customer_name,
        opened_at: c.created_at,
        total: Number(c.total ?? 0),
      } : null,
    };
  });

  return {
    mesas,
    openComandasCount: comandasRes.data?.length ?? 0,
    pendingCallsCount: callsRes.data?.length ?? 0,
    unitRequiresPhone: unitRes.data?.comanda_require_phone ?? false,
  };
}

export async function listOpenComandas(token: string): Promise<OpenComandaSummary[]> {
  const { db, employeeRole, unitId } = await authenticate(token);
  assertWaiterRole(employeeRole);

  const { data } = await db
    .from("comandas")
    .select("id, customer_name, customer_phone, mesa_id, mesa_number, table_number, total, guest_count, created_at, comanda_items(count)")
    .eq("unit_id", unitId)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return (data ?? []).map((c: any) => ({
    id: c.id,
    customer_name: c.customer_name,
    customer_phone: c.customer_phone,
    mesa_id: c.mesa_id,
    mesa_number: c.mesa_number,
    table_number: c.table_number,
    total: Number(c.total ?? 0),
    guest_count: c.guest_count,
    created_at: c.created_at,
    itemCount: c.comanda_items?.[0]?.count ?? 0,
  }));
}

export async function listAvailableMesas(token: string): Promise<AvailableMesa[]> {
  const { db, employeeRole, unitId } = await authenticate(token);
  assertWaiterRole(employeeRole);

  const { data } = await db.from("mesas")
    .select("id, number, label, status")
    .eq("unit_id", unitId).eq("is_active", true)
    .neq("status", "occupied")
    .order("number");

  return (data ?? []).map((m: any) => ({ id: m.id, number: m.number, label: m.label }));
}

export async function getAtendimentoCounts(token: string): Promise<AtendimentoCounts | null> {
  let auth;
  try { auth = await authenticate(token); } catch { return null; }
  if (!WAITER_ROLES.has(auth.employeeRole ?? "")) return null;

  const { db, unitId } = auth;
  const [mesasRes, comandasRes, callsRes] = await Promise.all([
    db.from("mesas").select("id", { count: "exact", head: true })
      .eq("unit_id", unitId).eq("is_active", true).eq("status", "occupied"),
    db.from("comandas").select("id", { count: "exact", head: true })
      .eq("unit_id", unitId).eq("status", "open"),
    db.from("table_calls").select("id", { count: "exact", head: true })
      .eq("unit_id", unitId).eq("status", "pending"),
  ]);

  return {
    mesasOccupied: mesasRes.count ?? 0,
    comandasOpen: comandasRes.count ?? 0,
    callsPending: callsRes.count ?? 0,
  };
}

export async function getComandaDetail(token: string, comandaId: string): Promise<ComandaDetailResult | null> {
  const { db, employeeRole, unitId } = await authenticate(token);
  assertWaiterRole(employeeRole);

  const { data } = await db
    .from("comandas")
    .select("id, unit_id, customer_name, customer_phone, mesa_number, table_number, total, guest_count, notes, status, short_code, created_at, opened_by_name")
    .eq("id", comandaId)
    .maybeSingle();

  if (!data || data.unit_id !== unitId) return null;

  return {
    id: data.id,
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    mesa_number: data.mesa_number,
    table_number: data.table_number,
    total: Number(data.total ?? 0),
    guest_count: data.guest_count,
    notes: data.notes,
    status: data.status,
    short_code: data.short_code,
    created_at: data.created_at,
    opened_by_name: data.opened_by_name,
  };
}

// ─── Mutations ───────────────────────────────────────────────────────────────

function generateShortCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function createComanda(
  token: string,
  input: CreateComandaInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  let auth;
  try { auth = await authenticate(token); } catch (e: any) {
    return { ok: false, error: e?.message ?? "Sessão inválida" };
  }
  const { db, employeeId, employeeName, employeeRole, unitId } = auth;
  if (!WAITER_ROLES.has(employeeRole ?? "")) {
    return { ok: false, error: "Acesso restrito a garçons e gerentes." };
  }

  const name = input.customerName.trim();
  if (name.length < 2) return { ok: false, error: "Informe o nome do cliente (mínimo 2 caracteres)." };

  const phone = (input.customerPhone ?? "").replace(/\D/g, "");

  const { data: unit } = await db
    .from("units")
    .select("comanda_require_phone")
    .eq("id", unitId)
    .maybeSingle();
  const requirePhone = unit?.comanda_require_phone ?? false;
  if (input.source === "mesa" && requirePhone && phone.length < 8) {
    return { ok: false, error: "Telefone obrigatório nesta unidade (mínimo 8 dígitos)." };
  }

  let mesaId: string | null = null;
  let mesaNumber: number | null = null;
  if (input.source === "mesa") {
    if (!input.mesaId) return { ok: false, error: "Selecione uma mesa." };
    const { data: mesa } = await db
      .from("mesas")
      .select("id, number, status, unit_id")
      .eq("id", input.mesaId)
      .maybeSingle();
    if (!mesa || mesa.unit_id !== unitId) return { ok: false, error: "Mesa não encontrada." };
    if (mesa.status === "occupied") return { ok: false, error: "Esta mesa foi ocupada por outro garçom agora." };
    mesaId = mesa.id;
    mesaNumber = mesa.number;
  }

  const shortCode = generateShortCode();
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  const { data: comanda, error } = await db
    .from("comandas")
    .insert({
      unit_id: unitId,
      mesa_id: mesaId,
      mesa_number: mesaNumber,
      table_number: mesaNumber,
      customer_name: name,
      customer_phone: phone || null,
      guest_count: input.guestCount ?? null,
      notes: input.notes?.trim() || null,
      opened_by: employeeId,
      opened_by_name: employeeName,
      opened_by_role: employeeRole,
      waiter_id: employeeId,
      waiter_name: employeeName,
      status: "open",
      short_code: shortCode,
      hash,
    })
    .select("id")
    .single();

  if (error || !comanda) {
    return { ok: false, error: error?.message ?? "Falha ao abrir comanda." };
  }

  if (mesaId) {
    await db.from("mesas").update({
      status: "occupied",
      current_comanda_id: comanda.id,
      current_waiter_id: employeeId,
      updated_at: new Date().toISOString(),
    }).eq("id", mesaId);
  }

  // Auto-register customer in CRM when phone is provided. The constraint
  // crm_customers_source_check requires `source` to be in the whitelist
  // (which now includes 'comanda') and `source_method` is non-null.
  if (phone.length >= 10) {
    try {
      const { data: existing } = await db
        .from("crm_customers")
        .select("id")
        .eq("unit_id", unitId)
        .eq("phone", phone)
        .maybeSingle();

      const nowIso = new Date().toISOString();
      if (existing) {
        await db
          .from("crm_customers")
          .update({ last_visit_at: nowIso, name })
          .eq("id", existing.id);
      } else {
        await db.from("crm_customers").insert({
          unit_id: unitId,
          name,
          phone,
          source: "comanda",
          source_method: "native",
          first_order_at: nowIso,
          last_visit_at: nowIso,
        });
      }
    } catch (e) {
      // Never block comanda creation on CRM bookkeeping.
      console.error("createComanda: crm_customers upsert failed:", e);
    }
  }

  await db.from("comanda_audit_log").insert({
    comanda_id: comanda.id,
    unit_id: unitId,
    action: "comanda_opened",
    new_value: JSON.stringify({
      customer_name: name,
      customer_phone: phone || null,
      mesa_number: mesaNumber,
      guest_count: input.guestCount ?? null,
      source: input.source,
    }),
    performed_by: employeeId,
    performed_by_role: employeeRole ?? "waiter",
    performed_by_name: employeeName,
  });

  return { ok: true, id: comanda.id };
}
