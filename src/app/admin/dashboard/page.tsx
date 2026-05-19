"use client";

import ExecutiveDashboardClient from "@/components/executive-dashboard-client";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';

export default function AdminDashboardPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  const hasAccess = userProfile?.role && ['admin', 'Marketing Admin', 'Marketing Manager', 'Dashback'].includes(userProfile.role);

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
    <div className="flex-1 space-y-4 p-8 pt-6">
      <ExecutiveDashboardClient />
    </div>
  );
}
