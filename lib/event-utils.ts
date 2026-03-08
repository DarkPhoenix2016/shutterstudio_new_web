/**
 * Returns a Tailwind class string for a given event status string.
 * Single source of truth — import from here instead of duplicating per page.
 */
export function getStatusColor(status: string): string {
  switch ((status ?? "").toLowerCase()) {
    case "quotation":       return "bg-blue-100 text-blue-700 border-blue-200"
    case "scheduled":       return "bg-purple-100 text-purple-700 border-purple-200"
    case "in progress":     return "bg-indigo-100 text-indigo-700 border-indigo-200"
    case "post production": return "bg-orange-100 text-orange-700 border-orange-200"
    case "review":          return "bg-amber-100 text-amber-700 border-amber-200"
    case "completed":       return "bg-green-100 text-green-700 border-green-200"
    case "handed over":     return "bg-teal-100 text-teal-700 border-teal-200"
    case "cancelled":       return "bg-red-100 text-red-700 border-red-200"
    default:                return "bg-slate-100 text-slate-700 border-slate-200"
  }
}
