import { Badge } from "@/components/ui/badge"
import type { AppointmentStatus } from "@/lib/types"

interface AppointmentStatusBadgeProps {
  status?: AppointmentStatus | 'Pending'
}

export function AppointmentStatusBadge({ status = 'Pending' }: AppointmentStatusBadgeProps) {
  const colorClass = {
    'Completed': "bg-green-100 text-green-800 border-green-200",
    'Cancelled': "bg-red-100 text-red-800 border-red-200",
    'No Show': "bg-yellow-100 text-yellow-800 border-yellow-200",
    'Rescheduled': "bg-purple-100 text-purple-800 border-purple-200",
    'Pending': "bg-gray-100 text-gray-800 border-gray-200",
  }[status];

  return (
    <Badge variant="outline" className={`capitalize ${colorClass}`}>
      {status}
    </Badge>
  )
}
