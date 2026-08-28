import { Metadata } from 'next';
import { TrainingAppointmentsClient } from '@/components/training-appointments-client';

export const metadata: Metadata = {
  title: 'Franchisee Training Sessions | ProspectPlus',
  description: 'Manage 1-on-1 franchisee training sessions and review booking analytics with Aleyna.'
};

export default function TrainingAppointmentsPage() {
  return <TrainingAppointmentsClient />;
}
