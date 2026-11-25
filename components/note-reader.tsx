"use client"

import { Check, Copy, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { NoteContent } from "@/components/note-content"
import { NoteTags } from "@/components/note-tags"
import { ImageGallery } from "@/components/image-gallery"
import type { Note } from "@/lib/notes"
import type { copyNote } from "@/lib/clipboard"

export function NoteReader({
  note,
  busy,
  copied,
  onClose,
  onEdit,
  onCopy,
}: {
  note: Note | null
  busy: string | null
  copied: string | null
  onClose: () => void
  onEdit: (note: Note) => void
  onCopy: (note: Note, mode: Parameters<typeof copyNote>[1]) => void
}) {
  const mode = note?.images.length ? "both" : "text"
  const isCopied = copied === `${note?.id}:${mode}`
  return (
    <Sheet
      open={note !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent className="note-reader data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="gap-4 px-6 pt-8 pr-14 pb-4">
          <SheetTitle>{note?.title}</SheetTitle>
          <SheetDescription className="sr-only">
            Nội dung đầy đủ của ghi chú.
          </SheetDescription>
          {note && <NoteTags tags={note.tags} />}
        </SheetHeader>
        {note && (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8">
            {note.text && (
              <div className="note-full-content">
                <NoteContent text={note.text} />
              </div>
            )}
            <ImageGallery images={note.images} title={note.title} />
          </div>
        )}
        <SheetFooter className="flex-row justify-end gap-2 border-t px-6 py-4">
          {note && (
            <>
              <Button variant="outline" onClick={() => onEdit(note)}>
                <Pencil data-icon="inline-start" />
                Chỉnh sửa
              </Button>
              {(note.text || note.images.length > 0) && (
                <Button
                  disabled={busy !== null}
                  onClick={() => onCopy(note, mode)}
                >
                  {isCopied ? (
                    <Check data-icon="inline-start" />
                  ) : (
                    <Copy data-icon="inline-start" />
                  )}
                  {isCopied ? "Đã chép" : "Sao chép"}
                </Button>
              )}
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
