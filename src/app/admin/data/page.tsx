
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DataDeletionTable } from '@/components/admin/data-deletion-table';
import { GranularDeletion } from '@/components/admin/granular-deletion';
import { ActivitySearchDeletion } from '@/components/admin/activity-search-deletion';
import { CampaignDeletion } from '@/components/admin/campaign-deletion';
import { TicketDeletion } from '@/components/admin/ticket-deletion';
import { LpoLeadDeletion } from '@/components/admin/lpo-lead-deletion';
import { BulkExportLeads } from '@/components/admin/bulk-export-leads';
import { BulkExportInvoices } from '@/components/admin/bulk-export-invoices';
import { BulkImportProducts } from '@/components/admin/bulk-import-products';
import { BulkImportServices } from '@/components/admin/bulk-import-services';
import { BulkImportInvoices } from '@/components/admin/bulk-import-invoices';
import { LeadStatusUpdater } from '@/components/admin/lead-status-updater';
import { DailyReportRecipients } from '@/components/admin/daily-report-recipients';

interface CollapsibleCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function CollapsibleCard({ title, description, children }: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="p-1 rounded-md hover:bg-muted">
            {isOpen ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="pt-6 border-t">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

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

      <CollapsibleCard
        title="Daily Barcodes Report Recipients"
        description="Manage the list of email addresses that receive the daily yesterday's barcodes report."
      >
        <DailyReportRecipients />
      </CollapsibleCard>

      <CollapsibleCard
        title="Lead Status Updater"
        description="Filter leads by source, bucket, status, assignees, and date entered to update their status individually or in bulk."
      >
        <LeadStatusUpdater />
      </CollapsibleCard>

      <CollapsibleCard
        title="Bulk Export Leads"
        description="Export leads to CSV based on multiple filters such as status, assigned dialer, campaign, and visit note outcome."
      >
        <BulkExportLeads />
      </CollapsibleCard>

      <CollapsibleCard
        title="Bulk Export Invoices"
        description="Export all customer invoices to CSV along with Customer Firebase ID, Entity ID, NetSuite Internal ID, and company details."
      >
        <BulkExportInvoices />
      </CollapsibleCard>

      <CollapsibleCard
        title="Bulk Import Invoices"
        description="Upload a CSV file to bulk import or update the customer invoices database."
      >
        <BulkImportInvoices />
      </CollapsibleCard>
      
      <CollapsibleCard
        title="Bulk Import Products"
        description="Upload a CSV file to bulk import or update the products database."
      >
        <BulkImportProducts />
      </CollapsibleCard>

      <CollapsibleCard
        title="Bulk Import Services"
        description="Upload a CSV file to bulk import or update the services database. Required columns: Internal ID, Name, NetSuite Item."
      >
        <BulkImportServices />
      </CollapsibleCard>
      
      <CollapsibleCard
        title="Bulk Delete by Campaign"
        description="Enter a campaign name to find and permanently delete all associated leads. This action is irreversible."
      >
        <CampaignDeletion />
      </CollapsibleCard>

      <CollapsibleCard
        title="Search and Delete Activities"
        description="Search for specific activities across all leads (e.g., by note content) and delete them in bulk."
      >
        <ActivitySearchDeletion />
      </CollapsibleCard>
      
      <CollapsibleCard
        title="Granular Record Deletion"
        description="Search for a lead to view and delete its individual sub-collection items like notes, activities, or contacts."
      >
        <GranularDeletion />
      </CollapsibleCard>

      <CollapsibleCard
        title="Bulk Delete Leads"
        description="Search for and delete entire lead records. This action is irreversible and will delete all associated sub-collections."
      >
        <DataDeletionTable collectionName="leads" />
      </CollapsibleCard>

      <CollapsibleCard
        title="Bulk Delete Signed Customers"
        description="Search for and delete entire signed customer (company) records. This action is irreversible."
      >
        <DataDeletionTable collectionName="companies" />
      </CollapsibleCard>

      <CollapsibleCard
        title="Delete Tickets"
        description="Search for support tickets by ticket number or document ID to permanently delete them and all associated communications, actions, staff notes, and escalations."
      >
        <TicketDeletion />
      </CollapsibleCard>

      <CollapsibleCard
        title="Delete LPO Leads"
        description="Search for LPO leads by LPO Name and/or Lead ID to permanently delete them and all associated activity records."
      >
        <LpoLeadDeletion />
      </CollapsibleCard>
    </div>
  );
}
