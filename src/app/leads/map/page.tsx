
"use client";

import LeadsMapClient from '@/components/leads-map-client';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';

export default function TerritoryMapPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  const hasAccess = userProfile?.role && ['admin', 'Field Sales', 'Field Sales Admin', 'Lead Gen Admin'].includes(userProfile.role);

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
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Territory Map</h1>
        <p className="text-muted-foreground">Visualize your leads and signed customers on the map.</p>
      </header>
      <LeadsMapClient />
    </div>
  );
}
