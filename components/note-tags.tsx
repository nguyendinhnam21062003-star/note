"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { cleanTags, tagKey } from "@/lib/notes"

export function NoteTags({
  tags,
  onSelect,
}: {
  tags: string[]
  onSelect?: (tag: string) => void
}) {
  if (!tags.length) return null
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Tag ghi chú">
      {tags.map((tag) => (
        <Badge
          key={tagKey(tag)}
          variant="secondary"
          className="max-w-full"
          render={
            onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(tag)}
                aria-label={`Lọc tag ${tag}`}
              />
            ) : undefined
          }
        >
          <span className="truncate">#{tag}</span>
        </Badge>
      ))}
    </div>
  )
}

export function TagInput({
  tags,
  suggestions,
  onChange,
}: {
  tags: string[]
  suggestions: string[]
  onChange: (tags: string[]) => void
}) {
  const [value, setValue] = useState("")
  const available = suggestions.filter(
    (tag) => !tags.some((current) => tagKey(current) === tagKey(tag))
  )
  function commit() {
    onChange(cleanTags([...tags, ...value.split(",")]))
    setValue("")
  }
  return (
    <Field>
      <FieldLabel htmlFor="note-tags">Tag</FieldLabel>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge
              key={tagKey(tag)}
              variant="secondary"
              className="h-auto max-w-full gap-1 py-0 pr-0 pl-2"
            >
              <span className="truncate">#{tag}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Gỡ tag ${tag}`}
                title="Gỡ tag"
                onClick={() =>
                  onChange(tags.filter((current) => current !== tag))
                }
              >
                <X />
              </Button>
            </Badge>
          ))}
        </div>
      )}
      <Input
        id="note-tags"
        value={value}
        maxLength={100}
        autoComplete="off"
        list="note-tag-suggestions"
        placeholder="Thêm tag, nhấn Enter…"
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault()
            commit()
          }
          if (event.key === "Backspace" && !value && tags.length)
            onChange(tags.slice(0, -1))
        }}
      />
      <datalist id="note-tag-suggestions">
        {available.map((tag) => (
          <option key={tagKey(tag)} value={tag} />
        ))}
      </datalist>
    </Field>
  )
}
