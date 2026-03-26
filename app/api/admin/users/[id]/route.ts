import type { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await ctx.params
  const userId = Number(id)

  if (userId === session.userId) {
    return Response.json({ error: "Cannot delete your own account." }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: userId } })
  return Response.json({ message: "User deleted." })
}
