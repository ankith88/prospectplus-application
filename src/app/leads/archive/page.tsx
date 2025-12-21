
"use client";

import ArchivedLeadsClientPage from '@/components/archived-leads-client';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';


export default function ArchivedLeadsPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  const hasAccess = !userProfile?.role?.includes('Lead Gen');

  useEffect(() => {
    if (!loading && !hasAccess) {
      router.replace('/leads');
    }
  }, [userProfile, loading, router, hasAccess]);

  if (loading || !hasAccess) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <ArchivedLeadsClientPage />
  );
}
