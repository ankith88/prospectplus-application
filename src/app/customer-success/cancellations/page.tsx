"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from '@/components/ui/loader';

export default function CSCancellationsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/customer-success/cs-requests');
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center min-h-[60vh]">
      <Loader />
    </div>
  );
}
