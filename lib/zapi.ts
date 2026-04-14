// Z-API WhatsApp — per-instance wrapper
// Credentials are manually inserted by admin; no partner/account API used.
// Docs: https://developer.z-api.io

const ZAPI_BASE = "https://api.z-api.io";

function instanceUrl(instanceId: string, token: string) {
  return `${ZAPI_BASE}/instances/${instanceId}/token/${token}`;
}

async function zapiRequest<T = unknown>(
  url: string,
  options: RequestInit = {},
  clientToken?: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers ?? {}) as Record<string, string>),
    };
    if (clientToken) headers["Client-Token"] = clientToken;

    const res = await fetch(url, { ...options, headers });

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const msg = (data as Record<string, unknown> | null)?.message;
      return { success: false, error: typeof msg === "string" ? msg : `HTTP ${res.status}` };
    }
    return { success: true, data: data as T };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}

// ─── Per-instance operations ─────────────────────────────────────────────────

export async function getQrCode(instanceId: string, token: string, clientToken?: string) {
  return zapiRequest<{ value: string }>(
    `${instanceUrl(instanceId, token)}/qr-code/image`,
    {},
    clientToken
  );
}

export async function getStatus(instanceId: string, token: string, clientToken?: string) {
  return zapiRequest<{ connected: boolean; phone?: string; session?: string }>(
    `${instanceUrl(instanceId, token)}/status`,
    {},
    clientToken
  );
}

export async function disconnect(instanceId: string, token: string, clientToken?: string) {
  return zapiRequest(
    `${instanceUrl(instanceId, token)}/disconnect`,
    {},
    clientToken
  );
}

export async function sendText(
  instanceId: string,
  token: string,
  phone: string,
  message: string,
  clientToken?: string
) {
  return zapiRequest<{ zaapId: string; messageId: string }>(
    `${instanceUrl(instanceId, token)}/send-text`,
    { method: "POST", body: JSON.stringify({ phone, message }) },
    clientToken
  );
}

export async function sendImage(
  instanceId: string,
  token: string,
  phone: string,
  imageUrl: string,
  caption?: string,
  clientToken?: string
) {
  return zapiRequest(
    `${instanceUrl(instanceId, token)}/send-image`,
    { method: "POST", body: JSON.stringify({ phone, image: imageUrl, caption }) },
    clientToken
  );
}

export async function markAsRead(
  instanceId: string,
  token: string,
  phone: string,
  messageId: string,
  clientToken?: string
) {
  return zapiRequest(
    `${instanceUrl(instanceId, token)}/read-message`,
    { method: "POST", body: JSON.stringify({ messageId, phone }) },
    clientToken
  );
}

export async function startTyping(
  instanceId: string,
  token: string,
  phone: string,
  durationMs: number,
  clientToken?: string
) {
  return zapiRequest(
    `${instanceUrl(instanceId, token)}/typing`,
    { method: "POST", body: JSON.stringify({ phone, duration: durationMs }) },
    clientToken
  );
}

export async function sendLink(
  instanceId: string,
  token: string,
  phone: string,
  message: string,
  linkUrl: string,
  title?: string,
  description?: string,
  clientToken?: string
) {
  return zapiRequest(
    `${instanceUrl(instanceId, token)}/send-link`,
    { method: "POST", body: JSON.stringify({ phone, message, linkUrl, title, description }) },
    clientToken
  );
}
