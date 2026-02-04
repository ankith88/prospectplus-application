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
      switch (userProfile.role) {
        case 'admin':
          router.replace('/admin/dashboard');
          break;
        case 'Field Sales':
        case 'Field Sales Admin':
          router.replace('/capture-visit');
          break;
        case 'Lead Gen Admin':
          router.replace('/signed-customers');
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
