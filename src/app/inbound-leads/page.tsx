"use client";

import LeadsClientPage from '@/components/leads-client';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FullScreenLoader } from '@/components/ui/loader';

export default function InboundLeadsPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const { canView, loadingPermissions } = usePermissions();

  useEffect(() => {
    if (!loading && userProfile?.activeRole === 'Franchisee') {
      router.replace('/franchisee-leads');
    }
  }, [loading, userProfile, router]);

  if (loading || loadingPermissions) return <FullScreenLoader message="Loading..." />;
  if (userProfile?.activeRole === 'Franchisee') return <FullScreenLoader message="Redirecting to Franchisee Leads..." />;

  if (!canView('inboundLeads')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view the Inbound Leads page.</p>
      </div>
    );
  }

  return (
    <LeadsClientPage title="Inbound Leads" initialBucket="inbound" />
  );
}
