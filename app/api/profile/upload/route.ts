import type { NextRequest } from "next/server"
import { Readable } from "stream"
import type { IncomingMessage } from "http"
import path from "path"
import fs from "fs"
import multer from "multer"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "profiles")
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"]

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg"
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) =>
    ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new Error("INVALID_TYPE")),
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
    upload.single("photo")(nodeReq as any, {} as any, (err) => {
      if (err) return reject(err)
      const file = (nodeReq as any).file as Express.Multer.File | undefined
      if (!file) return reject(new Error("NO_FILE"))
      resolve(file)
    })
  })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const buf = Buffer.from(await request.arrayBuffer())
  if (buf.byteLength > MAX_SIZE)
    return Response.json({ error: "File too large. Max 5 MB." }, { status: 413 })

  let file: Express.Multer.File
  try {
    file = await runMulter(toNodeReq(request, buf))
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg === "INVALID_TYPE")
      return Response.json({ error: "Use JPEG, PNG, WebP or GIF." }, { status: 415 })
    if (msg === "NO_FILE")
      return Response.json({ error: "No file received. Field name must be 'photo'." }, { status: 400 })
    if ((err as any).code === "LIMIT_FILE_SIZE")
      return Response.json({ error: "File too large. Max 5 MB." }, { status: 413 })
    return Response.json({ error: "Upload failed." }, { status: 500 })
  }

  const fileUrl = `/uploads/profiles/${file.filename}`

  try {
    await prisma.$transaction([
      prisma.fileAsset.create({
        data: {
          fileName: file.originalname,
          fileSize: file.size,
          fileUrl,
          fileType: file.mimetype,
          userId: session.userId,
        },
      }),
      prisma.user.update({ where: { id: session.userId }, data: { photoUrl: fileUrl } }),
    ])
  } catch {
    fs.unlink(file.path, () => {})
    return Response.json({ error: "Database error. Upload rolled back." }, { status: 500 })
  }

  return Response.json({ photoUrl: fileUrl })
}
