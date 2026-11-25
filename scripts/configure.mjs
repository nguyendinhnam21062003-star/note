import { randomBytes, scryptSync } from "node:crypto"
import { writeFile } from "node:fs/promises"
import readline from "node:readline"

if (!process.stdin.isTTY)
  throw new Error("Run pnpm configure in an interactive terminal")
async function secret(prompt) {
  process.stdout.write(prompt)
  process.stdin.setRawMode(true)
  process.stdin.resume()
  readline.emitKeypressEvents(process.stdin)
  return new Promise((resolve, reject) => {
    let value = ""
    function finish(error) {
      process.stdin.off("keypress", keypress)
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdout.write("\n")
      if (error) reject(error)
      else resolve(value)
    }
    function keypress(character, key = {}) {
      if (key.ctrl && key.name === "c") {
        finish(new Error("Cancelled"))
        return
      }
      if (key.name === "return") {
        finish()
        return
      }
      if (key.name === "backspace") value = value.slice(0, -1)
      else if (character && !key.ctrl && !key.meta) value += character
    }
    process.stdin.on("keypress", keypress)
  })
}
const connection = await secret("PostgreSQL DATABASE_URL (hidden): ")
let database
try {
  database = new URL(connection)
} catch {
  throw new Error("Invalid PostgreSQL URL")
}
if (!["postgres:", "postgresql:"].includes(database.protocol))
  throw new Error("Use a PostgreSQL connection URL")
const password = await secret(
  "Vault password, at least 12 characters (hidden): "
)
if (password.length < 12 || password.length > 1024)
  throw new Error("Use 12-1024 characters")
if (password !== (await secret("Repeat password (hidden): ")))
  throw new Error("Passwords do not match")
const salt = randomBytes(16).toString("hex")
const hash = `scrypt:${salt}:${scryptSync(password, Buffer.from(salt, "hex"), 64).toString("hex")}`
const url = database.href.replaceAll("$", "\\$")
await writeFile(
  new URL("../.env.local", import.meta.url),
  `DATABASE_URL=${url}\nNOTES_PASSWORD_HASH=${hash}\n# APP_ORIGIN=https://your-notes.example.com\n`,
  { flag: "wx", mode: 0o600 }
)
console.log(
  "Created .env.local with a password hash. Run pnpm db:migrate, then pnpm dev."
)
