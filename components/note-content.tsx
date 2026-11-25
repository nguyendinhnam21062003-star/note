import { Fragment } from "react"
import { validUrl } from "@/lib/notes"

// React escapes all content; only explicit HTTP(S) URLs become links.
export function NoteContent({ text }: { text: string }) {
  return text.split(/(https?:\/\/[^\s<>"']+)/gi).map((part, index) => {
    const url = part
      .replace(/[.,;!?\u3002]+$/, "")
      .replace(/\)+$/, (suffix) => {
        const opening = (part.match(/\(/g) ?? []).length
        const closing = (part.match(/\)/g) ?? []).length
        return suffix.slice(
          0,
          Math.max(0, suffix.length - Math.max(0, closing - opening))
        )
      })
    return /^https?:\/\//i.test(part) && validUrl(url) ? (
      <Fragment key={index}>
        <a
          className="note-url"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Mở trong tab mới"
        >
          {url}
        </a>
        {part.slice(url.length)}
      </Fragment>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    )
  })
}
