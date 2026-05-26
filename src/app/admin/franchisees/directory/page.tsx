'use client';

import FranchiseeDirectoryClient from '@/components/admin/franchisee-directory-client';

export default function FranchiseeDirectoryPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Franchisee Directory</h2>
      </div>
      <FranchiseeDirectoryClient />
    </div>
  );
}
