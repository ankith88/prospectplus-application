"use client"

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { UserProfile } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { CalendarSettingsConfig } from '@/components/account-manager/calendar-settings-config';

export default function AdminAMCalendarIndividualSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const amId = params.amId as string;
  const { isSuperAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [amUser, setAmUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function fetchUser() {
      if (!amId) return;
      try {
        const userRef = doc(firestore, 'users', amId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setAmUser(snap.data() as UserProfile);
        }
      } catch (error) {
        console.error("Error fetching AM:", error);
      } finally {
        setLoading(false);
      }
    }

    if (isSuperAdmin) {
      fetchUser();
    }
  }, [amId, isSuperAdmin]);

  if (!isSuperAdmin) {
    return <div className="p-6">You do not have permission to view this page.</div>;
  }

  if (loading) {
    return <div className="flex justify-center items-center h-[calc(100vh-100px)]"><Loader /></div>;
  }

  if (!amUser) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Account Manager Not Found</h2>
        <Button onClick={() => router.push('/admin/settings/am-calendar')}>Back to Directory</Button>
      </div>
    );
  }

  const displayName = amUser.displayName || `${amUser.firstName || ''} ${amUser.lastName || ''}`.trim();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/settings/am-calendar')} className="h-10 w-10 shrink-0">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Manage Calendar: {displayName}</h2>
          <p className="text-muted-foreground mt-1">Configure booking availability and view Outlook integration status.</p>
        </div>
      </div>

      {/* Reusing the exact same configuration component but in "admin mode" (isOwner = false) */}
      <CalendarSettingsConfig userId={amId} isOwner={false} />
    </div>
  );
}
