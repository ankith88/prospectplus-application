"use client";

import LoginActivityReport from '@/components/admin/login-report';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';

export default function LoginReportPage() {
  const { userProfile, loading } = useAuth();

  const isAuthorized = userProfile?.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';

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
