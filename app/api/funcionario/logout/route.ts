import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/funcionario-session";

/**
 * POST /api/funcionario/logout
 * Limpa o cookie de sessão do Portal do Funcionário.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return response;
}
