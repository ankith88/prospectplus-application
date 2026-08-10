import CancellationReportingClient from '@/components/customer-success/cancellation-reporting-client';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cancellation & Retention Reporting | ProspectPlus',
  description: 'Analytics and financial impact reporting for customer cancellations, retentions, themes, whys, and reasons.',
};

export default function CancellationReportingPage() {
  return <CancellationReportingClient />;
}
