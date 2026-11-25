import { requireSession } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { failure, HttpError, privateHeaders } from "@/lib/server/http"
export const runtime = "nodejs"
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession()
    const { id } = await context.params
    if (!/^[a-f0-9-]{36}$/.test(id))
      throw new HttpError(404, "Không tìm thấy ảnh.")
    const result = await db().query<{ data: Buffer }>(
      "SELECT data FROM image_assets WHERE id=$1",
      [id]
    )
    if (!result.rowCount) throw new HttpError(404, "Không tìm thấy ảnh.")
    return new Response(new Uint8Array(result.rows[0].data), {
      headers: {
        ...privateHeaders,
        "Content-Type": "image/png",
        "Content-Disposition": 'inline; filename="note-image.png"',
      },
    })
  } catch (error) {
    return failure(error)
  }
}
