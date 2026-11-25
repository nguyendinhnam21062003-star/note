"use client"
import { useState } from "react"
import Image from "next/image"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import { copyImage } from "@/lib/clipboard"

export function ImageGallery({
  images,
  title,
  compact = false,
  onRemove,
  disabled = false,
}: {
  images: string[]
  title: string
  compact?: boolean
  onRemove?: (index: number) => void
  disabled?: boolean
}) {
  const [index, setIndex] = useState<number | null>(null)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const active = index !== null ? images[index] : undefined
  const shown = compact ? images.slice(0, 4) : images
  async function copy() {
    if (!active || index === null || copying) return
    setCopying(true)
    try {
      await copyImage(active)
      setCopied(index)
    } catch (error) {
      toast.add({
        title: "Chưa chép được ảnh",
        description: error instanceof Error ? error.message : "Hãy thử lại.",
        type: "error",
      })
    } finally {
      setCopying(false)
    }
  }
  if (!images.length) return null
  return (
    <>
      <div
        className={
          compact ? "image-gallery image-gallery-compact" : "image-gallery"
        }
        aria-label="Ảnh đính kèm"
      >
        {shown.map((source, position) => (
          <div key={`${source}-${position}`} className="relative min-w-0">
            <Button
              type="button"
              variant="outline"
              className="gallery-thumbnail"
              aria-label={`Xem ảnh ${position + 1} của ${title}`}
              onClick={() => {
                setIndex(position)
                setCopied(null)
              }}
            >
              <Image
                unoptimized
                fill
                sizes="160px"
                src={source}
                alt={`Ảnh ${position + 1}: ${title}`}
                className="object-cover"
              />
              {compact && position === 3 && images.length > 4 && (
                <span className="gallery-more">+{images.length - 4}</span>
              )}
            </Button>
            {onRemove && (
              <Button
                type="button"
                size="icon-xs"
                variant="secondary"
                className="absolute top-1 right-1"
                disabled={disabled}
                aria-label={`Gỡ ảnh ${position + 1}`}
                onClick={() => onRemove(position)}
              >
                <X />
              </Button>
            )}
          </div>
        ))}
      </div>
      <Dialog
        open={Boolean(active)}
        onOpenChange={(open) => {
          if (!open) setIndex(null)
        }}
      >
        <DialogContent
          className="image-viewer"
          showCloseButton={false}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" && index !== null) {
              event.preventDefault()
              setIndex((index + images.length - 1) % images.length)
            }
            if (event.key === "ArrowRight" && index !== null) {
              event.preventDefault()
              setIndex((index + 1) % images.length)
            }
          }}
        >
          <DialogTitle className="sr-only">
            Ảnh {index === null ? "" : index + 1} của {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Dùng phím mũi tên để chuyển ảnh, Escape để đóng.
          </DialogDescription>
          <div className="image-viewer-toolbar">
            <span className="text-sm text-muted-foreground">
              {index === null ? "" : index + 1} / {images.length}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                onClick={copy}
                aria-disabled={copying}
                aria-busy={copying}
              >
                {copied === index ? (
                  <Check data-icon="inline-start" />
                ) : (
                  <Copy data-icon="inline-start" />
                )}
                {copied === index ? "Đã chép" : "Sao chép ảnh"}
              </Button>
              {active && (
                <Button
                  variant="ghost"
                  size="icon"
                  render={
                    <a
                      href={active}
                      download={`${title || "note"}-${(index ?? 0) + 1}.png`}
                    />
                  }
                  nativeButton={false}
                  aria-label="Tải ảnh"
                >
                  <Download />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Đóng ảnh"
                onClick={() => setIndex(null)}
              >
                <X />
              </Button>
            </div>
          </div>
          <div className="image-viewer-stage">
            {active && (
              <Image
                unoptimized
                fill
                sizes="95vw"
                src={active}
                alt={`Ảnh ${(index ?? 0) + 1}: ${title}`}
                className="object-contain"
              />
            )}
            {images.length > 1 && (
              <Button
                variant="secondary"
                size="icon"
                className="image-previous"
                aria-label="Ảnh trước"
                onClick={() =>
                  setIndex(((index ?? 0) + images.length - 1) % images.length)
                }
              >
                <ChevronLeft />
              </Button>
            )}
            {images.length > 1 && (
              <Button
                variant="secondary"
                size="icon"
                className="image-next"
                aria-label="Ảnh sau"
                onClick={() => setIndex(((index ?? 0) + 1) % images.length)}
              >
                <ChevronRight />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
