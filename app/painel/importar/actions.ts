"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizePlanName } from "@/lib/plan";
import { parseMoneyToCents } from "./utils";
import type { ImportTargetTable, ImportSourceMethod, ImportResult } from "./utils";
import OpenAI from "openai";

export type { ImportTargetTable, ImportSourceMethod, ImportResult };

// ─── Date guard: rejects dates outside [now-3years, now] ──────────────────────
const THREE_YEARS_MS = 3 * 365.25 * 24 * 60 * 60 * 1000;

function isDateInAllowedRange(isoDate: string): boolean {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return false;
  const now = Date.now();
  const min = now - THREE_YEARS_MS;
  return d.getTime() >= min && d.getTime() <= now + 60_000; // +1min tolerance
}

// ─── Main server action ────────────────────────────────────────────────────────
export async function createImportBatch(params: {
  unitId: string;
  targetTable: ImportTargetTable;
  sourceMethod: ImportSourceMethod;
  sourceFilename: string | null;
  rows: Record<string, any>[];
  tags: string[];
  notes?: string;
}): Promise<ImportResult> {
  const supabase = await createClient();

  // Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado." };

  // Get restaurant + validate plan
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, plan")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!restaurant) return { ok: false, message: "Restaurante não encontrado." };

  const plan = normalizePlanName(restaurant.plan);
  if (plan !== "business") {
    return { ok: false, message: "Importação histórica disponível apenas no plano Business." };
  }

  // Validate unit ownership
  const { data: unit } = await supabase
    .from("units")
    .select("id")
    .eq("id", params.unitId)
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();

  if (!unit) return { ok: false, message: "Unidade não encontrada ou sem permissão." };

  if (params.rows.length === 0) return { ok: false, message: "Nenhuma linha para importar." };

  // ── Create batch record ────────────────────────────────────────────────────
  const { data: batch, error: batchErr } = await supabase
    .from("import_batches")
    .insert({
      unit_id: params.unitId,
      restaurant_id: restaurant.id,
      target_table: params.targetTable,
      source_method: params.sourceMethod,
      source_filename: params.sourceFilename,
      records_count: 0,
      status: "processing",
      notes: params.notes ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (batchErr || !batch) {
    return { ok: false, message: `Erro ao criar lote: ${batchErr?.message}` };
  }

  const batchId = batch.id as string;
  const errors: string[] = [];
  let insertedCount = 0;

  // ── Build insert rows per target table ────────────────────────────────────
  const BATCH_SIZE = 100;
  let allInserts: Record<string, any>[] = [];

  for (let i = 0; i < params.rows.length; i++) {
    const row = params.rows[i];
    const lineNum = i + 1;

    try {
      const built = buildInsertRow(
        params.targetTable,
        row,
        params.unitId,
        restaurant.id,
        batchId,
        params.tags,
        lineNum,
      );
      allInserts.push(built);
    } catch (err: any) {
      errors.push(`Linha ${lineNum}: ${err.message}`);
    }
  }

  if (allInserts.length === 0) {
    await supabase.from("import_batches").update({ status: "failed", notes: "Nenhuma linha válida para inserir." }).eq("id", batchId);
    return { ok: false, batchId, message: "Nenhuma linha válida para importar.", errors };
  }

  // ── Insert in batches of 100 ───────────────────────────────────────────────
  for (let offset = 0; offset < allInserts.length; offset += BATCH_SIZE) {
    const chunk = allInserts.slice(offset, offset + BATCH_SIZE);
    const { error: insertErr } = await supabase.from(params.targetTable).insert(chunk);
    if (insertErr) {
      errors.push(`Erro ao inserir linhas ${offset + 1}-${offset + chunk.length}: ${insertErr.message}`);
    } else {
      insertedCount += chunk.length;
    }
  }

  // ── Compute date range ─────────────────────────────────────────────────────
  const dateField = getDateField(params.targetTable);
  const dates = allInserts.map(r => r[dateField]).filter(Boolean).sort();
  const dateRangeStart = dates[0] ? new Date(dates[0]).toISOString().split("T")[0] : null;
  const dateRangeEnd = dates[dates.length - 1] ? new Date(dates[dates.length - 1]).toISOString().split("T")[0] : null;

  // ── Update batch status ────────────────────────────────────────────────────
  const status = insertedCount > 0 ? "completed" : "failed";
  await supabase.from("import_batches").update({
    status,
    records_count: insertedCount,
    date_range_start: dateRangeStart,
    date_range_end: dateRangeEnd,
    notes: errors.length ? errors.slice(0, 10).join(" | ") : null,
  }).eq("id", batchId);

  return {
    ok: insertedCount > 0,
    batchId,
    recordsCount: insertedCount,
    errors: errors.length ? errors : undefined,
    message: insertedCount > 0
      ? `${insertedCount} registros importados com sucesso.`
      : "Nenhum registro foi importado.",
  };
}

// ─── Per-table row builder ─────────────────────────────────────────────────────
function buildInsertRow(
  table: ImportTargetTable,
  row: Record<string, any>,
  unitId: string,
  restaurantId: string,
  batchId: string,
  tags: string[],
  lineNum: number,
): Record<string, any> {
  const base = { unit_id: unitId, import_batch_id: batchId, source_method: "import", tags };

  switch (table) {
    case "order_intents": {
      const dateStr = row.occurred_at ?? row.data ?? "";
      if (!dateStr) throw new Error("Campo 'data' obrigatório ausente");
      if (!isDateInAllowedRange(dateStr)) throw new Error(`Data fora do intervalo permitido (máximo 3 anos atrás): ${dateStr}`);
      const total = parseMoneyToCents(row.total ?? row.valor ?? "");
      if (total === null) throw new Error("Campo 'total' inválido");
      return {
        ...base,
        restaurant_id: restaurantId,
        occurred_at: dateStr,
        total,
        customer_name: row.customer_name ?? row.nome_cliente ?? null,
        customer_phone: cleanPhone(row.customer_phone ?? row.telefone_cliente ?? ""),
        payment_method: row.payment_method ?? row.forma_pagamento ?? null,
        source: row.source ?? row.origem ?? "import",
        notes: row.notes ?? row.observacoes ?? null,
        status: "confirmed",
        items: [],
      };
    }

    case "business_expenses": {
      const dateStr = row.date ?? row.data ?? "";
      if (!dateStr) throw new Error("Campo 'data' obrigatório ausente");
      if (!isDateInAllowedRange(dateStr)) throw new Error(`Data fora do intervalo permitido: ${dateStr}`);
      const amount = parseMoneyToCents(row.amount ?? row.valor ?? "");
      if (amount === null) throw new Error("Campo 'valor' inválido");
      const name = row.name ?? row.descricao ?? "";
      if (!name) throw new Error("Campo 'descrição' obrigatório ausente");
      return {
        ...base,
        date: new Date(dateStr).toISOString().split("T")[0],
        name,
        category: row.category ?? row.categoria ?? "geral",
        amount,
        is_recurring: false,
        recurrence: "one_time",
        notes: row.notes ?? row.observacoes ?? null,
      };
    }

    case "payments": {
      const dateStr = row.occurred_at ?? row.data ?? "";
      if (!dateStr) throw new Error("Campo 'data' obrigatório ausente");
      if (!isDateInAllowedRange(dateStr)) throw new Error(`Data fora do intervalo permitido: ${dateStr}`);
      const amount = parseMoneyToCents(row.amount ?? row.valor ?? "");
      if (amount === null) throw new Error("Campo 'valor' inválido");
      return {
        ...base,
        restaurant_id: restaurantId,
        occurred_at: dateStr,
        amount,
        payment_method: row.method ?? row.metodo ?? row.forma_pagamento ?? "manual",
        status: row.status ?? "RECEIVED",
        plan: "manual",
        cycle: "one_time",
        notes: row.notes ?? row.observacoes ?? null,
      };
    }

    case "inventory_movements": {
      const dateStr = row.occurred_at ?? row.data ?? "";
      if (!dateStr) throw new Error("Campo 'data' obrigatório ausente");
      if (!isDateInAllowedRange(dateStr)) throw new Error(`Data fora do intervalo permitido: ${dateStr}`);
      const qty = parseFloat(String(row.quantity ?? row.quantidade ?? ""));
      if (isNaN(qty)) throw new Error("Campo 'quantidade' inválido");
      return {
        ...base,
        occurred_at: dateStr,
        inventory_item_id: row.inventory_item_id ?? null,
        type: row.type ?? row.tipo_movimentacao ?? "purchase",
        quantity: qty,
        cost_total: row.cost_total ? parseMoneyToCents(String(row.cost_total ?? row.custo_total ?? "")) : 0,
        notes: row.notes ?? row.observacoes ?? null,
      };
    }

    case "crm_customers": {
      const name = row.name ?? row.nome ?? "";
      if (!name) throw new Error("Campo 'nome' obrigatório ausente");
      const firstOrderAt = row.first_order_at ?? row.data_primeiro_pedido ?? null;
      if (firstOrderAt && !isDateInAllowedRange(firstOrderAt)) {
        throw new Error(`Data do primeiro pedido fora do intervalo permitido: ${firstOrderAt}`);
      }
      return {
        ...base,
        restaurant_id: restaurantId,
        name,
        phone: cleanPhone(row.phone ?? row.telefone ?? ""),
        email: row.email ?? null,
        neighborhood: row.neighborhood ?? row.bairro ?? null,
        city: row.city ?? row.cidade ?? null,
        first_order_at: firstOrderAt,
        total_orders: parseInt(String(row.total_orders ?? row.total_pedidos ?? "0")) || 0,
        total_spent: parseMoneyToCents(String(row.total_spent ?? row.total_gasto ?? "0")) ?? 0,
        source: "import",
        is_active: true,
      };
    }

    default:
      throw new Error(`Tabela desconhecida: ${table}`);
  }
}

function getDateField(table: ImportTargetTable): string {
  if (table === "business_expenses") return "date";
  if (table === "crm_customers") return "first_order_at";
  return "occurred_at";
}

function cleanPhone(raw: string): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d : null;
}

// ─── AI prompts per table ──────────────────────────────────────────────────────
const AI_PROMPTS: Record<ImportTargetTable, string> = {
  order_intents: `Extraia pedidos com data, nome do cliente (se houver), valor total, forma de pagamento. Retorne APENAS JSON válido sem markdown: { "records": [{"occurred_at": "YYYY-MM-DD", "customer_name": null, "total": 0.00, "payment_method": null}] }`,
  business_expenses: `Extraia despesas com data, descrição, categoria, valor. Categorias válidas: aluguel, salarios, fornecedores, marketing, impostos, manutencao, delivery, geral. Retorne APENAS JSON válido sem markdown: { "records": [{"date": "YYYY-MM-DD", "name": "string", "category": "geral", "amount": 0.00}] }`,
  payments: `Extraia recebimentos/pagamentos com data, valor, método. Retorne APENAS JSON válido sem markdown: { "records": [{"occurred_at": "YYYY-MM-DD", "amount": 0.00, "method": null}] }`,
  inventory_movements: `Extraia movimentações de estoque com data, item, tipo (purchase/usage/waste), quantidade, custo. Retorne APENAS JSON válido sem markdown: { "records": [{"occurred_at": "YYYY-MM-DD", "item_name": "string", "type": "purchase", "quantity": 0, "cost_total": 0.00}] }`,
  crm_customers: `Extraia clientes com nome, telefone, email, cidade. Retorne APENAS JSON válido sem markdown: { "records": [{"name": "string", "phone": null, "email": null, "city": null}] }`,
};

// ─── AI extraction server action ───────────────────────────────────────────────
export async function extractDataWithAI(params: {
  fileBase64: string;
  fileName: string;
  fileType: string;
  targetTable: ImportTargetTable;
}): Promise<{ ok: boolean; records?: Record<string, any>[]; warnings?: string[]; message?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado." };

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, plan")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!restaurant) return { ok: false, message: "Restaurante não encontrado." };
  if (normalizePlanName(restaurant.plan) !== "business") {
    return { ok: false, message: "Extração com IA disponível apenas no plano Business." };
  }

  const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/heic", "image/heif"];
  if (!allowedTypes.includes(params.fileType) && !params.fileName.match(/\.(pdf|png|jpg|jpeg|heic)$/i)) {
    return { ok: false, message: "Tipo de arquivo não suportado. Use PDF, PNG ou JPG." };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, message: "Chave OpenAI não configurada." };

  const openai = new OpenAI({ apiKey });
  const systemPrompt = AI_PROMPTS[params.targetTable];

  // Extract the base64 payload (strip data URL prefix)
  const base64Data = params.fileBase64.includes(",")
    ? params.fileBase64.split(",")[1]
    : params.fileBase64;
  const mimeType = params.fileBase64.includes(";")
    ? params.fileBase64.split(";")[0].replace("data:", "")
    : params.fileType;

  let rawJson = "";

  try {
    if (mimeType === "application/pdf" || params.fileName.toLowerCase().endsWith(".pdf")) {
      // PDF → extract text → send as text prompt
      const pdfMod = await import("pdf-parse");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParse: (buf: Buffer) => Promise<{ text: string }> = (pdfMod as any).default ?? pdfMod;
      const buffer = Buffer.from(base64Data, "base64");
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text?.slice(0, 12000) ?? "";
      if (!text.trim()) return { ok: false, message: "Não foi possível extrair texto do PDF." };

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extraia os dados deste documento:\n\n${text}` },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4096,
      });
      rawJson = response.choices[0]?.message?.content ?? "{}";
    } else {
      // Image → send to vision
      const dataUrl = params.fileBase64.startsWith("data:")
        ? params.fileBase64
        : `data:${params.fileType};base64,${base64Data}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia os dados desta imagem e retorne apenas JSON." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4096,
      });
      rawJson = response.choices[0]?.message?.content ?? "{}";
    }

    const parsed = JSON.parse(rawJson);
    const records: Record<string, any>[] = Array.isArray(parsed.records) ? parsed.records : [];

    if (records.length === 0) {
      return { ok: false, message: "A IA não encontrou registros no arquivo. Tente uma imagem mais clara ou um PDF com texto selecionável." };
    }

    return { ok: true, records, warnings: [] };
  } catch (err: any) {
    return { ok: false, message: `Erro na extração com IA: ${err.message ?? "Erro desconhecido"}` };
  }
}

