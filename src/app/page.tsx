'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';

export default function HomePage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return; // Wait until authentication state is loaded
    }

    if (!user) {
      router.replace('/signin');
      return;
    }

    if (userProfile) {
      const activeRole = (userProfile.activeRole || userProfile.role || '') as string;
      const lowerRole = activeRole.toLowerCase().trim();

      if (
        activeRole === 'Customer Service' ||
        lowerRole === 'customer service' ||
        lowerRole === 'customer_service' ||
        lowerRole === 'customer-service'
      ) {
        router.replace('/admin/tickets');
        return;
      }

      if (
        activeRole === 'Customer Success' ||
        lowerRole === 'customer success' ||
        lowerRole === 'customer_success' ||
        lowerRole === 'customer-success' ||
        lowerRole === 'cs'
      ) {
        router.replace('/customer-success/pipeline');
        return;
      }

      if (
        activeRole === 'Account Manager' ||
        activeRole === 'Account Managers' ||
        lowerRole === 'account manager' ||
        lowerRole === 'account managers' ||
        lowerRole === 'account_manager' ||
        lowerRole === 'account_managers' ||
        lowerRole === 'am'
      ) {
        router.replace('/account-manager/pipeline');
        return;
      }

      switch (activeRole) {
        case 'admin':
        case 'super user':
        case 'Sales Manager':
        case 'Marketing Manager':
          router.replace('/account-lookup');
          break;
        case 'Field Sales':
        case 'Field Sales Admin':
          router.replace('/capture-visit');
          break;
        case 'Franchisee':
        case 'franchisee':
          router.replace('/leads/new');
          break;
        case 'Lead Gen Admin':
        case 'Dashback':
          router.replace('/visit-notes');
          break;
        case 'Lead Gen':
          router.replace('/leads/new');
          break;
        default:
          router.replace('/leads');
          break;
      }
    } else {
      // If user is logged in but profile is not loaded for some reason,
      // go to a safe default. This can be a temporary state.
      router.replace('/leads');
    }
  }, [user, userProfile, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader />
    </div>
  );
}
