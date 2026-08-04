import CustomerRequestClient from './customer-request-client';

export const metadata = {
  title: 'Customer Service Request | MailPlus',
  description: 'Submit service change or cancellation requests for your MailPlus account.',
};

export default async function CustomerRequestPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <CustomerRequestClient companyId={companyId} />;
}
