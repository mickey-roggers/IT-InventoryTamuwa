import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import {
  ACCESS_COOKIE,
  authCookieOptions,
  djangoRequest,
  REFRESH_COOKIE,
} from "@/lib/server-api"

type Context = { params: Promise<{ path: string[] }> }

async function handler(request: NextRequest, context: Context) {
  const { path } = await context.params
  const cookieStore = await cookies()
  let access = cookieStore.get(ACCESS_COOKIE)?.value
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value
  const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await request.arrayBuffer()

  const forward = (token: string) => {
    const headers = new Headers()
    headers.set("Authorization", `Bearer ${token}`)
    const contentType = request.headers.get("content-type")
    if (contentType) headers.set("Content-Type", contentType)
    return djangoRequest(`/api/${path.join("/")}/${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body,
    })
  }

  let upstream = access ? await forward(access) : null
  let rotatedRefresh: string | undefined

  if ((!upstream || upstream.status === 401) && refresh) {
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
      upstream = await forward(newAccess)
    }
  }

  if (!upstream || !access) {
    return NextResponse.json({ detail: "Unauthenticated" }, { status: 401 })
  }

  const responseBody = await upstream.arrayBuffer()
  const result = new NextResponse(responseBody, { status: upstream.status })
  const contentType = upstream.headers.get("content-type")
  const disposition = upstream.headers.get("content-disposition")
  if (contentType) result.headers.set("Content-Type", contentType)
  if (disposition) result.headers.set("Content-Disposition", disposition)
  result.cookies.set(ACCESS_COOKIE, access, { ...authCookieOptions, maxAge: 30 * 60 })
  if (rotatedRefresh) {
    result.cookies.set(REFRESH_COOKIE, rotatedRefresh, {
      ...authCookieOptions,
      maxAge: 7 * 24 * 60 * 60,
    })
  }
  return result
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler

