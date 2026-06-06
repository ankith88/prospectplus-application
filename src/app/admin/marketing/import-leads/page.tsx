'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { ImportLeadsClient } from '@/components/marketing/import-leads-client';

export default function ImportLeadsPage() {
  const { userProfile, loading, isSuperAdmin } = useAuth();
  const router = useRouter();

  const isAllowed = isSuperAdmin || (userProfile?.activeRole && ['admin', 'Marketing Admin', 'Marketing Manager'].includes(userProfile.activeRole));

  useEffect(() => {
    if (!loading && !isAllowed) {
      router.replace('/leads');
    }
  }, [userProfile, loading, router, isAllowed]);

  if (loading || !isAllowed) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  return <ImportLeadsClient />;
}
