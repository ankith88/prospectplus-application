
"use client";

import LeadsMapClient from '@/components/leads-map-client';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';

export default function LeadsMapPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!userProfile?.role || !['admin', 'lead gen'].includes(userProfile.role))) {
      router.replace('/leads');
    }
  }, [userProfile, loading, router]);

  if (loading || !userProfile?.role || !['admin', 'lead gen'].includes(userProfile.role)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Leads Map</h1>
        <p className="text-muted-foreground">Visualize your leads on the map.</p>
      </header>
      <LeadsMapClient />
    </div>
  );
}
