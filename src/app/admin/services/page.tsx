'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { ServiceLineItemsManager } from '@/components/admin/service-line-items-manager';

export default function AdminServicesPage() {
  const { userProfile, loading: authLoading, isSuperAdmin } = useAuth();
  const router = useRouter();

  const role = String(userProfile?.role || userProfile?.activeRole || '').trim().toLowerCase();
  const assignedRoles = Array.isArray(userProfile?.assignedRoles)
    ? userProfile.assignedRoles.map(r => String(r).trim().toLowerCase())
    : [];

  const allowedRoles = [
    'admin',
    'super_admin',
    'super admin',
    'super user',
    'outbound admin',
    'data admin',
    'operations manager',
    'operations',
    'sales manager',
    'finance',
    'finance manager',
    'finanace manager'
  ];

  const hasAdminAccess = isSuperAdmin || 
    allowedRoles.includes(role) || 
    assignedRoles.some(r => allowedRoles.includes(r));

  useEffect(() => {
    if (!authLoading && !hasAdminAccess) {
      router.replace('/leads');
    }
  }, [userProfile, authLoading, router, hasAdminAccess]);

  if (authLoading || !hasAdminAccess) {
    return (
      <div className="flex h-full min-h-[500px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <ServiceLineItemsManager />
    </div>
  );
}
