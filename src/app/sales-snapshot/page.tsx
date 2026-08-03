"use client";
import React, { useEffect } from 'react';
import SalesSnapshotClient from '@/components/sales-snapshot-client';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { Loader } from '@/components/ui/loader';
import { AccessDenied } from '@/components/access-denied';

export default function SalesSnapshotPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { canView, loadingPermissions } = usePermissions();

  const loading = authLoading || loadingPermissions;
  const isFranchisee = userProfile?.activeRole === 'Franchisee' || userProfile?.activeRole?.toLowerCase() === 'franchisee';
  const hasAccess = (canView('reporting') || isFranchisee) && userProfile?.activeRole !== 'user' && userProfile?.activeRole?.toLowerCase() !== 'user' && userProfile?.activeRole !== 'Outbound Admin';

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDenied />;
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden min-w-0">
      <SalesSnapshotClient />
    </div>
  );
}
