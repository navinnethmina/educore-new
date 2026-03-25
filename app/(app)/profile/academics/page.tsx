"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { GpaLineChart } from "@/components/profile/GpaLineChart"

const TABS = [
  { label: "Overview", href: "/profile" },
  { label: "Academics", href: "/profile/academics" },
  { label: "Clubs", href: "/profile/clubs" },
  { label: "Sports", href: "/profile/sports" },
  { label: "Progress", href: "/profile/progress" },
]

const INPUT =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"

type Subject = {
  id: number
  subjectCode: string
  subjectName: string
  credits: number
  marks: number
  grade: string
}

type Semester = {
  id: number
  semesterNum: number
  academicYear: string
  gpa: number | null
  subjects: Subject[]
}

const GRADE_COLOR: Record<string, string> = {
  "A+": "text-emerald-600", A: "text-emerald-600", "A-": "text-green-600",
  "B+": "text-blue-600", B: "text-blue-600", "B-": "text-sky-600",
  "C+": "text-yellow-600", C: "text-yellow-600", "C-": "text-orange-500",
  D: "text-red-500", F: "text-red-700",
}

export default function AcademicsPage() {
  const pathname = usePathname()
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [error, setError] = useState("")

  // Add semester form
  const [showAddSem, setShowAddSem] = useState(false)
  const [semForm, setSemForm] = useState({ semesterNum: "", academicYear: "", gpa: "" })
  const [semSaving, setSemSaving] = useState(false)

  // Edit semester
  const [editSem, setEditSem] = useState<Semester | null>(null)

  // Add subject form: key = semesterId
  const [addSubjectFor, setAddSubjectFor] = useState<number | null>(null)
  const [subForm, setSubForm] = useState({ subjectCode: "", subjectName: "", credits: "3", marks: "" })
  const [subSaving, setSubSaving] = useState(false)

  // Edit subject
  const [editSub, setEditSub] = useState<(Subject & { semesterId: number }) | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/profile/semesters")
    if (res.ok) setSemesters(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function toggle(id: number) {
    setExpanded((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  async function addSemester() {
    if (!semForm.semesterNum || !semForm.academicYear) {
      setError("Semester number and academic year are required.")
      return
    }
    setSemSaving(true)
    setError("")
    const res = await fetch("/api/profile/semesters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(semForm),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Failed to add semester."); setSemSaving(false); return }
    setSemesters((prev) => [...prev, data].sort((a, b) => a.semesterNum - b.semesterNum))
    setSemForm({ semesterNum: "", academicYear: "", gpa: "" })
    setShowAddSem(false)
    setSemSaving(false)
  }

  async function updateSemester() {
    if (!editSem) return
    setSemSaving(true)
    setError("")
    const res = await fetch(`/api/profile/semesters/${editSem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ semesterNum: editSem.semesterNum, academicYear: editSem.academicYear, gpa: editSem.gpa }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Failed to update."); setSemSaving(false); return }
    setSemesters((prev) => prev.map((s) => (s.id === data.id ? data : s)))
    setEditSem(null)
    setSemSaving(false)
  }

  async function deleteSemester(id: number) {
    if (!confirm("Delete this semester and all its subjects?")) return
    const res = await fetch(`/api/profile/semesters/${id}`, { method: "DELETE" })
    if (res.ok) setSemesters((prev) => prev.filter((s) => s.id !== id))
    else setError("Failed to delete semester.")
  }

  async function addSubject(semId: number) {
    if (!subForm.subjectCode || !subForm.subjectName || !subForm.marks) {
      setError("Code, name, and marks are required.")
      return
    }
    setSubSaving(true)
    setError("")
    const res = await fetch("/api/profile/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ semesterId: semId, ...subForm }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Failed to add subject."); setSubSaving(false); return }
    setSemesters((prev) =>
      prev.map((s) => s.id === semId ? { ...s, subjects: [...s.subjects, data] } : s)
    )
    setSubForm({ subjectCode: "", subjectName: "", credits: "3", marks: "" })
    setAddSubjectFor(null)
    setSubSaving(false)
  }

  async function updateSubject() {
    if (!editSub) return
    setSubSaving(true)
    setError("")
    const res = await fetch(`/api/profile/subjects/${editSub.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectCode: editSub.subjectCode,
        subjectName: editSub.subjectName,
        credits: editSub.credits,
        marks: editSub.marks,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Failed to update."); setSubSaving(false); return }
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === editSub.semesterId
          ? { ...s, subjects: s.subjects.map((sub) => (sub.id === data.id ? data : sub)) }
          : s
      )
    )
    setEditSub(null)
    setSubSaving(false)
  }

  async function deleteSubject(semId: number, subId: number) {
    if (!confirm("Delete this subject?")) return
    const res = await fetch(`/api/profile/subjects/${subId}`, { method: "DELETE" })
    if (res.ok)
      setSemesters((prev) =>
        prev.map((s) =>
          s.id === semId ? { ...s, subjects: s.subjects.filter((sub) => sub.id !== subId) } : s
        )
      )
    else setError("Failed to delete subject.")
  }

  const chartData = semesters
    .filter((s) => s.gpa != null)
    .map((s) => ({ semesterNum: s.semesterNum, academicYear: s.academicYear, gpa: s.gpa! }))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Academic Records</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your semester results and subject grades.</p>
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

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* GPA Chart */}
      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">GPA Trend</h2>
          <GpaLineChart data={chartData} />
        </div>
      )}

      {/* Semester list */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : semesters.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-base mb-1">No semesters yet.</p>
          <p className="text-sm">Add your first semester below.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {semesters.map((sem) => (
            <div key={sem.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Semester header */}
              <div className="flex items-center justify-between px-5 py-4">
                <button
                  className="flex items-center gap-3 flex-1 text-left"
                  onClick={() => toggle(sem.id)}
                >
                  <div
                    className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-transform ${
                      expanded.has(sem.id) ? "rotate-90" : ""
                    }`}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      Semester {sem.semesterNum}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{sem.academicYear}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sem.subjects.length} subjects
                      {sem.gpa != null && (
                        <span className="ml-2 font-semibold text-foreground">GPA: {sem.gpa.toFixed(2)}</span>
                      )}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditSem({ ...sem })}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteSemester(sem.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Expanded subjects */}
              {expanded.has(sem.id) && (
                <div className="border-t border-border">
                  {sem.subjects.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left px-5 py-2.5 font-medium text-muted-foreground text-xs">Code</th>
                            <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">Subject</th>
                            <th className="text-center px-3 py-2.5 font-medium text-muted-foreground text-xs">Credits</th>
                            <th className="text-center px-3 py-2.5 font-medium text-muted-foreground text-xs">Marks</th>
                            <th className="text-center px-3 py-2.5 font-medium text-muted-foreground text-xs">Grade</th>
                            <th className="px-3 py-2.5" />
                          </tr>
                        </thead>
                        <tbody>
                          {sem.subjects.map((sub) => (
                            <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                              <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{sub.subjectCode}</td>
                              <td className="px-3 py-3 text-foreground">{sub.subjectName}</td>
                              <td className="px-3 py-3 text-center text-muted-foreground">{sub.credits}</td>
                              <td className="px-3 py-3 text-center">{sub.marks}%</td>
                              <td className={`px-3 py-3 text-center font-bold ${GRADE_COLOR[sub.grade] ?? ""}`}>{sub.grade}</td>
                              <td className="px-3 py-3">
                                <div className="flex gap-1 justify-end">
                                  <button
                                    onClick={() => setEditSub({ ...sub, semesterId: sem.id })}
                                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                  >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => deleteSubject(sem.id, sub.id)}
                                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="px-5 py-4 text-sm text-muted-foreground">No subjects yet.</p>
                  )}

                  {/* Add subject form */}
                  {addSubjectFor === sem.id ? (
                    <div className="px-5 py-4 bg-muted/20 border-t border-border">
                      <p className="text-xs font-semibold text-foreground mb-3">Add Subject</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        <input
                          placeholder="Code e.g. CS1010"
                          value={subForm.subjectCode}
                          onChange={(e) => setSubForm((p) => ({ ...p, subjectCode: e.target.value }))}
                          className={INPUT}
                        />
                        <input
                          placeholder="Subject Name"
                          value={subForm.subjectName}
                          onChange={(e) => setSubForm((p) => ({ ...p, subjectName: e.target.value }))}
                          className={INPUT + " sm:col-span-1"}
                        />
                        <input
                          type="number" placeholder="Credits" min={1} max={6}
                          value={subForm.credits}
                          onChange={(e) => setSubForm((p) => ({ ...p, credits: e.target.value }))}
                          className={INPUT}
                        />
                        <input
                          type="number" placeholder="Marks %" min={0} max={100}
                          value={subForm.marks}
                          onChange={(e) => setSubForm((p) => ({ ...p, marks: e.target.value }))}
                          className={INPUT}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => addSubject(sem.id)}
                          disabled={subSaving}
                          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
                        >
                          {subSaving ? "Saving…" : "Add Subject"}
                        </button>
                        <button
                          onClick={() => { setAddSubjectFor(null); setSubForm({ subjectCode: "", subjectName: "", credits: "3", marks: "" }) }}
                          className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-5 py-3 border-t border-border">
                      <button
                        onClick={() => { setAddSubjectFor(sem.id); setSubForm({ subjectCode: "", subjectName: "", credits: "3", marks: "" }) }}
                        className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Add Subject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Semester button / form */}
      {showAddSem ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Add Semester</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Semester Number</label>
              <select
                value={semForm.semesterNum}
                onChange={(e) => setSemForm((p) => ({ ...p, semesterNum: e.target.value }))}
                className={INPUT}
              >
                <option value="">Select…</option>
                {[1,2,3,4,5,6,7,8].map((n) => (
                  <option key={n} value={n}>Semester {n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Academic Year</label>
              <input
                placeholder="e.g. 2022/2023"
                value={semForm.academicYear}
                onChange={(e) => setSemForm((p) => ({ ...p, academicYear: e.target.value }))}
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">GPA (optional)</label>
              <input
                type="number" step="0.01" min="0" max="4"
                placeholder="e.g. 3.50"
                value={semForm.gpa}
                onChange={(e) => setSemForm((p) => ({ ...p, gpa: e.target.value }))}
                className={INPUT}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addSemester}
              disabled={semSaving}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {semSaving ? "Saving…" : "Add Semester"}
            </button>
            <button
              onClick={() => { setShowAddSem(false); setSemForm({ semesterNum: "", academicYear: "", gpa: "" }) }}
              className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddSem(true)}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Semester
        </button>
      )}

      {/* Edit Semester Modal */}
      {editSem && (
        <Modal title="Edit Semester" onClose={() => setEditSem(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Semester Number</label>
                <select
                  value={editSem.semesterNum}
                  onChange={(e) => setEditSem((p) => p ? { ...p, semesterNum: Number(e.target.value) } : null)}
                  className={INPUT}
                >
                  {[1,2,3,4,5,6,7,8].map((n) => (
                    <option key={n} value={n}>Semester {n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Academic Year</label>
                <input
                  value={editSem.academicYear}
                  onChange={(e) => setEditSem((p) => p ? { ...p, academicYear: e.target.value } : null)}
                  className={INPUT}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">GPA (optional)</label>
              <input
                type="number" step="0.01" min="0" max="4"
                value={editSem.gpa ?? ""}
                onChange={(e) => setEditSem((p) => p ? { ...p, gpa: e.target.value === "" ? null : Number(e.target.value) } : null)}
                className={INPUT}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={updateSemester} disabled={semSaving}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
              {semSaving ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={() => setEditSem(null)}
              className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent">
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Subject Modal */}
      {editSub && (
        <Modal title="Edit Subject" onClose={() => setEditSub(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Subject Code</label>
                <input
                  value={editSub.subjectCode}
                  onChange={(e) => setEditSub((p) => p ? { ...p, subjectCode: e.target.value } : null)}
                  className={INPUT}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Credits</label>
                <input
                  type="number" min={1} max={6}
                  value={editSub.credits}
                  onChange={(e) => setEditSub((p) => p ? { ...p, credits: Number(e.target.value) } : null)}
                  className={INPUT}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Subject Name</label>
              <input
                value={editSub.subjectName}
                onChange={(e) => setEditSub((p) => p ? { ...p, subjectName: e.target.value } : null)}
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Marks (%)</label>
              <input
                type="number" min={0} max={100}
                value={editSub.marks}
                onChange={(e) => setEditSub((p) => p ? { ...p, marks: Number(e.target.value) } : null)}
                className={INPUT}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={updateSubject} disabled={subSaving}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
              {subSaving ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={() => setEditSub(null)}
              className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
