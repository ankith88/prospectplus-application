"use client";

import MyInboundCallsClient from '@/components/my-inbound-calls-client';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { AccessDenied } from '@/components/access-denied';

export default function MyInboundCallsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!user && !userProfile) {
    return <AccessDenied />;
  }

  const isFranchisee = userProfile?.activeRole === 'Franchisee' || userProfile?.role === 'Franchisee';
  const hasLinkedAircall = Boolean(
    (userProfile?.aircallPhoneNumber && userProfile.aircallPhoneNumber.trim().length > 0) ||
    (userProfile?.dialpadPhoneNumber && userProfile.dialpadPhoneNumber.trim().length > 0) ||
    userProfile?.aircallUserId ||
    userProfile?.dialpadUserId
  );

  if (isFranchisee || !hasLinkedAircall) {
    return <AccessDenied />;
  }

  return <MyInboundCallsClient />;
}
