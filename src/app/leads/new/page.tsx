
'use client';

import { NewLeadForm } from '@/components/new-lead-form';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';

export default function NewLeadPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  const hasAccess = userProfile?.role && ['admin', 'Field Sales', 'Lead Gen', 'Lead Gen Admin', 'Field Sales Admin'].includes(userProfile.role);

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
        <h1 className="text-3xl font-bold tracking-tight">Create New Lead</h1>
        <p className="text-muted-foreground">Enter the details for the new lead.</p>
      </header>
      <NewLeadForm />
    </div>
  );
}
