
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { DataDeletionTable } from '@/components/admin/data-deletion-table';
import { GranularDeletion } from '@/components/admin/granular-deletion';
import { ActivitySearchDeletion } from '@/components/admin/activity-search-deletion';
import { CampaignDeletion } from '@/components/admin/campaign-deletion';
import { BulkExportLeads } from '@/components/admin/bulk-export-leads';

export default function AdminDataPage() {
  const { userProfile, loading: authLoading, isSuperAdmin } = useAuth();
  const router = useRouter();



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
        <p className="text-muted-foreground">Manage, export, and permanently delete records from the system.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Export Leads</CardTitle>
          <CardDescription>Export leads to CSV based on multiple filters such as status, assigned dialer, campaign, and visit note outcome.</CardDescription>
        </CardHeader>
        <CardContent>
          <BulkExportLeads />
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Bulk Delete by Campaign</CardTitle>
          <CardDescription>Enter a campaign name to find and permanently delete all associated leads. This action is irreversible.</CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignDeletion />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search and Delete Activities</CardTitle>
          <CardDescription>Search for specific activities across all leads (e.g., by note content) and delete them in bulk.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivitySearchDeletion />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Granular Record Deletion</CardTitle>
          <CardDescription>Search for a lead to view and delete its individual sub-collection items like notes, activities, or contacts.</CardDescription>
        </CardHeader>
        <CardContent>
            <GranularDeletion />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Delete Leads</CardTitle>
          <CardDescription>Search for and delete entire lead records. This action is irreversible and will delete all associated sub-collections.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataDeletionTable collectionName="leads" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Delete Signed Customers</CardTitle>
          <CardDescription>Search for and delete entire signed customer (company) records. This action is irreversible.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataDeletionTable collectionName="companies" />
        </CardContent>
      </Card>
    </div>
  );
}
