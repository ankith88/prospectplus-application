import { Badge } from "@/components/ui/badge"
import type { LeadStatus } from "@/lib/types"

interface LeadStatusBadgeProps {
  status: LeadStatus
}

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  const colorClass = {
    New: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800",
    Contacted: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800",
    Qualified: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800",
    'Pre Qualified': "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-800",
    Unqualified: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-800",
    Won: "bg-primary text-primary-foreground",
    Lost: "bg-destructive text-destructive-foreground",
    'LPO Review': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800',
    'In Progress': 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800',
    'Connected': 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800',
    'High Touch': 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/50 dark:text-pink-300 dark:border-pink-800',
    'Trialing ShipMate': 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/50 dark:text-pink-300 dark:border-pink-800',
    'Free Trial': 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/50 dark:text-pink-300 dark:border-pink-800',
    'Reschedule': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800',
    'LocalMile Pending': 'bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-900/50 dark:text-lime-300 dark:border-lime-800',
    'Priority Lead': 'bg-red-500 text-white border-red-600 dark:bg-red-700 dark:text-white dark:border-red-800 animate-pulse',
    'Priority Field Lead': 'bg-red-500 text-white border-red-600 dark:bg-red-700 dark:text-white dark:border-red-800 animate-pulse',
  }[status] || "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-800";


  return (
    <Badge variant="outline" className={`capitalize ${colorClass}`}>
      {status}
    </Badge>
  )
}
