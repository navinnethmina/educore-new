import type { NextRequest } from "next/server"
import { Readable } from "stream"
import type { IncomingMessage } from "http"
import path from "path"
import fs from "fs"
import multer from "multer"
import { MaterialType } from "@prisma/client"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "materials")
const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin"
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
})

function toNodeReq(request: NextRequest, buf: Buffer): IncomingMessage {
  const r = new Readable({ read() {} })
  r.push(buf)
  r.push(null)
  return Object.assign(r, {
    headers: Object.fromEntries(request.headers.entries()),
    method: request.method,
  }) as unknown as IncomingMessage
}

function runMulter(nodeReq: IncomingMessage): Promise<Express.Multer.File> {
  return new Promise((resolve, reject) => {
    upload.single("file")(nodeReq as any, {} as any, (err) => {
      if (err) return reject(err)
      const file = (nodeReq as any).file as Express.Multer.File | undefined
      if (!file) return reject(new Error("NO_FILE"))
      resolve(file)
    })
  })
}

const VALID_TYPES = Object.values(MaterialType) as string[]

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const buf = Buffer.from(await request.arrayBuffer())
  if (buf.byteLength > MAX_SIZE)
    return Response.json({ error: "File too large. Max 20 MB." }, { status: 413 })

  let file: Express.Multer.File
  const nodeReq = toNodeReq(request, buf)

  try {
    file = await runMulter(nodeReq)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg === "NO_FILE")
      return Response.json({ error: "No file received." }, { status: 400 })
    if ((err as any).code === "LIMIT_FILE_SIZE")
      return Response.json({ error: "File too large. Max 20 MB." }, { status: 413 })
    return Response.json({ error: "Upload failed." }, { status: 500 })
  }

  const body = (nodeReq as any).body as Record<string, string>
  const { title, courseCode, type, description } = body

  if (!title?.trim() || !courseCode?.trim())
    return Response.json({ error: "Title and course code are required." }, { status: 400 })

  const materialType: MaterialType = VALID_TYPES.includes(type) ? (type as MaterialType) : MaterialType.NOTES
  const fileUrl = `/uploads/materials/${file.filename}`

  try {
    const material = await prisma.$transaction(async (tx) => {
      const mat = await tx.studyMaterial.create({
        data: {
          title: title.trim(),
          courseCode: courseCode.trim().toUpperCase(),
          type: materialType,
          description: description?.trim() || null,
          userId: session.userId,
        },
      })
      await tx.fileAsset.create({
        data: {
          fileName: file.originalname,
          fileSize: file.size,
          fileUrl,
          fileType: file.mimetype,
          userId: session.userId,
          materialId: mat.id,
        },
      })
      return tx.studyMaterial.findUnique({
        where: { id: mat.id },
        include: {
          fileAsset: { select: { fileName: true, fileSize: true, fileUrl: true, fileType: true } },
          summary: { select: { quickSummary: true } },
        },
      })
    })
    return Response.json(material, { status: 201 })
  } catch {
    fs.unlink(file.path, () => {})
    return Response.json({ error: "Database error. Upload rolled back." }, { status: 500 })
  }
}
