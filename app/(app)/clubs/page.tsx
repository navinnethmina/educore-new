"use client"

import { useState, useEffect, useMemo } from "react"

// ── Types ───────────────────────────────────────────────────────────────────

type Application = { id: number; status: string }
type Member = { id: number; isActive: boolean; role: string }

type Club = {
  id: number
  name: string
  category: string
  status: string
  description: string
  requirements: string | null
  capacity: number
  logoUrl: string | null
  email: string | null
  social: string | null
  applications: Application[]
  members: Member[]
  _count: { members: number }
}

// ── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = ["ALL", "ACADEMIC", "SPORTS", "CULTURAL", "RELIGIOUS", "OTHER"]

const CATEGORY_COLOR: Record<string, string> = {
  ACADEMIC: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SPORTS: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CULTURAL: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  RELIGIOUS: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  OTHER: "bg-muted text-muted-foreground",
}

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  FULL: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  CLOSED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const APPLICATION_STYLE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  WAITLISTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
}

const INPUT =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"

const TEXTAREA =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition resize-none"

// ── Component ───────────────────────────────────────────────────────────────

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState("ALL")
  const [search, setSearch] = useState("")

  // Apply modal
  const [applyClub, setApplyClub] = useState<Club | null>(null)
  const [applyForm, setApplyForm] = useState({
    motivation: "",
    currentYear: "",
    currentSemester: "",
    gpa: "",
    contribution: "",
    experience: "",
    availableDays: "",
  })
  const [applyError, setApplyError] = useState("")
  const [applying, setApplying] = useState(false)

  // Detail modal
  const [detailClub, setDetailClub] = useState<Club | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/clubs")
    if (res.ok) setClubs(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return clubs
      .filter((c) => category === "ALL" || c.category === category)
      .filter((c) => {
        const q = search.toLowerCase()
        return !q || c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
      })
  }, [clubs, category, search])

  function userApplicationStatus(club: Club): string | null {
    if (club.members.some((m) => m.isActive)) return "MEMBER"
    return club.applications[0]?.status ?? null
  }

  async function submitApplication() {
    if (!applyClub) return
    if (!applyForm.motivation.trim()) { setApplyError("Motivation is required."); return }
    setApplying(true)
    setApplyError("")
    const res = await fetch(`/api/clubs/${applyClub.id}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(applyForm),
    })
    const data = await res.json()
    if (!res.ok) { setApplyError(data.error ?? "Failed to apply."); setApplying(false); return }
    // Update local state: add application to the club
    setClubs((prev) =>
      prev.map((c) =>
        c.id === applyClub.id
          ? { ...c, applications: [{ id: data.id, status: "PENDING" }] }
          : c
      )
    )
    setApplyClub(null)
    setApplyForm({ motivation: "", currentYear: "", currentSemester: "", gpa: "", contribution: "", experience: "", availableDays: "" })
    setApplying(false)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clubs & Societies</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse and apply to clubs across all categories.
        </p>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            placeholder="Search clubs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              category === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {cat === "ALL" ? "All" : cat.charAt(0) + cat.slice(1).toLowerCase()}
            {cat !== "ALL" && (
              <span className="ml-1 opacity-60">
                {clubs.filter((c) => c.category === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{filtered.length} club{filtered.length !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span className="text-green-600 dark:text-green-400">
          {filtered.filter((c) => c.status === "OPEN").length} open
        </span>
      </div>

      {/* Club grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">🏛️</p>
          <p className="text-base">No clubs found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((club) => {
            const appStatus = userApplicationStatus(club)
            const capacityPct = Math.min((club._count.members / club.capacity) * 100, 100)

            return (
              <div
                key={club.id}
                className="bg-card border border-border rounded-xl flex flex-col hover:border-primary/40 transition-colors"
              >
                {/* Card header */}
                <div className="p-5 flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    {/* Logo / initial */}
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                      {club.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={club.logoUrl} alt={club.name} className="h-full w-full object-cover rounded-xl" />
                      ) : (
                        club.name.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm leading-tight">{club.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[club.category] ?? CATEGORY_COLOR.OTHER}`}>
                          {club.category.charAt(0) + club.category.slice(1).toLowerCase()}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[club.status]}`}>
                          {club.status.charAt(0) + club.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-3">
                    {club.description}
                  </p>

                  {/* Capacity bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Members</span>
                      <span className="font-medium text-foreground">{club._count.members} / {club.capacity}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${capacityPct}%`,
                          backgroundColor: capacityPct >= 90 ? "#ef4444" : capacityPct >= 70 ? "#f59e0b" : "#22c55e",
                        }}
                      />
                    </div>
                  </div>

                  {club.email && (
                    <p className="text-xs text-muted-foreground truncate">{club.email}</p>
                  )}
                </div>

                {/* Card footer */}
                <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2">
                  <button
                    onClick={() => setDetailClub(club)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View details
                  </button>

                  {appStatus === "MEMBER" ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
                      ✓ Member
                    </span>
                  ) : appStatus ? (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${APPLICATION_STYLE[appStatus]}`}>
                      {appStatus.charAt(0) + appStatus.slice(1).toLowerCase()}
                    </span>
                  ) : club.status === "OPEN" ? (
                    <button
                      onClick={() => { setApplyClub(club); setApplyError("") }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                    >
                      Apply
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Closed</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Detail Modal ──────────────────────────────────────────────────────── */}
      {detailClub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setDetailClub(null)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                  {detailClub.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{detailClub.name}</h3>
                  <div className="flex gap-1.5 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[detailClub.category] ?? CATEGORY_COLOR.OTHER}`}>
                      {detailClub.category.charAt(0) + detailClub.category.slice(1).toLowerCase()}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[detailClub.status]}`}>
                      {detailClub.status.charAt(0) + detailClub.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setDetailClub(null)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">About</p>
                <p className="text-sm text-foreground leading-relaxed">{detailClub.description}</p>
              </div>

              {detailClub.requirements && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Requirements</p>
                  <p className="text-sm text-foreground leading-relaxed">{detailClub.requirements}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Capacity</p>
                  <p className="font-medium text-foreground">{detailClub._count.members} / {detailClub.capacity} members</p>
                </div>
                {detailClub.email && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                    <a href={`mailto:${detailClub.email}`} className="text-primary hover:underline text-sm break-all">{detailClub.email}</a>
                  </div>
                )}
              </div>

              {(() => {
                const appStatus = userApplicationStatus(detailClub)
                if (appStatus === "MEMBER") return (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">
                    ✓ You are a member of this club.
                  </div>
                )
                if (appStatus) return (
                  <div className={`p-3 rounded-lg border text-sm ${APPLICATION_STYLE[appStatus]} bg-opacity-20`}>
                    Application status: <strong>{appStatus.charAt(0) + appStatus.slice(1).toLowerCase()}</strong>
                  </div>
                )
                if (detailClub.status === "OPEN") return (
                  <button
                    onClick={() => { setDetailClub(null); setApplyClub(detailClub); setApplyError("") }}
                    className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Apply to Join
                  </button>
                )
                return null
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Apply Modal ───────────────────────────────────────────────────────── */}
      {applyClub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setApplyClub(null)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">Apply to {applyClub.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Fill in the form to submit your application.</p>
              </div>
              <button onClick={() => setApplyClub(null)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {applyError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                  {applyError}
                </div>
              )}

              {/* Academic info */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Year</label>
                  <select value={applyForm.currentYear} onChange={(e) => setApplyForm((p) => ({ ...p, currentYear: e.target.value }))} className={INPUT}>
                    <option value="">—</option>
                    {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Semester</label>
                  <select value={applyForm.currentSemester} onChange={(e) => setApplyForm((p) => ({ ...p, currentSemester: e.target.value }))} className={INPUT}>
                    <option value="">—</option>
                    {[1, 2].map((s) => <option key={s} value={s}>Sem {s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">GPA</label>
                  <input type="number" step="0.01" min="0" max="4" placeholder="3.50" value={applyForm.gpa} onChange={(e) => setApplyForm((p) => ({ ...p, gpa: e.target.value }))} className={INPUT} />
                </div>
              </div>

              {/* Motivation */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Why do you want to join? <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us your motivation for joining this club…"
                  value={applyForm.motivation}
                  onChange={(e) => setApplyForm((p) => ({ ...p, motivation: e.target.value }))}
                  className={TEXTAREA}
                />
              </div>

              {/* Contribution */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">What can you contribute? <span className="text-xs opacity-60">(optional)</span></label>
                <textarea rows={3} placeholder="Skills, time, ideas…" value={applyForm.contribution} onChange={(e) => setApplyForm((p) => ({ ...p, contribution: e.target.value }))} className={TEXTAREA} />
              </div>

              {/* Experience */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Relevant experience <span className="text-xs opacity-60">(optional)</span></label>
                <textarea rows={2} placeholder="Previous club memberships, competitions…" value={applyForm.experience} onChange={(e) => setApplyForm((p) => ({ ...p, experience: e.target.value }))} className={TEXTAREA} />
              </div>

              {/* Available days */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Available days <span className="text-xs opacity-60">(optional)</span></label>
                <input placeholder="e.g. Monday, Wednesday, Friday" value={applyForm.availableDays} onChange={(e) => setApplyForm((p) => ({ ...p, availableDays: e.target.value }))} className={INPUT} />
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={submitApplication} disabled={applying}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity">
                  {applying ? "Submitting…" : "Submit Application"}
                </button>
                <button onClick={() => setApplyClub(null)}
                  className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
