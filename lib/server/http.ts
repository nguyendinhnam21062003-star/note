import "server-only"

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}
export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: privateHeaders })
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status)
  // Never expose connection strings, SQL values or passwords in an API response.
  console.error(
    "Vault request failed",
    error instanceof Error ? error.name : "UnknownError"
  )
  return json({ error: "Chưa thể kết nối máy chủ. Vui lòng thử lại." }, 503)
}
export function sameOrigin(request: Request) {
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin
  if (request.headers.get("origin") !== expected)
    throw new HttpError(403, "Yêu cầu không hợp lệ.")
}
export async function readBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new HttpError(413, "Dữ liệu quá lớn.")
  if (!request.body) return new Uint8Array()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      throw new HttpError(413, "Dữ liệu quá lớn.")
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}
export async function readJson(
  request: Request,
  limit = 128 * 1024
): Promise<unknown> {
  try {
    return JSON.parse(new TextDecoder().decode(await readBody(request, limit)))
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(400, "Dữ liệu không hợp lệ.")
  }
}
