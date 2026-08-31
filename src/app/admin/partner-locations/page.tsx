'use client';

import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { AccessDenied } from '@/components/access-denied';
import { PartnerLocationsClient } from '@/components/admin/partner-locations-client';

export default function PartnerLocationsPage() {
  const { loading, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <AccessDenied customPageName="Partner Locations Management" />;
  }

  return <PartnerLocationsClient />;
}
