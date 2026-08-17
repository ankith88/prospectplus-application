import React from 'react';
import FranchiseeHomeClient from '@/components/franchisee-home-client';

export const metadata = {
  title: 'Welcome to Your ProspectPlus Homepage | MailPlus',
  description: 'Your default franchisee hub for lead creation, territory overview, appointments calendar, sales process snapshot, and support.',
};

export default function FranchiseeHomePage() {
  return <FranchiseeHomeClient />;
}
