"use client";

import LeadsClientPage from '@/components/leads-client';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FullScreenLoader } from '@/components/ui/loader';

export default function LeadsPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && userProfile?.activeRole === 'Franchisee') {
      router.replace('/franchisee-leads');
    }
  }, [loading, userProfile, router]);

  if (loading) return <FullScreenLoader message="Loading..." />;
  if (userProfile?.activeRole === 'Franchisee') return <FullScreenLoader message="Redirecting to Franchisee Leads..." />;

  return (
    <LeadsClientPage title="Outbound Leads" initialBucket="outbound" />
  );
}
