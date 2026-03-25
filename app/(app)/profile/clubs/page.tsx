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

const CATEGORY_COLOR: Record<string, string> = {
  ACADEMIC: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SPORTS: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CULTURAL: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  RELIGIOUS: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  OTHER: "bg-muted text-muted-foreground",
}

type ClubInfo = { id: number; name: string; category: string; logoUrl: string | null }
type ClubEntry = {
  id: number
  role: string
  joinedDate: string
  participationPoints: number
  isActive: boolean
  club: ClubInfo
}

export default function ClubsPage() {
  const pathname = usePathname()
  const [entries, setEntries] = useState<ClubEntry[]>([])
  const [allClubs, setAllClubs] = useState<{ id: number; name: string; category: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ clubId: "", role: "Member", joinedDate: "", participationPoints: "0" })
  const [saving, setSaving] = useState(false)

  const [editEntry, setEditEntry] = useState<ClubEntry | null>(null)

  async function load() {
    setLoading(true)
    const [clubsRes, allRes] = await Promise.all([
      fetch("/api/profile/clubs"),
      fetch("/api/clubs"),
    ])
    if (clubsRes.ok) setEntries(await clubsRes.json())
    if (allRes.ok) setAllClubs(await allRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const joinedIds = new Set(entries.map((e) => e.club.id))
  const availableClubs = allClubs.filter((c) => !joinedIds.has(c.id))

  const totalPoints = entries.filter((e) => e.isActive).reduce((s, e) => s + e.participationPoints, 0)
  const societyScore = Math.min(totalPoints, 100)

  async function addClub() {
    if (!form.clubId) { setError("Please select a club."); return }
    setSaving(true)
    setError("")
    const res = await fetch("/api/profile/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Failed to add club."); setSaving(false); return }
    setEntries((prev) => [data, ...prev])
    setForm({ clubId: "", role: "Member", joinedDate: "", participationPoints: "0" })
    setShowForm(false)
    setSaving(false)
  }

  async function updateEntry() {
    if (!editEntry) return
    setSaving(true)
    setError("")
    const res = await fetch(`/api/profile/clubs/${editEntry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: editEntry.role,
        participationPoints: editEntry.participationPoints,
        isActive: editEntry.isActive,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Failed to update."); setSaving(false); return }
    setEntries((prev) => prev.map((e) => (e.id === data.id ? data : e)))
    setEditEntry(null)
    setSaving(false)
  }

  async function deleteEntry(id: number) {
    if (!confirm("Remove this club membership?")) return
    const res = await fetch(`/api/profile/clubs/${id}`, { method: "DELETE" })
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id))
    else setError("Failed to remove club.")
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Club Memberships</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your club and society involvement.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Club
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

      {/* Society score */}
      <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-5">
        <div className="h-14 w-14 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-2xl shrink-0">
          👥
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">Society Score</p>
          <p className="text-3xl font-bold text-foreground">{societyScore}<span className="text-base font-normal text-muted-foreground"> / 100</span></p>
          <p className="text-xs text-muted-foreground mt-0.5">{entries.filter(e => e.isActive).length} active club{entries.filter(e => e.isActive).length !== 1 ? "s" : ""}</p>
        </div>
        <div className="ml-auto hidden sm:block">
          <div className="h-3 w-48 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-purple-500 transition-all duration-500" style={{ width: `${societyScore}%` }} />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add Club Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Add Club Membership</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Club <span className="text-destructive">*</span></label>
              <select
                value={form.clubId}
                onChange={(e) => setForm((p) => ({ ...p, clubId: e.target.value }))}
                className={INPUT}
              >
                <option value="">Select a club…</option>
                {availableClubs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                className={INPUT}
              >
                {["Member", "Secretary", "President", "Vice President", "Treasurer", "Committee"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Joined Date</label>
              <input
                type="date"
                value={form.joinedDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setForm((p) => ({ ...p, joinedDate: e.target.value }))}
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Participation Points</label>
              <input
                type="number" min={0}
                value={form.participationPoints}
                onChange={(e) => setForm((p) => ({ ...p, participationPoints: e.target.value }))}
                className={INPUT}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addClub} disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
              {saving ? "Saving…" : "Add Club"}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({ clubId: "", role: "Member", joinedDate: "", participationPoints: "0" }) }}
              className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Club list */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-3">🏛️</p>
          <p className="text-base mb-1">No clubs joined yet.</p>
          <p className="text-sm">Add your club memberships to track your society score.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                    {entry.club.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm leading-tight">{entry.club.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[entry.club.category] ?? CATEGORY_COLOR.OTHER}`}>
                        {entry.club.category}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entry.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                        {entry.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditEntry({ ...entry })}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                  <button onClick={() => deleteEntry(entry.id)}
                    className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Role</span>
                  <p className="font-medium text-foreground mt-0.5">{entry.role}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Points</span>
                  <p className="font-bold text-purple-600 dark:text-purple-400 mt-0.5">{entry.participationPoints} pts</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Joined</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {new Date(entry.joinedDate).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
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
              <h3 className="font-semibold text-foreground">Edit Membership</h3>
              <button onClick={() => setEditEntry(null)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Club</label>
                <input value={editEntry.club.name} readOnly className={INPUT + " opacity-60 cursor-not-allowed"} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role</label>
                <select
                  value={editEntry.role}
                  onChange={(e) => setEditEntry((p) => p ? { ...p, role: e.target.value } : null)}
                  className={INPUT}
                >
                  {["Member", "Secretary", "President", "Vice President", "Treasurer", "Committee"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Participation Points</label>
                <input
                  type="number" min={0}
                  value={editEntry.participationPoints}
                  onChange={(e) => setEditEntry((p) => p ? { ...p, participationPoints: Number(e.target.value) } : null)}
                  className={INPUT}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-foreground">Active</label>
                <button
                  type="button"
                  onClick={() => setEditEntry((p) => p ? { ...p, isActive: !p.isActive } : null)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editEntry.isActive ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${editEntry.isActive ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={updateEntry} disabled={saving}
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
