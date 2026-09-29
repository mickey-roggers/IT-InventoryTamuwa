import "server-only"

export const DJANGO_API_URL = (
  process.env.DJANGO_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "")

export const ACCESS_COOKIE = "inventory_access"
export const REFRESH_COOKIE = "inventory_refresh"

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
}

export async function djangoRequest(path: string, init?: RequestInit) {
  return fetch(`${DJANGO_API_URL}${path}`, {
    ...init,
    cache: "no-store",
  })
}

