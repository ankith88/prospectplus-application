
'use client';
import { notFound } from 'next/navigation'
import { getLeadFromFirebase } from '@/services/firebase'
import { LeadProfile } from '@/components/lead-profile'
import type { Lead } from '@/lib/types'
import React, { useEffect, useState } from 'react'

export default function LeadProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const { id } = params;
    if (!id || typeof id !== 'string') {
      setError(true);
      setLoading(false);
      return;
    }

    const fetchLead = async () => {
      try {
        const leadData = await getLeadFromFirebase(id, true);
        if (!leadData) {
          setError(true);
        } else {
          setLead(leadData);
        }
      } catch (e) {
        console.error(e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [params]);

  if (error) {
    notFound();
    return null;
  }

  if (loading || !lead) {
    // You can return a loading spinner here if you have one
    return <div>Loading...</div>;
  }
  
  return <LeadProfile 
            initialLead={lead} 
        />;
}
