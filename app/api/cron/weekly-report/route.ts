import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Chamado toda segunda às 08:00 via Vercel Cron
// Configurado em vercel.json

async function sendReportEmail(to: string, restaurantName: string, stats: {
  orders: number; revenue: number; avgTicket: number;
  topProducts: Array<{ name: string; qty: number }>;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  const from = process.env.REPORT_FROM_EMAIL ?? "FyMenu <relatorios@fymenu.com.br>";
  const R = (c: number) =>
    `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const productList = stats.topProducts
    .slice(0, 3)
    .map((p, i) => `#${i + 1} ${p.name} (${p.qty}×)`)
    .join(" &bull; ");

  const html = `
<div style="font-family:system-ui;background:#0a0a0a;padding:32px;color:#fff">
  <h2>📊 Relatório Semanal — ${restaurantName}</h2>
  <p>Pedidos: <strong>${stats.orders}</strong></p>
  <p>Receita: <strong>${R(stats.revenue)}</strong></p>
  <p>Ticket Médio: <strong>${R(stats.avgTicket)}</strong></p>
  ${productList ? `<p>Top Produtos: ${productList}</p>` : ""}
  <a href="https://fymenu.vercel.app/painel/relatorios" style="color:#a78bfa">Ver relatório completo →</a>
</div>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: `📊 Relatório Semanal — ${restaurantName}`, html }),
  }).catch(() => {});
}

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get all active restaurants with owner emails
  const { data: restaurants } = await admin
    .from("restaurants")
    .select("id, name, owner_id")
    .in("status", ["active", "trial"]);

  if (!restaurants?.length) {
    return NextResponse.json({ sent: 0 });
  }

  // Get owner emails from auth.users via admin
  let sent = 0;
  const results: string[] = [];

  for (const restaurant of restaurants) {
    try {
      // Get owner email
      const { data: authUser } = await admin.auth.admin.getUserById(restaurant.owner_id);
      const email = authUser?.user?.email;
      if (!email) continue;

      // Get this restaurant's unit
      const { data: unit } = await admin
        .from("units")
        .select("id")
        .eq("restaurant_id", restaurant.id)
        .single();
      if (!unit) continue;

      // Compute weekly stats
      const { data: orders } = await admin
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

      await sendReportEmail(email, restaurant.name, { orders: totalOrders, revenue, avgTicket, topProducts });
      sent++;
      results.push(`✓ ${restaurant.name} → ${email}`);
    } catch {
      results.push(`✗ ${restaurant.name} (erro)`);
    }
  }

  console.log(`[Cron weekly-report] Sent ${sent}/${restaurants.length}`);
  return NextResponse.json({ sent, total: restaurants.length, results });
}
