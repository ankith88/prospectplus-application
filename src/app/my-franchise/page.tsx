import React from 'react';
import MyFranchiseClient from '@/components/franchisee/my-franchise-client';

export const metadata = {
  title: 'My Franchise Profile & Territory | MailPlus',
  description: 'View your franchisee profile, mapped suburbs, lodgement points, and operator details.',
};

export default function MyFranchisePage() {
  return <MyFranchiseClient />;
}
