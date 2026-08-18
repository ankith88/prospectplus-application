
import { Badge } from "@/components/ui/badge"
import type { LeadStatus } from "@/lib/types"
import { StatusOutcomeInfo } from "@/components/status-outcome-info"

interface LeadStatusBadgeProps {
  status: LeadStatus;
  showInfoTooltip?: boolean;
}

export function LeadStatusBadge({ status, showInfoTooltip }: LeadStatusBadgeProps) {
  let displayStatus = status as string;
  if (typeof status === 'string') {
    const trimmed = status.trim();
    if (trimmed === 'SUSPECT-Unqualified' || trimmed === 'SUSPECT - Unqualified' || trimmed.toUpperCase() === 'SUSPECT-UNQUALIFIED' || trimmed.toUpperCase() === 'SUSPECT - UNQUALIFIED') {
      displayStatus = 'New';
    } else if (trimmed === 'Priority Lead' || trimmed === 'Priority Field Lead' || trimmed === 'Hot Lead') {
      displayStatus = 'Hot Leads';
    }
  }

  const colorClassMap: Record<string, string> = {
    // New (Blue)
    New: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800",

    // Priority / Hot (Crimson Red / Pulse)
    'Hot Leads': "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 animate-pulse font-semibold",
    'Hot Lead': "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 animate-pulse font-semibold",
    'Priority Lead': "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 animate-pulse font-semibold",
    'Priority Field Lead': "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 animate-pulse font-semibold",
    'High Touch': "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",

    // Positive / Trial / Quote (Cyan/Teal)
    'Trialing ShipMate': "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800",
    'Trialing LocalMile': "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800",
    'Free Trial': "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800",
    'Quote Sent': "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800",
    'Quote Accepted': "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/50 dark:text-teal-300 dark:border-teal-800 font-semibold",
    Qualified: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800",
    'Pre Qualified': "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800",
    'In Progress': "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800",
    Contacted: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800",
    Connected: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800",
    'Prospect Opportunity': "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800",
    'Customer Opportunity': "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800",
    'In Qualification': "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800",
    'LocalMile Pending': "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800",
    'LocalMile Opportunity': "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800",
    'LPO Opportunity': "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/50 dark:text-sky-300 dark:border-sky-800 font-semibold",

    // Very Positive Outcome (Emerald Green)
    Won: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800",
    Signed: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800",
    Customer: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800",

    // No Answer / Reschedule / Follow-up (Orange)
    'No Answer': "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800",
    'No Response': "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800",
    Reschedule: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800",
    'Future Follow-up': "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800",

    // Address Verification
    'Address Check': "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700 font-semibold",
    'Address Confirmed': "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700 font-semibold",

    // Negative / Dead / Trial Stopped (Red / Amber)
    'LocalMile Trial Stopped': "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700 font-medium",
    'ShipMate Trial Stopped': "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700 font-medium",
    Lost: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800",
    'Lost Customer': "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800",
    Unqualified: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800",
    'Email Brush Off': "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800",
    'LPO Review': "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800",
  };
  
  const colorClass = colorClassMap[displayStatus] || "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-800";

  return (
    <div className="inline-flex items-center gap-1.5">
      <Badge variant="outline" className={`capitalize ${colorClass}`}>
        {displayStatus === 'Won' ? 'Signed' : displayStatus}
      </Badge>
      {showInfoTooltip && <StatusOutcomeInfo status={displayStatus} />}
    </div>
  )
}

