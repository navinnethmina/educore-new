import type { NextRequest } from "next/server"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      studentId: true,
      faculty: true,
      degree: true,
      intakeYear: true,
      photoUrl: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
      role: true,
    },
  })

  if (!user) return Response.json({ error: "Not found" }, { status: 404 })
  return Response.json(user)
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { fullName, phone, dateOfBirth, gender, photoUrl } = body

  if (fullName !== undefined && (!fullName || String(fullName).trim().length < 2)) {
    return Response.json({ error: "Full name must be at least 2 characters." }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: {
      ...(fullName && { fullName: String(fullName).trim() }),
      phone: phone ? String(phone) : null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender: gender ? String(gender) : null,
      photoUrl: photoUrl ? String(photoUrl) : null,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      studentId: true,
      faculty: true,
      degree: true,
      intakeYear: true,
      photoUrl: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
    },
  })

  return Response.json(user)
}
