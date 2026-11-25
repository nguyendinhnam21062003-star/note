import { authenticated, configured, unlock, lock } from "@/lib/server/auth"
import { failure, json, readJson, sameOrigin } from "@/lib/server/http"
export const runtime = "nodejs"
export async function GET() {
  try {
    return json({
      configured: configured(),
      authenticated: await authenticated(),
    })
  } catch (error) {
    return failure(error)
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const body = (await readJson(request, 4096)) as { password?: unknown }
    await unlock(body?.password)
    return json({ authenticated: true })
  } catch (error) {
    return failure(error)
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request)
    await lock()
    return json({ authenticated: false })
  } catch (error) {
    return failure(error)
  }
}
