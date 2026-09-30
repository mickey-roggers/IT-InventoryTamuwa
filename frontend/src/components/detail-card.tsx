import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DetailCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <Card className="border-border/70 shadow-sm"><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">{title}</CardTitle>{action}</CardHeader><CardContent>{children}</CardContent></Card>
}

export function DetailGrid({ items }: { items: Array<{ label: string; value: React.ReactNode }> }) {
  return <dl className="grid gap-5 sm:grid-cols-2">{items.map((item) => <div key={item.label}><dt className="text-xs text-muted-foreground">{item.label}</dt><dd className="mt-1 text-sm font-medium">{item.value || "—"}</dd></div>)}</dl>
}
