import { Badge } from "@/components/ui/badge"
import type { LeadStatus } from "@/lib/types"

interface LeadStatusBadgeProps {
  status: LeadStatus
}

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  const variant: "default" | "secondary" | "destructive" | "outline" = {
    New: "secondary",
    Contacted: "outline",
    Qualified: "default",
    Unqualified: "secondary",
    Won: "default",
    Lost: "destructive",
    'LPO Review': 'default',
  }[status]

  const colorClass = {
    New: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800",
    Contacted: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800",
    Qualified: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800",
    Unqualified: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-800",
    Won: "bg-primary text-primary-foreground",
    Lost: "bg-destructive text-destructive-foreground",
    'LPO Review': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800',
  }[status]

  return (
    <Badge variant="outline" className={`capitalize ${colorClass}`}>
      {status}
    </Badge>
  )
}
