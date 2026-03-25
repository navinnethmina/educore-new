import type { NextRequest } from "next/server"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

function gradeFromMarks(marks: number): string {
  if (marks >= 90) return "A+"
  if (marks >= 85) return "A"
  if (marks >= 80) return "A-"
  if (marks >= 75) return "B+"
  if (marks >= 70) return "B"
  if (marks >= 65) return "B-"
  if (marks >= 60) return "C+"
  if (marks >= 55) return "C"
  if (marks >= 50) return "C-"
  if (marks >= 45) return "D"
  return "F"
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  const subId = Number(id)

  const existing = await prisma.subjectResult.findUnique({
    where: { id: subId },
    include: { semester: true },
  })
  if (!existing || existing.semester.userId !== session.userId)
    return Response.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()
  const { subjectCode, subjectName, credits, marks } = body

  const marksNum = marks != null ? Number(marks) : existing.marks
  if (marksNum < 0 || marksNum > 100)
    return Response.json({ error: "Marks must be between 0 and 100." }, { status: 400 })

  const subject = await prisma.subjectResult.update({
    where: { id: subId },
    data: {
      ...(subjectCode && { subjectCode: String(subjectCode).trim() }),
      ...(subjectName && { subjectName: String(subjectName).trim() }),
      ...(credits && { credits: Number(credits) }),
      ...(marks != null && { marks: marksNum, grade: gradeFromMarks(marksNum) }),
    },
  })

  return Response.json(subject)
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  const subId = Number(id)

  const existing = await prisma.subjectResult.findUnique({
    where: { id: subId },
    include: { semester: true },
  })
  if (!existing || existing.semester.userId !== session.userId)
    return Response.json({ error: "Not found" }, { status: 404 })

  await prisma.subjectResult.delete({ where: { id: subId } })
  return new Response(null, { status: 204 })
}
