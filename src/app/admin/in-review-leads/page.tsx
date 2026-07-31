import { Metadata } from "next"
import { InReviewLeadsClient } from "@/app/admin/in-review-leads/in-review-leads-client"

export const metadata: Metadata = {
  title: "In Review Leads - ProspectPlus",
  description: "View, filter, and reassign leads under review across target buckets.",
}

export default function InReviewLeadsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">In Review Leads</h2>
          <p className="text-sm text-muted-foreground">
            Leads currently under review. Filter by key properties and push selected leads to target buckets with multi-user random equal assignment.
          </p>
        </div>
      </div>
      <InReviewLeadsClient />
    </div>
  )
}
