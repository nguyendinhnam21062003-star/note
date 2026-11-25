import "server-only"
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"
import { cookies } from "next/headers"
import { db } from "@/lib/server/db"
import { HttpError } from "@/lib/server/http"

const deriveKey = promisify(scrypt)
const cookieName = "notes_session"
const lifetime = 7 * 24 * 60 * 60
const hash = (value: string) => createHash("sha256").update(value).digest("hex")
export function configured() {
  return Boolean(
    process.env.DATABASE_URL &&
    /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(
      process.env.NOTES_PASSWORD_HASH || ""
    )
  )
}
function stamp() {
  return hash(process.env.NOTES_PASSWORD_HASH || "")
}
export async function authenticated() {
  if (!configured()) return false
  const token = (await cookies()).get(cookieName)?.value
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false
  const result = await db().query(
    "SELECT 1 FROM vault_sessions WHERE token_hash=$1 AND password_stamp=$2 AND expires_at > now()",
    [hash(token), stamp()]
  )
  return result.rowCount === 1
}
export async function requireSession() {
  if (!(await authenticated()))
    throw new HttpError(401, "Phiên đã hết hạn. Vui lòng mở khóa lại.")
}
export async function unlock(password: unknown) {
  if (!configured()) throw new HttpError(503, "Sổ ghi chú chưa được thiết lập.")
  if (typeof password !== "string" || password.length > 1024 || !password)
    throw new HttpError(400, "Nhập mật khẩu của bạn.")
  // Stored in PostgreSQL so the limit also applies across server instances.
  const attempts = await db().query<{ attempts: number }>(`
    INSERT INTO vault_login_attempts(bucket, attempts, resets_at) VALUES ('vault',1,now()+interval '15 minutes')
    ON CONFLICT(bucket) DO UPDATE SET
      attempts=CASE WHEN vault_login_attempts.resets_at < now() THEN 1 ELSE vault_login_attempts.attempts+1 END,
      resets_at=CASE WHEN vault_login_attempts.resets_at < now() THEN now()+interval '15 minutes' ELSE vault_login_attempts.resets_at END
    RETURNING attempts`)
  if (attempts.rows[0].attempts > 30)
    throw new HttpError(429, "Thử quá nhiều lần. Vui lòng đợi 15 phút.")
  const [, salt, stored] = process.env.NOTES_PASSWORD_HASH!.split(":")
  const actual = (await deriveKey(
    password,
    Buffer.from(salt, "hex"),
    64
  )) as Buffer
  if (!timingSafeEqual(actual, Buffer.from(stored, "hex")))
    throw new HttpError(401, "Mật khẩu chưa đúng.")
  const token = randomBytes(32).toString("hex")
  await db().query(
    "DELETE FROM vault_sessions WHERE expires_at < now() OR password_stamp <> $1",
    [stamp()]
  )
  await db().query(
    "INSERT INTO vault_sessions(token_hash,password_stamp,expires_at) VALUES ($1,$2,now()+interval '7 days')",
    [hash(token), stamp()]
  )
  await db().query("DELETE FROM vault_login_attempts WHERE bucket='vault'")
  ;(await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: lifetime,
  })
}
export async function lock() {
  const store = await cookies()
  const token = store.get(cookieName)?.value
  if (token && configured())
    await db().query("DELETE FROM vault_sessions WHERE token_hash=$1", [
      hash(token),
    ])
  store.delete(cookieName)
}
