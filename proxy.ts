import { createHmac } from "crypto"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const COOKIE = "educore_session"
const SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-in-production"

function sign(payload: string) {
  return createHmac("sha256", SECRET).update(payload).digest("hex")
}

function roleFromToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const lastDot = decoded.lastIndexOf(".")
    const payload = decoded.slice(0, lastDot)
    const sig = decoded.slice(lastDot + 1)
    if (sign(payload) !== sig) return null
    return payload.split(":")[1] ?? null
  } catch {
    return null
  }
}

function homeFor(role: string) {
  if (role === "ADMIN") return "/admin"
  if (role === "LECTURER") return "/lecturer"
  return "/dashboard"
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(COOKIE)?.value
  const role = token ? roleFromToken(token) : null

  // Auth pages: redirect authenticated users to their home
  if (pathname === "/login" || pathname === "/register") {
    if (role) return NextResponse.redirect(new URL(homeFor(role), req.url))
    return NextResponse.next()
  }

  // All other protected routes: require authentication
  if (!role) {
    const url = new URL("/login", req.url)
    url.searchParams.set("from", pathname)
    return NextResponse.redirect(url)
  }

  // Role guards
  const isAdminRoute = pathname.startsWith("/admin")
  const isLecturerRoute = pathname.startsWith("/lecturer")
  const isStudentOnlyRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/clubs") ||
    pathname.startsWith("/support")

  if (isAdminRoute && role !== "ADMIN")
    return NextResponse.redirect(new URL(homeFor(role), req.url))

  if (isLecturerRoute && role !== "LECTURER")
    return NextResponse.redirect(new URL(homeFor(role), req.url))

  if (isStudentOnlyRoute && role === "ADMIN")
    return NextResponse.redirect(new URL("/admin", req.url))

  if (isStudentOnlyRoute && role === "LECTURER")
    return NextResponse.redirect(new URL("/lecturer", req.url))

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
