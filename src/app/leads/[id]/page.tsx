
'use client';
import { notFound, useParams, useRouter } from 'next/navigation'
import { getLeadFromFirebase, getCompanyFromFirebase } from '@/services/firebase'
import { LeadProfile } from '@/components/lead-profile'
import type { Lead } from '@/lib/types'
import React, { useEffect, useState } from 'react'

export default function LeadProfilePage() {
  const params = useParams();
  const router = useRouter();
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
        
        // If lead is missing or marked as duplicate, check if a company exists to redirect
        if (!leadData || leadData.isDuplicate) {
          const companyData = await getCompanyFromFirebase(id, false);
          if (companyData) {
            window.location.href = `/companies/${id}`;
            return;
          }
        }

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
