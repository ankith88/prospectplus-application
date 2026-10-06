'use client';

import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { AccessDenied } from '@/components/access-denied';
import { CustomerInvoicingClient } from '@/components/admin/customer-invoicing-client';

export default function CustomerInvoicingPage() {
  const { userProfile, isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  const role = (userProfile?.activeRole || userProfile?.role || '').toLowerCase();
  const isAdminOrSuperAdmin = isSuperAdmin || 
    role === 'admin' || 
    role === 'superadmin' || 
    role === 'super user';

  if (!isAdminOrSuperAdmin) {
    return <AccessDenied customPageName="Customer Invoicing" />;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <CustomerInvoicingClient />
    </div>
  );
}
