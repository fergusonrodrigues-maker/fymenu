import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function sendWithResend(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurado");

  const from = process.env.REPORT_FROM_EMAIL ?? "FyMenu <relatorios@fymenu.com.br>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return res.json();
}

function buildWeeklyHTML(restaurantName: string, stats: {
  orders: number; revenue: number; avgTicket: number; topProducts: Array<{ name: string; qty: number }>;
}) {
  const R = (c: number) =>
    `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const productRows = stats.topProducts
    .slice(0, 5)
    .map(
      (p, i) =>
        `<tr><td style="padding:6px 0;color:#9ca3af">#${i + 1}</td><td style="padding:6px 0;color:#e5e7eb">${p.name}</td><td style="padding:6px 0;color:#9ca3af;text-align:right">${p.qty}×</td></tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0a0a0a;font-family:system-ui,sans-serif;margin:0;padding:32px 16px">
  <div style="max-width:520px;margin:0 auto;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1f2937">
    <div style="background:#6d28d9;padding:24px 32px">
      <h1 style="color:#fff;margin:0;font-size:20px">📊 Relatório Semanal</h1>
      <p style="color:#ddd6fe;margin:4px 0 0;font-size:14px">${restaurantName}</p>
    </div>
    <div style="padding:32px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
        <div style="background:#1f2937;border-radius:12px;padding:16px">
          <div style="font-size:24px">📦</div>
          <div style="color:#fff;font-size:24px;font-weight:900;margin-top:8px">${stats.orders}</div>
          <div style="color:#9ca3af;font-size:13px;margin-top:4px">Pedidos</div>
        </div>
        <div style="background:#1f2937;border-radius:12px;padding:16px">
          <div style="font-size:24px">💰</div>
          <div style="color:#fff;font-size:20px;font-weight:900;margin-top:8px">${R(stats.revenue)}</div>
          <div style="color:#9ca3af;font-size:13px;margin-top:4px">Receita</div>
        </div>
        <div style="background:#1f2937;border-radius:12px;padding:16px;grid-column:1/-1">
          <div style="font-size:24px">🎯</div>
          <div style="color:#fff;font-size:20px;font-weight:900;margin-top:8px">${R(stats.avgTicket)}</div>
          <div style="color:#9ca3af;font-size:13px;margin-top:4px">Ticket Médio</div>
        </div>
      </div>

      ${productRows ? `
      <div style="margin-bottom:24px">
        <h3 style="color:#d1d5db;font-size:13px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px">🏆 Top Produtos</h3>
        <table style="width:100%;border-collapse:collapse">${productRows}</table>
      </div>` : ""}

      <a href="https://fymenu.vercel.app/painel/relatorios"
        style="display:block;text-align:center;background:#7c3aed;color:#fff;padding:14px;border-radius:10px;text-decoration:none;font-weight:700">
        Ver Relatório Completo →
      </a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #1f2937;text-align:center">
      <p style="color:#4b5563;font-size:12px;margin:0">FyMenu — Gerenciamento de Cardápio Digital</p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let body: { type?: string; email?: string } = {};
  try { body = await req.json(); } catch {}

  const type = body.type ?? "weekly";
  const toEmail = body.email ?? user.email;
  if (!toEmail) return NextResponse.json({ error: "Email não encontrado" }, { status: 400 });

  // Fetch restaurant + stats
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();
  if (!restaurant) return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });

  const { data: unit } = await supabase
    .from("units")
    .select("id")
    .eq("restaurant_id", restaurant.id)
    .single();
  if (!unit) return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: orders } = await supabase
    .from("order_intents")
    .select("total, items")
    .eq("unit_id", unit.id)
    .eq("status", "confirmed")
    .gte("created_at", sevenDaysAgo);

  const revenue = (orders ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0);
  const totalOrders = orders?.length ?? 0;
  const avgTicket = totalOrders > 0 ? Math.round(revenue / totalOrders) : 0;

  const productMap: Record<string, number> = {};
  for (const o of orders ?? []) {
    const items = Array.isArray(o.items) ? o.items : [];
    for (const item of items) {
      const name: string = item.code_name ?? item.name ?? "Sem nome";
      productMap[name] = (productMap[name] ?? 0) + (item.qty ?? 1);
    }
  }
  const topProducts = Object.entries(productMap)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty);

  const html = buildWeeklyHTML(restaurant.name, { orders: totalOrders, revenue, avgTicket, topProducts });

  try {
    await sendWithResend(toEmail, `📊 Relatório Semanal — ${restaurant.name}`, html);
    return NextResponse.json({ success: true, sent_to: toEmail });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao enviar email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
