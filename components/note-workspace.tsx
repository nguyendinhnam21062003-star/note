"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import Link from "next/link"
import {
  Search,
  Plus,
  Moon,
  Sun,
  NotebookPen,
  Cloud,
  LockKeyhole,
  Download,
  X,
  Layers,
  Hash,
  LayoutGrid,
  List,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import { NoteCard } from "@/components/note-card"
import { NoteEditor } from "@/components/note-editor"
import { NoteReader } from "@/components/note-reader"
import { cn } from "@/lib/utils"
import {
  maxImages,
  readNotes,
  cleanTags,
  tagKey,
  normalize,
  storageKey,
  type Note,
} from "@/lib/notes"
import { copyNote, readNoteImage, imageDataUrl } from "@/lib/clipboard"

import { api, ApiError, storeNote } from "@/lib/api"

async function fingerprint(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
    )
  )
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

const blank = (): Note => ({
  id: crypto.randomUUID(),
  title: "",
  text: "",
  tags: [],
  images: [],
  updated: new Date().toISOString(),
})

export function NoteWorkspace({ onLock }: { onLock: () => void }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState("")
  const [readError, setReadError] = useState(false)
  const [query, setQuery] = useState("")
  const [activeTag, setActiveTag] = useState("")
  const [viewing, setViewing] = useState<Note | null>(null)
  const [view, setView] = useState("grid")
  const [compact, setCompact] = useState(false)
  const [draft, setDraft] = useState<Note | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [legacy, setLegacy] = useState<Note[]>([])
  const legacyDigest = useRef("")
  const generation = useRef(Symbol())
  const uploadingRef = useRef(false)
  const search = useRef<HTMLInputElement>(null)
  const { resolvedTheme, setTheme } = useTheme()

  const refresh = useCallback(async () => {
    const current = Symbol()
    generation.current = current
    try {
      const data = await api<{ notes: unknown }>("/api/notes")
      if (current === generation.current) {
        setNotes(readNotes(data.notes))
        setStorageError("")
        setReadError(false)
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        onLock()
        return
      }
      if (current === generation.current) {
        setReadError(true)
        setStorageError(
          cause instanceof Error ? cause.message : "Chưa tải được ghi chú."
        )
      }
    } finally {
      if (current === generation.current) setReady(true)
    }
  }, [onLock])
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void refresh()
    })
    return () => {
      cancelAnimationFrame(frame)
      generation.current = Symbol()
    }
  }, [refresh])
  useEffect(() => {
    if (draft || saving) return
    const focus = () => {
      if (document.visibilityState === "visible") void refresh()
    }
    window.addEventListener("focus", focus)
    const timer = window.setInterval(focus, 30000)
    return () => {
      window.removeEventListener("focus", focus)
      window.clearInterval(timer)
    }
  }, [draft, saving, refresh])
  useEffect(() => {
    let active = true
    async function localNotes() {
      try {
        const raw = localStorage.getItem(storageKey)
        if (!raw) return
        const digest = await fingerprint(raw)
        if (localStorage.getItem(`${storageKey}:imported`) === digest) return
        const old = readNotes(JSON.parse(raw))
        if (active) {
          legacyDigest.current = digest
          setLegacy(old)
        }
      } catch {
        /* The local source remains untouched and cloud notes stay usable. */
      }
    }
    void localNotes()
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const updateLayout = () => setCompact(media.matches)
    const frame = requestAnimationFrame(updateLayout)
    media.addEventListener("change", updateLayout)
    function hotkey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        search.current?.focus()
      }
    }
    window.addEventListener("keydown", hotkey)
    return () => {
      cancelAnimationFrame(frame)
      media.removeEventListener("change", updateLayout)
      window.removeEventListener("keydown", hotkey)
    }
  }, [])
  const tags = useMemo(
    () =>
      cleanTags(notes.flatMap((note) => note.tags)).sort((a, b) =>
        a.localeCompare(b, "vi")
      ),
    [notes]
  )
  const filterTags = cleanTags([...tags, ...(activeTag ? [activeTag] : [])])
  const shown = useMemo(
    () =>
      notes.filter(
        (note) =>
          (!activeTag ||
            note.tags.some((tag) => tagKey(tag) === tagKey(activeTag))) &&
          normalize(
            `${note.title} ${note.text} ${note.tags.join(" ")}`
          ).includes(normalize(query.trim()))
      ),
    [notes, query, activeTag]
  )
  function edit(note: Note) {
    setViewing(null)
    setError("")
    setDraft({ ...note, images: [...note.images], tags: [...note.tags] })
  }
  function create() {
    const note = blank()
    if (activeTag) note.tags = [activeTag]
    edit(note)
  }
  function failed(cause: unknown) {
    if (cause instanceof ApiError && cause.status === 401) onLock()
    return cause instanceof Error
      ? cause.message
      : "Chưa lưu được. Hãy thử lại."
  }
  function accept(note: Note) {
    setNotes((current) =>
      [note, ...current.filter((entry) => entry.id !== note.id)].sort(
        (a, b) => Date.parse(b.updated) - Date.parse(a.updated)
      )
    )
    setStorageError("")
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!draft || saving || uploading) return
    if (!draft.title.trim()) {
      setError("Hãy nhập tiêu đề ghi chú.")
      return
    }
    setSaving(true)
    setError("")
    generation.current = Symbol()
    try {
      const note = await storeNote({
        ...draft,
        title: draft.title.trim(),
        tags: cleanTags(draft.tags),
        sample: false,
      })
      accept(note)
      if (
        activeTag &&
        !note.tags.some((tag) => tagKey(tag) === tagKey(activeTag))
      )
        setActiveTag("")
      if (
        !normalize(
          `${note.title} ${note.text} ${note.tags.join(" ")}`
        ).includes(normalize(query.trim()))
      )
        setQuery("")
      setDraft(null)
      toast.add({ title: "Đã lưu ghi chú", type: "success" })
    } catch (cause) {
      setError(failed(cause))
    } finally {
      setSaving(false)
    }
  }
  async function remove(note: Note) {
    if (saving) return
    setSaving(true)
    generation.current = Symbol()
    try {
      await api(
        `/api/notes/${encodeURIComponent(note.id)}?version=${note.version}`,
        { method: "DELETE" }
      )
      setNotes((current) => current.filter((entry) => entry.id !== note.id))
      setDraft(null)
      const toastId = toast.add({
        title: "Đã xóa ghi chú",
        actionProps: {
          children: "Hoàn tác",
          onClick: async () => {
            setSaving(true)
            try {
              generation.current = Symbol()
              const restored = await storeNote({ ...note, version: undefined })
              accept(restored)
              toast.close(toastId)
            } catch (cause) {
              toast.add({ title: failed(cause), type: "error" })
            } finally {
              setSaving(false)
            }
          },
        },
      })
    } catch (cause) {
      setError(failed(cause))
    } finally {
      setSaving(false)
    }
  }
  async function copy(note: Note, mode: Parameters<typeof copyNote>[1]) {
    const key = `${note.id}:${mode}`
    setBusy(key)
    try {
      await copyNote(note, mode)
      setCopied(key)
      window.setTimeout(
        () => setCopied((current) => (current === key ? null : current)),
        2000
      )
      toast.add({
        title: mode === "both" ? "Đã chép nội dung và ảnh" : "Đã chép nội dung",
        type: "success",
      })
    } catch (cause) {
      toast.add({
        title: "Chưa sao chép được",
        description: failed(cause),
        type: "error",
      })
    } finally {
      setBusy(null)
    }
  }
  async function upload(files: File[]) {
    if (!files.length || !draft || uploadingRef.current) return
    if (draft.images.length + files.length > maxImages) {
      setError(`Mỗi ghi chú tối đa ${maxImages} ảnh.`)
      return
    }
    uploadingRef.current = true
    setUploading(true)
    setError("")
    const id = draft.id
    try {
      const images: string[] = []
      for (const file of files) images.push(await readNoteImage(file))
      setDraft((current) =>
        current?.id === id
          ? { ...current, images: [...current.images, ...images] }
          : current
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không đọc được ảnh.")
    } finally {
      uploadingRef.current = false
      setUploading(false)
    }
  }
  async function backup() {
    try {
      const exported = await Promise.all(
        notes.map(async (note) => ({
          ...note,
          images: await Promise.all(note.images.map(imageDataUrl)),
        }))
      )
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(exported, null, 2)], {
          type: "application/json",
        })
      )
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = "ethans-notes.json"
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (cause) {
      toast.add({
        title: "Chưa sao lưu được",
        description: failed(cause),
        type: "error",
      })
    }
  }
  async function importLegacy() {
    setSaving(true)
    generation.current = Symbol()
    try {
      for (const note of legacy) {
        const id = `import-${await fingerprint(JSON.stringify(note))}`
        try {
          accept(
            await storeNote({ ...note, id, version: undefined, sample: false })
          )
        } catch (cause) {
          if (!(cause instanceof ApiError && cause.status === 409)) throw cause
        }
      }
      try {
        localStorage.setItem(`${storageKey}:imported`, legacyDigest.current)
      } catch {
        /* Original data is retained. */
      }
      setLegacy([])
      toast.add({ title: "Đã chuyển ghi chú vào sổ", type: "success" })
      await refresh()
    } catch (cause) {
      setStorageError(failed(cause))
    } finally {
      setSaving(false)
    }
  }
  async function lockVault() {
    try {
      await api("/api/session", { method: "DELETE" })
      onLock()
    } catch (cause) {
      toast.add({
        title: "Chưa khóa được phiên",
        description: failed(cause),
        type: "error",
      })
    }
  }

  return (
    <div className="workspace">
      <a href="#notes" className="skip-link">
        Đến ghi chú
      </a>
      <aside className="workspace-sidebar" aria-label="Điều hướng">
        <Link href="/" className="workspace-brand">
          <span className="brand-mark">
            <NotebookPen className="size-5" aria-hidden="true" />
          </span>
          <span>
            Ethan’s Note<span className="brand-dot">.</span>
          </span>
        </Link>
        <nav className="tag-navigation" aria-label="Lọc ghi chú theo tag">
          <ToggleGroup
            variant="navigation"
            spacing={1}
            value={[activeTag ? `tag:${tagKey(activeTag)}` : "all"]}
            onValueChange={(values) => {
              const value = values[0]
              if (value === "all") setActiveTag("")
              else if (value)
                setActiveTag(
                  filterTags.find((tag) => `tag:${tagKey(tag)}` === value) ?? ""
                )
            }}
            aria-label="Tag"
            className="tag-filters"
            orientation={compact ? "horizontal" : "vertical"}
          >
            <ToggleGroupItem value="all">
              <Layers data-icon="inline-start" />
              <span>Tất cả</span>
              <span className="tag-count">{ready ? notes.length : "–"}</span>
            </ToggleGroupItem>
            {filterTags.map((tag) => (
              <ToggleGroupItem key={tagKey(tag)} value={`tag:${tagKey(tag)}`}>
                <Hash data-icon="inline-start" />
                <span className="truncate" title={tag}>
                  {tag}
                </span>
                <span className="tag-count">
                  {
                    notes.filter((note) =>
                      note.tags.some(
                        (current) => tagKey(current) === tagKey(tag)
                      )
                    ).length
                  }
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </nav>
        <div className="sidebar-utilities">
          <span
            className="local-storage-label"
            title="Ghi chú và ảnh được lưu trong sổ riêng của bạn."
          >
            <Cloud className="size-3.5" aria-hidden="true" />
            {storageError ? "Chưa đồng bộ" : "Đã đồng bộ"}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Khóa sổ ghi chú"
              title="Khóa sổ"
              onClick={lockVault}
              disabled={saving || uploading}
            >
              <LockKeyhole />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={backup}
              disabled={!ready}
              aria-label="Sao lưu ghi chú"
              title="Sao lưu ghi chú"
            >
              <Download />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Đổi giao diện sáng tối"
              title="Đổi sáng / tối"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              <Sun className="dark:hidden" />
              <Moon className="hidden dark:block" />
            </Button>
          </div>
        </div>
      </aside>
      <main id="notes" tabIndex={-1} className="workspace-main">
        <div className="workspace-content">
          <header className="workspace-toolbar">
            <div className="flex min-w-0 items-baseline gap-3">
              <h1>Ghi chú</h1>
              <span className="note-count" role="status" aria-live="polite">
                {ready ? shown.length : "…"}
                <span className="sr-only"> ghi chú</span>
              </span>
            </div>
            <Button onClick={create} disabled={!ready || readError || saving}>
              <Plus data-icon="inline-start" />
              Tạo mới
            </Button>
          </header>
          {legacy.length > 0 && (
            <Alert>
              <AlertTitle>{legacy.length} ghi chú trên thiết bị này</AlertTitle>
              <AlertDescription>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving || !ready || readError}
                  onClick={importLegacy}
                >
                  {saving ? "Đang chuyển…" : "Chuyển vào sổ"}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {storageError && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Chưa đồng bộ được</AlertTitle>
              <AlertDescription>
                {storageError}
                <Button variant="outline" size="sm" onClick={refresh}>
                  Thử lại
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <section
            aria-label="Tìm và hiển thị ghi chú"
            className="search-toolbar"
          >
            <InputGroup className="note-search">
              <InputGroupInput
                ref={search}
                placeholder="Tìm ghi chú…"
                aria-label="Tìm ghi chú"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">
                {query ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Xóa tìm kiếm"
                    onClick={() => {
                      setQuery("")
                      search.current?.focus()
                    }}
                  >
                    <X />
                  </Button>
                ) : (
                  <kbd
                    className="search-shortcut"
                    title="Ctrl hoặc Command + K"
                  >
                    ⌘ K
                  </kbd>
                )}
              </InputGroupAddon>
            </InputGroup>
            <ToggleGroup
              variant="outline"
              spacing={0}
              value={[view]}
              onValueChange={(values) => {
                if (values[0]) setView(values[0])
              }}
              aria-label="Cách hiển thị"
              className="view-toggle"
            >
              <ToggleGroupItem
                value="grid"
                aria-label="Dạng lưới"
                title="Dạng lưới"
              >
                <LayoutGrid />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="list"
                aria-label="Dạng danh sách"
                title="Dạng danh sách"
              >
                <List />
              </ToggleGroupItem>
            </ToggleGroup>
          </section>
          {!ready ? (
            <div
              className="notes-grid"
              aria-label="Đang tải ghi chú"
              aria-busy="true"
            >
              {[1, 2, 3, 4].map((n) => (
                <Skeleton key={n} className="h-64 w-full rounded-2xl" />
              ))}
            </div>
          ) : readError ? null : shown.length === 0 ? (
            <Empty className="min-h-80">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {query ? <Search /> : <NotebookPen />}
                </EmptyMedia>
                <EmptyTitle>
                  {query ? "Không tìm thấy ghi chú" : "Chưa có ghi chú"}
                </EmptyTitle>
                <EmptyDescription>
                  {query ? "Thử từ khóa khác." : "Lưu lại điều bạn cần."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (query || activeTag) {
                      setQuery("")
                      setActiveTag("")
                    } else create()
                  }}
                >
                  {query || activeTag ? "Xem tất cả" : "Tạo ghi chú"}
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <section
              aria-label="Danh sách ghi chú"
              className={cn("notes-grid", view === "list" && "notes-list")}
            >
              {shown.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  busy={busy}
                  copied={copied}
                  readOnly={readError}
                  onEdit={edit}
                  onCopy={copy}
                  onView={setViewing}
                  onTagSelect={setActiveTag}
                />
              ))}
            </section>
          )}
        </div>
      </main>
      <NoteReader
        note={viewing}
        busy={busy}
        copied={copied}
        onClose={() => setViewing(null)}
        onEdit={edit}
        onCopy={copy}
      />
      <NoteEditor
        draft={draft}
        setDraft={setDraft}
        editing={notes.some((note) => note.id === draft?.id)}
        uploading={uploading}
        saving={saving}
        error={error}
        onSave={save}
        onRemove={remove}
        onUpload={upload}
        availableTags={tags}
      />
    </div>
  )
}
