"use client"

import { Pencil, Copy, Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { NoteContent } from "@/components/note-content"
import { NoteTags } from "@/components/note-tags"
import { ImageGallery } from "@/components/image-gallery"
import type { Note } from "@/lib/notes"
import type { copyNote } from "@/lib/clipboard"

type CopyMode = Parameters<typeof copyNote>[1]

export function NoteCard({
  note,
  busy,
  copied,
  readOnly,
  onEdit,
  onCopy,
  onView,
  onTagSelect,
}: {
  note: Note
  busy: string | null
  copied: string | null
  readOnly: boolean
  onEdit: (note: Note) => void
  onCopy: (note: Note, mode: CopyMode) => void
  onView: (note: Note) => void
  onTagSelect: (tag: string) => void
}) {
  const isLong = note.text.length > 190 || note.text.split("\n").length > 4
  const mode: CopyMode = note.images.length ? "both" : "text"
  const hasContent = Boolean(note.text || note.images.length)
  const isCopied = copied === `${note.id}:${mode}`
  const date = new Date(note.updated)
  const preview = note.text.replace(/\n\s*\n/g, "\n")

  return (
    <article className="note-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 pt-2">
          <h2 className="text-base font-semibold tracking-tight break-words">
            {note.title}
          </h2>
          {note.sample && <Badge variant="outline">Mẫu</Badge>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Sửa ${note.title}`}
          title="Chỉnh sửa"
          onClick={() => onEdit(note)}
          disabled={readOnly}
        >
          <Pencil />
        </Button>
      </div>
      <div className="mt-3 flex min-w-0 flex-1 items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {note.text && (
            <p
              id={`content-${note.id}`}
              className={cn("note-preview", isLong && "line-clamp-4")}
            >
              <NoteContent text={preview} />
            </p>
          )}
          {isLong && (
            <Button
              variant="link"
              size="sm"
              className="self-start px-0"
              aria-haspopup="dialog"
              aria-label={`Xem thêm ${note.title}`}
              onClick={() => onView(note)}
            >
              Xem thêm
            </Button>
          )}
        </div>
      </div>
      <ImageGallery images={note.images} title={note.title} compact />
      {note.tags.length > 0 && (
        <div className="mt-4">
          <NoteTags tags={note.tags} onSelect={onTagSelect} />
        </div>
      )}
      <div className="note-card-footer">
        <time
          dateTime={note.updated}
          className="text-xs text-muted-foreground"
          title={
            Number.isNaN(date.getTime())
              ? undefined
              : date.toLocaleString("vi-VN")
          }
        >
          {!Number.isNaN(date.getTime()) &&
            date.toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
            })}
        </time>
        {hasContent && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              disabled={busy !== null}
              onClick={() => onCopy(note, mode)}
              title={mode === "both" ? "Sao chép nội dung kèm ảnh" : undefined}
            >
              {isCopied ? (
                <Check data-icon="inline-start" />
              ) : (
                <Copy data-icon="inline-start" />
              )}
              {isCopied ? "Đã chép" : "Sao chép"}
            </Button>
            {note.images.length > 0 && note.text && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Tùy chọn sao chép ${note.title}`}
                      title="Tùy chọn sao chép"
                    />
                  }
                >
                  <ChevronDown />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    {note.text && (
                      <DropdownMenuItem
                        disabled={busy !== null}
                        onClick={() => onCopy(note, "text")}
                      >
                        <Copy />
                        Chép nội dung
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
