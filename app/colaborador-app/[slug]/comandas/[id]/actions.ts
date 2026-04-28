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

export type ComandaItemRow = {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number; // cents
  addons: Array<{ id?: string; name: string; price: number }>;
  notes: string | null;
  status: string;
  added_by_name: string | null;
  added_by_role: string | null;
  created_at: string;
};

export type ComandaFullDetail = {
  id: string;
  short_code: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  mesa_id: string | null;
  mesa_number: number | null;
  table_number: number | null;
  guest_count: number | null;
  notes: string | null;
  status: string;
  total: number;
  subtotal: number;
  created_at: string;
  opened_by_name: string | null;
  items: ComandaItemRow[];
};

export type CategoryForCart = {
  id: string;
  name: string;
};

export type ProductForCart = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  base_price: number;
  thumbnail_url: string | null;
  variations: { id: string; name: string; price: number }[];
};

export type CartItemInput = {
  productId: string;
  productName: string;
  variationName?: string;
  quantity: number;
  unitPrice: number; // cents
  addons?: Array<{ id?: string; name: string; price: number }>;
  notes?: string;
};

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getComandaDetail(token: string, comandaId: string): Promise<ComandaFullDetail | null> {
  const { db, employeeRole, unitId } = await authenticate(token);
  assertWaiterRole(employeeRole);

  const [comandaRes, itemsRes] = await Promise.all([
    db.from("comandas")
      .select("id, unit_id, short_code, customer_name, customer_phone, mesa_id, mesa_number, table_number, guest_count, notes, status, total, subtotal, created_at, opened_by_name")
      .eq("id", comandaId)
      .maybeSingle(),
    db.from("comanda_items")
      .select("id, product_id, product_name, quantity, unit_price, addons, notes, status, added_by_name, added_by_role, created_at")
      .eq("comanda_id", comandaId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true }),
  ]);

  if (!comandaRes.data || comandaRes.data.unit_id !== unitId) return null;
  const c = comandaRes.data;

  // Self-heal: if a comanda's stored subtotal doesn't match the current line
  // total (e.g. row predates the recompute logic), fix it once on first view.
  // Only writes when there's drift, so cost is bounded.
  let subtotalNum = Number(c.subtotal ?? 0);
  let totalNum = Number(c.total ?? 0);
  if (c.status === "open" && (itemsRes.data?.length ?? 0) > 0) {
    const expected = (itemsRes.data ?? []).reduce(
      (s: number, i: any) => s + Number(i.unit_price ?? 0) * Number(i.quantity ?? 1) + Number(i.addons_total ?? 0),
      0,
    );
    if (expected !== subtotalNum || expected !== totalNum) {
      subtotalNum = await recomputeComandaTotal(db, c.id);
      totalNum = subtotalNum;
    }
  }

  return {
    id: c.id,
    short_code: c.short_code,
    customer_name: c.customer_name,
    customer_phone: c.customer_phone,
    mesa_id: c.mesa_id,
    mesa_number: c.mesa_number,
    table_number: c.table_number,
    guest_count: c.guest_count,
    notes: c.notes,
    status: c.status,
    total: totalNum,
    subtotal: subtotalNum,
    created_at: c.created_at,
    opened_by_name: c.opened_by_name,
    items: (itemsRes.data ?? []).map((i: any) => ({
      id: i.id,
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: Number(i.quantity ?? 1),
      unit_price: Number(i.unit_price ?? 0),
      addons: Array.isArray(i.addons) ? i.addons : [],
      notes: i.notes,
      status: i.status,
      added_by_name: i.added_by_name,
      added_by_role: i.added_by_role,
      created_at: i.created_at,
    })),
  };
}

