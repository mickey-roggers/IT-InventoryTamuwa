import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { AppShell } from "@/components/app-shell"
import { AuthProvider } from "@/components/providers/auth-provider"
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/server-api"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  if (!cookieStore.has(ACCESS_COOKIE) && !cookieStore.has(REFRESH_COOKIE)) redirect("/login")

  return <AuthProvider><AppShell>{children}</AppShell></AuthProvider>
}

