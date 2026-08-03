"use client";

import LoginActivityReport from '@/components/admin/login-report';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { EXCLUDED_LOGIN_ACTIVITY_UIDS } from '@/lib/constants';

export default function LoginReportPage() {
  const { userProfile, loading, isSuperAdmin } = useAuth();

  const isAuthorized = isSuperAdmin && !EXCLUDED_LOGIN_ACTIVITY_UIDS.includes(userProfile?.uid || '');

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page. Please contact Ankith Ravindran if you need access.</p>
      </div>
    );
  }

  return <LoginActivityReport />;
}
