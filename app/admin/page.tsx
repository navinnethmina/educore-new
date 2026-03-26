import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export default async function AdminPage() {
  const session = await getSession()
  if (!session || session.role !== "ADMIN") redirect("/login")

  const [userCount, clubCount, pendingApps, activeSessions, recentApps] = await Promise.all([
    prisma.user.count(),
    prisma.club.count(),
    prisma.clubApplication.count({ where: { status: "PENDING" } }),
    prisma.supportSession.count({ where: { status: { in: ["UPCOMING", "ONGOING"] } } }),
    prisma.clubApplication.findMany({
      where: { status: "PENDING" },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { fullName: true } },
        club: { select: { name: true } },
      },
    }),
  ])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform overview and management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={String(userCount)} sub="Registered accounts" color="text-primary" />
        <StatCard label="Total Clubs" value={String(clubCount)} sub="Active clubs" color="text-chart-2" />
        <StatCard label="Pending Applications" value={String(pendingApps)} sub="Club applications" color="text-yellow-600 dark:text-yellow-400" />
        <StatCard label="Active Sessions" value={String(activeSessions)} sub="Upcoming & ongoing" color="text-chart-3" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent applications */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Pending Club Applications</h2>
            <Link href="/admin/club-applications" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {recentApps.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No pending applications.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentApps.map((app) => (
                <li key={app.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{app.user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{app.club.name}</p>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full">Pending</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <AdminAction href="/admin/users" label="Manage Users" />
            <AdminAction href="/admin/clubs" label="Manage Clubs" />
            <AdminAction href="/admin/club-applications" label="Review Applications" />
            <AdminAction href="/admin/mentors" label="Manage Mentors" />
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

function AdminAction({ href, label }: { href: string; label: string }) {
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
