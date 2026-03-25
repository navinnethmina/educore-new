import type { NextRequest } from "next/server"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  const entryId = Number(id)

  const existing = await prisma.studentClub.findUnique({ where: { id: entryId } })
  if (!existing || existing.userId !== session.userId)
    return Response.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()
  const { role, participationPoints, isActive } = body

  const studentClub = await prisma.studentClub.update({
    where: { id: entryId },
    data: {
      ...(role !== undefined && { role: String(role).trim() }),
      ...(participationPoints != null && { participationPoints: Number(participationPoints) }),
      ...(isActive != null && { isActive: Boolean(isActive) }),
    },
    include: { club: { select: { id: true, name: true, category: true, logoUrl: true } } },
  })

  return Response.json(studentClub)
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  const entryId = Number(id)

  const existing = await prisma.studentClub.findUnique({ where: { id: entryId } })
  if (!existing || existing.userId !== session.userId)
    return Response.json({ error: "Not found" }, { status: 404 })

  await prisma.studentClub.delete({ where: { id: entryId } })
  return new Response(null, { status: 204 })
}
