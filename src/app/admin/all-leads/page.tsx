import { Metadata } from "next"
import { MasterAllLeadsClient } from "./master-all-leads-client"

export const metadata: Metadata = {
  title: "Master Leads Directory - ProspectPlus",
  description: "View, filter, bucket push, and export all lead records across the application.",
}

export default function MasterAllLeadsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Master Leads Directory</h2>
          <p className="text-sm text-muted-foreground">
            View all leads irrespective of bucket, push leads across buckets, filter by key properties, and export with tracking.
          </p>
        </div>
      </div>
      <MasterAllLeadsClient />
    </div>
  )
}
