import "server-only"
import { db } from "@/lib/server/db"
import { HttpError } from "@/lib/server/http"
import { cleanTags, maxImages, type Note } from "@/lib/notes"

type Row = {
  id: string
  title: string
  body: string
  tags: string[]
  updated_at: Date
  version: string
  images: string[]
}
const selection = `SELECT n.*, COALESCE((SELECT array_agg('/api/images/' || a.image_id::text ORDER BY a.position) FROM note_attachments a WHERE a.note_id=n.id), '{}') AS images FROM notes n`
function fromRow(row: Row): Note {
  return {
    id: row.id,
    title: row.title,
    text: row.body,
    tags: row.tags,
    images: row.images,
    updated: row.updated_at.toISOString(),
    version: Number(row.version),
  }
}
export async function listNotes() {
  return (
    await db().query<Row>(`${selection} ORDER BY n.updated_at DESC, n.id`)
  ).rows.map(fromRow)
}
function validate(value: unknown, id: string): Note {
  if (!value || typeof value !== "object")
    throw new HttpError(400, "Ghi chú không hợp lệ.")
  const n = value as Note
  if (
    !/^[a-zA-Z0-9_-]{1,128}$/.test(id) ||
    n.id !== id ||
    typeof n.title !== "string" ||
    !n.title.trim() ||
    n.title.trim().length > 120 ||
    typeof n.text !== "string" ||
    n.text.length > 20000 ||
    !Array.isArray(n.tags) ||
    n.tags.length > 100 ||
    !n.tags.every((tag) => typeof tag === "string" && tag.length <= 100) ||
    !Array.isArray(n.images) ||
    n.images.length > maxImages ||
    !n.images.every(
      (image) =>
        typeof image === "string" &&
        /^\/api\/images\/[a-f0-9-]{36}$/.test(image)
    ) ||
    (n.version !== undefined &&
      (!Number.isSafeInteger(n.version) || n.version < 1))
  )
    throw new HttpError(400, "Ghi chú không hợp lệ.")
  return {
    ...n,
    title: n.title.trim(),
    tags: cleanTags(n.tags),
    images: [...new Set(n.images)],
  }
}
export async function saveNote(id: string, value: unknown) {
  const note = validate(value, id)
  const client = await db().connect()
  try {
    await client.query("BEGIN")
    // Serializes create/update/delete for this ID, including an absent row.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [id]
    )
    const existing = await client.query<{ version: string }>(
      "SELECT version FROM notes WHERE id=$1 FOR UPDATE",
      [id]
    )
    if (
      existing.rowCount
        ? Number(existing.rows[0].version) !== note.version
        : note.version !== undefined
    )
      throw new HttpError(
        409,
        "Ghi chú đã thay đổi trên thiết bị khác. Nội dung đang sửa vẫn được giữ; hãy sao chép trước khi tải lại."
      )
    const imageIds = note.images.map((image) => image.split("/").pop()!)
    const assets = await client.query(
      "SELECT id FROM image_assets WHERE id=ANY($1::uuid[])",
      [imageIds]
    )
    if (assets.rowCount !== imageIds.length)
      throw new HttpError(
        400,
        "Một ảnh không còn khả dụng. Vui lòng thêm lại ảnh."
      )
    if (existing.rowCount) {
      await client.query(
        "UPDATE notes SET title=$2,body=$3,tags=$4,updated_at=now(),version=nextval('note_versions') WHERE id=$1",
        [id, note.title, note.text, note.tags]
      )
    } else {
      await client.query(
        "INSERT INTO notes(id,title,body,tags) VALUES ($1,$2,$3,$4)",
        [id, note.title, note.text, note.tags]
      )
    }
    // Keep detached images available for undo before the cleanup grace period.
    await client.query(
      "UPDATE image_assets SET created_at=now() WHERE id IN (SELECT image_id FROM note_attachments WHERE note_id=$1)",
      [id]
    )
    await client.query("DELETE FROM note_attachments WHERE note_id=$1", [id])
    for (const [position, imageId] of imageIds.entries())
      await client.query(
        "INSERT INTO note_attachments(note_id,image_id,position) VALUES ($1,$2,$3)",
        [id, imageId, position]
      )
    const saved = await client.query<Row>(`${selection} WHERE n.id=$1`, [id])
    await client.query("COMMIT")
    return fromRow(saved.rows[0])
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
export async function deleteNote(id: string, version: number) {
  if (!Number.isSafeInteger(version) || version < 1)
    throw new HttpError(400, "Phiên bản không hợp lệ.")
  const client = await db().connect()
  try {
    await client.query("BEGIN")
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [id]
    )
    const current = await client.query(
      "SELECT id FROM notes WHERE id=$1 AND version=$2 FOR UPDATE",
      [id, version]
    )
    if (!current.rowCount)
      throw new HttpError(
        409,
        "Ghi chú đã thay đổi. Hãy tải lại trước khi xóa."
      )
    await client.query(
      "UPDATE image_assets SET created_at=now() WHERE id IN (SELECT image_id FROM note_attachments WHERE note_id=$1)",
      [id]
    )
    await client.query("DELETE FROM notes WHERE id=$1", [id])
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
