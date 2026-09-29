import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  ACCESS_COOKIE,
  authCookieOptions,
  djangoRequest,
  REFRESH_COOKIE,
} from "@/lib/server-api"

export async function GET() {
  const cookieStore = await cookies()
  let access = cookieStore.get(ACCESS_COOKIE)?.value
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value

  let response = access
    ? await djangoRequest("/api/auth/me/", {
        headers: { Authorization: `Bearer ${access}` },
      })
    : null

  let rotatedRefresh: string | undefined
  if ((!response || response.status === 401) && refresh) {
    const refreshed = await djangoRequest("/api/auth/refresh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
    if (refreshed.ok) {
      const tokens = (await refreshed.json()) as { access: string; refresh?: string }
      const newAccess = tokens.access
      access = newAccess
      rotatedRefresh = tokens.refresh
      response = await djangoRequest("/api/auth/me/", {
        headers: { Authorization: `Bearer ${newAccess}` },
      })
    }
  }

  if (!response?.ok || !access) {
    const result = NextResponse.json({ detail: "Unauthenticated" }, { status: 401 })
    result.cookies.set(ACCESS_COOKIE, "", { ...authCookieOptions, maxAge: 0 })
    result.cookies.set(REFRESH_COOKIE, "", { ...authCookieOptions, maxAge: 0 })
    return result
  }

  const result = NextResponse.json(await response.json())
  result.cookies.set(ACCESS_COOKIE, access, { ...authCookieOptions, maxAge: 30 * 60 })
  if (rotatedRefresh) {
    result.cookies.set(REFRESH_COOKIE, rotatedRefresh, {
      ...authCookieOptions,
      maxAge: 7 * 24 * 60 * 60,
    })
  }
  return result
}

