import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/ativos/:path*",
    "/operacoes/:path*",
    "/projetos/:path*",
    "/aportes/:path*",
    "/reserva/:path*",
    "/alocacao/:path*",
    "/familia/:path*",
    "/notificacoes/:path*",
    "/configuracoes/:path*",
  ],
};
