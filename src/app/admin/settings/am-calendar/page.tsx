"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { UserProfile } from '@/lib/types';
import { Settings, Calendar as CalendarIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export default function AdminAMCalendarSettingsPage() {
  const router = useRouter();
  const { isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ams, setAms] = useState<UserProfile[]>([]);

  useEffect(() => {
    async function fetchAms() {
      try {
        const usersRef = collection(firestore, 'users');
        // Fetch all users and filter in memory since role filtering can be complex if role is in assignedRoles array
        const snap = await getDocs(usersRef);
        const amUsers = snap.docs
          .map(doc => {
            const data = doc.data() as UserProfile;
            return { ...data, uid: doc.id }; // ensure uid is set from doc id
          })
          .filter(user => {
            const roles = (user.assignedRoles || []).map(r => r.toLowerCase());
            const activeRole = (user.activeRole || '').toLowerCase();
            const hasAmRole = roles.includes('account manager') || roles.includes('account managers') || 
                              activeRole === 'account manager' || activeRole === 'account managers';
            return hasAmRole && !user.disabled;
          });
        
        setAms(amUsers);
      } catch (error) {
        console.error("Error fetching AMs:", error);
      } finally {
        setLoading(false);
      }
    }

    if (isSuperAdmin) {
      fetchAms();
    }
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return <div className="p-6">You do not have permission to view this page.</div>;
  }

  if (loading) {
    return <div className="flex justify-center items-center h-[calc(100vh-100px)]"><Loader /></div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Account Manager Calendars</h2>
        <p className="text-muted-foreground mt-2">Manage calendar connections and working hours for all Account Managers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ams.map(am => {
          const isConnected = !!am.microsoftRefreshToken;
          const displayName = am.displayName || `${am.firstName || ''} ${am.lastName || ''}`.trim();
          
          return (
            <Card key={am.uid} className="border-[#095c7b]/10 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center justify-between">
                  <span className="truncate">{displayName}</span>
                  <div className={`p-1.5 rounded-full ${isConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`} title={isConnected ? 'Connected' : 'Not Connected'}>
                    {isConnected ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  </div>
                </CardTitle>
                <CardDescription className="truncate">{am.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full justify-start mt-2 border-[#095c7b]/20 text-[#095c7b] hover:bg-[#095c7b]/5"
                  onClick={() => router.push(`/admin/settings/am-calendar/${am.uid}`)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Settings
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {ams.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            No active Account Managers found.
          </div>
        )}
      </div>
    </div>
  );
}
