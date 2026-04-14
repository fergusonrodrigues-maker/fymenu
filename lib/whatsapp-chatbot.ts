// WhatsApp AI Chatbot — powered by OpenAI gpt-4o-mini
// Handles inbound messages: builds restaurant context, maintains conversation
// history, generates replies and sends via Z-API.

import { createAdminClient } from "@/lib/supabase/admin";
import { sendText, markAsRead, startTyping } from "@/lib/zapi";
import type { MenuCacheData } from "@/lib/cache/buildMenuCache";

// ─── In-memory context cache (5 min TTL) ────────────────────────────────────

interface ContextEntry {
  context: string;
  slug: string;
  expiresAt: number;
}

const contextCache = new Map<string, ContextEntry>();

// ─── Rate-limit: 1 reply per 3 s per phone ──────────────────────────────────

const lastReplyAt = new Map<string, number>();

function isRateLimited(phone: string): boolean {
  const last = lastReplyAt.get(phone) ?? 0;
  if (Date.now() - last < 3_000) return true;
  lastReplyAt.set(phone, Date.now());
  return false;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Estimate typing duration based on reply length. 1s per 20 chars, clamped 2–8s. */
function estimateTypingMs(text: string): number {
  const ms = Math.round((text.length / 20) * 1_000);
  return Math.min(8_000, Math.max(2_000, ms));
}

/**
 * Clamp total delay budget to 25s minus openai time budget (10s) minus 2s buffer.
 * Returns adjusted [readDelayMs, typingDelayMs, typingDurationMs].
 */
function clampDelays(
  readDelayMs: number,
  typingDelayMs: number,
  typingDurationMs: number
): [number, number, number] {
  const BUDGET = 13_000; // 25s total - 10s openai - 2s buffer
  const total = readDelayMs + typingDelayMs + typingDurationMs;
  if (total <= BUDGET) return [readDelayMs, typingDelayMs, typingDurationMs];
  const scale = BUDGET / total;
  return [
    Math.round(readDelayMs * scale),
    Math.round(typingDelayMs * scale),
    Math.round(typingDurationMs * scale),
  ];
}

// ─── Build restaurant context from menu_cache ────────────────────────────────

async function buildRestaurantContext(unitId: string): Promise<{ context: string; slug: string }> {
  const cached = contextCache.get(unitId);
  if (cached && cached.expiresAt > Date.now()) {
    return { context: cached.context, slug: cached.slug };
  }

  const admin = createAdminClient();

  const { data: cacheRow } = await admin
    .from("menu_cache")
    .select("menu_json")
    .eq("unit_id", unitId)
    .maybeSingle();

  const menu: MenuCacheData | null = (cacheRow?.menu_json as MenuCacheData) ?? null;

  if (!menu) {
    const { data: unit } = await admin
      .from("units")
      .select("id, name, slug, whatsapp, instagram, city, neighborhood")
      .eq("id", unitId)
      .single();
    if (!unit) throw new Error("Unidade não encontrada");

    const context = `Você é o assistente virtual do restaurante ${unit.name}.\n\nResponda em português brasileiro de forma simpática e objetiva.`;
    const slug = unit.slug ?? "";
    contextCache.set(unitId, { context, slug, expiresAt: Date.now() + 5 * 60 * 1000 });
    return { context, slug };
  }

  const u = menu.unit;

  const menuLines: string[] = [];
  for (const cat of menu.categories) {
    const activeProducts = cat.products.filter((p) => p.is_active);
    if (activeProducts.length === 0) continue;

    menuLines.push(`\n## ${cat.name}`);
    for (const p of activeProducts) {
      const price =
        p.variations.length > 0
          ? `a partir de R$ ${(Math.min(...p.variations.map((v) => v.price)) / 100).toFixed(2).replace(".", ",")}`
          : `R$ ${(p.base_price / 100).toFixed(2).replace(".", ",")}`;
      const desc = p.description ? ` — ${p.description}` : "";
      menuLines.push(`- ${p.name}: ${price}${desc}`);
    }
  }

  const addressParts = [u.neighborhood, u.city].filter(Boolean).join(", ");

  const context = `Você é o assistente virtual do restaurante ${u.name}.

INFORMAÇÕES DO RESTAURANTE:
- Nome: ${u.name}${addressParts ? `\n- Endereço: ${addressParts}` : ""}${u.whatsapp ? `\n- WhatsApp: ${u.whatsapp}` : ""}${u.instagram ? `\n- Instagram: ${u.instagram}` : ""}
- Cardápio digital: https://fymenu.com/delivery/${u.slug}

CARDÁPIO COMPLETO:${menuLines.join("\n")}

REGRAS DE COMPORTAMENTO:
- Seja simpático, profissional e objetivo
- Responda sempre em português brasileiro
- Se perguntarem sobre um prato, descreva com base no cardápio acima
- Se perguntarem sobre delivery ou pedidos, envie o link do cardápio
- Se perguntarem preço, responda com o valor exato do cardápio
- Se perguntarem sobre algo que não está no cardápio, diga que não temos no momento
- Nunca invente pratos, preços ou informações que não estão acima
- Se o cliente quiser fazer um pedido, direcione para o link do cardápio digital
- Mantenha respostas curtas e diretas (máximo 3-4 frases)
- Use emojis com moderação
- Não mencione que você é uma IA — aja como atendente do restaurante`;

  contextCache.set(unitId, { context, slug: u.slug, expiresAt: Date.now() + 5 * 60 * 1000 });
  return { context, slug: u.slug };
}

// ─── Conversation history ────────────────────────────────────────────────────

interface OpenAIMessage {
  role: "user" | "assistant";
  content: string;
}

async function getConversationHistory(
  unitId: string,
  phone: string,
  limit = 15
): Promise<OpenAIMessage[]> {
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("whatsapp_messages")
    .select("direction, message")
    .eq("unit_id", unitId)
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!rows || rows.length === 0) return [];

  return rows
    .reverse()
    .map((row) => ({
      role: (row.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
      content: row.message,
    }));
}

// ─── Generate reply via OpenAI ───────────────────────────────────────────────

async function generateChatbotResponse(
  unitId: string,
  phone: string,
  incomingMessage: string
): Promise<string> {
  const { context, slug } = await buildRestaurantContext(unitId);
  const history = await getConversationHistory(unitId, phone);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: context },
          ...history,
          { role: "user", content: incomingMessage },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content as string | undefined;
    if (!reply?.trim()) throw new Error("Resposta vazia da OpenAI");

    return reply.trim();
  } catch {
    return `Olá! No momento nosso atendente não está disponível. Acesse nosso cardápio: https://fymenu.com/delivery/${slug}`;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Process inbound message (main entry point) ──────────────────────────────

export interface InboundMessageData {
  unitId: string;
  phone: string;
  messageText: string;
  messageId: string;
  instanceId: string;
  instanceToken: string;
  clientToken?: string;
  slug: string;
  /** Seconds to wait before marking as read (default 3) */
  readDelay: number;
  /** Seconds to wait before starting typing indicator (default 5) */
  typingDelay: number;
  showRead: boolean;
  showTyping: boolean;
}

export async function processIncomingMessage(data: InboundMessageData): Promise<void> {
  const {
    unitId, phone, messageText, messageId,
    instanceId, instanceToken, clientToken, slug,
    readDelay, typingDelay, showRead, showTyping,
  } = data;
  const admin = createAdminClient();

  // 1. Save inbound message
  await admin.from("whatsapp_messages").insert({
    unit_id: unitId,
    phone,
    message: messageText,
    direction: "inbound",
    trigger_type: "auto_chatbot",
    status: "delivered",
  });

  // 2. Rate-limit check
  if (isRateLimited(phone)) return;

  // 3. Skip very short messages ("k", "ok", single emoji, etc.)
  if (messageText.trim().length <= 2) return;

  // 4. Generate reply (parallel with delays below — we await it after human simulation)
  const replyPromise = generateChatbotResponse(unitId, phone, messageText);

  // 5. Human simulation sequence
  //    Calculate typing duration based on expected reply length (150 chars estimate)
  //    We estimate before knowing the reply; we'll use actual length after OpenAI responds.
  const estimatedTypingMs = estimateTypingMs("x".repeat(150));
  const [safeReadMs, safeTypingMs, safeTypingDurationMs] = clampDelays(
    readDelay * 1_000,
    typingDelay * 1_000,
    estimatedTypingMs
  );

  // Step 5a: wait read_delay, then mark as read
  await sleep(safeReadMs);
  if (showRead) {
    markAsRead(instanceId, instanceToken, phone, messageId, clientToken).catch(() => {});
  }

  // Step 5b: wait typing_delay, then start typing indicator
  await sleep(safeTypingMs);

  // Await the OpenAI reply now (it's been running in parallel)
  const reply = await replyPromise;

  // Recalculate typing duration with actual reply length
  const actualTypingMs = Math.min(safeTypingDurationMs, estimateTypingMs(reply));

  if (showTyping) {
    startTyping(instanceId, instanceToken, phone, actualTypingMs, clientToken).catch(() => {});
  }

  // Step 5c: wait typing duration
  await sleep(actualTypingMs);

  // 6. Send via Z-API
  const result = await sendText(instanceId, instanceToken, phone, reply, clientToken);

  // 7. Save outbound reply
  await admin.from("whatsapp_messages").insert({
    unit_id: unitId,
    phone,
    message: reply,
    direction: "outbound",
    trigger_type: "auto_chatbot",
    status: result.success ? "sent" : "failed",
    zapi_message_id: result.success
      ? (result.data as Record<string, string> | undefined)?.messageId ?? null
      : null,
    error_message: result.success ? null : result.error ?? null,
    sent_at: result.success ? new Date().toISOString() : null,
  });
}

// ─── Webhook payload type ────────────────────────────────────────────────────

export interface ZApiInboundPayload {
  phone?: string;
  fromMe?: boolean;
  isGroup?: boolean;
  broadcast?: boolean;
  instanceId?: string;
  text?: { message?: string };
  location?: { latitude: number; longitude: number };
  messageId?: string;
  type?: string;
}
