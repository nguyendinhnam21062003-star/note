import nextEnv from "@next/env"
import pg from "pg"
nextEnv.loadEnvConfig(process.cwd())
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
try {
  await client.connect()
  await client.query("BEGIN")
  const images = await client.query(
    "DELETE FROM image_assets a WHERE a.created_at < now()-interval '7 days' AND NOT EXISTS (SELECT 1 FROM note_attachments n WHERE n.image_id=a.id)"
  )
  await client.query("DELETE FROM vault_sessions WHERE expires_at < now()")
  await client.query("DELETE FROM vault_login_attempts WHERE resets_at < now()")
  await client.query("COMMIT")
  console.log(
    `Removed ${images.rowCount} unreferenced images older than 7 days`
  )
} catch (error) {
  await client.query("ROLLBACK").catch(() => {})
  throw error
} finally {
  await client.end()
}
