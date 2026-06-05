'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';
import { CampaignScheduler } from '@/components/marketing/campaign-scheduler';

export default function CampaignsPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  const isAllowed = (userProfile?.activeRole && ['admin', 'Marketing Admin', 'Marketing Manager', 'Dashback'].includes(userProfile.activeRole)) || user?.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';

  useEffect(() => {
    if (!loading && !isAllowed) {
      router.replace('/leads');
    }
  }, [loading, isAllowed, router]);

  if (loading || !isAllowed) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto min-h-screen">
      <div>
        <h1 className="text-3xl font-normal tracking-tight text-slate-800">
          Campaigns & Queues
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Design, schedule, segment, and dispatch outbound bulk marketing campaigns
        </p>
      </div>
      <div className="border rounded-xl bg-white p-6 shadow-sm">
        <CampaignScheduler />
      </div>
    </div>
  );
}
