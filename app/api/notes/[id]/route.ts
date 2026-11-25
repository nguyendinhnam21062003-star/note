import { requireSession } from "@/lib/server/auth"
import { saveNote, deleteNote } from "@/lib/server/notes"
import { failure, json, readJson, sameOrigin } from "@/lib/server/http"
export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }
export async function PUT(request: Request, context: Context) {
  try {
    sameOrigin(request)
    await requireSession()
    const { id } = await context.params
    return json({ note: await saveNote(id, await readJson(request)) })
  } catch (error) {
    return failure(error)
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    sameOrigin(request)
    await requireSession()
    const { id } = await context.params
    await deleteNote(
      id,
      Number(new URL(request.url).searchParams.get("version"))
    )
    return json({ deleted: true })
  } catch (error) {
    return failure(error)
  }
}
