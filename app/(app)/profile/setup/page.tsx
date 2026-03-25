"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

// ── Constants ──────────────────────────────────────────────────────────────────

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
]

const SPORTS_OPTIONS = [
  "Badminton", "Football", "Basketball", "Volleyball", "Table Tennis",
  "Swimming", "Athletics", "Tennis", "Futsal", "Cycling",
  "Martial Arts", "Squash", "Cricket", "Hockey", "Rugby",
]

const CLUB_INTERESTS = [
  "Computer Science Society", "Robotics Club", "Debate Society",
  "Drama Club", "Photography Club", "Music Club", "Entrepreneurship Club",
  "Environmental Club", "Cultural Heritage Society", "Volunteer Corps",
  "Chess Club", "Language Society", "Science Society", "Art Society",
]

const LEARNING_STYLES = [
  { value: "visual", label: "Visual — diagrams, charts, videos" },
  { value: "auditory", label: "Auditory — lectures, discussions" },
  { value: "reading", label: "Reading/Writing — notes, textbooks" },
  { value: "kinesthetic", label: "Kinesthetic — practice, hands-on" },
]

const CURRENT_YEAR = new Date().getFullYear()

// ── Types ──────────────────────────────────────────────────────────────────────

interface FormData {
  // Step 1
  fullName: string
  dateOfBirth: string
  phone: string
  photoUrl: string
  gender: string
  // Step 2
  faculty: string
  degree: string
  intakeYear: string
  graduationYear: string
  studentId: string
  // Step 3
  sports: string[]
  clubInterests: string[]
  learningStyle: string
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ProfileSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [previewSrc, setPreviewSrc] = useState("")

  const [form, setForm] = useState<FormData>({
    fullName: "",
    dateOfBirth: "",
    phone: "",
    photoUrl: "",
    gender: "",
    faculty: "",
    degree: "",
    intakeYear: "",
    graduationYear: "",
    studentId: "",
    sports: [],
    clubInterests: [],
    learningStyle: "",
  })

