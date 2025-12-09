
import { notFound } from 'next/navigation'
import { getLeadFromFirebase } from '@/services/firebase'
import { LeadProfile } from '@/components/lead-profile'
import type { Lead } from '@/lib/types'
import React from 'react'

export default async function LeadProfilePage({
  params,
}: {
  params: { id: string }
}) {
  // const resolvedParams = React.use(params);
  const { id } = params;

  // params.then((resolvedData) => {
  //   // Access the elements within 'resolvedData' here
  //   console.log("Resolved data:", resolvedData);
  //   // Example: If resolvedData is an object with a 'name' property
  //   // console.log(resolvedData.name);
  // }).catch((error) => {
  //   // Handle any errors that occurred during Promise resolution
  //   console.error("Error resolving Promise:", error);
  // });
  console.log('params: ' + params);
  console.log('typeof params: ' + typeof params);
  

  // Add a guard to ensure the ID is valid before fetching
  if (!id || typeof id !== 'string') {
    notFound();
    return;
  }

  // Fetch the lead and all its sub-collections on the server.
  const lead: Lead | null = await getLeadFromFirebase(id, true);

  if (!lead) {
    notFound();
    return;
  }
  
  return <LeadProfile 
            initialLead={lead} 
        />;
}
