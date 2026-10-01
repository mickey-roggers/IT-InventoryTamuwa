"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Boxes, CheckCircle2, Loader2, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")
    const form = new FormData(event.currentTarget)
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setError(body.detail || "The username or password is incorrect.")
      setLoading(false)
      return
    }
    const session = await fetch("/api/auth/session", { cache: "no-store" }).then((value) => value.json()).catch(() => null)
    router.replace(session?.profile?.must_change_password ? "/profile" : "/dashboard")
    router.refresh()
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 size-[30rem] rounded-full border border-white/10 bg-sidebar-primary/10" />
        <div className="absolute -bottom-48 -left-32 size-[34rem] rounded-full border border-white/10" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><ShieldCheck className="size-6" /></span>
          <div><p className="font-semibold text-white">Tamuwa ICT</p><p className="text-xs text-sidebar-foreground/55">Asset operations</p></div>
        </div>
        <div className="relative max-w-xl">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-sidebar-primary">Inventory intelligence</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight text-white">Every asset.<br />Clearly accounted for.</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-sidebar-foreground/65">Track equipment, maintenance, issues, and procurement from one focused workspace.</p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-sidebar-primary" /> Live asset status</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-sidebar-primary" /> Complete audit trail</div>
          </div>
        </div>
        <p className="relative text-xs text-sidebar-foreground/40">Internal system · Authorized access only</p>
      </section>
      <section className="flex items-center justify-center p-5 sm:p-10">
        <Card className="w-full max-w-md border-border/70 shadow-xl shadow-slate-900/5">
          <CardHeader className="space-y-4 pb-2">
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary lg:hidden"><Boxes /></span>
            <div><CardTitle className="text-2xl tracking-tight">Welcome back</CardTitle><CardDescription className="mt-2">Sign in with your inventory account.</CardDescription></div>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="mt-4 space-y-5">
              <div className="space-y-2"><Label htmlFor="username">Username</Label><Input id="username" name="username" autoComplete="username" required autoFocus placeholder="Enter your username" /></div>
              <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Enter your password" /></div>
              {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              <Button className="h-10 w-full" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <>Sign in <ArrowRight /></>}</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

