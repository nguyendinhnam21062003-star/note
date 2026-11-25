import "server-only"
import { Pool } from "pg"

const globalDb = globalThis as unknown as { notesPool?: Pool }
export function db() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured")
  if (!globalDb.notesPool) {
    globalDb.notesPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
      statement_timeout: 15000,
    })
    globalDb.notesPool.on("error", () =>
      console.error("PostgreSQL connection lost")
    )
  }
  return globalDb.notesPool
}
