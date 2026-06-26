"use client";

import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import FinancialDashboardClient from '@/components/admin/financial-dashboard-client';

export default function FinancialDashboardPage() {
  const { loading, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page. Please contact your system administrator if you need access.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4">
      <FinancialDashboardClient />
    </div>
  );
}
