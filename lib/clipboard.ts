import { noteText, type Note } from "@/lib/notes"

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () =>
      reject(
        new Error("Không đọc được ảnh. Hãy mở khóa lại nếu phiên đã hết hạn.")
      )
    image.src = source
  })
}
function png(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Không tạo được ảnh.")),
      "image/png"
    )
  )
}
function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Không đọc được ảnh."))
    reader.readAsDataURL(blob)
  })
}
async function imageBlob(source: string) {
  const response = await fetch(source, {
    cache: "no-store",
    credentials: "same-origin",
  })
  if (!response.ok) throw new Error("Không tải được ảnh. Hãy thử mở khóa lại.")
  return response.blob()
}
export async function imageDataUrl(source: string) {
  return source.startsWith("data:") ? source : dataUrl(await imageBlob(source))
}
export async function readNoteImage(file: File) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Chọn ảnh PNG, JPG hoặc WebP.")
  if (file.size > 5 * 1024 * 1024) throw new Error("Mỗi ảnh cần nhỏ hơn 5 MB.")
  const source = URL.createObjectURL(file)
  try {
    const image = await loadImage(source)
    let scale = Math.min(1, 1600 / Math.max(image.width, image.height))
    const canvas = document.createElement("canvas")
    for (let attempt = 0; attempt < 8; attempt++) {
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      canvas
        .getContext("2d")!
        .drawImage(image, 0, 0, canvas.width, canvas.height)
      const blob = await png(canvas)
      if (blob.size <= 3 * 1024 * 1024) return dataUrl(blob)
      scale *= 0.8
    }
    throw new Error("Ảnh quá lớn để xử lý. Hãy thử ảnh nhỏ hơn.")
  } finally {
    URL.revokeObjectURL(source)
  }
}
export async function combinedImage(note: Note) {
  const images = await Promise.all(note.images.map(loadImage))
  const canvas = document.createElement("canvas")
  canvas.width = 1000
  const context = canvas.getContext("2d")!
  context.font = "26px Arial"
  const lines: string[] = []
  for (const paragraph of noteText(note).split("\n")) {
    let line = ""
    for (const character of paragraph) {
      if (context.measureText(line + character).width > 904) {
        lines.push(line)
        line = character
      } else line += character
    }
    lines.push(line)
  }
  const sizes = images.map((image) => {
    const scale = Math.min(1, 904 / image.width, 700 / image.height)
    return {
      width: Math.round(image.width * scale),
      height: Math.round(image.height * scale),
    }
  })
  canvas.height =
    96 +
    lines.length * 40 +
    sizes.reduce((sum, size) => sum + size.height + 32, 0)
  if (canvas.height > 16000)
    throw new Error(
      "Nội dung quá dài để ghép ảnh. Hãy chép nội dung và từng ảnh riêng."
    )
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = "#171717"
  context.font = "26px Arial"
  context.textBaseline = "top"
  lines.forEach((line, index) => context.fillText(line, 48, 48 + index * 40))
  let top = 96 + lines.length * 40
  images.forEach((image, index) => {
    context.drawImage(image, 48, top, sizes[index].width, sizes[index].height)
    top += sizes[index].height + 32
  })
  return png(canvas)
}
function requireImageClipboard() {
  if (!navigator.clipboard?.write || !window.ClipboardItem)
    throw new Error("Trình duyệt chưa hỗ trợ chép ảnh. Bạn có thể tải ảnh.")
}
export async function copyImage(source: string) {
  requireImageClipboard()
  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": imageBlob(source) }),
  ])
}
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  )
export async function copyNote(note: Note, mode: "text" | "both") {
  if (!navigator.clipboard)
    throw new Error("Sao chép cần HTTPS hoặc localhost.")
  if (mode === "text" || !note.images.length)
    return navigator.clipboard.writeText(noteText(note))
  requireImageClipboard()
  const html = Promise.all(note.images.map(imageDataUrl)).then(
    (sources) =>
      new Blob(
        [
          `<div>${escapeHtml(noteText(note)).replace(/\n/g, "<br>")}${sources.map((src) => `<br><img src="${src}" alt="Ảnh đính kèm">`).join("")}</div>`,
        ],
        { type: "text/html" }
      )
  )
  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": combinedImage(note),
      "text/plain": new Blob([noteText(note)], { type: "text/plain" }),
      "text/html": html,
    }),
  ])
}
