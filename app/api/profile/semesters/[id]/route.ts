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
  const semId = Number(id)

  const existing = await prisma.semester.findUnique({ where: { id: semId } })
  if (!existing || existing.userId !== session.userId)
    return Response.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()
  const { semesterNum, academicYear, gpa } = body

  const semester = await prisma.semester.update({
    where: { id: semId },
    data: {
      ...(semesterNum && { semesterNum: Number(semesterNum) }),
      ...(academicYear && { academicYear: String(academicYear) }),
      gpa: gpa != null && gpa !== "" ? Number(gpa) : null,
    },
    include: { subjects: { orderBy: { subjectCode: "asc" } } },
  })

  return Response.json(semester)
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  const semId = Number(id)

  const existing = await prisma.semester.findUnique({ where: { id: semId } })
  if (!existing || existing.userId !== session.userId)
    return Response.json({ error: "Not found" }, { status: 404 })

  await prisma.semester.delete({ where: { id: semId } })
  return new Response(null, { status: 204 })
}
