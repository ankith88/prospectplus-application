"use client";

import RevenueAnalysisClient from '@/components/reports/revenue-analysis-client';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { FullScreenLoader } from '@/components/ui/loader';
import { AccessDenied } from '@/components/access-denied';

import { isAccountManagerUser } from '@/lib/lead-permissions';

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
    'account managers',
    'account_manager',
    'accountmanager',
    'am'
  ];

  const activeRoleLower = (userProfile?.activeRole as string)?.toLowerCase().replace(/_/g, ' ').trim() || '';
  const roleLower = (userProfile?.role as string)?.toLowerCase().replace(/_/g, ' ').trim() || '';
  const isFranchiseeRole = activeRoleLower === 'franchisee' || roleLower === 'franchisee';
  const isAmUser = isAccountManagerUser(userProfile) || canView('accountManagerPipeline');

  const hasAccess = !isFranchiseeRole && (
    isSuperAdmin ||
    Boolean((userProfile as any)?.isSuperAdmin) ||
    Boolean((userProfile as any)?.superAdmin) ||
    canView('revenueAnalysis') ||
    canView('accountManagerPipeline') ||
    isAmUser ||
    allowedRoles.includes(activeRoleLower) ||
    allowedRoles.includes(roleLower) ||
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
