import { readFile } from "node:fs/promises"
import { execFileSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))
let config
try {
  config = JSON.parse(
    await readFile(path.join(root, ".local/dev-database.json"), "utf8")
  )
} catch (error) {
  if (error.code === "ENOENT" && process.argv.includes("--if-configured"))
    process.exit(0)
  throw new Error("Local PostgreSQL is not configured for this project")
}
const data = path.resolve(root, config.dataDirectory)
if (
  data !== path.join(root, ".local", "postgres") ||
  config.host !== "127.0.0.1" ||
  !Number.isInteger(config.port) ||
  config.port < 1024 ||
  config.port > 65535
)
  throw new Error("Invalid local PostgreSQL configuration")
const executable = path.join(
  config.binDirectory,
  process.platform === "win32" ? "pg_ctl.exe" : "pg_ctl"
)
const run = (args) =>
  execFileSync(executable, ["-D", data, ...args], {
    windowsHide: true,
    stdio: "ignore",
  })
function running() {
  try {
    run(["status"])
    return true
  } catch (error) {
    if (error.status === 3) return false
    throw error
  }
}
const action = process.argv[2] || "start"
if (action === "start") {
  if (!running())
    run([
      "-l",
      path.join(root, ".local/postgres.log"),
      "-o",
      `-p ${config.port} -h ${config.host}`,
      "-w",
      "start",
    ])
  console.log(`Dev PostgreSQL ready at ${config.host}:${config.port}`)
} else if (action === "stop") {
  if (running()) run(["-m", "fast", "-w", "stop"])
  console.log("Dev PostgreSQL stopped; data is retained in .local/postgres")
} else throw new Error("Use start or stop")
