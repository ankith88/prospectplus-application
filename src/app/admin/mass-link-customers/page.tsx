import { Metadata } from 'next'
import { MassLinkCustomersClient } from './mass-link-customers-client'

export const metadata: Metadata = {
  title: 'Mass Link Customers - ProspectPlus',
  description: 'Mass link child customer accounts to a parent customer account.',
}

export default function MassLinkCustomersPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Mass Link Customers</h2>
          <p className="text-sm text-muted-foreground">
            Search, select, and mass link multiple child customer accounts under a primary Parent Customer.
          </p>
        </div>
      </div>
      <MassLinkCustomersClient />
    </div>
  )
}
