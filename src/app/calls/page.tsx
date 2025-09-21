
import { getAllCallActivities, getAllTranscripts } from '@/services/firebase';
import CallsClientPage from '@/components/calls-client';

// Revalidate the data for this page every 10 minutes (600 seconds)
export const revalidate = 600;

async function getCallsData() {
  // Fetch all necessary data in parallel on the server
  const [calls, transcripts] = await Promise.all([
    getAllCallActivities(),
    getAllTranscripts()
  ]);

  return { calls, transcripts };
}


export default async function AllCallsPage() {
  const { calls, transcripts } = await getCallsData();

  return (
    <CallsClientPage
      initialCalls={calls}
      initialTranscripts={transcripts}
    />
  );
}