export async function listProductsForCart(token: string): Promise<{
  products: ProductForCart[];
  categories: CategoryForCart[];
}> {
  const { db, employeeRole, unitId } = await authenticate(token);
  assertWaiterRole(employeeRole);

  const { data: cats } = await db
    .from("categories")
    .select("id, name, order_index, is_active")
    .eq("unit_id", unitId)
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  const catIds = (cats ?? []).map((c: any) => c.id);
  if (catIds.length === 0) return { products: [], categories: [] };

  const { data: prods } = await db
    .from("products")
    .select("id, category_id, name, description, base_price, thumbnail_url, is_active, order_index")
    .in("category_id", catIds)
    .eq("is_active", true)
    .order("order_index", { ascending: true })
    .limit(500);

  const prodIds = (prods ?? []).map((p: any) => p.id);

  const { data: vars } = prodIds.length
    ? await db.from("product_variations")
      .select("id, product_id, name, price, order_index")
      .in("product_id", prodIds)
      .order("order_index", { ascending: true })
    : { data: [] };

  const varsByProduct = new Map<string, { id: string; name: string; price: number }[]>();
  (vars ?? []).forEach((v: any) => {
    const arr = varsByProduct.get(v.product_id) ?? [];
    arr.push({ id: v.id, name: v.name, price: Number(v.price ?? 0) });
    varsByProduct.set(v.product_id, arr);
  });

  return {
    products: (prods ?? []).map((p: any) => ({
      id: p.id,
      category_id: p.category_id,
      name: p.name,
      description: p.description,
      base_price: Number(p.base_price ?? 0),
      thumbnail_url: p.thumbnail_url,
      variations: varsByProduct.get(p.id) ?? [],
    })),
    categories: (cats ?? []).map((c: any) => ({ id: c.id, name: c.name })),
  };
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Sums every non-cancelled item line + addons and writes the result back to
 * `comandas.subtotal` and `comandas.total`. Returns the computed subtotal so
 * callers can self-heal stale rows without re-reading.
 *
 * Defensive: tries `addons_total` first; if the column doesn't exist (or any
 * other read error), falls back to qty × unit_price.
 */
async function recomputeComandaTotal(db: any, comandaId: string): Promise<number> {
  let items: Array<{ quantity: number; unit_price: number; addons_total?: number }> | null = null;

  const withAddons = await db.from("comanda_items")
    .select("quantity, unit_price, addons_total")
    .eq("comanda_id", comandaId)
    .neq("status", "cancelled");

  if (withAddons.error) {
    const fallback = await db.from("comanda_items")
      .select("quantity, unit_price")
      .eq("comanda_id", comandaId)
      .neq("status", "cancelled");
    if (fallback.error) {
      console.error("recomputeComandaTotal: select failed:", fallback.error);
      return 0;
    }
    items = (fallback.data as any) ?? [];
  } else {
    items = (withAddons.data as any) ?? [];
  }

  let subtotal = 0;
  for (const i of items ?? []) {
    const line = Number(i.unit_price ?? 0) * Number(i.quantity ?? 1);
    const addons = Number((i as any).addons_total ?? 0);
    subtotal += line + addons;
  }

  const { error: updErr } = await db.from("comandas").update({
    subtotal,
    total: subtotal,
    updated_at: new Date().toISOString(),
  }).eq("id", comandaId);
  if (updErr) console.error("recomputeComandaTotal: update failed:", updErr);

  return subtotal;
}

export async function sendCartToKitchen(
  token: string,
  comandaId: string,
  items: CartItemInput[],
): Promise<{ ok: true; itemsAdded: number } | { ok: false; error: string }> {
  let auth;
  try { auth = await authenticate(token); } catch (e: any) {
    return { ok: false, error: e?.message ?? "Sessão inválida" };
  }
  const { db, employeeId, employeeName, employeeRole, unitId } = auth;
  if (!WAITER_ROLES.has(employeeRole ?? "")) {
    return { ok: false, error: "Acesso restrito a garçons e gerentes." };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Carrinho vazio." };
  }

  const { data: comanda } = await db
    .from("comandas")
    .select("id, unit_id, status")
    .eq("id", comandaId)
    .maybeSingle();
  if (!comanda || comanda.unit_id !== unitId) return { ok: false, error: "Comanda não encontrada." };
  if (comanda.status !== "open") return { ok: false, error: "Comanda não está aberta." };

  // Defensive validation
  for (const i of items) {
    if (!i.productId || !i.productName) return { ok: false, error: "Item inválido no carrinho." };
    if (!Number.isFinite(i.quantity) || i.quantity < 1) return { ok: false, error: "Quantidade inválida." };
    if (!Number.isFinite(i.unitPrice) || i.unitPrice < 0) return { ok: false, error: "Preço inválido." };
  }

  const rows = items.map((i) => ({
    comanda_id: comandaId,
    product_id: i.productId,
    product_name: i.variationName ? `${i.productName} — ${i.variationName}` : i.productName,
    quantity: i.quantity,
    unit_price: i.unitPrice,
    addons: i.addons ?? [],
    notes: i.notes?.trim() || null,
    status: "pending",
    added_by: employeeId,
    added_by_name: employeeName,
    added_by_role: employeeRole ?? "waiter",
  }));

  const { error: insErr } = await db.from("comanda_items").insert(rows);
  if (insErr) return { ok: false, error: insErr.message };

  await recomputeComandaTotal(db, comandaId);

  const totalAdded = items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
  await db.from("comanda_audit_log").insert({
    comanda_id: comandaId,
    unit_id: unitId,
    action: "items_added",
    new_value: JSON.stringify({
      items_count: items.length,
      total_added: totalAdded,
      items: items.map((i) => ({
        name: i.variationName ? `${i.productName} — ${i.variationName}` : i.productName,
        qty: i.quantity,
        unit_price: i.unitPrice,
      })),
    }),
    performed_by: employeeId,
    performed_by_role: employeeRole ?? "waiter",
    performed_by_name: employeeName,
  });

  return { ok: true, itemsAdded: items.length };
}

