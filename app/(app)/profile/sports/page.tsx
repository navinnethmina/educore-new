"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const TABS = [
  { label: "Overview", href: "/profile" },
  { label: "Academics", href: "/profile/academics" },
  { label: "Clubs", href: "/profile/clubs" },
  { label: "Sports", href: "/profile/sports" },
  { label: "Progress", href: "/profile/progress" },
]

const INPUT =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"

const ACHIEVEMENT_TYPES = ["TROPHY", "MEDAL", "CERTIFICATE"]

const TYPE_ICON: Record<string, string> = {
  TROPHY: "🏆",
  MEDAL: "🥇",
  CERTIFICATE: "📜",
}

const TYPE_COLOR: Record<string, string> = {
  TROPHY: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  MEDAL: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  CERTIFICATE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
}

type Achievement = {
  id: number
  sportName: string
  achievementType: string
  position: string | null
  date: string
  points: number
}

export default function SportsPage() {
  const pathname = usePathname()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ sportName: "", achievementType: "TROPHY", position: "", date: "", points: "0" })
  const [saving, setSaving] = useState(false)

  const [editEntry, setEditEntry] = useState<Achievement | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/profile/sports")
    if (res.ok) setAchievements(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totalPoints = achievements.reduce((s, a) => s + a.points, 0)
  const sportsScore = Math.min(totalPoints, 100)

  async function addAchievement() {
    if (!form.sportName || !form.date) {
      setError("Sport name and date are required.")
      return
    }
    setSaving(true)
    setError("")
    const res = await fetch("/api/profile/sports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Failed to add achievement."); setSaving(false); return }
    setAchievements((prev) => [data, ...prev])
    setForm({ sportName: "", achievementType: "TROPHY", position: "", date: "", points: "0" })
    setShowForm(false)
    setSaving(false)
  }

  async function updateAchievement() {
    if (!editEntry) return
    setSaving(true)
    setError("")
    const res = await fetch(`/api/profile/sports/${editEntry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sportName: editEntry.sportName,
        achievementType: editEntry.achievementType,
        position: editEntry.position,
        date: editEntry.date,
        points: editEntry.points,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Failed to update."); setSaving(false); return }
    setAchievements((prev) => prev.map((a) => (a.id === data.id ? data : a)))
    setEditEntry(null)
    setSaving(false)
  }

  async function deleteAchievement(id: number) {
    if (!confirm("Delete this achievement?")) return
    const res = await fetch(`/api/profile/sports/${id}`, { method: "DELETE" })
    if (res.ok) setAchievements((prev) => prev.filter((a) => a.id !== id))
    else setError("Failed to delete achievement.")
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sports Achievements</h1>
          <p className="text-sm text-muted-foreground mt-1">Record your sports trophies, medals, and certificates.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Achievement
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              pathname === t.href
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Sports score */}
      <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-5">
        <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-2xl shrink-0">
          🏃
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">Sports Score</p>
          <p className="text-3xl font-bold text-foreground">{sportsScore}<span className="text-base font-normal text-muted-foreground"> / 100</span></p>
          <p className="text-xs text-muted-foreground mt-0.5">{achievements.length} achievement{achievements.length !== 1 ? "s" : ""} · {totalPoints} total points</p>
        </div>
        <div className="ml-auto hidden sm:block">
          <div className="h-3 w-48 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${sportsScore}%` }} />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add Achievement Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Add Achievement</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sport Name <span className="text-destructive">*</span></label>
              <input
                placeholder="e.g. Badminton"
                value={form.sportName}
                onChange={(e) => setForm((p) => ({ ...p, sportName: e.target.value }))}
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Achievement Type</label>
              <select
                value={form.achievementType}
                onChange={(e) => setForm((p) => ({ ...p, achievementType: e.target.value }))}
                className={INPUT}
              >
                {ACHIEVEMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_ICON[t]} {t.charAt(0) + t.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Position / Place</label>
              <input
                placeholder="e.g. 1st, Runner-up"
                value={form.position}
                onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date <span className="text-destructive">*</span></label>
              <input
                type="date"
                value={form.date}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Points Awarded</label>
              <input
                type="number" min={0}
                value={form.points}
                onChange={(e) => setForm((p) => ({ ...p, points: e.target.value }))}
                className={INPUT}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addAchievement} disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
              {saving ? "Saving…" : "Add Achievement"}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({ sportName: "", achievementType: "TROPHY", position: "", date: "", points: "0" }) }}
              className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Achievement list */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : achievements.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-base mb-1">No achievements recorded yet.</p>
          <p className="text-sm">Add your sports trophies and medals to boost your score.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((ach) => (
            <div key={ach.id} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl leading-none">{TYPE_ICON[ach.achievementType] ?? "🏅"}</span>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{ach.sportName}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[ach.achievementType] ?? ""}`}>
                      {ach.achievementType.charAt(0) + ach.achievementType.slice(1).toLowerCase()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditEntry({ ...ach })}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                  <button onClick={() => deleteAchievement(ach.id)}
                    className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-border pt-3">
                {ach.position && (
                  <div>
                    <span className="text-muted-foreground">Position</span>
                    <p className="font-semibold text-foreground mt-0.5">{ach.position}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Points</span>
                  <p className="font-bold text-green-600 dark:text-green-400 mt-0.5">+{ach.points} pts</p>
                </div>
                <div className={ach.position ? "" : "col-span-2"}>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {new Date(ach.date).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Edit Achievement</h3>
              <button onClick={() => setEditEntry(null)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sport Name</label>
                  <input
                    value={editEntry.sportName}
                    onChange={(e) => setEditEntry((p) => p ? { ...p, sportName: e.target.value } : null)}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
                  <select
                    value={editEntry.achievementType}
                    onChange={(e) => setEditEntry((p) => p ? { ...p, achievementType: e.target.value } : null)}
                    className={INPUT}
                  >
                    {ACHIEVEMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{TYPE_ICON[t]} {t.charAt(0) + t.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Position</label>
                  <input
                    value={editEntry.position ?? ""}
                    onChange={(e) => setEditEntry((p) => p ? { ...p, position: e.target.value || null } : null)}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Points</label>
                  <input
                    type="number" min={0}
                    value={editEntry.points}
                    onChange={(e) => setEditEntry((p) => p ? { ...p, points: Number(e.target.value) } : null)}
                    className={INPUT}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date</label>
                <input
                  type="date"
                  value={new Date(editEntry.date).toISOString().split("T")[0]}
                  onChange={(e) => setEditEntry((p) => p ? { ...p, date: e.target.value } : null)}
                  className={INPUT}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={updateAchievement} disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button onClick={() => setEditEntry(null)}
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
