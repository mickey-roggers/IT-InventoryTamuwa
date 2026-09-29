"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="grid min-h-[60vh] place-items-center text-center"><div><AlertTriangle className="mx-auto size-10 text-destructive" /><h1 className="mt-4 text-xl font-semibold">This page could not be loaded</h1><p className="mt-2 text-sm text-muted-foreground">Check that the Django API is running, then try again.</p><Button onClick={reset} className="mt-5">Try again</Button></div></div>
}

