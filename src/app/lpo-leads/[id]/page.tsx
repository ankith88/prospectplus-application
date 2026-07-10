"use client";

import { notFound, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { LpoLeadProfile } from '@/components/lpo-lead-profile';
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
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view the LPO Lead details.</p>
      </div>
    );
  }

  if (error) {
    notFound();
    return null;
  }

  if (loadingLead || !lead) {
    return <FullScreenLoader message="Loading LPO lead details..." />;
  }

  return <LpoLeadProfile initialLead={lead} />;
}
