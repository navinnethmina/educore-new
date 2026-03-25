import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

const TABS = [
  { label: "Overview", href: "/profile" },
  { label: "Academics", href: "/profile/academics" },
  { label: "Clubs", href: "/profile/clubs" },
  { label: "Sports", href: "/profile/sports" },
  { label: "Progress", href: "/profile/progress" },
]

const ACHIEVEMENT_ICON: Record<string, string> = {
  TROPHY: "🏆",
  CERTIFICATE: "📜",
  MEDAL: "🥇",
}

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [user, semesters, clubs, sports] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        fullName: true,
        studentId: true,
        faculty: true,
        degree: true,
        intakeYear: true,
        photoUrl: true,
        email: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
      },
    }),
    prisma.semester.findMany({
      where: { userId: session.userId },
      orderBy: { semesterNum: "desc" },
      include: { subjects: { orderBy: { marks: "asc" } } },
    }),
    prisma.studentClub.findMany({
      where: { userId: session.userId, isActive: true },
      orderBy: { joinedDate: "desc" },
      take: 3,
      include: { club: { select: { name: true, category: true } } },
    }),
    prisma.sportAchievement.findMany({
      where: { userId: session.userId },
      orderBy: { date: "desc" },
      take: 3,
    }),
  ])

  if (!user) redirect("/login")

  // ── Score calculations ─────────────────────────────────────────────────────
  const avgGpa =
    semesters.length > 0
      ? semesters.reduce((sum, s) => sum + (s.gpa ?? 0), 0) / semesters.length
      : 0

  const academicScore = Math.min(Math.round((avgGpa / 4.0) * 100), 100)
  const sportsScore = Math.min(sports.reduce((sum, s) => sum + s.points, 0), 100)
  const societyScore = Math.min(
    clubs.reduce((sum, c) => sum + c.participationPoints, 0),
    100
  )
  const overallScore = Math.round(
    academicScore * 0.5 + sportsScore * 0.25 + societyScore * 0.25
  )

  // ── Overview data ──────────────────────────────────────────────────────────
  const latestSemester = semesters[0] ?? null
  const graduationYear = user.intakeYear + 4

  const initials = user.fullName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  // ── Suggestions ───────────────────────────────────────────────────────────
  const suggestions: { text: string; href: string; linkLabel: string }[] = []

  if (latestSemester) {
    const weakSubject = latestSemester.subjects.find((s) => s.marks < 70)
    if (weakSubject) {
      suggestions.push({
        text: `Your ${weakSubject.subjectName} grade is ${weakSubject.grade} (${weakSubject.marks}%). Consider getting extra support.`,
        href: "/support/mentors",
        linkLabel: "Find a mentor →",
      })
    }
  }
  if (clubs.length === 0) {
    suggestions.push({
      text: "You haven't joined any clubs yet. Joining clubs boosts your society score.",
      href: "/clubs",
      linkLabel: "Explore clubs →",
    })
  }
  if (sports.length === 0) {
    suggestions.push({
      text: "No sports achievements recorded. Participate in sports events to earn points.",
      href: "/profile/sports",
      linkLabel: "Add achievement →",
    })
  }
  suggestions.push({
    text: "Upload your lecture notes to use the AI-powered study summarizer.",
    href: "/materials/upload",
    linkLabel: "Upload materials →",
  })
  suggestions.push({
    text: "Browse peer mentor sessions to get academic support from top students.",
    href: "/support/sessions",
    linkLabel: "Browse sessions →",
  })

  const topSuggestions = suggestions.slice(0, 3)

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Profile Header Card ─────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">

          {/* Avatar */}
          <div className="h-20 w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shrink-0 overflow-hidden ring-4 ring-primary/20">
            {user.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoUrl} alt={user.fullName} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{user.fullName}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{user.studentId}</p>
              </div>
              <Link
                href="/profile/setup"
                className="shrink-0 text-sm font-medium px-4 py-2 rounded-lg border border-border hover:bg-accent/50 transition-colors text-foreground"
              >
                Edit Profile
              </Link>
            </div>

            <div className="mt-2 space-y-0.5">
              <p className="text-sm text-foreground">{user.faculty}</p>
              <p className="text-sm text-muted-foreground">{user.degree}</p>
              <p className="text-sm text-muted-foreground">
                Intake {user.intakeYear} &rarr; Est. Graduation {graduationYear}
              </p>
            </div>
          </div>
        </div>

        {/* Score Badges */}
        <div className="mt-5 pt-5 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Profile Score
          </p>
          <div className="flex flex-wrap gap-3">
            {/* Overall */}
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5">
              <span className="text-2xl font-bold text-primary">{overallScore}</span>
              <div>
                <p className="text-xs font-semibold text-primary">Overall</p>
                <p className="text-xs text-muted-foreground">/ 100</p>
              </div>
            </div>
            <ScoreBadge label="Academic" value={academicScore} color="blue" />
            <ScoreBadge label="Sports" value={sportsScore} color="green" />
            <ScoreBadge label="Society" value={societyScore} color="purple" />
          </div>

          {/* Score bars */}
          <div className="mt-4 space-y-2">
            <ScoreBar label="Academic" value={academicScore} color="bg-blue-500" />
            <ScoreBar label="Sports" value={sportsScore} color="bg-green-500" />
            <ScoreBar label="Society" value={societyScore} color="bg-purple-500" />
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-muted/60 p-1 rounded-xl border border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 text-center py-2 px-1 rounded-lg text-sm font-medium transition-colors ${
              tab.href === "/profile"
                ? "bg-card shadow-sm text-foreground border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* ── Overview Content ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left col — GPA + Subjects */}
        <div className="lg:col-span-2 space-y-4">

          {/* Current Semester GPA */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Current Semester</h2>
              <Link href="/profile/academics" className="text-xs text-primary hover:underline">
                View all →
              </Link>
            </div>

            {latestSemester ? (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">
                      {latestSemester.gpa?.toFixed(2) ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">GPA</p>
                  </div>
                  <div className="h-10 w-px bg-border" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Semester {latestSemester.semesterNum}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {latestSemester.academicYear}
                    </p>
                  </div>
                </div>

                {latestSemester.subjects.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-xs text-muted-foreground">
                          <th className="text-left px-3 py-2 font-medium">Subject</th>
                          <th className="text-center px-3 py-2 font-medium">Marks</th>
                          <th className="text-center px-3 py-2 font-medium">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {latestSemester.subjects.map((subj) => (
                          <tr key={subj.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-2.5">
                              <p className="font-medium text-foreground truncate max-w-[180px]">
                                {subj.subjectName}
                              </p>
                              <p className="text-xs text-muted-foreground">{subj.subjectCode}</p>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="text-foreground font-medium">{subj.marks}%</span>
                                <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      subj.marks >= 80
                                        ? "bg-green-500"
                                        : subj.marks >= 70
                                        ? "bg-blue-500"
                                        : subj.marks >= 60
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                    }`}
                                    style={{ width: `${subj.marks}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  subj.grade.startsWith("A")
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : subj.grade.startsWith("B")
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : subj.grade.startsWith("C")
                                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                }`}
                              >
                                {subj.grade}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No subjects recorded for this semester.
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-3">No academic records yet.</p>
                <Link
                  href="/profile/academics"
                  className="text-sm text-primary font-medium hover:underline"
                >
                  Add your first semester →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right col — Clubs + Sports */}
        <div className="space-y-4">

          {/* Clubs */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">Clubs</h2>
              <Link href="/profile/clubs" className="text-xs text-primary hover:underline">
                View all →
              </Link>
            </div>
            {clubs.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">No clubs joined yet.</p>
                <Link href="/clubs" className="text-xs text-primary hover:underline">
                  Browse clubs →
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {clubs.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {c.club.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {c.club.name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {c.role.toLowerCase()}
                      </p>
                    </div>
                    {c.isActive && (
                      <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full shrink-0">
                        Active
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Sports */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">Sports</h2>
              <Link href="/profile/sports" className="text-xs text-primary hover:underline">
                View all →
              </Link>
            </div>
            {sports.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">No achievements yet.</p>
                <Link href="/profile/sports" className="text-xs text-primary hover:underline">
                  Add achievement →
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {sports.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40"
                  >
                    <span className="text-xl shrink-0">
                      {ACHIEVEMENT_ICON[s.achievementType] ?? "🏅"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {s.sportName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.position ?? s.achievementType.toLowerCase()} · {s.points} pts
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── Suggestions Panel ───────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Improvement Suggestions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {topSuggestions.map((s, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 p-4 rounded-lg bg-primary/5 border border-primary/15"
            >
              <div className="flex items-start gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground leading-snug">{s.text}</p>
              </div>
              <Link
                href={s.href}
                className="text-xs text-primary font-medium hover:underline mt-auto"
              >
                {s.linkLabel}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ScoreBadge({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: "blue" | "green" | "purple"
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    green: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    purple: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  }
  return (
    <div className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 ${colors[color]}`}>
      <span className="text-2xl font-bold">{value}</span>
      <div>
        <p className="text-xs font-semibold">{label}</p>
        <p className="text-xs opacity-70">/ 100</p>
      </div>
    </div>
  )
}

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-medium text-foreground w-8 text-right shrink-0">
        {value}%
      </span>
    </div>
  )
}
