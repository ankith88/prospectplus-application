import MultiSitesDashboard from '@/components/account-manager/multisites-dashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MultiSites Pipeline | ProspectPlus',
  description: 'MultiSite lead management and parent-child account hierarchy dashboard for Account Managers',
};

export default function AccountManagerMultiSitesPage() {
  return <MultiSitesDashboard />;
}
