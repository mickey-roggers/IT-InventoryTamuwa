import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const tones: Record<string, string> = {
  available: "border-sky-200 bg-sky-50 text-sky-700",
  "in use": "border-emerald-200 bg-emerald-50 text-emerald-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  closed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  open: "border-amber-200 bg-amber-50 text-amber-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  "in progress": "border-blue-200 bg-blue-50 text-blue-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  urgent: "border-red-200 bg-red-50 text-red-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  missing: "border-red-200 bg-red-50 text-red-700",
  retired: "border-slate-200 bg-slate-100 text-slate-600",
  "under maintenance": "border-yellow-300 bg-yellow-50 text-yellow-800",
  incomplete: "border-yellow-300 bg-yellow-50 text-yellow-800",
}

export function StatusBadge({ value, className }: { value: string | null | undefined; className?: string }) {
  const label = value || "Not set"
  return <Badge variant="outline" className={cn("font-medium", tones[label.toLowerCase()], className)}>{label}</Badge>
}

