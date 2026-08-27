
'use client';
import { notFound, useParams, useRouter } from 'next/navigation'
import { getCompanyFromFirebase } from '@/services/firebase'
import { LeadProfile } from '@/components/lead-profile'
import { AccessDenied } from '@/components/access-denied'
import { canFranchiseeAccessLead } from '@/lib/lead-permissions'
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

  const hasAccess = canView('signedCustomers') || (userProfile?.activeRole && ['admin', 'Marketing Manager', 'Field Sales', 'Field Sales Admin', 'Lead Gen Admin', 'Lead Gen', 'user', 'Dashback', 'Operations', 'operations', 'Operations Manager', 'operations manager'].includes(userProfile.activeRole));

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
    return <AccessDenied customPageName="Signed Customers" />;
  }
  
  if (error || !company) {
    notFound();
    return null;
  }

  if (userProfile && !canFranchiseeAccessLead(company, userProfile)) {
    return <AccessDenied customPageName={`Company: ${company.companyName || company.id}`} />;
  }
  
  return <LeadProfile initialLead={company} />;
}

