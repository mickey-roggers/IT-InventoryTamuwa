import { NextResponse } from "next/server"

import {
  ACCESS_COOKIE,
  authCookieOptions,
  djangoRequest,
  REFRESH_COOKIE,
} from "@/lib/server-api"

export async function POST(request: Request) {
  const body = await request.text()
  const response = await djangoRequest("/api/auth/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })
  const data = await response.json().catch(() => ({ detail: "Unable to sign in" }))

  if (!response.ok) {
    return NextResponse.json(data, { status: response.status })
  }

  const result = NextResponse.json({ ok: true })
  result.cookies.set(ACCESS_COOKIE, data.access, {
    ...authCookieOptions,
    maxAge: 30 * 60,
  })
  result.cookies.set(REFRESH_COOKIE, data.refresh, {
    ...authCookieOptions,
    maxAge: 7 * 24 * 60 * 60,
  })
  return result
}

