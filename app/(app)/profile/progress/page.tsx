import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { ProgressRing } from "@/components/profile/ProgressRing"
import { GpaLineChart } from "@/components/profile/GpaLineChart"
import { ProfileScoreBar } from "@/components/profile/ProfileScoreBar"
import { SuggestionCard } from "@/components/profile/SuggestionCard"

const TABS = [
  { label: "Overview", href: "/profile" },
  { label: "Academics", href: "/profile/academics" },
  { label: "Clubs", href: "/profile/clubs" },
  { label: "Sports", href: "/profile/sports" },
  { label: "Progress", href: "/profile/progress" },
]

function BarChart({
  data,
  label,
  color,
}: {
  data: { key: string; value: number }[]
  label: string
  color: string
}) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No data yet.</p>
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{label}</p>
      <div className="flex items-end gap-2 h-24">
        {data.map((d) => (
          <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-semibold tabular-nums" style={{ color }}>{d.value}</span>
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{ height: `${(d.value / max) * 72}px`, backgroundColor: color, opacity: 0.85 }}
            />
            <span className="text-xs text-muted-foreground truncate max-w-full">{d.key}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function ProgressPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [semesters, sports, clubs] = await Promise.all([
    prisma.semester.findMany({
      where: { userId: session.userId },
      orderBy: { semesterNum: "asc" },
      include: { subjects: { orderBy: { marks: "asc" } } },
    }),
    prisma.sportAchievement.findMany({
      where: { userId: session.userId },
      orderBy: { date: "asc" },
    }),
    prisma.studentClub.findMany({
      where: { userId: session.userId, isActive: true },
    }),
  ])

  // ── Score calculations ────────────────────────────────────────────────────
  const avgGpa =
    semesters.length > 0
      ? semesters.reduce((sum, s) => sum + (s.gpa ?? 0), 0) / semesters.length
      : 0

  const academicScore = Math.min(Math.round((avgGpa / 4.0) * 100), 100)
  const sportsTotal = sports.reduce((sum, s) => sum + s.points, 0)
  const sportsScore = Math.min(sportsTotal, 100)
  const societyTotal = clubs.reduce((sum, c) => sum + c.participationPoints, 0)
  const societyScore = Math.min(societyTotal, 100)
  const overallScore = Math.round(academicScore * 0.5 + sportsScore * 0.25 + societyScore * 0.25)

  // ── GPA chart data ────────────────────────────────────────────────────────
  const gpaChartData = semesters
    .filter((s) => s.gpa != null)
    .map((s) => ({ semesterNum: s.semesterNum, academicYear: s.academicYear, gpa: s.gpa! }))

  // ── Sports by year ────────────────────────────────────────────────────────
  const sportsByYear: Record<string, number> = {}
  for (const s of sports) {
    const yr = String(new Date(s.date).getFullYear())
    sportsByYear[yr] = (sportsByYear[yr] ?? 0) + s.points
  }
  const sportsBarData = Object.entries(sportsByYear)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([key, value]) => ({ key, value }))

  // ── Weak subjects ─────────────────────────────────────────────────────────
  const allSubjects = semesters.flatMap((s) =>
    s.subjects.map((sub) => ({ ...sub, semesterNum: s.semesterNum }))
  )
  const weakSubjects = [...allSubjects]
    .sort((a, b) => a.marks - b.marks)
    .slice(0, 3)
    .filter((s) => s.marks < 70)

  // ── Suggestions ───────────────────────────────────────────────────────────
  type Suggestion = { type: string; text: string; href: string; linkLabel: string }
  const suggestions: Suggestion[] = []

  for (let i = 1; i < semesters.length; i++) {
    const prev = semesters[i - 1]
    const curr = semesters[i]
    if (prev.gpa && curr.gpa && curr.gpa < prev.gpa - 0.3) {
      suggestions.push({
        type: "academic",
        text: `Your GPA dropped from ${prev.gpa.toFixed(2)} (Sem ${prev.semesterNum}) to ${curr.gpa.toFixed(2)} (Sem ${curr.semesterNum}). Review your study strategy.`,
        href: "/profile/academics",
        linkLabel: "View academics →",
      })
      break
    }
  }

  if (weakSubjects.length > 0) {
    const w = weakSubjects[0]
    suggestions.push({
      type: "academic",
      text: `${w.subjectName} is your weakest subject at ${w.marks}% (${w.grade}). A mentor session could help.`,
      href: "/support/mentors",
      linkLabel: "Find a mentor →",
    })
  }

  if (sportsScore < 30) {
    suggestions.push({
      type: "sports",
      text: "Your sports score is below average. Participate in sports events to earn more points.",
      href: "/profile/sports",
      linkLabel: "Add achievement →",
    })
  }

  if (societyScore < 30) {
    suggestions.push({
      type: "society",
      text: clubs.length === 0
        ? "You haven't joined any clubs. Joining boosts your society score."
        : "Your society participation is low. Get more involved in your clubs.",
      href: clubs.length === 0 ? "/clubs" : "/profile/clubs",
      linkLabel: clubs.length === 0 ? "Explore clubs →" : "View clubs →",
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

  const topSuggestions = suggestions.slice(0, 4)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">4-Year Progress</h1>
        <p className="text-sm text-muted-foreground mt-1">Your overall academic and extracurricular progress.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              t.href === "/profile/progress"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Score Overview */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-foreground mb-6">Overall Progress Score</h2>
        <div className="flex flex-col sm:flex-row items-center gap-8">
          {/* Overall ring */}
          <div className="shrink-0">
            <ProgressRing
              value={overallScore}
              size={140}
              strokeWidth={14}
              color={overallScore >= 70 ? "#22c55e" : overallScore >= 50 ? "#f59e0b" : "#ef4444"}
              label="Overall"
            />
          </div>

          {/* Score breakdown rings */}
          <div className="flex gap-6">
            <ProgressRing value={academicScore} size={90} strokeWidth={10} color="#6366f1" label="Academic" />
            <ProgressRing value={sportsScore} size={90} strokeWidth={10} color="#22c55e" label="Sports" />
            <ProgressRing value={societyScore} size={90} strokeWidth={10} color="#a855f7" label="Society" />
          </div>

          {/* Score bars */}
          <div className="flex-1 w-full space-y-4">
            <ProfileScoreBar label="Academic" score={academicScore} color="#6366f1" weight="50%" />
            <ProfileScoreBar label="Sports" score={sportsScore} color="#22c55e" weight="25%" />
            <ProfileScoreBar label="Society" score={societyScore} color="#a855f7" weight="25%" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Formula: Academic×50% + Sports×25% + Society×25%
        </p>
      </div>

      {/* GPA Trend */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-1">GPA Trend</h2>
        <p className="text-xs text-muted-foreground mb-4">Semester-by-semester GPA across all years.</p>
        {gpaChartData.length > 0 ? (
          <GpaLineChart data={gpaChartData} />
        ) : (
          <div className="flex items-center justify-center h-28 text-sm text-muted-foreground">
            Add semester records in the Academics tab to see your GPA trend.
          </div>
        )}
      </div>

      {/* Timeline Charts */}
      {sportsBarData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Sports Points by Year</h2>
          <BarChart data={sportsBarData} label="Points earned" color="#22c55e" />
        </div>
      )}

      {/* Weak Areas */}
      {weakSubjects.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-1">Weak Areas</h2>
          <p className="text-xs text-muted-foreground mb-4">Your lowest-performing subjects that need attention.</p>
          <div className="space-y-3">
            {weakSubjects.map((sub) => (
              <div
                key={sub.id}
                className={`flex items-center gap-4 p-4 rounded-xl border ${
                  sub.marks < 50
                    ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800"
                    : "bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800"
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    sub.marks < 50 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  }`}
                >
                  {sub.grade}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{sub.subjectName}</p>
                  <p className="text-xs text-muted-foreground">
                    Sem {sub.semesterNum} · {sub.marks}% · {sub.subjectCode}
                  </p>
                </div>
                <Link
                  href="/support/mentors"
                  className="text-xs text-primary hover:underline font-medium shrink-0"
                >
                  Get help →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement Suggestions */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-1">Improvement Suggestions</h2>
        <p className="text-xs text-muted-foreground mb-4">Personalised recommendations based on your profile.</p>
        <div className="space-y-3">
          {topSuggestions.map((s, i) => (
            <SuggestionCard key={i} {...s} />
          ))}
        </div>
      </div>
    </div>
  )
}
