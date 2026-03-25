import type { NextRequest } from "next/server"
import fs from "fs"
import path from "path"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  const matId = Number(id)

  const material = await prisma.studyMaterial.findUnique({
    where: { id: matId },
    include: { fileAsset: true },
  })
  if (!material || material.userId !== session.userId)
    return Response.json({ error: "Not found." }, { status: 404 })

  // Delete file from disk if exists
  if (material.fileAsset?.fileUrl) {
    const filePath = path.join(process.cwd(), "public", material.fileAsset.fileUrl)
    fs.unlink(filePath, () => {})
  }

  await prisma.studyMaterial.delete({ where: { id: matId } })
  return new Response(null, { status: 204 })
}
