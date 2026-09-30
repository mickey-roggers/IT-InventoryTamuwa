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

export function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