// ─── Batch rollback server action ──────────────────────────────────────────────
export async function revertImportBatch(
  batchId: string,
): Promise<{ ok: boolean; deletedCount?: number; message?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado." };

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, plan")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!restaurant) return { ok: false, message: "Restaurante não encontrado." };
  if (normalizePlanName(restaurant.plan) !== "business") {
    return { ok: false, message: "Rollback disponível apenas no plano Business." };
  }

  // Validate batch ownership and status
  const { data: batch } = await supabase
    .from("import_batches")
    .select("id, target_table, status, records_count")
    .eq("id", batchId)
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();

  if (!batch) return { ok: false, message: "Lote não encontrado ou sem permissão." };
  if (batch.status !== "completed") return { ok: false, message: `Lote não pode ser revertido (status: ${batch.status}).` };

  const targetTable = batch.target_table as ImportTargetTable;

  // Delete all records from the target table that belong to this batch
  const { error: deleteErr, count } = await supabase
    .from(targetTable)
    .delete({ count: "exact" })
    .eq("import_batch_id", batchId);

  if (deleteErr) {
    return { ok: false, message: `Erro ao deletar registros: ${deleteErr.message}` };
  }

  // Mark batch as reverted
  await supabase
    .from("import_batches")
    .update({ status: "reverted", reverted_at: new Date().toISOString() })
    .eq("id", batchId);

  const deletedCount = count ?? batch.records_count ?? 0;
  return { ok: true, deletedCount, message: `${deletedCount} registros removidos. Lote revertido.` };
}
