import React from 'react';
import FranchiseProspectsClient from '@/components/operations/franchise-prospects-client';

export const metadata = {
  title: 'Franchise Prospects | MailPlus Operations',
  description: 'Manage and track expressions of interest for buying a franchise.',
};

export default function FranchiseProspectsPage() {
  return <FranchiseProspectsClient />;
}
