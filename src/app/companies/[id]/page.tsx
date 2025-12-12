
'use client';
import { notFound, useParams } from 'next/navigation'
import { getCompanyFromFirebase } from '@/services/firebase'
import { LeadProfile } from '@/components/lead-profile'
import type { Lead } from '@/lib/types'
import React, { useEffect, useState } from 'react'

export default function CompanyProfilePage() {
  const params = useParams();
  const [company, setCompany] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const { id } = params;
    if (!id || typeof id !== 'string') {
      setError(true);
      setLoading(false);
      return;
    }

    const fetchCompany = async () => {
      try {
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
  }, [params]);

  if (error) {
    notFound();
    return null;
  }

  if (loading || !company) {
    // You can return a loading spinner here if you have one
    return <div>Loading...</div>;
  }
  
  return <LeadProfile 
            initialLead={company} 
        />;
}
