import CustomerSuccessDashboard from '@/components/customer-success/pipeline-dashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Customer Success Pipeline | ProspectPlus',
  description: 'Pipeline management dashboard for Customer Success',
};

export default function CustomerSuccessPipelinePage() {
  return <CustomerSuccessDashboard />;
}
