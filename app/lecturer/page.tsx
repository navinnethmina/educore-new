import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import Link from "next/link"

export default async function LecturerPage() {
  const session = await getSession()
  if (!session || session.role !== "LECTURER") redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { fullName: true },
  })
  if (!user) redirect("/login")

  const [studentCount, materialCount, activeSessions, activeMentors, recentSessions] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.studyMaterial.count(),
    prisma.supportSession.count({ where: { status: { in: ["UPCOMING", "ONGOING"] } } }),
    prisma.mentorProfile.count({ where: { isActive: true } }),
    prisma.supportSession.findMany({
      where: { status: { in: ["UPCOMING", "ONGOING"] } },
      orderBy: { date: "asc" },
      take: 5,
      include: { mentor: { include: { user: { select: { fullName: true } } } } },
    }),
  ])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 flex items-center justify-center text-lg font-bold">
            {user.fullName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{user.fullName}</h1>
            <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">Lecturer</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Students" value={String(studentCount)} sub="Registered students" color="text-primary" />
        <StatCard label="Study Materials" value={String(materialCount)} sub="Uploaded materials" color="text-chart-2" />
        <StatCard label="Active Sessions" value={String(activeSessions)} sub="Upcoming & ongoing" color="text-chart-3" />
        <StatCard label="Active Mentors" value={String(activeMentors)} sub="Peer mentors" color="text-purple-600 dark:text-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming sessions */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Upcoming Sessions</h2>
          </div>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No upcoming sessions.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentSessions.map((s) => (
                <li key={s.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.mentor.user.fullName} · {new Date(s.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.status === "ONGOING"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {s.status.charAt(0) + s.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Action href="/materials" label="Browse Materials" />
            <Action href="/lecturer/analytics" label="View Analytics" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  )
}

function Action({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors text-sm font-medium text-foreground"
    >
      {label}
      <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  )
}
