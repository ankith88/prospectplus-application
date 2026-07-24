import CustomerSuccessReportingClient from '@/components/customer-success/reporting-client';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Customer Success Reporting | ProspectPlus',
  description: 'Analytics and contact attempt performance reporting for Customer Success',
};

export default function CustomerSuccessReportingPage() {
  return <CustomerSuccessReportingClient />;
}
