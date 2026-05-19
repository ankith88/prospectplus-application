"use client";

import { SuppressionList } from '@/components/marketing/suppression-list';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';

export default function LeadsSuppressionsPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  const isAllowed = userProfile?.role === 'admin' || userProfile?.role === 'Marketing Admin' || user?.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';

  useEffect(() => {
    if (!loading && !isAllowed) {
      router.replace('/leads');
    }
  }, [user, userProfile, loading, isAllowed, router]);

  if (loading || !isAllowed) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Suppression & Opt-Outs</h1>
        <p className="text-muted-foreground">Directory of opted-out emails, search/filters, and manual suppression options.</p>
      </header>
      <SuppressionList />
    </div>
  );
}
