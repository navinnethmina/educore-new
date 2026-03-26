import type { NextRequest } from "next/server"
import { AchievementType } from "@prisma/client"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const achievements = await prisma.sportAchievement.findMany({
    where: { userId: session.userId },
    orderBy: { date: "desc" },
    include: { fileAsset: true },
  })

  return Response.json(achievements)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { sportName, achievementType, position, date, points, certificateUrl, certificateFileName } = body

  if (!sportName || !achievementType || !date)
    return Response.json({ error: "Sport name, achievement type, and date are required." }, { status: 400 })

  if (!Object.values(AchievementType).includes(achievementType))
    return Response.json({ error: "Invalid achievement type." }, { status: 400 })

  const achievement = await prisma.sportAchievement.create({
    data: {
      userId: session.userId,
      sportName: String(sportName).trim(),
      achievementType: achievementType as AchievementType,
      position: position ? String(position).trim() : null,
      date: new Date(date),
      points: points ? Number(points) : 0,
      ...(certificateUrl && {
        fileAsset: {
          create: {
            userId: session.userId,
            fileName: certificateFileName ?? "certificate",
            fileSize: 0,
            fileUrl: certificateUrl,
            fileType: "image",
          },
        },
      }),
    },
    include: { fileAsset: true },
  })

  return Response.json(achievement, { status: 201 })
}
