import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// Rotas de PÁGINA acessíveis sem sessão.
// Prefixo: cobre a própria rota e tudo abaixo dela (ex: "/jogos" cobre "/jogos/abc").
const PUBLIC_PAGE_PREFIXES = ["/login", "/jogos"]

// Rotas de API acessíveis sem sessão.
// "/api/auth" é o mecanismo do próprio NextAuth (login, callback, csrf, signout...) — bloqueá-lo impediria login.
// "/api/public" é a área de endpoints públicos por design (ex: cadastro público, hoje desativado).
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/public"]

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (matchesPrefix(pathname, PUBLIC_API_PREFIXES) || matchesPrefix(pathname, PUBLIC_PAGE_PREFIXES)) {
    return NextResponse.next()
  }

  // Só verifica se existe uma sessão válida — checagens de papel (superuser/direção/etc)
  // continuam sendo feitas em cada página/rota, como já eram. Isto é só a rede de segurança
  // para o caso de uma rota nova esquecer o checagem de auth().
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (token) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
  }

  const loginUrl = new URL("/login", req.nextUrl.origin)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ttf|woff|woff2|json|js|css|txt|xml|html)$).*)",
  ],
}
