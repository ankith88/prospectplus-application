
"use client";

import ReportsClientPage from '@/components/reports-client';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';

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
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page. Please contact Ankith Ravindran if you need access.</p>
      </div>
    );
  }

  return (
    <ReportsClientPage />
  );
}
