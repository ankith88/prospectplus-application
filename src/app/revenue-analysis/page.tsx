"use client";

import RevenueAnalysisClient from '@/components/reports/revenue-analysis-client';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { FullScreenLoader } from '@/components/ui/loader';
import { AccessDenied } from '@/components/access-denied';

export default function RevenueAnalysisPage() {
  const { userProfile, isSuperAdmin, loading: authLoading } = useAuth();
  const { canView, loadingPermissions } = usePermissions();

  const loading = authLoading || loadingPermissions;

  const allowedRoles = [
    'admin',
    'superadmin',
    'super user',
    'sales manager',
    'sales_manager',
    'account manager',
    'account managers'
  ];

  const activeRoleLower = (userProfile?.activeRole as string)?.toLowerCase().replace(/_/g, ' ').trim() || '';
  const isFranchiseeRole = activeRoleLower === 'franchisee';
  const isUserRole = activeRoleLower === 'user';

  const hasAccess = !isFranchiseeRole && !isUserRole && (
    isSuperAdmin ||
    Boolean((userProfile as any)?.isSuperAdmin) ||
    Boolean((userProfile as any)?.superAdmin) ||
    canView('revenueAnalysis') ||
    allowedRoles.includes(activeRoleLower) ||
    (userProfile?.assignedRoles || []).some((r: any) => allowedRoles.includes(String(r).trim().toLowerCase().replace(/_/g, ' ')))
  );

  if (loading) {
    return <FullScreenLoader message="Checking permissions..." />;
  }

  if (!hasAccess) {
    return <AccessDenied customPageName="Revenue Analysis" />;
  }

  return <RevenueAnalysisClient />;
}
