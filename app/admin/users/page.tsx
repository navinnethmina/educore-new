"use client"

import { useState, useEffect, useCallback } from "react"

type User = {
  id: number
  fullName: string
  email: string
  studentId: string
  faculty: string
  degree: string
  intakeYear: number
  role: "STUDENT" | "LECTURER" | "ADMIN"
  createdAt: string
}

const ROLE_TABS = ["ALL", "STUDENT", "LECTURER", "ADMIN"] as const
type RoleTab = (typeof ROLE_TABS)[number]

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  LECTURER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  STUDENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
}

const FACULTIES = [
  "Faculty of Computer Science & Information Technology",
  "Faculty of Engineering",
  "Faculty of Medicine",
  "Faculty of Law",
  "Faculty of Business & Economics",
  "Faculty of Arts & Social Sciences",
  "Faculty of Science",
  "Faculty of Education",
  "Faculty of Architecture & Built Environment",
  "Faculty of Pharmacy",
  "Administration",
]

const EMPTY_FORM = {
  fullName: "",
  email: "",
  studentId: "",
  password: "",
  faculty: "",
  degree: "",
  intakeYear: String(new Date().getFullYear()),
  role: "STUDENT" as "STUDENT" | "LECTURER" | "ADMIN",
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<RoleTab>("ALL")
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState("")
  const [formPending, setFormPending] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (activeTab !== "ALL") params.set("role", activeTab)
    if (search) params.set("search", search)
    const res = await fetch(`/api/admin/users?${params}`)
    const data = await res.json()
    setUsers(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [activeTab, search])

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300)
    return () => clearTimeout(t)
  }, [fetchUsers])

  function openModal() {
    setForm(EMPTY_FORM)
    setFormError("")
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setFormError("")
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    setFormPending(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, intakeYear: Number(form.intakeYear) }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? "Failed to create user."); return }
      closeModal()
      fetchUsers()
    } catch {
      setFormError("Something went wrong.")
    } finally {
      setFormPending(false)
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
    if (res.ok) { setDeleteId(null); fetchUsers() }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage students, lecturers, and admins
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-lg hover:opacity-90 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Role tabs */}
        <div className="flex bg-muted rounded-lg p-1 gap-1">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, ID…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Faculty</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Intake</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {u.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{u.studentId}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{u.faculty}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.intakeYear}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[u.role]}`}>
                        {u.role.charAt(0) + u.role.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeleteId(u.id)}
                        className="text-xs text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && users.length > 0 && (
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
            {users.length} user{users.length !== 1 ? "s" : ""} found
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Add New User</h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-6 space-y-4">
              {formError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  {formError}
                </div>
              )}

              {/* Role selector — top */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
                <div className="flex gap-2">
                  {(["STUDENT", "LECTURER", "ADMIN"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, role: r }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                        form.role === r
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-accent/50"
                      }`}
                    >
                      {r.charAt(0) + r.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Full Name" required className="col-span-2">
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder="Full name"
                    className={INPUT}
                  />
                </Field>

                <Field label="Email" required className="col-span-2">
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder={
                      form.role === "STUDENT"
                        ? "student@university.edu.my"
                        : "staff@university.edu.my"
                    }
                    className={INPUT}
                  />
                </Field>

                <Field label={form.role === "STUDENT" ? "Student ID" : "Staff ID"} required>
                  <input
                    type="text"
                    required
                    value={form.studentId}
                    onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                    placeholder={form.role === "STUDENT" ? "S20220001" : "L10000001"}
                    className={INPUT}
                  />
                </Field>

                <Field label="Intake / Start Year" required>
                  <input
                    type="number"
                    required
                    min={1990}
                    max={new Date().getFullYear()}
                    value={form.intakeYear}
                    onChange={(e) => setForm((f) => ({ ...f, intakeYear: e.target.value }))}
                    className={INPUT}
                  />
                </Field>

                <Field label="Faculty" required className="col-span-2">
                  <select
                    required
                    value={form.faculty}
                    onChange={(e) => setForm((f) => ({ ...f, faculty: e.target.value }))}
                    className={INPUT}
                  >
                    <option value="" disabled>Select faculty</option>
                    {FACULTIES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Degree / Position" required className="col-span-2">
                  <input
                    type="text"
                    required
                    value={form.degree}
                    onChange={(e) => setForm((f) => ({ ...f, degree: e.target.value }))}
                    placeholder={
                      form.role === "STUDENT"
                        ? "Bachelor of Computer Science"
                        : form.role === "LECTURER"
                        ? "Senior Lecturer / Ph.D. Computer Science"
                        : "System Administrator"
                    }
                    className={INPUT}
                  />
                </Field>

                <Field label="Password" required className="col-span-2">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Min. 6 characters"
                    className={INPUT}
                  />
                </Field>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent/50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formPending}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 transition"
                >
                  {formPending ? "Adding…" : `Add ${form.role.charAt(0) + form.role.slice(1).toLowerCase()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Delete User</h2>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this user? This action cannot be undone and will
              remove all their data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent/50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const INPUT = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}
