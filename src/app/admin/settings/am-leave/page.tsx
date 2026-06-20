'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AmLeaveManagement } from '../../../../components/admin/am-leave-management';

export default function AmLeaveSettingsPage() {
  const { userProfile, loading: authLoading, isSuperAdmin } = useAuth();
  const router = useRouter();

  const hasAccess = isSuperAdmin || userProfile?.activeRole === 'Sales Manager';

  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader /></div>;
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
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Account Manager Leave Settings</h1>
        <p className="text-muted-foreground">Manage leave schedules and automated assignment rules for Account Managers.</p>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Account Managers</CardTitle>
          <CardDescription>Configure leave status and backup assignments for Account Managers.</CardDescription>
        </CardHeader>
        <CardContent>
          <AmLeaveManagement />
        </CardContent>
      </Card>
    </div>
  );
}
