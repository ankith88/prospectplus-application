'use client';

import LeadsMapClient from '@/components/leads-map-client';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';

export default function TerritoryMapPage() {
  const { userProfile, isSuperAdmin, loading } = useAuth();
  const router = useRouter();

  const allowedRoles = ['admin', 'super user', 'superadmin', 'Franchisee', 'franchisee', 'Lead Gen', 'Lead Gen Admin', 'Dashback'];
  const hasAccess = isSuperAdmin || (userProfile?.activeRole && allowedRoles.includes(userProfile.activeRole));
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
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

  return (
    <div className="flex flex-col gap-6 h-full">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Route Planner Map</h1>
        <p className="text-muted-foreground">Plan sales routes and visualize leads and signed customers on the map.</p>
      </header>
      <LeadsMapClient />
    </div>
  );
}
