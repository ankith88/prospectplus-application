"use client";

import LeadsClientPage from '@/components/leads-client';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FullScreenLoader } from '@/components/ui/loader';

export default function InboundLeadsPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  const allowedRoles = ['admin', 'Marketing Admin', 'Marketing Manager', 'Lead Gen Admin', 'Dashback'];

  useEffect(() => {
    const role = userProfile?.activeRole;
    if (!loading && role && !allowedRoles.includes(role)) {
      router.push('/leads');
    }
  }, [userProfile, loading, router]);

  if (loading) return <FullScreenLoader message="Loading..." />;
  
  const role = userProfile?.activeRole;
  if (!userProfile || !role || !allowedRoles.includes(role)) {
    return null;
  }

  return (
    <LeadsClientPage title="Inbound Leads" initialBucket="inbound" />
  );
}
