import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/painel", "/garcom", "/cozinha"];
// /admin routes are NOT in PROTECTED_ROUTES — they self-manage redirects to /admin/login
const AUTH_ROUTES = ["/entrar", "/cadastro", "/auth/reset-password", "/auth/confirm-email"];

// Rate limiting simples em memória (por IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count++;
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") ?? "";

  // ── Subdomínio → rewrite para /delivery/[slug] ────────────────────────
  // pizzaria.fymenu.com → /delivery/pizzaria
  // pizzaria.fymenu.com/menu → /menu/pizzaria
  // pizzaria.fymenu.com/tv → /tv/pizzaria
  const mainDomain = process.env.NEXT_PUBLIC_DOMAIN ?? "fymenu.com";
  const isSubdomain =
    hostname.endsWith(`.${mainDomain}`) &&
    !hostname.startsWith("www.") &&
    hostname !== mainDomain;

  if (isSubdomain) {
    const subdomain = hostname.replace(`.${mainDomain}`, "");

    // ── Employee subdomain: [role]-[username].fymenu.com ─────────────────
    // e.g. garcom-joao.fymenu.com → /employee-login?subdomain=garcom-joao
    const EMPLOYEE_ROLES = ["cozinha", "garcom", "entregador", "gerente", "financeiro", "limpeza", "caixa"];
    const firstSegment = subdomain.split("-")[0].toLowerCase();
    if (EMPLOYEE_ROLES.includes(firstSegment)) {
      const url = request.nextUrl.clone();
      url.pathname = "/employee-login";
      url.searchParams.set("subdomain", subdomain);
      return NextResponse.rewrite(url);
    }

    // ── Restaurant menu subdomain ─────────────────────────────────────────
    let slug = subdomain;

    // Resolve custom_domain → slug (allows user-customized subdomains)
    try {
      const db = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: unit } = await db
        .from("units")
        .select("slug")
        .eq("custom_domain", subdomain)
        .maybeSingle();
      if (unit?.slug) slug = unit.slug;
    } catch { /* fall back to direct slug mapping */ }

    const url = request.nextUrl.clone();

    // Path-aware routing: map subdomain paths to new route structure
    if (pathname === "/" || pathname === "/delivery") {
      url.pathname = `/delivery/${slug}`;
    } else if (pathname === "/menu") {
      url.pathname = `/menu/${slug}`;
    } else if (pathname === "/tv") {
      url.pathname = `/tv/${slug}`;
    } else if (pathname === "/operacoes" || pathname === "/hub-central") {
      url.pathname = `/operacoes/${slug}`;
    } else if (pathname.startsWith("/comanda/")) {
      const hash = pathname.slice("/comanda/".length);
      url.pathname = `/comanda/${slug}/${hash}`;
    } else {
      // /pdv, /pdv/* and any other sub-paths remain under delivery
      url.pathname = `/delivery/${slug}${pathname}`;
    }

    return NextResponse.rewrite(url);
  }

  // ── Rate limiting nas rotas de auth ──────────────────────────────────
  const isAuthAction =
    pathname === "/entrar" ||
    pathname === "/cadastro" ||
    pathname === "/auth/reset-password";

  if (isAuthAction && request.method === "POST") {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!checkRateLimit(ip)) {
      return new NextResponse("Muitas tentativas. Tente novamente em 1 minuto.", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }
  }

  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r);

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }

  if (isAuthRoute && user && pathname !== "/auth/reset-password") {
    return NextResponse.redirect(new URL("/painel", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
