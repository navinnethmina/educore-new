import type { NextRequest } from "next/server"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const semesters = await prisma.semester.findMany({
    where: { userId: session.userId },
    orderBy: { semesterNum: "asc" },
    include: { subjects: { orderBy: { subjectCode: "asc" } } },
  })

  return Response.json(semesters)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { semesterNum, academicYear, gpa } = body

  if (!semesterNum || !academicYear)
    return Response.json({ error: "Semester number and academic year are required." }, { status: 400 })

  const semester = await prisma.semester.create({
    data: {
      semesterNum: Number(semesterNum),
      academicYear: String(academicYear),
      gpa: gpa != null && gpa !== "" ? Number(gpa) : null,
      userId: session.userId,
    },
    include: { subjects: true },
  })

  return Response.json(semester, { status: 201 })
}
