import { NextResponse } from "next/server";

/**
 * Middleware de separação de ambientes.
 *
 * LOCALHOST (Mac do Cesar):
 *   - Apenas a plataforma ANTIGA (raiz: /dashboard, /mapa, /radar, etc + /login)
 *   - /mazzel-preview bloqueada (redireciona pra /dashboard)
 *   - Usado pra demonstrar a antiga pro cliente rodando local (latência zero)
 *
 * TUNNEL (Cloudflare / produção):
 *   - Apenas a plataforma NOVA (/mazzel-preview/*) + /login + estáticos
 *   - Rotas da antiga bloqueadas (redirecionam pra /mazzel-preview)
 *   - Nova = versão pública, mostrada no servidor
 */

const ROTAS_ESTATICAS = ["/mockups", "/api", "/_next", "/logos", "/bandeiras", "/icons"];

function ehLocalhost(host) {
  if (!host) return false;
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

function ehEstatica(pathname) {
  if (pathname === "/favicon.ico") return true;
  return ROTAS_ESTATICAS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function ehNova(pathname) {
  return pathname === "/mazzel-preview" || pathname.startsWith("/mazzel-preview/");
}

export function middleware(request) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  if (ehEstatica(pathname)) return NextResponse.next();

  if (ehLocalhost(host)) {
    // Localhost: bloquear a NOVA (nova vai pro tunnel)
    if (ehNova(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Tunnel: só a NOVA + /login
  if (pathname === "/login" || ehNova(pathname)) {
    return NextResponse.next();
  }

  // Bloquear antiga: redireciona pra nova
  const url = request.nextUrl.clone();
  url.pathname = "/mazzel-preview";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)",
};
