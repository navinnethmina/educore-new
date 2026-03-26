import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { getSession } from "@/lib/auth/session"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === "your-anthropic-api-key-here") {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured in .env" }, { status: 503 })
  }

  // ── Parse uploaded file ───────────────────────────────────────────────────

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: "Invalid form data." }, { status: 400 })
  }

  const file = formData.get("image") as File | null
  if (!file || typeof file === "string") {
    return Response.json({ error: "No image file provided." }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: "Only JPG, PNG, and WebP images are supported." }, { status: 400 })
  }

  if (file.size > MAX_SIZE_BYTES) {
    return Response.json({ error: "Image must be under 5 MB." }, { status: 400 })
  }

  // ── Save file to public/uploads/certificates/ ─────────────────────────────

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const base64 = buffer.toString("base64")

  const ext = file.type.split("/")[1].replace("jpeg", "jpg")
  const filename = `${session.userId}-${Date.now()}.${ext}`
  const uploadDir = join(process.cwd(), "public", "uploads", "certificates")
  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, filename), buffer)
  const fileUrl = `/uploads/certificates/${filename}`

  // ── Call Claude vision API ────────────────────────────────────────────────

  const prompt = `You are extracting sports achievement information from a certificate or trophy photo.

Look at the image carefully and extract the following fields. Return ONLY a JSON object, no markdown, no explanation:
{
  "sportName": "name of the sport or event (e.g. Badminton, Football, Swimming)",
  "achievementType": "one of: TROPHY, CERTIFICATE, MEDAL",
  "position": "position or placing (e.g. 1st Place, Champion, Runner-up, 3rd Place) — null if not found",
  "eventName": "full name of the event or competition — null if not found",
  "date": "date in YYYY-MM-DD format — null if not found",
  "points": a number between 10 and 100 based on achievement level (1st=100, 2nd=70, 3rd=50, participation=10)
}

If the image is not a certificate or achievement document, still return the JSON with null values where unknown.`

  let extracted: {
    sportName: string
    achievementType: string
    position: string | null
    eventName: string | null
    date: string | null
    points: number
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: file.type as "image/jpeg" | "image/png" | "image/webp",
                  data: base64,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      console.error("Anthropic API error:", err)
      return Response.json({ error: "AI scan failed. Check your API key.", fileUrl }, { status: 502 })
    }

    const aiData = await anthropicRes.json()
    const rawText: string = aiData.choices?.[0]?.message?.content ?? aiData.content?.[0]?.text ?? ""
    // Strip any markdown code fences if present
    const jsonText = rawText.replace(/```json\n?|\n?```/g, "").trim()
    extracted = JSON.parse(jsonText)
  } catch (err) {
    console.error("Scan parse error:", err)
    return Response.json({ error: "Could not parse certificate details.", fileUrl }, { status: 422 })
  }

  // Normalise achievementType
  const validTypes = ["TROPHY", "CERTIFICATE", "MEDAL"]
  if (!validTypes.includes(extracted.achievementType)) {
    extracted.achievementType = "CERTIFICATE"
  }

  return Response.json({ ...extracted, fileUrl })
}