  // Pre-fill from API
  useEffect(() => {
    fetch("/api/profile/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return
        setForm((prev) => ({
          ...prev,
          fullName: data.fullName ?? "",
          phone: data.phone ?? "",
          photoUrl: data.photoUrl ?? "",
          gender: data.gender ?? "",
          dateOfBirth: data.dateOfBirth
            ? new Date(data.dateOfBirth).toISOString().split("T")[0]
            : "",
          faculty: data.faculty ?? "",
          degree: data.degree ?? "",
          intakeYear: data.intakeYear ? String(data.intakeYear) : "",
          studentId: data.studentId ?? "",
        }))
        if (data.photoUrl) setPreviewSrc(data.photoUrl)
      })
      .catch(() => {})
  }, [])

  // Auto-compute graduation year
  useEffect(() => {
    const year = parseInt(form.intakeYear)
    if (!isNaN(year) && year > 1990) {
      setForm((prev) => ({ ...prev, graduationYear: String(year + 4) }))
    }
  }, [form.intakeYear])

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleChip(field: "sports" | "clubInterests", value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }))
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setPreviewSrc(objectUrl)
    setUploadError("")
    setUploading(true)
    try {
      const data = new FormData()
      data.append("photo", file)
      const res = await fetch("/api/profile/upload", { method: "POST", body: data })
      const json = await res.json()
      if (!res.ok) {
        setUploadError(json.error ?? "Upload failed.")
        setPreviewSrc("")
        URL.revokeObjectURL(objectUrl)
        return
      }
      set("photoUrl", json.photoUrl)
      URL.revokeObjectURL(objectUrl)
      setPreviewSrc(json.photoUrl)
    } catch {
      setUploadError("Network error. Please try again.")
      setPreviewSrc("")
      URL.revokeObjectURL(objectUrl)
    } finally {
      setUploading(false)
    }
  }

  function validateStep(): string {
    if (step === 1) {
      if (!form.fullName.trim()) return "Full name is required."
      if (form.phone && !/^\d{7,15}$/.test(form.phone.replace(/[-\s]/g, "")))
        return "Enter a valid phone number."
    }
    if (step === 2) {
      if (!form.faculty) return "Please select your faculty."
      if (!form.degree.trim()) return "Degree program is required."
      const year = parseInt(form.intakeYear)
      if (isNaN(year) || year < 1990 || year > CURRENT_YEAR)
        return `Intake year must be between 1990 and ${CURRENT_YEAR}.`
    }
    return ""
  }

  function handleNext() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError("")
    setStep((s) => s + 1)
  }

  function handleBack() {
    setError("")
    setStep((s) => s - 1)
  }

  async function handleFinish() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError("")
    setSaving(true)
    try {
      const res = await fetch("/api/profile/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone || null,
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender || null,
          photoUrl: form.photoUrl || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to save profile.")
        return
      }
      router.push("/profile")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const initials = form.fullName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?"

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Edit Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Keep your profile up to date for a better experience.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Left: Form ────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Step progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">
                Step {step} of 3 &mdash;{" "}
                <span className="text-muted-foreground">
                  {step === 1 ? "Personal Details" : step === 2 ? "Academic Info" : "Interests"}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">{Math.round((step / 3) * 100)}%</p>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              {["Personal", "Academic", "Interests"].map((label, i) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                      i + 1 < step
                        ? "bg-primary border-primary text-primary-foreground"
                        : i + 1 === step
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground bg-muted"
                    }`}
                  >
                    {i + 1 < step ? (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block ${
                      i + 1 === step ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Form card */}
          <div className="bg-card border border-border rounded-xl p-6">
            {error && (
              <div className="mb-5 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* ── Step 1: Personal Details ──────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold text-foreground">Personal Details</h2>

                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Profile Photo <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <label
                    className={`flex items-center gap-3 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm cursor-pointer transition ${
                      uploading ? "opacity-60 pointer-events-none" : "hover:border-primary/50"
                    }`}
                  >
                    <span className="shrink-0 text-muted-foreground">
                      {uploading ? (
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                      )}
                    </span>
                    <span className="text-muted-foreground truncate flex-1">
                      {uploading
                        ? "Uploading…"
                        : form.photoUrl
                        ? form.photoUrl.split("/").pop()
                        : "Choose an image…"}
                    </span>
                    {form.photoUrl && !uploading && (
                      <span className="text-xs text-green-600 dark:text-green-400 shrink-0">✓ Uploaded</span>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={handleFileChange}
                      disabled={uploading}
                    />
                  </label>
                  {uploadError ? (
                    <p className="text-xs text-destructive mt-1">{uploadError}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP or GIF — max 5 MB.</p>
                  )}
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Full Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    placeholder="Ahmad bin Abdullah"
                    className={INPUT}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date of Birth */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Date of Birth <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => set("dateOfBirth", e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className={INPUT}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Phone Number <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="0123456789"
                      className={INPUT}
                    />
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Gender <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <div className="flex gap-3">
                    {["Male", "Female", "Prefer not to say"].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => set("gender", form.gender === g ? "" : g)}
                        className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                          form.gender === g
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Academic Info ─────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold text-foreground">Academic Info</h2>

                {/* Student ID (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Student ID
                  </label>
                  <input
                    type="text"
                    value={form.studentId}
                    readOnly
                    className={INPUT + " opacity-60 cursor-not-allowed"}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Student ID cannot be changed after registration.
                  </p>
                </div>

                {/* Faculty */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Faculty <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={form.faculty}
                    onChange={(e) => set("faculty", e.target.value)}
                    className={INPUT}
                  >
                    <option value="">Select your faculty</option>
                    {FACULTIES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                {/* Degree */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Degree Program <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.degree}
                    onChange={(e) => set("degree", e.target.value)}
                    placeholder="e.g. Bachelor of Computer Science"
                    className={INPUT}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Intake Year */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Intake Year <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      value={form.intakeYear}
                      onChange={(e) => set("intakeYear", e.target.value)}
                      placeholder="e.g. 2022"
                      min={1990}
                      max={CURRENT_YEAR}
                      className={INPUT}
                    />
                  </div>

                  {/* Graduation Year (auto) */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Expected Graduation
                    </label>
                    <input
                      type="number"
                      value={form.graduationYear}
                      readOnly
                      className={INPUT + " opacity-60 cursor-not-allowed"}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Interests ─────────────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-base font-semibold text-foreground">Interests</h2>
                <p className="text-sm text-muted-foreground -mt-3">
                  Help us personalize your experience. All optional.
                </p>

                {/* Sports */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Sports Interests
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SPORTS_OPTIONS.map((s) => (
                      <Chip
                        key={s}
                        label={s}
                        active={form.sports.includes(s)}
                        onClick={() => toggleChip("sports", s)}
                      />
                    ))}
                  </div>
                </div>

                {/* Club Interests */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Club & Society Interests
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CLUB_INTERESTS.map((c) => (
                      <Chip
                        key={c}
                        label={c}
                        active={form.clubInterests.includes(c)}
                        onClick={() => toggleChip("clubInterests", c)}
                      />
                    ))}
                  </div>
                </div>

                {/* Learning Style */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Learning Style Preference
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {LEARNING_STYLES.map((ls) => (
                      <button
                        key={ls.value}
                        type="button"
                        onClick={() => set("learningStyle", form.learningStyle === ls.value ? "" : ls.value)}
                        className={`text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                          form.learningStyle === ls.value
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {ls.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Navigation buttons ───────────────────────────────────────── */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/profile")}
                  className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent/50 transition-colors"
                >
                  Cancel
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Next
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {saving ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Save Profile
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Live Preview ────────────────────────────────────────────── */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="sticky top-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Live Preview
            </p>
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden ring-2 ring-primary/20">
                  {(previewSrc || form.photoUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewSrc || form.photoUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {form.fullName || "Your Name"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {form.studentId || "Student ID"}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                {form.gender && (
                  <PreviewRow label="Gender" value={form.gender} />
                )}
                {form.dateOfBirth && (
                  <PreviewRow
                    label="Birthday"
                    value={new Date(form.dateOfBirth).toLocaleDateString("en-MY", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  />
                )}
                {form.phone && <PreviewRow label="Phone" value={form.phone} />}
              </div>

              {(form.faculty || form.degree || form.intakeYear) && (
                <div className="pt-3 border-t border-border space-y-1.5 text-sm">
                  {form.faculty && (
                    <PreviewRow label="Faculty" value={form.faculty.replace("Faculty of ", "")} />
                  )}
                  {form.degree && <PreviewRow label="Degree" value={form.degree} />}
                  {form.intakeYear && (
                    <PreviewRow
                      label="Intake"
                      value={`${form.intakeYear} → ${form.graduationYear || "—"}`}
                    />
                  )}
                </div>
              )}

              {(form.sports.length > 0 || form.clubInterests.length > 0) && (
                <div className="pt-3 border-t border-border">
                  {form.sports.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground mb-1.5">Sports</p>
                      <div className="flex flex-wrap gap-1">
                        {form.sports.slice(0, 4).map((s) => (
                          <span key={s} className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                            {s}
                          </span>
                        ))}
                        {form.sports.length > 4 && (
                          <span className="text-xs text-muted-foreground px-1">
                            +{form.sports.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {form.clubInterests.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Clubs</p>
                      <div className="flex flex-wrap gap-1">
                        {form.clubInterests.slice(0, 3).map((c) => (
                          <span key={c} className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full">
                            {c}
                          </span>
                        ))}
                        {form.clubInterests.length > 3 && (
                          <span className="text-xs text-muted-foreground px-1">
                            +{form.clubInterests.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step hints */}
            <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/15">
              <p className="text-xs font-semibold text-primary mb-2">
                {step === 1 && "Step 1 — Personal Details"}
                {step === 2 && "Step 2 — Academic Info"}
                {step === 3 && "Step 3 — Interests"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {step === 1 && "Fill in your personal details. Only Full Name is required. You can update these anytime."}
                {step === 2 && "Your academic information helps generate personalised improvement suggestions and track your progress."}
                {step === 3 && "Select your interests to help us recommend relevant clubs, sessions, and resources."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const INPUT =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
      }`}
    >
      {active && (
        <span className="mr-1">✓</span>
      )}
      {label}
    </button>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground shrink-0 w-16 text-xs pt-0.5">{label}</span>
      <span className="text-foreground text-xs break-words">{value}</span>
    </div>
  )
}
