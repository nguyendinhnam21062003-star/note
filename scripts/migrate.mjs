import { readFile, readdir } from "node:fs/promises"
import nextEnv from "@next/env"
import pg from "pg"
nextEnv.loadEnvConfig(process.cwd())
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL before running db:migrate")
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
try {
  await client.connect()
  await client.query("BEGIN")
  await client.query("SELECT pg_advisory_xact_lock(81447119)")
  await client.query(
    "CREATE TABLE IF NOT EXISTS notes_schema_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
  )
  for (const file of (await readdir(new URL("../db/", import.meta.url)))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    const existing = await client.query(
      "SELECT 1 FROM notes_schema_migrations WHERE version=$1",
      [file]
    )
    if (existing.rowCount) continue
    await client.query(
      await readFile(new URL(`../db/${file}`, import.meta.url), "utf8")
    )
    await client.query(
      "INSERT INTO notes_schema_migrations(version) VALUES ($1)",
      [file]
    )
    console.log(`Applied ${file}`)
  }
  await client.query("COMMIT")
  console.log("PostgreSQL schema ready")
} catch (error) {
  await client.query("ROLLBACK").catch(() => {})
  throw error
} finally {
  await client.end()
}
