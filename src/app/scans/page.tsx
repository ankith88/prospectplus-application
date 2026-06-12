"use client";

import { ScansClient } from "@/components/scans/scans-client"
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';

export default function ScansPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  const hasAccess = userProfile?.activeRole && ['admin', 'superadmin', 'Customer Success', 'Account Managers', 'Account Manager', 'Sales Manager'].includes(userProfile.activeRole);

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

  return <ScansClient />
}
