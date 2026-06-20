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
      switch (userProfile.activeRole) {
        case 'admin':
        case 'Sales Manager':
          router.replace('/admin/dashboard');
          break;
        case 'Account Managers':
        case 'Account Manager':
        case 'account managers':
          router.replace('/account-manager/pipeline');
          break;
        case 'Customer Success':
          router.replace('/customer-success/pipeline');
          break;
        case 'Marketing Admin':
        case 'Marketing Manager':
          router.replace('/admin/marketing');
          break;
        case 'Field Sales':
        case 'Field Sales Admin':
        case 'Franchisee':
          router.replace('/capture-visit');
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
