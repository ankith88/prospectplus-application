"use client";

import { notFound, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { LpoLeadProfile } from '@/components/lpo-lead-profile';
import { AccessDenied } from '@/components/access-denied';
import { canFranchiseeAccessLead } from '@/lib/lead-permissions';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { FullScreenLoader } from '@/components/ui/loader';
import React, { useEffect, useState } from 'react';

export default function LpoLeadProfilePage() {
  const params = useParams();
  const { userProfile, loading: authLoading } = useAuth();
  const { canView, loadingPermissions } = usePermissions();
  
  const [lead, setLead] = useState<any | null>(null);
  const [loadingLead, setLoadingLead] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const { id } = params;
    if (!id || typeof id !== 'string' || authLoading || loadingPermissions || !canView('lpoLeads')) {
      if (!id || typeof id !== 'string') {
        setError(true);
        setLoadingLead(false);
      }
      return;
    }

    const fetchLpoLead = async () => {
      try {
        const docRef = doc(firestore, 'lpo_leads', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setLead({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError(true);
        }
      } catch (e) {
        console.error('Error fetching LPO lead:', e);
        setError(true);
      } finally {
        setLoadingLead(false);
      }
    };

    fetchLpoLead();
  }, [params, authLoading, loadingPermissions, canView]);

  if (authLoading || loadingPermissions) {
    return <FullScreenLoader message="Loading..." />;
  }

  if (!canView('lpoLeads')) {
    return <AccessDenied customPageName="LPO Lead Details" />;
  }

  if (error) {
    notFound();
    return null;
  }

  if (loadingLead || !lead) {
    return <FullScreenLoader message="Loading LPO lead details..." />;
  }

  if (userProfile && !canFranchiseeAccessLead(lead, userProfile)) {
    return <AccessDenied customPageName={`LPO Lead: ${lead.companyName || lead.id}`} />;
  }

  return <LpoLeadProfile initialLead={lead} />;
}

