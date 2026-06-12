import { Metadata } from "next"
import { UnassignedLeadsClient } from "./unassigned-leads-client"

export const metadata: Metadata = {
  title: "Unassigned Leads - ProspectPlus",
  description: "Manage and assign leads with no bucket assigned.",
}

export default function UnassignedLeadsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Unassigned Leads</h2>
      </div>
      <UnassignedLeadsClient />
    </div>
  )
}
