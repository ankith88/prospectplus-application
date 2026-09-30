import { Metadata } from 'next';
import { AppointmentReportingClient } from '@/components/appointment-reporting-client';

export const metadata: Metadata = {
  title: 'Appointment Reporting | ProspectPlus',
  description: 'Comprehensive reporting on booked appointments, meeting outcomes, AM performance, original lead buckets, and post-appointment lead status transitions.',
};

export default function AppointmentReportingPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-[1700px]">
      <AppointmentReportingClient />
    </div>
  );
}
