"use client"

import { useState, useEffect, useMemo } from "react"

// ── Types ───────────────────────────────────────────────────────────────────

type FileAsset = {
  fileName: string
  fileSize: number
  fileUrl: string
  fileType: string
}

type Material = {
  id: number
  title: string
  courseCode: string
  type: string
  description: string | null
  isSummarized: boolean
  createdAt: string
  fileAsset: FileAsset | null
  summary: { quickSummary: string } | null
}

// ── Constants ───────────────────────────────────────────────────────────────

const TYPES = ["ALL", "PDF", "SLIDES", "NOTES"]

const TYPE_COLOR: Record<string, string> = {
  PDF: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  SLIDES: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  NOTES: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
}

const TYPE_ICON: Record<string, string> = {
  PDF: "📄",
  SLIDES: "📊",
  NOTES: "📝",
}

const ACCEPT_TYPES = ".pdf,.ppt,.pptx,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.zip"

const INPUT =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"

const TEXTAREA =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition resize-none"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Component ───────────────────────────────────────────────────────────────

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")

  // Upload form state
  const [showUpload, setShowUpload] = useState(false)
  const [form, setForm] = useState({ title: "", courseCode: "", type: "NOTES", description: "" })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  // Detail expand
  const [expanded, setExpanded] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/materials")
    if (res.ok) setMaterials(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return materials
      .filter((m) => typeFilter === "ALL" || m.type === typeFilter)
      .filter((m) => {
        const q = search.toLowerCase()
        return !q || m.title.toLowerCase().includes(q) || m.courseCode.toLowerCase().includes(q)
      })
  }, [materials, typeFilter, search])

  async function uploadMaterial() {
    if (!form.title.trim() || !form.courseCode.trim()) {
      setUploadError("Title and course code are required.")
      return
    }
    if (!file) {
      setUploadError("Please select a file.")
      return
    }
    setUploading(true)
    setUploadError("")

    const fd = new FormData()
    fd.append("file", file)
    fd.append("title", form.title.trim())
    fd.append("courseCode", form.courseCode.trim())
    fd.append("type", form.type)
    fd.append("description", form.description.trim())

    const res = await fetch("/api/materials/upload", { method: "POST", body: fd })
    const data = await res.json()
    if (!res.ok) { setUploadError(data.error ?? "Upload failed."); setUploading(false); return }

    setMaterials((prev) => [data, ...prev])
    setForm({ title: "", courseCode: "", type: "NOTES", description: "" })
    setFile(null)
    setShowUpload(false)
    setUploading(false)
  }

  async function deleteMaterial(id: number) {
    if (!confirm("Delete this material?")) return
    const res = await fetch(`/api/materials/${id}`, { method: "DELETE" })
    if (res.ok) setMaterials((prev) => prev.filter((m) => m.id !== id))
    else setError("Failed to delete material.")
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Study Materials</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload and manage your lecture notes, slides, and PDFs.</p>
        </div>
        {!showUpload && (
          <button
            onClick={() => { setShowUpload(true); setUploadError("") }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Upload Material
          </button>
        )}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            placeholder="Search by title or course code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
          />
        </div>
        <div className="flex gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                typeFilter === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {t === "ALL" ? "All" : `${TYPE_ICON[t]} ${t}`}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{filtered.length} material{filtered.length !== 1 ? "s" : ""}</span>
        {materials.some((m) => m.isSummarized) && (
          <>
            <span>·</span>
            <span className="text-purple-600 dark:text-purple-400">
              {materials.filter((m) => m.isSummarized).length} summarized
            </span>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Upload form */}
      {showUpload && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Upload New Material</h3>
          {uploadError && (
            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
              {uploadError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title <span className="text-destructive">*</span></label>
              <input placeholder="e.g. Lecture 3 Notes" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Course Code <span className="text-destructive">*</span></label>
              <input placeholder="e.g. CS2010" value={form.courseCode} onChange={(e) => setForm((p) => ({ ...p, courseCode: e.target.value }))} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className={INPUT}>
                <option value="NOTES">📝 Notes</option>
                <option value="PDF">📄 PDF</option>
                <option value="SLIDES">📊 Slides</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">File <span className="text-destructive">*</span></label>
              <label className={`flex items-center gap-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm cursor-pointer transition ${uploading ? "opacity-60 pointer-events-none" : "hover:border-primary/50"}`}>
                <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-muted-foreground truncate flex-1 text-sm">
                  {file ? file.name : "Choose file…"}
                </span>
                {file && <span className="text-xs text-muted-foreground shrink-0">{formatBytes(file.size)}</span>}
                <input
                  type="file"
                  accept={ACCEPT_TYPES}
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={uploading}
                />
              </label>
              <p className="text-xs text-muted-foreground mt-1">PDF, PPT, DOC, TXT, images — max 20 MB.</p>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description <span className="text-xs opacity-60">(optional)</span></label>
            <textarea rows={2} placeholder="Brief description of the material…" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={TEXTAREA} />
          </div>
          <div className="flex gap-2">
            <button onClick={uploadMaterial} disabled={uploading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity">
              {uploading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Uploading…
                </>
              ) : "Upload"}
            </button>
            <button onClick={() => { setShowUpload(false); setForm({ title: "", courseCode: "", type: "NOTES", description: "" }); setFile(null) }}
              className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Material list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-base mb-1">{search || typeFilter !== "ALL" ? "No materials match your search." : "No materials uploaded yet."}</p>
          {!search && typeFilter === "ALL" && (
            <p className="text-sm">Upload your first lecture note or PDF to get started.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((mat) => (
            <div key={mat.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Main row */}
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Icon */}
                <span className="text-2xl shrink-0">{TYPE_ICON[mat.type] ?? "📄"}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground text-sm">{mat.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[mat.type] ?? ""}`}>
                      {mat.type}
                    </span>
                    {mat.isSummarized && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        ✨ AI Summary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="font-mono font-medium text-foreground">{mat.courseCode}</span>
                    {mat.fileAsset && (
                      <>
                        <span>·</span>
                        <span>{mat.fileAsset.fileName}</span>
                        <span>·</span>
                        <span>{formatBytes(mat.fileAsset.fileSize)}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{new Date(mat.createdAt).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {mat.fileAsset && (
                    <a
                      href={mat.fileAsset.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      title="Download"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </a>
                  )}
                  {(mat.description || mat.summary) && (
                    <button
                      onClick={() => setExpanded(expanded === mat.id ? null : mat.id)}
                      className={`p-2 rounded-lg transition-colors ${expanded === mat.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                      title="Details"
                    >
                      <svg className={`h-4 w-4 transition-transform ${expanded === mat.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => deleteMaterial(mat.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === mat.id && (
                <div className="border-t border-border px-5 py-4 bg-muted/20 space-y-3">
                  {mat.description && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                      <p className="text-sm text-foreground leading-relaxed">{mat.description}</p>
                    </div>
                  )}
                  {mat.summary && (
                    <div>
                      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <span>✨</span> AI Quick Summary
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">{mat.summary.quickSummary}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
