"use client"
import { useEffect, useState } from "react"
import { NoteWorkspace } from "@/components/note-workspace"
import { VaultLock } from "@/components/vault-lock"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
export default function Page() {
  const [state, setState] = useState<
    "checking" | "locked" | "open" | "setup" | "error"
  >("checking")
  useEffect(() => {
    let active = true
    api<{ configured: boolean; authenticated: boolean }>("/api/session")
      .then((session) => {
        if (active)
          setState(
            !session.configured
              ? "setup"
              : session.authenticated
                ? "open"
                : "locked"
          )
      })
      .catch(() => {
        if (active) setState("error")
      })
    return () => {
      active = false
    }
  }, [])
  if (state === "checking")
    return (
      <div
        className="vault-lock"
        role="status"
        aria-label="Đang kiểm tra phiên"
      />
    )
  if (state === "error")
    return (
      <main className="vault-lock">
        <div className="flex flex-col items-center gap-4">
          <p>Chưa thể kết nối máy chủ.</p>
          <Button onClick={() => window.location.reload()}>Thử lại</Button>
        </div>
      </main>
    )
  if (state !== "open")
    return (
      <VaultLock
        configured={state !== "setup"}
        onUnlock={() => setState("open")}
      />
    )
  return <NoteWorkspace onLock={() => setState("locked")} />
}
