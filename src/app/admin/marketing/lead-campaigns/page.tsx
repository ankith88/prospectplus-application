'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';
import { LeadCampaignsClient } from '@/components/marketing/lead-campaigns-client';

export default function LeadCampaignsPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  const isAllowed = (userProfile?.activeRole && ['admin', 'Marketing Admin', 'Marketing Manager', 'Dashback', 'super user'].includes(userProfile.activeRole)) || user?.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';

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

  return <LeadCampaignsClient />;
}
