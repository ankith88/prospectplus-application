
"use client";

import ReportsClientPage from '@/components/reports-client';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { Loader } from '@/components/ui/loader';
import { AccessDenied } from '@/components/access-denied';

export default function ReportsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { canView, loadingPermissions } = usePermissions();

  const loading = authLoading || loadingPermissions;
  const hasAccess = canView('reporting');

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
    <ReportsClientPage />
  );
}
