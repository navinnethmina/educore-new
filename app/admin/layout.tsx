import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import Sidebar from "@/components/layout/Sidebar"
import Topbar from "@/components/layout/Topbar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role !== "ADMIN") redirect("/dashboard")

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { fullName: true, photoUrl: true },
  })
  if (!user) redirect("/login")

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar role="ADMIN" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar name={user.fullName} photoUrl={user.photoUrl} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
