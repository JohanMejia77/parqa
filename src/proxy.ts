import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION } from "@/lib/cookie-sesion";

// Comprobación rápida antes de mostrar cualquier página: quien llega sin la cookie
// de sesión va directo al inicio de sesión.
//
// Aquí no se consulta la base de datos. Que la sesión sea válida (exista y no haya
// expirado) y que el rol tenga permiso lo comprueban cada página y cada servicio.
export function proxy(request: NextRequest) {
  const esPagina = request.method === "GET" || request.method === "HEAD";
  const tieneCookie = request.cookies.has(COOKIE_SESION);

  if (esPagina && !tieneCookie && request.nextUrl.pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  // Todas las rutas menos la API (responde 401 por su cuenta) y los archivos estáticos.
  matcher: ["/((?!api|_next/static|_next/image|icon.svg|favicon.ico).*)"],
};
