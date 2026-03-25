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

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { semesterId, subjectCode, subjectName, credits, marks } = body

  if (!semesterId || !subjectCode || !subjectName || !credits || marks == null)
    return Response.json({ error: "All fields are required." }, { status: 400 })

  const semester = await prisma.semester.findUnique({ where: { id: Number(semesterId) } })
  if (!semester || semester.userId !== session.userId)
    return Response.json({ error: "Semester not found." }, { status: 404 })

  const marksNum = Number(marks)
  if (marksNum < 0 || marksNum > 100)
    return Response.json({ error: "Marks must be between 0 and 100." }, { status: 400 })

  const subject = await prisma.subjectResult.create({
    data: {
      semesterId: Number(semesterId),
      subjectCode: String(subjectCode).trim(),
      subjectName: String(subjectName).trim(),
      credits: Number(credits),
      marks: marksNum,
      grade: gradeFromMarks(marksNum),
    },
  })

  return Response.json(subject, { status: 201 })
}
