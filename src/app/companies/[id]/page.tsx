
'use client';
import { notFound, useParams, useRouter } from 'next/navigation'
import { getCompanyFromFirebase } from '@/services/firebase'
import { CompanyProfile } from '@/components/company-profile'
import type { Lead, Note } from '@/lib/types'
import React, { useEffect, useState } from 'react'
import { Loader } from '@/components/ui/loader';
import { useAuth } from '@/hooks/use-auth';

export default function CompanyProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const [company, setCompany] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const hasAccess = userProfile?.activeRole && ['admin', 'Marketing Admin', 'Marketing Manager', 'Field Sales', 'Field Sales Admin', 'Lead Gen Admin', 'Lead Gen', 'user', 'Dashback'].includes(userProfile.activeRole);

  useEffect(() => {
    if (!authLoading && userProfile && !hasAccess) {
      router.replace('/leads');
    }
  }, [userProfile, authLoading, router, hasAccess]);

  useEffect(() => {
    const { id } = params;
    if (!id || typeof id !== 'string') {
      setError(true);
      setLoading(false);
      return;
    }
    if (authLoading || !userProfile || !hasAccess) return;

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
  }, [params, userProfile, authLoading, hasAccess]);
  
  const handleNoteLogged = (newNote: Note) => {
    setCompany(prev => {
        if (!prev) return null;
        const updatedNotes = [newNote, ...(prev.notes || [])];
        return { ...prev, notes: updatedNotes };
    });
  };

  if (authLoading || loading || !hasAccess) {
    return (
        <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
            <Loader />
        </div>
    );
  }
  
  if (error || !company) {
    notFound();
    return null;
  }
  
  return <CompanyProfile initialCompany={company} onNoteLogged={handleNoteLogged} />;
}
