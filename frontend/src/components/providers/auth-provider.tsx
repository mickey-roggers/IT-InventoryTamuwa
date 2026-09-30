"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import type { User } from "@/lib/types"

type AuthContextValue = {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function refreshUser() {
    const response = await fetch("/api/auth/session", { cache: "no-store" })
    if (!response.ok) throw new Error("Unauthenticated")
    setUser(await response.json() as User)
  }

  useEffect(() => {
    let active = true
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unauthenticated")
        return response.json() as Promise<User>
      })
      .then((value) => active && setUser(value))
      .catch(() => {
        if (active) router.replace("/login")
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [router])

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.replace("/login")
    router.refresh()
  }

  return <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used within AuthProvider")
  return value
}

