"use client";

import ExecutiveDashboardClient from "@/components/executive-dashboard-client";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { Loader } from '@/components/ui/loader';

export default function AdminDashboardPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  const { canView, loadingPermissions } = usePermissions();
  const hasAccess = canView('executiveDashboard');

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
        <p className="text-muted-foreground">You do not have permission to view this page. Please contact Ankith Ravindran if you need access.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <ExecutiveDashboardClient />
    </div>
  );
}
