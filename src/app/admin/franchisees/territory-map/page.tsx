'use client';

import TerritoryMapClient from '@/components/admin/territory-map-client';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { Loader } from '@/components/ui/loader';

export default function TerritoryMapPage() {
  const { userProfile, loading, isSuperAdmin } = useAuth();
  const { canView, loadingPermissions } = usePermissions();

  const activeRoleLower = (userProfile?.activeRole as string)?.toLowerCase() || '';
  const isAllowed = isSuperAdmin || 
    canView('territoryMap') || 
    ['admin', 'superadmin', 'franchisee', 'executive', 'outbound admin', 'customer service', 'customer_service', 'customer success', 'customer_success'].includes(activeRoleLower);

  if (loading || loadingPermissions) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view the Franchisee Territory Map page.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full w-full p-4 flex flex-col space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-3xl font-bold tracking-tight">Franchisee Territory Map</h2>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-border shadow-sm">
        <TerritoryMapClient />
      </div>
    </div>
  );
}
