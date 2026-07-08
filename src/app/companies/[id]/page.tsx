
'use client';
import { notFound, useParams, useRouter } from 'next/navigation'
import { getCompanyFromFirebase } from '@/services/firebase'
import { LeadProfile } from '@/components/lead-profile'
import type { Lead, Note } from '@/lib/types'
import React, { useEffect, useState } from 'react'
import { Loader } from '@/components/ui/loader';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';

export default function CompanyProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { canView, loadingPermissions } = usePermissions();
  const [company, setCompany] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const hasAccess = canView('signedCustomers') || (userProfile?.activeRole && ['admin', 'Marketing Admin', 'Marketing Manager', 'Field Sales', 'Field Sales Admin', 'Lead Gen Admin', 'Lead Gen', 'user', 'Dashback'].includes(userProfile.activeRole));

  useEffect(() => {
    const { id } = params;
    if (!id || typeof id !== 'string') {
      setError(true);
      setLoading(false);
      return;
    }
    if (authLoading || loadingPermissions || !userProfile) return;

    if (!hasAccess) {
      setLoading(false);
      return;
    }

    const fetchCompany = async () => {
      try {
        setLoading(true);
        const companyData = await getCompanyFromFirebase(id, true);
        if (!companyData) {
          setError(true);
        } else {
          setCompany(companyData);
        }
      } catch (e) {
        console.error(e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [params, userProfile, authLoading, loadingPermissions, hasAccess]);
  if (authLoading || loadingPermissions || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page. Please contact Ankith Ravindran if you need access.</p>
      </div>
    );
  }
  
  if (error || !company) {
    notFound();
    return null;
  }
  
  return <LeadProfile initialLead={company} />;
}
