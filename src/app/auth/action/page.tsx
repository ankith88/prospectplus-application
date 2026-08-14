'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FullScreenLoader } from '@/components/ui/loader';

function AuthActionHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    if (mode === 'resetPassword' || oobCode) {
      router.replace(`/reset-password?${searchParams.toString()}`);
    } else {
      router.replace('/signin');
    }
  }, [router, searchParams]);

  return <FullScreenLoader message="Redirecting to security action..." />;
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={<FullScreenLoader message="Loading..." />}>
      <AuthActionHandler />
    </Suspense>
  );
}
