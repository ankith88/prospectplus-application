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
  const hasAccess = canView('reporting') && userProfile?.activeRole !== 'user' && userProfile?.activeRole !== 'Outbound Admin';

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

  return <SalesSnapshotClient />;
}
