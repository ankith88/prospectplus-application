
'use client';
import { notFound, useParams, useRouter } from 'next/navigation'
import { getLeadFromFirebase, getCompanyFromFirebase } from '@/services/firebase'
import { LeadProfile } from '@/components/lead-profile'
import { AccessDenied } from '@/components/access-denied'
import { canFranchiseeAccessLead } from '@/lib/lead-permissions'
import { useAuth } from '@/hooks/use-auth'
import { FullScreenLoader } from '@/components/ui/loader'
import type { Lead } from '@/lib/types'
import React, { useEffect, useState } from 'react'

export default function LeadProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
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
        
        // If lead is missing, marked as duplicate, or is Won/Signed, check if a company exists to redirect
        if (!leadData || leadData.isDuplicate || leadData.status === 'Won' || leadData.customerStatus === 'Won' || (leadData.status as string) === 'Signed' || (leadData.customerStatus as string) === 'Signed') {
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

  if (authLoading || loading) {
    return <FullScreenLoader message="Loading lead details..." />;
  }

  if (error || !lead) {
    notFound();
    return null;
  }

  if (userProfile && !canFranchiseeAccessLead(lead, userProfile)) {
    return <AccessDenied customPageName={`Lead: ${lead.companyName || lead.id}`} />;
  }

  return <LeadProfile 
            initialLead={lead} 
        />;
}

