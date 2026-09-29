import type { Paginated } from "@/lib/types"

export class ApiError extends Error {
  status: number
  details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cleanPath = path.replace(/^\//, "")
  const response = await fetch(`/api/backend/${cleanPath}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  })

  const contentType = response.headers.get("content-type") ?? ""
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "detail" in payload
        ? String(payload.detail)
        : `Request failed (${response.status})`
    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}

export function unpackResults<T>(value: Paginated<T> | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : value.results
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.details && typeof error.details === "object") {
    const entries = Object.entries(error.details as Record<string, unknown>)
    if (entries.length) {
      const [field, value] = entries[0]
      const detail = Array.isArray(value) ? value.join(" ") : String(value)
      return field === "detail" ? detail : `${field.replaceAll("_", " ")}: ${detail}`
    }
  }
  return error instanceof Error ? error.message : "Something went wrong"
}

