import type { NextRequest } from "next/server"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const clubs = await prisma.studentClub.findMany({
    where: { userId: session.userId },
    orderBy: { joinedDate: "desc" },
    include: { club: { select: { id: true, name: true, category: true, logoUrl: true } } },
  })

  return Response.json(clubs)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { clubId, role, joinedDate, participationPoints } = body

  if (!clubId)
    return Response.json({ error: "Club is required." }, { status: 400 })

  const clubExists = await prisma.club.findUnique({ where: { id: Number(clubId) } })
  if (!clubExists)
    return Response.json({ error: "Club not found." }, { status: 404 })

  const existing = await prisma.studentClub.findUnique({
    where: { userId_clubId: { userId: session.userId, clubId: Number(clubId) } },
  })
  if (existing)
    return Response.json({ error: "You are already a member of this club." }, { status: 409 })

  const studentClub = await prisma.studentClub.create({
    data: {
      userId: session.userId,
      clubId: Number(clubId),
      role: role ? String(role).trim() : "Member",
      joinedDate: joinedDate ? new Date(joinedDate) : new Date(),
      participationPoints: participationPoints ? Number(participationPoints) : 0,
    },
    include: { club: { select: { id: true, name: true, category: true, logoUrl: true } } },
  })

  return Response.json(studentClub, { status: 201 })
}
