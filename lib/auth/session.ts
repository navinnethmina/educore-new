import { createHash, createHmac, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

const SESSION_COOKIE = "educore_session"
const SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-in-production"

// ── Password hashing ──────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex")
}

export function verifyPassword(plain: string, hashed: string): boolean {
  const a = Buffer.from(hashPassword(plain))
  const b = Buffer.from(hashed)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// ── HMAC-signed session token ─────────────────────────────────────────────────

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex")
}

function createToken(userId: number, role: string): string {
  const payload = `${userId}:${role}`
  return Buffer.from(`${payload}.${sign(payload)}`).toString("base64url")
}

function parseToken(token: string): { userId: number; role: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const lastDot = decoded.lastIndexOf(".")
    const payload = decoded.slice(0, lastDot)
    const sig = decoded.slice(lastDot + 1)
    if (sign(payload) !== sig) return null
    const [userId, role] = payload.split(":")
    return { userId: Number(userId), role }
  } catch {
    return null
  }
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

export async function setSession(userId: number, role: string, remember = false) {
  const store = await cookies()
  store.set(SESSION_COOKIE, createToken(userId, role), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  })
}

export async function getSession(): Promise<{ userId: number; role: string } | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  return parseToken(token)
}

export async function clearSession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}
