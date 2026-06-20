
'use client';

import { NewLeadForm } from '@/components/new-lead-form';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';

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
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view the Create New Lead page.</p>
      </div>
    );
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