// ─── Cancel item / edit / cancel comanda ─────────────────────────────────────

export async function cancelComandaItem(
  token: string,
  itemId: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let auth;
  try { auth = await authenticate(token); } catch (e: any) {
    return { ok: false, error: e?.message ?? "Sessão inválida" };
  }
  const { db, employeeId, employeeName, employeeRole, unitId } = auth;
  if (!WAITER_ROLES.has(employeeRole ?? "")) {
    return { ok: false, error: "Acesso restrito a garçons e gerentes." };
  }
  const trimmedReason = (reason ?? "").trim();
  if (trimmedReason.length < 10) {
    return { ok: false, error: "Informe um motivo (mínimo 10 caracteres)." };
  }

  const { data: item } = await db
    .from("comanda_items")
    .select("id, comanda_id, product_name, status, added_by, comandas:comanda_id(id, unit_id)")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return { ok: false, error: "Item não encontrado." };

  const comanda: any = (item as any).comandas;
  if (!comanda || comanda.unit_id !== unitId) {
    return { ok: false, error: "Item não pertence a sua unidade." };
  }
  if (item.status === "cancelled") return { ok: false, error: "Item já foi cancelado." };

  // Permission: waiter can cancel only items they added; manager can cancel any.
  if (employeeRole === "waiter" && item.added_by && item.added_by !== employeeId) {
    return { ok: false, error: "Só o gerente pode cancelar itens lançados por outro garçom." };
  }

  const { error: updErr } = await db
    .from("comanda_items")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", itemId);
  if (updErr) return { ok: false, error: updErr.message };

  await recomputeComandaTotal(db, item.comanda_id);

  await db.from("comanda_audit_log").insert({
    comanda_id: item.comanda_id,
    unit_id: unitId,
    action: "item_cancelled",
    item_id: itemId,
    item_name: item.product_name,
    reason: trimmedReason,
    performed_by: employeeId,
    performed_by_role: employeeRole ?? "waiter",
    performed_by_name: employeeName,
  });

  return { ok: true };
}

export type UpdateComandaInfoInput = {
  customerName?: string;
  customerPhone?: string;
  guestCount?: number | null;
  notes?: string;
};

export async function updateComandaInfo(
  token: string,
  comandaId: string,
  input: UpdateComandaInfoInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let auth;
  try { auth = await authenticate(token); } catch (e: any) {
    return { ok: false, error: e?.message ?? "Sessão inválida" };
  }
  const { db, employeeId, employeeName, employeeRole, unitId } = auth;
  if (!WAITER_ROLES.has(employeeRole ?? "")) {
    return { ok: false, error: "Acesso restrito a garçons e gerentes." };
  }

  const { data: comanda } = await db
    .from("comandas")
    .select("id, unit_id, status, customer_name, customer_phone, guest_count, notes")
    .eq("id", comandaId)
    .maybeSingle();
  if (!comanda || comanda.unit_id !== unitId) return { ok: false, error: "Comanda não encontrada." };
  if (comanda.status !== "open") return { ok: false, error: "Comanda já fechada ou cancelada." };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const changes: Record<string, { from: any; to: any }> = {};

  if (input.customerName !== undefined) {
    const name = input.customerName.trim();
    if (name.length < 2) return { ok: false, error: "Nome do cliente: mínimo 2 caracteres." };
    if (name !== (comanda.customer_name ?? "")) {
      update.customer_name = name;
      changes.customer_name = { from: comanda.customer_name, to: name };
    }
  }
  if (input.customerPhone !== undefined) {
    const phone = input.customerPhone.replace(/\D/g, "") || null;
    if (phone !== (comanda.customer_phone ?? null)) {
      update.customer_phone = phone;
      changes.customer_phone = { from: comanda.customer_phone, to: phone };
    }
  }
  if (input.guestCount !== undefined) {
    const gc = input.guestCount === null ? null : Math.max(1, Math.min(20, input.guestCount));
    if (gc !== (comanda.guest_count ?? null)) {
      update.guest_count = gc;
      changes.guest_count = { from: comanda.guest_count, to: gc };
    }
  }
  if (input.notes !== undefined) {
    const notes = input.notes.trim() || null;
    if (notes !== (comanda.notes ?? null)) {
      update.notes = notes;
      changes.notes = { from: comanda.notes, to: notes };
    }
  }

  if (Object.keys(changes).length === 0) return { ok: true };

  const { error } = await db.from("comandas").update(update).eq("id", comandaId);
  if (error) return { ok: false, error: error.message };

  await db.from("comanda_audit_log").insert({
    comanda_id: comandaId,
    unit_id: unitId,
    action: "comanda_updated",
    new_value: JSON.stringify(changes),
    performed_by: employeeId,
    performed_by_role: employeeRole ?? "waiter",
    performed_by_name: employeeName,
  });

  return { ok: true };
}

