"use client"
import { useState, type FormEvent } from "react"
import { Eye, EyeOff, LockKeyhole, NotebookPen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { api } from "@/lib/api"

export function VaultLock({
  configured,
  onUnlock,
}: {
  configured: boolean
  onUnlock: () => void
}) {
  const [password, setPassword] = useState("")
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      await api("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      setPassword("")
      onUnlock()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chưa mở khóa được.")
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="vault-lock">
      <div className="vault-lock-panel">
        <span className="brand-mark mb-7">
          <NotebookPen className="size-5" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          Ethan’s Note<span className="brand-dot">.</span>
        </h1>
        <p className="mt-2 mb-8 text-sm text-muted-foreground">
          {configured
            ? "Không gian riêng của bạn."
            : "Sổ ghi chú chưa được thiết lập."}
        </p>
        {configured && (
          <form onSubmit={submit}>
            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="vault-password">Mật khẩu</FieldLabel>
                <InputGroup className="h-11">
                  <InputGroupInput
                    id="vault-password"
                    type={visible ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    autoFocus
                    maxLength={1024}
                    value={password}
                    disabled={busy}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "unlock-error" : undefined}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <InputGroupAddon align="inline-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff /> : <Eye />}
                    </Button>
                  </InputGroupAddon>
                </InputGroup>
                {error && (
                  <p
                    id="unlock-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {error}
                  </p>
                )}
              </Field>
              <Button type="submit" disabled={busy}>
                <LockKeyhole data-icon="inline-start" />
                {busy ? "Đang mở…" : "Mở khóa"}
              </Button>
            </FieldGroup>
          </form>
        )}
      </div>
    </main>
  )
}
