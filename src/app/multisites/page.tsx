import MultiSitesDashboard from '@/components/account-manager/multisites-dashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MultiSites | ProspectPlus',
  description: 'MultiSite lead management and parent-child account hierarchy dashboard',
};

export default function MultiSitesPage() {
  return <MultiSitesDashboard />;
}
