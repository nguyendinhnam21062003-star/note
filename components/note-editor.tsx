"use client"
import {
  useRef,
  type ClipboardEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react"
import { ImagePlus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { maxImages, type Note } from "@/lib/notes"
import { TagInput } from "@/components/note-tags"
import { ImageGallery } from "@/components/image-gallery"

export function NoteEditor({
  draft,
  setDraft,
  editing,
  uploading,
  saving,
  error,
  onSave,
  onRemove,
  onUpload,
  availableTags,
}: {
  draft: Note | null
  setDraft: Dispatch<SetStateAction<Note | null>>
  editing: boolean
  uploading: boolean
  saving: boolean
  error: string
  onSave: (event: FormEvent) => void
  onRemove: (note: Note) => void
  onUpload: (files: File[]) => Promise<void>
  availableTags: string[]
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  function pasteImage(event: ClipboardEvent<HTMLDivElement>) {
    const images = Array.from(event.clipboardData.files).filter((file) =>
      file.type.startsWith("image/")
    )
    if (!images.length)
      for (const item of Array.from(event.clipboardData.items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) images.push(file)
        }
      }
    if (!images.length) return
    if (!event.clipboardData.getData("text/plain")) event.preventDefault()
    if (!uploading && !saving) void onUpload(images)
  }
  return (
    <Sheet
      open={draft !== null}
      onOpenChange={(open) => {
        if (!open && !uploading && !saving) setDraft(null)
      }}
    >
      <SheetContent
        className="note-editor data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
        onPaste={pasteImage}
      >
        <SheetHeader className="px-6 pt-7 pb-5">
          <SheetTitle>{editing ? "Chỉnh sửa" : "Ghi chú mới"}</SheetTitle>
          <SheetDescription className="sr-only">
            Nhập thông tin và lưu ghi chú.
          </SheetDescription>
        </SheetHeader>
        {draft && (
          <form
            id="note-form"
            onSubmit={onSave}
            className="min-h-0 flex-1 overflow-y-auto px-6 pb-6"
          >
            <fieldset disabled={saving} className="min-w-0">
              <FieldGroup className="gap-6">
                <Field>
                  <FieldLabel htmlFor="note-title">
                    Tiêu đề <span aria-hidden="true">*</span>
                  </FieldLabel>
                  <Input
                    id="note-title"
                    required
                    autoFocus
                    maxLength={120}
                    placeholder="Tên ghi chú"
                    value={draft.title}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, title: event.target.value }
                          : null
                      )
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="note-content">Nội dung</FieldLabel>
                  <Textarea
                    id="note-content"
                    className="max-h-64 min-h-44 resize-y"
                    maxLength={20000}
                    placeholder="Viết ghi chú…"
                    value={draft.text}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, text: event.target.value }
                          : null
                      )
                    }
                  />
                </Field>
                <TagInput
                  key={draft.id}
                  tags={draft.tags}
                  suggestions={availableTags}
                  onChange={(tags) =>
                    setDraft((current) =>
                      current ? { ...current, tags } : null
                    )
                  }
                />
                <Field data-disabled={uploading || undefined}>
                  <FieldLabel htmlFor="note-image">Ảnh / QR</FieldLabel>
                  <Input
                    ref={fileInput}
                    id="note-image"
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={uploading}
                    aria-describedby="image-hint"
                    onChange={(event) => {
                      void onUpload(Array.from(event.target.files ?? []))
                      event.target.value = ""
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="self-start"
                    disabled={uploading || draft.images.length >= maxImages}
                    aria-describedby="image-hint"
                    onClick={() => fileInput.current?.click()}
                  >
                    <ImagePlus data-icon="inline-start" />
                    Thêm ảnh
                  </Button>
                  <FieldDescription id="image-hint" role="status">
                    {uploading
                      ? "Đang xử lý…"
                      : `Ctrl/⌘ V · ${draft.images.length}/${maxImages} ảnh · 5 MB/ảnh`}
                  </FieldDescription>
                  <ImageGallery
                    images={draft.images}
                    title={draft.title || "ghi chú"}
                    disabled={uploading || saving}
                    onRemove={(index) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              images: current.images.filter(
                                (_, position) => position !== index
                              ),
                            }
                          : null
                      )
                    }
                  />
                </Field>
                {error && (
                  <Alert variant="destructive" role="alert">
                    <AlertTitle>Chưa lưu được</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </FieldGroup>
            </fieldset>
          </form>
        )}
        <SheetFooter className="flex-row items-center gap-2 border-t px-6 py-4">
          {draft && editing && (
            <Button
              variant="destructive"
              size="icon"
              aria-label="Xóa ghi chú"
              title="Xóa ghi chú"
              onClick={() => onRemove(draft)}
              disabled={uploading || saving}
            >
              <Trash2 />
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setDraft(null)}
              disabled={uploading || saving}
            >
              Hủy
            </Button>
            <Button
              form="note-form"
              type="submit"
              disabled={uploading || saving}
            >
              {saving ? "Đang lưu…" : "Lưu"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