export async function cancelComanda(
  token: string,
  comandaId: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let auth;
  try { auth = await authenticate(token); } catch (e: any) {
    return { ok: false, error: e?.message ?? "Sessão inválida" };
  }
  const { db, employeeId, employeeName, employeeRole, unitId } = auth;
  if (!WAITER_ROLES.has(employeeRole ?? "")) {
    return { ok: false, error: "Acesso restrito a garçons e gerentes." };
  }
  const trimmedReason = (reason ?? "").trim();
  if (trimmedReason.length < 10) {
    return { ok: false, error: "Informe um motivo (mínimo 10 caracteres)." };
  }

  const { data: comanda } = await db
    .from("comandas")
    .select("id, unit_id, status, mesa_id")
    .eq("id", comandaId)
    .maybeSingle();
  if (!comanda || comanda.unit_id !== unitId) return { ok: false, error: "Comanda não encontrada." };
  if (comanda.status !== "open") return { ok: false, error: "Comanda já fechada ou cancelada." };

  const nowIso = new Date().toISOString();
  const { error: cancelErr } = await db
    .from("comandas")
    .update({ status: "cancelled", updated_at: nowIso })
    .eq("id", comandaId);
  if (cancelErr) return { ok: false, error: cancelErr.message };

  // Free the mesa if linked.
  if (comanda.mesa_id) {
    await db.from("mesas").update({
      status: "available",
      current_comanda_id: null,
      current_waiter_id: null,
      updated_at: nowIso,
    }).eq("id", comanda.mesa_id);
  }

  await db.from("comanda_audit_log").insert({
    comanda_id: comandaId,
    unit_id: unitId,
    action: "comanda_cancelled",
    reason: trimmedReason,
    performed_by: employeeId,
    performed_by_role: employeeRole ?? "waiter",
    performed_by_name: employeeName,
  });

  return { ok: true };
}

// ─── Close comanda with splits ───────────────────────────────────────────────

export type PaymentMethod = "cash" | "credit" | "debit" | "pix" | "voucher";

export type CloseSplit = {
  customerName: string;
  customerPhone?: string;
  amount: number; // cents
  paymentMethod: PaymentMethod;
  cashChangeFor?: number; // cents, optional, only meaningful for "cash"
};

export type CloseComandaInput = {
  mode: "single" | "equal" | "manual";
  splits: CloseSplit[];
};

export type CloseComandaResult =
  | { ok: true; splitsCreated: number; total: number }
  | { ok: false; error: string };

const VALID_PAYMENT_METHODS: PaymentMethod[] = ["cash", "credit", "debit", "pix", "voucher"];

