import type { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"
import { hashPassword } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const role = searchParams.get("role")
  const search = searchParams.get("search") ?? ""

  const users = await prisma.user.findMany({
    where: {
      ...(role && role !== "ALL" ? { role: role as "STUDENT" | "ADMIN" | "LECTURER" } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search } },
              { email: { contains: search } },
              { studentId: { contains: search } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      studentId: true,
      faculty: true,
      degree: true,
      intakeYear: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return Response.json(users)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized." }, { status: 401 })
  }

  const body = await request.json()
  const { fullName, email, studentId, password, faculty, degree, intakeYear, role } = body

  if (!fullName || !email || !studentId || !password || !faculty || !degree || !intakeYear || !role) {
    return Response.json({ error: "All fields are required." }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(String(email))) {
    return Response.json({ error: "Invalid email address." }, { status: 400 })
  }

  if (typeof password !== "string" || password.length < 6) {
    return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 })
  }

  const validRoles = ["STUDENT", "LECTURER", "ADMIN"]
  if (!validRoles.includes(String(role))) {
    return Response.json({ error: "Invalid role." }, { status: 400 })
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: String(email) }, { studentId: String(studentId) }] },
    select: { email: true, studentId: true },
  })

  if (existing?.email === String(email)) {
    return Response.json({ error: "Email already registered." }, { status: 409 })
  }
  if (existing?.studentId === String(studentId)) {
    return Response.json({ error: "ID already registered." }, { status: 409 })
  }

  const user = await prisma.user.create({
    data: {
      fullName: String(fullName),
      email: String(email),
      studentId: String(studentId),
      password: hashPassword(String(password)),
      faculty: String(faculty),
      degree: String(degree),
      intakeYear: Number(intakeYear),
      role: role as "STUDENT" | "LECTURER" | "ADMIN",
    },
    select: { id: true, fullName: true, email: true, role: true },
  })

  return Response.json(user, { status: 201 })
}
