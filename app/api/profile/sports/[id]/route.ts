import type { NextRequest } from "next/server"
import { AchievementType } from "@prisma/client"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  const achId = Number(id)

  const existing = await prisma.sportAchievement.findUnique({ where: { id: achId } })
  if (!existing || existing.userId !== session.userId)
    return Response.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()
  const { sportName, achievementType, position, date, points } = body

  if (achievementType && !Object.values(AchievementType).includes(achievementType))
    return Response.json({ error: "Invalid achievement type." }, { status: 400 })

  const achievement = await prisma.sportAchievement.update({
    where: { id: achId },
    data: {
      ...(sportName && { sportName: String(sportName).trim() }),
      ...(achievementType && { achievementType: achievementType as AchievementType }),
      ...(position !== undefined && { position: position ? String(position).trim() : null }),
      ...(date && { date: new Date(date) }),
      ...(points != null && { points: Number(points) }),
    },
  })

  return Response.json(achievement)
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  const achId = Number(id)

  const existing = await prisma.sportAchievement.findUnique({ where: { id: achId } })
  if (!existing || existing.userId !== session.userId)
    return Response.json({ error: "Not found" }, { status: 404 })

  await prisma.sportAchievement.delete({ where: { id: achId } })
  return new Response(null, { status: 204 })
}
