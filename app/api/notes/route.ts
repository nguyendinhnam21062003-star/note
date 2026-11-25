import { requireSession } from "@/lib/server/auth"
import { listNotes } from "@/lib/server/notes"
import { failure, json } from "@/lib/server/http"
export const runtime = "nodejs"
export async function GET() {
  try {
    await requireSession()
    return json({ notes: await listNotes() })
  } catch (error) {
    return failure(error)
  }
}
