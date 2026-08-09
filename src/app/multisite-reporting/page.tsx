import MultiSiteReportingClient from '@/components/multisite-reporting-client';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MultiSite Reporting | ProspectPlus',
  description: 'Analytics, Liam CS tagging, and Michael branch engagement reporting for multi-site customer expansions',
};

export default function MultiSiteReportingPage() {
  return <MultiSiteReportingClient />;
}
