import AMReportsDashboard from '@/components/account-manager/am-reports-dashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AM Reports | ProspectPlus',
  description: 'Reporting dashboard for Account Managers',
};

export default function AccountManagerReportsPage() {
  return <AMReportsDashboard />;
}
