
"use client";

import ReportsClientPage from '@/components/reports-client';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';
import { AccessDenied } from '@/components/access-denied';

export default function ReportsPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  const hasAccess = userProfile?.activeRole && ['admin', 'user', 'Field Sales', 'Field Sales Admin', 'Franchisee', 'Sales Manager'].includes(userProfile.activeRole);
  if (loading) {
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
    <ReportsClientPage />
  );
}