export async function closeComanda(
  token: string,
  comandaId: string,
  input: CloseComandaInput,
): Promise<CloseComandaResult> {
  let auth;
  try { auth = await authenticate(token); } catch (e: any) {
    return { ok: false, error: e?.message ?? "Sessão inválida" };
  }
  const { db, employeeId, employeeName, employeeRole, unitId } = auth;
  if (!WAITER_ROLES.has(employeeRole ?? "")) {
    return { ok: false, error: "Acesso restrito a garçons e gerentes." };
  }

  // Reload + recompute the comanda's total before validating, in case any
  // items were added/cancelled between the modal load and confirmation.
  const expectedTotal = await recomputeComandaTotal(db, comandaId);

  const { data: comanda } = await db
    .from("comandas")
    .select("id, unit_id, status, mesa_id, total, customer_name")
    .eq("id", comandaId)
    .maybeSingle();
  if (!comanda || comanda.unit_id !== unitId) return { ok: false, error: "Comanda não encontrada." };
  if (comanda.status !== "open") return { ok: false, error: "Comanda já foi fechada ou cancelada." };
  if (expectedTotal <= 0) return { ok: false, error: "Comanda sem itens — adicione pelo menos um antes de fechar." };

  // Validate splits payload
  if (!Array.isArray(input.splits) || input.splits.length === 0) {
    return { ok: false, error: "Pelo menos um pagamento é obrigatório." };
  }
  if (!["single", "equal", "manual"].includes(input.mode)) {
    return { ok: false, error: "Modo de divisão inválido." };
  }

  for (const s of input.splits) {
    if (!s.customerName || s.customerName.trim().length < 2) {
      return { ok: false, error: "Cada pagador precisa de um nome (mín. 2 caracteres)." };
    }
    if (!Number.isFinite(s.amount) || s.amount <= 0) {
      return { ok: false, error: "Cada pagamento precisa de um valor maior que zero." };
    }
    if (!VALID_PAYMENT_METHODS.includes(s.paymentMethod)) {
      return { ok: false, error: "Forma de pagamento inválida." };
    }
  }

  const sumOfSplits = input.splits.reduce((s, x) => s + x.amount, 0);
  // Allow ±1 cent of rounding tolerance for equal-split scenarios.
  if (Math.abs(sumOfSplits - expectedTotal) > 1) {
    return {
      ok: false,
      error: `A soma dos pagamentos (${sumOfSplits / 100}) precisa bater com o total da comanda (${expectedTotal / 100}).`,
    };
  }

  const nowIso = new Date().toISOString();

  // Insert splits
  const splitRows = input.splits.map((s) => ({
    comanda_id: comandaId,
    customer_name: s.customerName.trim(),
    customer_phone: (s.customerPhone ?? "").replace(/\D/g, "") || null,
    amount: s.amount,
    payment_method: s.paymentMethod,
    cash_change_for: s.paymentMethod === "cash" && s.cashChangeFor && s.cashChangeFor > s.amount
      ? s.cashChangeFor
      : null,
    paid_at: nowIso,
    paid_by: employeeId,
    paid_by_name: employeeName,
    paid_by_role: employeeRole ?? "waiter",
  }));

  const { error: splitsErr } = await db.from("comanda_splits").insert(splitRows);
  if (splitsErr) {
    // Some columns may not exist (cash_change_for, paid_by_*) on older
    // schemas. Retry with a minimal payload before giving up.
    const minimalRows = input.splits.map((s) => ({
      comanda_id: comandaId,
      customer_name: s.customerName.trim(),
      customer_phone: (s.customerPhone ?? "").replace(/\D/g, "") || null,
      amount: s.amount,
      payment_method: s.paymentMethod,
      paid_at: nowIso,
    }));
    const retry = await db.from("comanda_splits").insert(minimalRows);
    if (retry.error) {
      console.error("closeComanda: splits insert failed:", splitsErr, retry.error);
      return { ok: false, error: retry.error.message ?? splitsErr.message };
    }
  }

  // Close the comanda
  const { error: closeErr } = await db.from("comandas").update({
    status: "closed",
    closed_at: nowIso,
    closed_by: employeeId,
    closed_by_name: employeeName,
    closed_by_role: employeeRole ?? "waiter",
    updated_at: nowIso,
  }).eq("id", comandaId);
  if (closeErr) {
    console.error("closeComanda: comanda update failed:", closeErr);
    return { ok: false, error: closeErr.message };
  }

  // Free the mesa if linked
  if (comanda.mesa_id) {
    await db.from("mesas").update({
      status: "available",
      current_comanda_id: null,
      current_waiter_id: null,
      updated_at: nowIso,
    }).eq("id", comanda.mesa_id);
  }

  // Audit
  await db.from("comanda_audit_log").insert({
    comanda_id: comandaId,
    unit_id: unitId,
    action: "comanda_closed",
    new_value: JSON.stringify({
      mode: input.mode,
      splits_count: input.splits.length,
      total: expectedTotal,
      payment_methods: input.splits.map((s) => s.paymentMethod),
    }),
    performed_by: employeeId,
    performed_by_role: employeeRole ?? "waiter",
    performed_by_name: employeeName,
  });

  return { ok: true, splitsCreated: input.splits.length, total: expectedTotal };
}

