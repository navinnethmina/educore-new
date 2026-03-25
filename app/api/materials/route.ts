import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const materials = await prisma.studyMaterial.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      fileAsset: { select: { fileName: true, fileSize: true, fileUrl: true, fileType: true } },
      summary: { select: { quickSummary: true } },
    },
  })

  return Response.json(materials)
}
