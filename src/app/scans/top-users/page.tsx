"use client";

import { TopUsersClient } from "@/components/scans/top-users-client"
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';

export default function TopUsersPage() {
  const { userProfile, loading } = useAuth();
  const { canView } = usePermissions();
  const router = useRouter();

  const hasAccess = canView('topBarcodesUsers');

  useEffect(() => {
    if (!loading && !hasAccess) {
      router.replace('/leads');
    }
  }, [loading, router, hasAccess]);

  if (loading || !hasAccess) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  return <TopUsersClient />
}
