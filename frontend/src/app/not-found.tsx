import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center p-6 text-center"><div><p className="font-mono text-sm text-primary">404</p><h1 className="mt-2 text-3xl font-semibold">Page not found</h1><p className="mt-3 text-muted-foreground">The page you requested does not exist.</p><Button asChild className="mt-6"><Link href="/dashboard">Return to dashboard</Link></Button></div></main>
}

