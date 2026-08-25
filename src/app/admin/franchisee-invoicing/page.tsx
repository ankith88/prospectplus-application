"use client";

import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { AccessDenied } from '@/components/access-denied';
import FranchiseeInvoicingClient from '@/components/admin/franchisee-invoicing-client';

const AUTHORIZED_SUPERADMIN_UID = 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';

export default function FranchiseeInvoicingPage() {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  const isAuthorized = (user?.uid === AUTHORIZED_SUPERADMIN_UID) || (userProfile?.uid === AUTHORIZED_SUPERADMIN_UID);

  if (!isAuthorized) {
    return <AccessDenied />;
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden min-w-0 p-2 sm:p-4">
      <FranchiseeInvoicingClient />
    </div>
  );
}
