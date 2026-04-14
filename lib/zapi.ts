// Z-API WhatsApp integration
// FyMenu manages instances; each restaurant connects its own number.
// Docs: https://developer.z-api.io

const ZAPI_BASE = "https://api.z-api.io";

function instanceUrl(instanceId: string, token: string) {
  return `${ZAPI_BASE}/instances/${instanceId}/token/${token}`;
}

async function zapiRequest<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

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

// ─── Admin — instance management ────────────────────────────────────────────
// Creates a new Z-API instance under FyMenu's account
export async function createInstance(name: string) {
  return zapiRequest<{ id: string; token: string }>(
    `${ZAPI_BASE}/instances/integrator/on-demand`,
    {
      method: "POST",
      headers: { "Client-Token": process.env.ZAPI_ADMIN_TOKEN! },
      body: JSON.stringify({ name }),
    }
  );
}

// Deletes an instance from FyMenu's Z-API account (called on plan downgrade)
export async function deleteInstance(instanceId: string) {
  return zapiRequest(
    `${ZAPI_BASE}/instances/${instanceId}`,
    {
      method: "DELETE",
      headers: { "Client-Token": process.env.ZAPI_ADMIN_TOKEN! },
    }
  );
}

// ─── Per-instance operations (restaurant's number) ──────────────────────────
export async function getQrCode(instanceId: string, token: string) {
  return zapiRequest<{ value: string }>(
    `${instanceUrl(instanceId, token)}/qr-code/image`
  );
}

export async function getStatus(instanceId: string, token: string) {
  return zapiRequest<{ connected: boolean; phone?: string; session?: string }>(
    `${instanceUrl(instanceId, token)}/status`
  );
}

export async function disconnect(instanceId: string, token: string) {
  return zapiRequest(`${instanceUrl(instanceId, token)}/disconnect`);
}

export async function sendText(
  instanceId: string,
  token: string,
  phone: string,
  message: string
) {
  return zapiRequest<{ zaapId: string; messageId: string }>(
    `${instanceUrl(instanceId, token)}/send-text`,
    {
      method: "POST",
      body: JSON.stringify({ phone, message }),
    }
  );
}

export async function sendImage(
  instanceId: string,
  token: string,
  phone: string,
  imageUrl: string,
  caption?: string
) {
  return zapiRequest(
    `${instanceUrl(instanceId, token)}/send-image`,
    {
      method: "POST",
      body: JSON.stringify({ phone, image: imageUrl, caption }),
    }
  );
}

export async function sendLink(
  instanceId: string,
  token: string,
  phone: string,
  message: string,
  linkUrl: string,
  title?: string,
  description?: string
) {
  return zapiRequest(
    `${instanceUrl(instanceId, token)}/send-link`,
    {
      method: "POST",
      body: JSON.stringify({ phone, message, linkUrl, title, description }),
    }
  );
}
