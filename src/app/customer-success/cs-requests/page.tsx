"use client";

import CSRequestsDashboard from '@/components/customer-success/cs-requests-dashboard';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';

export default function CSRequestsPage() {
  const { userProfile, loading } = useAuth();

  const hasAccess = userProfile?.activeRole && ['admin', 'Customer Success', 'Marketing Manager'].includes(userProfile.activeRole);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh]">
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

  return <CSRequestsDashboard />;
}
