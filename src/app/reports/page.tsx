
import { getAllCallActivities, getAllLeadsForReport, getAllAppointments, getAllUsers } from '@/services/firebase';
import ReportsClientPage from '@/components/reports-client';
import type { Lead, Activity, Appointment, UserProfile } from '@/lib/types';
import { auth } from 'firebase-admin';

// Revalidate the data for this page every 10 minutes (600 seconds)
export const revalidate = 600; 

type CallActivity = Activity & { leadId: string; leadName: string, leadStatus: Lead['status'], dialerAssigned?: string };
type AppointmentWithLead = Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: Lead['status'] };

async function getReportData() {
  // Fetch all necessary data in parallel on the server
  const [calls, leads, appointments, users] = await Promise.all([
    getAllCallActivities(),
    getAllLeadsForReport(),
    getAllAppointments(),
    getAllUsers()
  ]);

  const dialers = users
    .filter(u => u.role !== 'admin' && u.displayName)
    .map(u => u.displayName!);

  return { calls, leads, appointments, dialers };
}


export default async function ReportsPage() {
  const { calls, leads, appointments, dialers } = await getReportData();

  return (
    <ReportsClientPage
      initialCalls={calls as CallActivity[]}
      initialLeads={leads}
      initialAppointments={appointments as AppointmentWithLead[]}
      initialDialers={dialers}
    />
  );
}
