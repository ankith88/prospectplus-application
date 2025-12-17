
"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';

export default function HomePage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (userProfile?.role === 'admin') {
            router.replace('/admin/dashboard');
        } else if (userProfile?.role === 'Field Sales') {
            router.replace('/field-sales');
        } else {
            router.replace('/leads');
        }
      } else {
        router.replace('/signin');
      }
    }
  }, [user, userProfile, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader />
    </div>
  );
}
