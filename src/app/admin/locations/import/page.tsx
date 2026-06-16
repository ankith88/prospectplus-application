'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { ImportLocationsClient } from '@/components/admin/import-locations-client';

export default function ImportLocationsPage() {
  const { userProfile, loading, isSuperAdmin } = useAuth();
  const router = useRouter();

  // Based on user request, this is only visible to admins/super admins
  const isAllowed = isSuperAdmin || (userProfile?.activeRole === 'admin');

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

  return <ImportLocationsClient />;
}
