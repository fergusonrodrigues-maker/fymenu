import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function notifySlack(event: string, data: unknown) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `🔔 *FyMenu Event*: \`${event}\``,
      attachments: [
        {
          color: "#7c3aed",
          text: "```" + JSON.stringify(data, null, 2) + "```",
          mrkdwn_in: ["text"],
        },
      ],
    }),
  }).catch(() => {});
}

async function notifyTelegram(event: string, data: unknown) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const text = `🔔 *FyMenu*: \`${event}\`\n\`\`\`${JSON.stringify(data, null, 2)}\`\`\``;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  let body: { event?: string; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, data } = body;
  if (!event) {
    return NextResponse.json({ error: "Campo 'event' obrigatório" }, { status: 400 });
  }

  console.log(`[Webhook] Event: ${event}`, data);

  // Log to DB
  const admin = createAdminClient();
  await admin.from("webhook_logs").insert({ event, data: data ?? {} });

  // Dispatch notifications in parallel (fire-and-forget)
  await Promise.allSettled([
    notifySlack(event, data),
    notifyTelegram(event, data),
  ]);

  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({
    service: "FyMenu Webhooks",
    events: [
      "order.created",
      "order.confirmed",
      "order.status_changed",
      "order.ready",
      "order.delivered",
      "payment.confirmed",
    ],
  });
}
