import { Metadata } from "next"
import OperatorsDirectoryClient from "@/components/admin/operators-directory-client"

export const metadata: Metadata = {
  title: "Operators Directory",
  description: "View and manage all franchisee operators.",
}

export default function OperatorsDirectoryPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Operators Directory</h2>
      </div>
      <OperatorsDirectoryClient />
    </div>
  )
}
