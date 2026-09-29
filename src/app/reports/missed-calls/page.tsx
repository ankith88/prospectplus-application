"use client";

import MissedCallsClient from '@/components/reports/missed-calls-client';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { Loader } from '@/components/ui/loader';
import { AccessDenied } from '@/components/access-denied';

export default function MissedCallsReportPage() {
  const { userProfile, isSuperAdmin, loading: authLoading } = useAuth();
  const { loadingPermissions } = usePermissions();

  const loading = authLoading || loadingPermissions;
  
  const role = (userProfile?.activeRole || userProfile?.role || '').trim().toLowerCase();
  const assignedRoles = (userProfile?.assignedRoles || []).map((r: any) => String(r).trim().toLowerCase());

  const allowedRoles = ['admin', 'data admin', 'super user', 'sales manager', 'outbound admin'];
  const hasAccess =
    isSuperAdmin ||
    Boolean((userProfile as any)?.isSuperAdmin) ||
    Boolean((userProfile as any)?.superAdmin) ||
    allowedRoles.includes(role) ||
    assignedRoles.some((r: string) => allowedRoles.includes(r));

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDenied />;
  }

  return <MissedCallsClient />;
}
