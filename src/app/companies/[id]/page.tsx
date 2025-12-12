
'use client';
import { notFound, useParams } from 'next/navigation'
import { getCompanyFromFirebase } from '@/services/firebase'
import { CompanyProfile } from '@/components/company-profile'
import type { Lead, Note } from '@/lib/types'
import React, { useEffect, useState } from 'react'
import { Loader } from '@/components/ui/loader';

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
  }, [params]);
  
  const handleNoteLogged = (newNote: Note) => {
    setCompany(prev => prev ? ({...prev, notes: [newNote, ...(prev.notes || [])]}) : null);
  };

  if (loading) {
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
