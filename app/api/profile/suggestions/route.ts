import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const [semesters, sports, clubs] = await Promise.all([
    prisma.semester.findMany({
      where: { userId: session.userId },
      orderBy: { semesterNum: "asc" },
      include: { subjects: { orderBy: { marks: "asc" } } },
    }),
    prisma.sportAchievement.findMany({ where: { userId: session.userId } }),
    prisma.studentClub.findMany({ where: { userId: session.userId, isActive: true } }),
  ])

  type Suggestion = { type: string; text: string; href: string; linkLabel: string }
  const suggestions: Suggestion[] = []

  // GPA drop detection
  for (let i = 1; i < semesters.length; i++) {
    const prev = semesters[i - 1]
    const curr = semesters[i]
    if (prev.gpa && curr.gpa && curr.gpa < prev.gpa - 0.3) {
      suggestions.push({
        type: "academic",
        text: `Your GPA dropped from ${prev.gpa.toFixed(2)} (Sem ${prev.semesterNum}) to ${curr.gpa.toFixed(2)} (Sem ${curr.semesterNum}). Review your study habits.`,
        href: "/profile/academics",
        linkLabel: "View academics →",
      })
      break
    }
  }

  // Weak subjects in latest semester
  const latestSem = semesters[semesters.length - 1]
  if (latestSem) {
    const weakSubs = latestSem.subjects.filter((s) => s.marks < 65)
    for (const sub of weakSubs.slice(0, 2)) {
      suggestions.push({
        type: "academic",
        text: `Your ${sub.subjectName} grade is ${sub.grade} (${sub.marks}%). A mentor session could help.`,
        href: "/support/mentors",
        linkLabel: "Find a mentor →",
      })
    }
  }

  // Low sports score
  const sportsTotal = sports.reduce((sum, s) => sum + s.points, 0)
  if (sportsTotal < 20) {
    suggestions.push({
      type: "sports",
      text: "Your sports score is low. Participate in sports events or record your achievements.",
      href: "/profile/sports",
      linkLabel: "Add achievement →",
    })
  }

  // No clubs
  if (clubs.length === 0) {
    suggestions.push({
      type: "society",
      text: "You haven't joined any clubs yet. Joining clubs boosts your society score.",
      href: "/clubs",
      linkLabel: "Explore clubs →",
    })
  }

  suggestions.push({
    type: "materials",
    text: "Upload your lecture notes to use the AI-powered study summarizer.",
    href: "/materials/upload",
    linkLabel: "Upload materials →",
  })

  suggestions.push({
    type: "mentor",
    text: "Browse peer mentor sessions to get academic support from top students.",
    href: "/support/sessions",
    linkLabel: "Browse sessions →",
  })

  return Response.json(suggestions.slice(0, 6))
}
