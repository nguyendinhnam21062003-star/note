import { createHash, randomUUID } from "node:crypto"
import { requireSession } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import {
  failure,
  HttpError,
  json,
  readBody,
  sameOrigin,
} from "@/lib/server/http"
export const runtime = "nodejs"
export async function POST(request: Request) {
  try {
    sameOrigin(request)
    await requireSession()
    if (request.headers.get("content-type") !== "image/png")
      throw new HttpError(415, "Ảnh cần ở định dạng PNG.")
    const bytes = Buffer.from(await readBody(request, 3.5 * 1024 * 1024))
    if (
      bytes.length < 33 ||
      !bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      bytes.toString("ascii", 12, 16) !== "IHDR" ||
      bytes.readUInt32BE(16) < 1 ||
      bytes.readUInt32BE(20) < 1 ||
      bytes.readUInt32BE(16) > 1600 ||
      bytes.readUInt32BE(20) > 1600
    )
      throw new HttpError(400, "Ảnh không hợp lệ.")
    const digest = createHash("sha256").update(bytes).digest("hex")
    const result = await db().query<{ id: string }>(
      "INSERT INTO image_assets(id,digest,data) VALUES ($1,$2,$3) ON CONFLICT(digest) DO UPDATE SET created_at=now() RETURNING id",
      [randomUUID(), digest, bytes]
    )
    return json({ image: `/api/images/${result.rows[0].id}` })
  } catch (error) {
    return failure(error)
  }
}
