'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { ImportLeadsClient } from '@/components/marketing/import-leads-client';

import { usePermissions } from '@/hooks/use-permissions';

export default function ImportLeadsPage() {
  const { userProfile, loading, isSuperAdmin } = useAuth();
  const { canView, loadingPermissions } = usePermissions();
  const router = useRouter();

  const isAllowed = isSuperAdmin || canView('importLeads') || (userProfile?.activeRole && ['admin', 'Marketing Admin', 'Marketing Manager', 'Outbound Admin'].includes(userProfile.activeRole));

  useEffect(() => {
    if (!loading && !loadingPermissions && !isAllowed) {
      router.replace('/leads');
    }
  }, [userProfile, loading, loadingPermissions, router, isAllowed]);

  if (loading || loadingPermissions || !isAllowed) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  return <ImportLeadsClient />;
}
