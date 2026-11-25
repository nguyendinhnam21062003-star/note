import type { Note } from "@/lib/notes"
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok)
    throw new ApiError(
      response.status,
      body.error || "Chưa thể kết nối máy chủ."
    )
  return body as T
}
export async function storeNote(note: Note) {
  const images: string[] = []
  for (const source of note.images) {
    if (source.startsWith("/api/images/")) images.push(source)
    else {
      const blob = await (await fetch(source)).blob()
      const result = await api<{ image: string }>("/api/images", {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: blob,
      })
      images.push(result.image)
    }
  }
  return (
    await api<{ note: Note }>(`/api/notes/${encodeURIComponent(note.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...note, images }),
    })
  ).note
}
