import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const clubs = await prisma.club.findMany({
    orderBy: { name: "asc" },
    include: {
      applications: {
        where: { userId: session.userId },
        select: { id: true, status: true },
      },
      members: {
        where: { userId: session.userId },
        select: { id: true, isActive: true, role: true },
      },
      _count: {
        select: { members: { where: { isActive: true } } },
      },
    },
  })

  return Response.json(clubs)
}
