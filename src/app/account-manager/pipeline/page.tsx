import PipelineDashboard from '@/components/account-manager/pipeline-dashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AM Pipeline | ProspectPlus',
  description: 'Pipeline management dashboard for Account Managers',
};

export default function AccountManagerPipelinePage() {
  return <PipelineDashboard />;
}
