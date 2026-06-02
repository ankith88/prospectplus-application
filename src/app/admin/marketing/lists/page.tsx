import { Metadata } from 'next'
import MarketingListsClient from '@/components/marketing/marketing-lists-client'

export const metadata: Metadata = {
  title: 'Marketing Lists | ProspectPlus',
  description: 'View and manage marketing lists.',
}

export default function MarketingListsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Marketing Lists</h2>
      </div>
      <MarketingListsClient />
    </div>
  )
}
