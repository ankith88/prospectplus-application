"use client";

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { FullScreenLoader } from '@/components/ui/loader';
import { AccessDenied } from '@/components/access-denied';
import { LpoReportingClient } from '@/components/lpo-reporting-client';

export default function LpoReportingPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { canView, loadingPermissions } = usePermissions();

  if (authLoading || loadingPermissions) {
    return <FullScreenLoader message="Verifying security permissions..." />;
  }

  // Check if user has permission to view LPO leads / reporting
  const userRole = (userProfile?.role || '').toLowerCase();
  const canViewLpoReports = canView('lpoLeads') || canView('reports') || userRole === 'admin' || userRole === 'superadmin';

  if (!canViewLpoReports) {
    return <AccessDenied customPageName="LPO.Plus Reporting" />;
  }

  return <LpoReportingClient />;
}
