"use client";

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { FullScreenLoader } from '@/components/ui/loader';
import { ImportLposClient } from '@/components/admin/import-lpos-client';

export default function AdminImportLposPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { canView, loadingPermissions } = usePermissions();

  if (authLoading || loadingPermissions) {
    return <FullScreenLoader message="Loading LPO Import tool..." />;
  }

  if (!canView('lpoLeads')) {
    return (
      <div className="p-8 text-center text-red-600 font-semibold">
        Access Denied: You do not have permission to view or manage Participating LPOs.
      </div>
    );
  }

  return <ImportLposClient />;
}

