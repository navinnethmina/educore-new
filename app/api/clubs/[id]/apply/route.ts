import type { NextRequest } from "next/server"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  const clubId = Number(id)

  const club = await prisma.club.findUnique({ where: { id: clubId } })
  if (!club) return Response.json({ error: "Club not found." }, { status: 404 })
  if (club.status !== "OPEN")
    return Response.json({ error: "This club is not accepting applications." }, { status: 400 })

  // Check already a member
  const isMember = await prisma.studentClub.findUnique({
    where: { userId_clubId: { userId: session.userId, clubId } },
  })
  if (isMember) return Response.json({ error: "You are already a member of this club." }, { status: 409 })

  // Check already applied (pending or approved)
  const existing = await prisma.clubApplication.findFirst({
    where: {
      userId: session.userId,
      clubId,
      status: { in: ["PENDING", "APPROVED", "WAITLISTED"] },
    },
  })
  if (existing)
    return Response.json({ error: "You have already applied to this club." }, { status: 409 })

  const body = await request.json()
  const { motivation, currentYear, currentSemester, gpa, contribution, experience, availableDays } = body

  if (!motivation?.trim())
    return Response.json({ error: "Motivation is required." }, { status: 400 })

  const application = await prisma.clubApplication.create({
    data: {
      userId: session.userId,
      clubId,
      motivation: String(motivation).trim(),
      currentYear: currentYear ? Number(currentYear) : null,
      currentSemester: currentSemester ? Number(currentSemester) : null,
      gpa: gpa ? Number(gpa) : null,
      contribution: contribution ? String(contribution).trim() : null,
      experience: experience ? String(experience).trim() : null,
      availableDays: availableDays ? String(availableDays).trim() : null,
    },
    include: { club: { select: { name: true } } },
  })

  return Response.json(application, { status: 201 })
}
