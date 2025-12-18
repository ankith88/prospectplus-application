
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { DataDeletionTable } from '@/components/admin/data-deletion-table';

export default function AdminDataPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  const isSuperAdmin = userProfile?.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.replace('/leads');
    }
  }, [userProfile, authLoading, router, isSuperAdmin]);

  if (authLoading || !isSuperAdmin) {
    return <div className="flex h-full items-center justify-center"><Loader /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Data Management</h1>
        <p className="text-muted-foreground">Permanently delete records from the system.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Delete Leads</CardTitle>
          <CardDescription>Search for and delete leads. This action is irreversible and will delete all associated sub-collections.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataDeletionTable collectionName="leads" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete Signed Customers</CardTitle>
          <CardDescription>Search for and delete signed customers (companies). This action is irreversible and will delete all associated sub-collections.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataDeletionTable collectionName="companies" />
        </CardContent>
      </Card>
    </div>
  );
}
