import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReceiptType = "kitchen_order" | "partial_check" | "final_receipt";

export type PrintJob = {
  printerId: string;
  printerName: string;
  paperWidth: number; // 80 | 58
  html: string;
};

type PrinterRow = {
  id: string;
  name: string;
  purpose: string | null;
  paper_width: number | null;
  print_logo: boolean | null;
  footer_message: string | null;
  is_active: boolean | null;
};

const fmtBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Dinheiro",
  credit: "Cartão crédito",
  debit: "Cartão débito",
  pix: "PIX",
  voucher: "Voucher",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Wraps body in a fully-self-contained <html> with thermal-printer styles. */
function wrapHtml(opts: {
  title: string;
  bodyHtml: string;
  paperWidth: number;
}): string {
  const widthMm = opts.paperWidth;
  const fontSize = widthMm === 58 ? 11 : 12;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(opts.title)}</title>
<style>
  @page { size: ${widthMm}mm auto; margin: 4mm 3mm; }
  * { box-sizing: border-box; }
  body {
    width: ${widthMm}mm;
    margin: 0;
    padding: 0;
    font-family: 'Courier New', ui-monospace, monospace;
    font-size: ${fontSize}px;
    line-height: 1.35;
    color: #000;
    background: #fff;
  }
  .center { text-align: center; }
  .right  { text-align: right; }
  .bold   { font-weight: 800; }
  .big    { font-size: ${fontSize + 4}px; font-weight: 800; }
  .small  { font-size: ${Math.max(9, fontSize - 2)}px; }
  .muted  { color: #444; }
  .row    { display: flex; justify-content: space-between; gap: 6px; }
  .row .l { flex: 1; min-width: 0; word-break: break-word; }
  .row .r { white-space: nowrap; flex-shrink: 0; }
  .sep    { border-top: 1px dashed #000; margin: 6px 0; height: 0; }
  .heavy  { border-top: 2px solid #000; margin: 6px 0; height: 0; }
  .item   { margin: 4px 0; }
  .item .name { font-weight: 700; }
  .item .meta { font-size: ${Math.max(9, fontSize - 2)}px; color: #444; }
  .logo   { max-width: 100%; max-height: 60px; margin: 0 auto 4px; display: block; }
  .stamp  { font-size: ${Math.max(9, fontSize - 2)}px; margin-top: 6px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
${opts.bodyHtml}
</body>
</html>`;
}

async function loadComandaWithItems(db: any, comandaId: string) {
  const [{ data: comanda }, { data: items }] = await Promise.all([
    db.from("comandas")
      .select("id, unit_id, short_code, customer_name, customer_phone, mesa_number, table_number, guest_count, notes, status, total, subtotal, created_at, opened_by_name, closed_by_name, closed_at")
      .eq("id", comandaId).maybeSingle(),
    db.from("comanda_items")
      .select("id, product_name, quantity, unit_price, addons, notes, status, added_by_name, created_at")
      .eq("comanda_id", comandaId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true }),
  ]);
  return { comanda, items: (items ?? []) as Array<any> };
}

async function loadUnit(db: any, unitId: string) {
  const { data } = await db.from("units")
    .select("id, name, address, city, neighborhood, logo_url, whatsapp")
    .eq("id", unitId).maybeSingle();
  return data;
}

function renderHeader(opts: {
  unit: any;
  printerLogo: boolean;
  title: string;
  paperWidth: number;
}): string {
  const { unit, printerLogo, title } = opts;
  const showLogo = printerLogo && unit?.logo_url;
  const addr = [unit?.address, unit?.neighborhood, unit?.city].filter(Boolean).join(", ");
  return `
${showLogo ? `<img src="${escapeHtml(unit.logo_url)}" alt="" class="logo" />` : ""}
<div class="center bold big">${escapeHtml(unit?.name ?? "Restaurante")}</div>
${addr ? `<div class="center small muted">${escapeHtml(addr)}</div>` : ""}
${unit?.whatsapp ? `<div class="center small muted">${escapeHtml(unit.whatsapp)}</div>` : ""}
<div class="heavy"></div>
<div class="center bold" style="font-size: 14px;">${escapeHtml(title)}</div>
<div class="sep"></div>`;
}

function renderItemLine(item: any, paperWidth: number): string {
  const lineTotal = (Number(item.unit_price ?? 0) * Number(item.quantity ?? 1)) +
                    Number(item.addons_total ?? 0);
  return `
<div class="item">
  <div class="row">
    <div class="l name">${item.quantity}× ${escapeHtml(item.product_name)}</div>
    <div class="r bold">${fmtBRL(lineTotal)}</div>
  </div>
  <div class="row meta">
    <div class="l">${fmtBRL(Number(item.unit_price ?? 0))} cada${item.added_by_name ? ` · ${escapeHtml(item.added_by_name)}` : ""}</div>
  </div>
  ${item.notes ? `<div class="meta">obs: ${escapeHtml(item.notes)}</div>` : ""}
</div>`;
}

// ─── Generators ───────────────────────────────────────────────────────────

export async function generateKitchenOrderHTML(opts: {
  comandaId: string;
  itemIds: string[];
  printer: PrinterRow;
}): Promise<string> {
  const db = createAdminClient();
  const { comanda } = await loadComandaWithItems(db, opts.comandaId);
  if (!comanda) return "";
  const unit = await loadUnit(db, comanda.unit_id);

  // Only the items just sent (filtered by ID)
  const idSet = new Set(opts.itemIds);
  const { data: items } = await db.from("comanda_items")
    .select("id, product_name, quantity, unit_price, addons, notes, status, added_by_name, created_at")
    .in("id", Array.from(idSet))
    .order("created_at", { ascending: true });

  const paperWidth = opts.printer.paper_width ?? 80;
  const mesaLabel = comanda.mesa_number ? `Mesa ${comanda.mesa_number}` : "Balcão";
  const itemsHtml = (items ?? []).map((i: any) => `
<div class="item">
  <div class="bold">${i.quantity}× ${escapeHtml(i.product_name)}</div>
  ${i.notes ? `<div class="meta">▶ ${escapeHtml(i.notes)}</div>` : ""}
</div>`).join("");

  const body = `
${renderHeader({ unit, printerLogo: opts.printer.print_logo ?? false, title: "PEDIDO COZINHA", paperWidth })}
<div class="row"><div class="l bold">${escapeHtml(mesaLabel)}</div><div class="r small muted">${fmtDateTime(new Date().toISOString())}</div></div>
<div class="row"><div class="l">Cliente: ${escapeHtml(comanda.customer_name ?? "—")}</div></div>
<div class="row"><div class="l">Garçom: ${escapeHtml(comanda.opened_by_name ?? "—")}</div><div class="r small">#${escapeHtml(comanda.short_code ?? "—")}</div></div>
<div class="sep"></div>
${itemsHtml || '<div class="muted small center">(nenhum item)</div>'}
<div class="heavy"></div>
<div class="center small">— preparar e entregar —</div>
${opts.printer.footer_message ? `<div class="sep"></div><div class="center small muted">${escapeHtml(opts.printer.footer_message)}</div>` : ""}
`;
  return wrapHtml({ title: `Cozinha — ${mesaLabel}`, bodyHtml: body, paperWidth });
}

export async function generatePartialCheckHTML(opts: {
  comandaId: string;
  printer: PrinterRow;
}): Promise<string> {
  const db = createAdminClient();
  const { comanda, items } = await loadComandaWithItems(db, opts.comandaId);
  if (!comanda) return "";
  const unit = await loadUnit(db, comanda.unit_id);
  const paperWidth = opts.printer.paper_width ?? 80;
  const mesaLabel = comanda.mesa_number ? `Mesa ${comanda.mesa_number}` : "Balcão";
  const total = Number(comanda.total ?? 0);

  const body = `
${renderHeader({ unit, printerLogo: opts.printer.print_logo ?? false, title: "CONTA PARCIAL", paperWidth })}
<div class="row"><div class="l bold">${escapeHtml(mesaLabel)}</div><div class="r small muted">${fmtDateTime(new Date().toISOString())}</div></div>
<div class="row"><div class="l">Cliente: ${escapeHtml(comanda.customer_name ?? "—")}</div>${comanda.guest_count ? `<div class="r small">${comanda.guest_count}p</div>` : ""}</div>
<div class="row"><div class="l small muted">Comanda #${escapeHtml(comanda.short_code ?? "—")}</div><div class="r small muted">aberta: ${fmtDateTime(comanda.created_at)}</div></div>
<div class="sep"></div>
${items.map((i) => renderItemLine(i, paperWidth)).join("")}
<div class="heavy"></div>
<div class="row"><div class="l bold">TOTAL PARCIAL</div><div class="r bold big">${fmtBRL(total)}</div></div>
${comanda.guest_count && comanda.guest_count > 1 ? `<div class="row small muted"><div class="l">por pessoa (${comanda.guest_count})</div><div class="r">${fmtBRL(Math.ceil(total / comanda.guest_count))}</div></div>` : ""}
<div class="sep"></div>
<div class="center small bold">⚠ ESTA NÃO É A CONTA FINAL</div>
<div class="center small muted">Pedidos podem ser adicionados</div>
${opts.printer.footer_message ? `<div class="sep"></div><div class="center small muted">${escapeHtml(opts.printer.footer_message)}</div>` : ""}
`;
  return wrapHtml({ title: `Conta parcial — ${mesaLabel}`, bodyHtml: body, paperWidth });
}

export async function generateFinalReceiptHTML(opts: {
  comandaId: string;
  printer: PrinterRow;
}): Promise<string> {
  const db = createAdminClient();
  const { comanda, items } = await loadComandaWithItems(db, opts.comandaId);
  if (!comanda) return "";
  const unit = await loadUnit(db, comanda.unit_id);
  const paperWidth = opts.printer.paper_width ?? 80;
  const mesaLabel = comanda.mesa_number ? `Mesa ${comanda.mesa_number}` : "Balcão";
  const total = Number(comanda.total ?? 0);

  const { data: splits } = await db.from("comanda_splits")
    .select("customer_name, customer_phone, amount, payment_method, change_amount, paid_at")
    .eq("comanda_id", opts.comandaId)
    .order("paid_at", { ascending: true });

  const splitsHtml = (splits ?? []).map((s: any) => `
<div class="item">
  <div class="row">
    <div class="l name">👤 ${escapeHtml(s.customer_name ?? "—")}</div>
    <div class="r bold">${fmtBRL(Number(s.amount ?? 0))}</div>
  </div>
  <div class="meta">
    ${escapeHtml(PAYMENT_LABEL[s.payment_method] ?? s.payment_method ?? "—")}
    ${s.change_amount ? ` · troco ${fmtBRL(Number(s.change_amount))}` : ""}
  </div>
</div>`).join("");

  const body = `
${renderHeader({ unit, printerLogo: opts.printer.print_logo ?? false, title: "RECIBO", paperWidth })}
<div class="row"><div class="l bold">${escapeHtml(mesaLabel)}</div><div class="r small">#${escapeHtml(comanda.short_code ?? "—")}</div></div>
<div class="row small muted"><div class="l">Cliente: ${escapeHtml(comanda.customer_name ?? "—")}</div><div class="r">${fmtDateTime(comanda.closed_at ?? new Date().toISOString())}</div></div>
<div class="sep"></div>
${items.map((i) => renderItemLine(i, paperWidth)).join("")}
<div class="heavy"></div>
<div class="row"><div class="l bold">TOTAL</div><div class="r bold big">${fmtBRL(total)}</div></div>
<div class="sep"></div>
<div class="center small bold">PAGAMENTOS</div>
${splitsHtml || '<div class="center small muted">(sem splits)</div>'}
<div class="heavy"></div>
${comanda.opened_by_name ? `<div class="small muted">Garçom: ${escapeHtml(comanda.opened_by_name)}</div>` : ""}
${comanda.closed_by_name ? `<div class="small muted">Fechado por: ${escapeHtml(comanda.closed_by_name)}</div>` : ""}
${opts.printer.footer_message ? `<div class="sep"></div><div class="center bold">${escapeHtml(opts.printer.footer_message)}</div>` : ""}
<div class="center small muted stamp">================================</div>
`;
  return wrapHtml({ title: `Recibo — ${mesaLabel}`, bodyHtml: body, paperWidth });
}

// ─── Public action helpers (used from server actions) ────────────────────

async function fetchPrinters(db: any, unitId: string): Promise<PrinterRow[]> {
  const { data } = await db.from("printer_configs")
    .select("id, name, purpose, paper_width, print_logo, footer_message, is_active, unit_id")
    .eq("unit_id", unitId);
  return (data ?? []).filter((p: any) => p.is_active !== false) as PrinterRow[];
}

async function fetchCategoryMappings(db: any, printerIds: string[]) {
  if (printerIds.length === 0) return new Map<string, Set<string>>();
  // Try `printer_config_id` first; fall back to `printer_id` for legacy rows.
  const { data } = await db.from("printer_category_mappings")
    .select("printer_config_id, printer_id, category_id")
    .or(`printer_config_id.in.(${printerIds.join(",")}),printer_id.in.(${printerIds.join(",")})`);
  const map = new Map<string, Set<string>>();
  (data ?? []).forEach((row: any) => {
    const pid = row.printer_config_id ?? row.printer_id;
    if (!pid) return;
    if (!map.has(pid)) map.set(pid, new Set());
    map.get(pid)!.add(row.category_id);
  });
  return map;
}

/** For kitchen routing: given items just inserted, dispatch to all kitchen-purpose
 * printers whose category-mappings include any of the items' product categories.
 * generic-purpose printers receive everything. */
export async function buildKitchenPrintJobs(opts: {
  unitId: string;
  comandaId: string;
  itemIds: string[];
}): Promise<PrintJob[]> {
  if (opts.itemIds.length === 0) return [];
  const db = createAdminClient();

  const printers = await fetchPrinters(db, opts.unitId);
  const targets = printers.filter((p) => p.purpose === "kitchen" || p.purpose === "generic");
  if (targets.length === 0) return [];

  // Resolve each item's product → category
  const { data: itemRows } = await db.from("comanda_items")
    .select("id, product_id")
    .in("id", opts.itemIds);
  const productIds = Array.from(new Set((itemRows ?? []).map((r: any) => r.product_id).filter(Boolean)));
  let productToCat = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: prods } = await db.from("products")
      .select("id, category_id")
      .in("id", productIds);
    productToCat = new Map((prods ?? []).map((p: any) => [p.id, p.category_id]));
  }
  const itemIdToCat = new Map<string, string | null>();
  (itemRows ?? []).forEach((r: any) => {
    itemIdToCat.set(r.id, r.product_id ? (productToCat.get(r.product_id) ?? null) : null);
  });

  const mappings = await fetchCategoryMappings(db, targets.map((p) => p.id));

  const jobs: PrintJob[] = [];
  for (const printer of targets) {
    const isGeneric = printer.purpose === "generic";
    const mappedCats = mappings.get(printer.id) ?? new Set<string>();
    const matchingItemIds = isGeneric
      ? opts.itemIds
      : opts.itemIds.filter((id) => {
          const cat = itemIdToCat.get(id);
          return cat ? mappedCats.has(cat) : false;
        });
    if (matchingItemIds.length === 0) continue;
    const html = await generateKitchenOrderHTML({
      comandaId: opts.comandaId,
      itemIds: matchingItemIds,
      printer,
    });
    if (html) jobs.push({ printerId: printer.id, printerName: printer.name, paperWidth: printer.paper_width ?? 80, html });
  }
  return jobs;
}

export async function buildPartialCheckJob(opts: {
  unitId: string;
  comandaId: string;
}): Promise<PrintJob | null> {
  const db = createAdminClient();
  const printers = await fetchPrinters(db, opts.unitId);
  // Prefer cashier printer; fall back to any active.
  const printer = printers.find((p) => p.purpose === "cashier")
    ?? printers.find((p) => p.purpose === "generic")
    ?? printers[0];
  if (!printer) return null;
  const html = await generatePartialCheckHTML({ comandaId: opts.comandaId, printer });
  if (!html) return null;
  return { printerId: printer.id, printerName: printer.name, paperWidth: printer.paper_width ?? 80, html };
}

export async function buildFinalReceiptJob(opts: {
  unitId: string;
  comandaId: string;
}): Promise<PrintJob | null> {
  const db = createAdminClient();
  const printers = await fetchPrinters(db, opts.unitId);
  const printer = printers.find((p) => p.purpose === "cashier")
    ?? printers.find((p) => p.purpose === "generic")
    ?? printers[0];
  if (!printer) return null;
  const html = await generateFinalReceiptHTML({ comandaId: opts.comandaId, printer });
  if (!html) return null;
  return { printerId: printer.id, printerName: printer.name, paperWidth: printer.paper_width ?? 80, html };
}
