
'use client';

import { NewLeadForm } from '@/components/new-lead-form';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';
import { AccessDenied } from '@/components/access-denied';

export default function NewLeadPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  const { canView, loadingPermissions } = usePermissions();
  const hasAccess = canView('newLead');

  if (loading || loadingPermissions) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDenied />;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Create New Lead</h1>
        <p className="text-muted-foreground">Enter the details for the new lead.</p>
      </header>
      <NewLeadForm />
    </div>
  );
}
