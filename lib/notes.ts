const legacyTypes = ["Ngân hàng", "Prompt AI", "Ghi chú", "Liên kết"]
export type Note = {
  id: string
  title: string
  text: string
  tags: string[]
  images: string[]
  version?: number
  updated: string
  sample?: boolean
}
export const storageKey = "ethans-note:v1"
export const maxImages = 12
export function validImageSource(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(value) ||
      /^\/api\/images\/[a-f0-9-]{36}$/.test(value))
  )
}
export const initialNotes: Note[] = [
  {
    id: "bank",
    title: "Thông tin chuyển khoản",
    text: "Chào bạn, mình gửi thông tin thanh toán nhé.\n\nNgân hàng: [Tên ngân hàng]\nChủ tài khoản: [Tên của bạn]\nSố tài khoản: [Số tài khoản]\nNội dung: [Tên khách hàng] thanh toán\n\nChuyển khoản xong, bạn gửi mình ảnh xác nhận nhé. Cảm ơn bạn!",
    tags: ["Cá nhân", "Ngân hàng"],
    images: [],
    updated: "2026-11-17T00:00:00.000Z",
    sample: true,
  },
  {
    id: "customers",
    title: "Danh sách khách hàng",
    text: "https://khachhang.com",
    tags: ["Công việc"],
    images: [],
    updated: "2026-11-16T00:00:00.000Z",
    sample: true,
  },
  {
    id: "prompt",
    title: "Viết nội dung landing page",
    text: "Bạn là copywriter chuyên nghiệp. Hãy viết nội dung landing page cho [sản phẩm/dịch vụ], hướng đến [đối tượng khách hàng].\n\nGiọng văn: [phong cách].\nBao gồm: tiêu đề, lợi ích chính, bằng chứng xã hội và lời kêu gọi hành động.",
    tags: ["Công việc", "Viết lách", "Prompt AI"],
    images: [],
    updated: "2026-11-15T00:00:00.000Z",
    sample: true,
  },
  {
    id: "contact",
    title: "Liên hệ đối tác thiết kế",
    text: "Minh Anh — thiết kế thương hiệu\nTrao đổi về bộ nhận diện cho dự án mới.\n\nhttps://example.com/contact",
    tags: ["Công việc"],
    images: [],
    updated: "2026-11-12T00:00:00.000Z",
    sample: true,
  },
]
export function tagKey(tag: string) {
  return tag.normalize("NFC").toLocaleLowerCase("vi")
}

export function cleanTags(tags: string[]) {
  const seen = new Set<string>()
  return tags
    .map((tag) => tag.trim().replace(/^#+/, "").replace(/\s+/g, " ").trim())
    .filter((tag) => {
      const key = tagKey(tag)
      if (!tag || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

// Decode both current notes and the previous URL/category format without writing
// to storage. Existing data is only replaced after a successful user change.
export function readNotes(value: unknown): Note[] {
  if (!Array.isArray(value)) throw new Error("Dữ liệu ghi chú không hợp lệ")
  return value.map((entry) => {
    if (!entry || typeof entry !== "object")
      throw new Error("Ghi chú không hợp lệ")
    const n = entry as Record<string, unknown>
    if (
      typeof n.id !== "string" ||
      typeof n.title !== "string" ||
      typeof n.text !== "string" ||
      typeof n.updated !== "string" ||
      (n.type !== undefined &&
        (typeof n.type !== "string" || !legacyTypes.includes(n.type))) ||
      (n.tags !== undefined &&
        (!Array.isArray(n.tags) ||
          !n.tags.every((tag) => typeof tag === "string"))) ||
      (n.url !== undefined &&
        (typeof n.url !== "string" || (n.url !== "" && !validUrl(n.url)))) ||
      (n.image !== undefined && !validImageSource(n.image)) ||
      (n.images !== undefined &&
        (!Array.isArray(n.images) || !n.images.every(validImageSource))) ||
      (n.version !== undefined &&
        (typeof n.version !== "number" ||
          !Number.isSafeInteger(n.version) ||
          n.version < 1))
    )
      throw new Error("Ghi chú không hợp lệ")

    const url = typeof n.url === "string" ? n.url : ""
    return {
      id: n.id,
      title: n.title,
      text:
        url && !n.text.split(/\s+/).includes(url)
          ? [n.text, url].filter(Boolean).join("\n\n")
          : n.text,
      tags: cleanTags([
        ...((n.tags as string[] | undefined) ?? []),
        ...(typeof n.type === "string" ? [n.type] : []),
      ]),
      updated: n.updated,
      images: [
        ...new Set([
          ...((n.images as string[] | undefined) ?? []),
          ...(typeof n.image === "string" ? [n.image] : []),
        ]),
      ],
      ...(typeof n.version === "number" ? { version: n.version } : {}),
      ...(typeof n.sample === "boolean" ? { sample: n.sample } : {}),
    }
  })
}
export function validUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol)
  } catch {
    return false
  }
}
export function noteText(note: Note) {
  return note.text
}
export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
}
