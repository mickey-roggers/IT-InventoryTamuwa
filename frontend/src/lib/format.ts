export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}) }).format(date)
}

export function formatCurrency(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—"
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value))
}

