/**
 * Shared session helpers for the Portal do Funcionário.
 * Uses a base64url-encoded JSON cookie (httpOnly, no Supabase auth).
 * Cookie name: fy_emp_s — expires in 12h.
 */

export const SESSION_COOKIE = "fy_emp_s";
export const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12h

export interface EmployeeSession {
  employee_id: string;
  unit_id: string;
  name: string;
  role: string;
  unit_name: string;
  unit_logo: string | null;
  active_category_id: string | null;
  active_category_name: string | null;
  exp: number; // Date.now() + SESSION_DURATION_MS
}

export function encodeSession(session: EmployeeSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64url");
}

export function decodeSession(token: string): EmployeeSession | null {
  try {
    const session = JSON.parse(
      Buffer.from(token, "base64url").toString()
    ) as EmployeeSession;
    if (!session.exp || Date.now() > session.exp) return null;
    return session;
  } catch {
    return null;
  }
}

export function createSessionData(
  data: Omit<EmployeeSession, "exp">
): EmployeeSession {
  return { ...data, exp: Date.now() + SESSION_DURATION_MS };
}
