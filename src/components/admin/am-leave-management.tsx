'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { getAestDateString, hasLeaveEnded } from '@/lib/leave-utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';

export function AmLeaveManagement() {
  const [accountManagers, setAccountManagers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAMs = async () => {
    setLoading(true);
    try {
      const usersRef = collection(firestore, 'users');
      // Fetch both 'Account Managers' and 'Account Manager' to cover role variations
      const [snap1, snap2] = await Promise.all([
        getDocs(query(usersRef, where('assignedRoles', 'array-contains', 'Account Managers'))),
        getDocs(query(usersRef, where('assignedRoles', 'array-contains', 'Account Manager'))),
      ]);
      const amMap = new Map<string, UserProfile>();
      snap1.docs.forEach(d => amMap.set(d.id, { uid: d.id, ...d.data() } as UserProfile));
      snap2.docs.forEach(d => amMap.set(d.id, { uid: d.id, ...d.data() } as UserProfile));
      const ams = Array.from(amMap.values());

      const todayStr = getAestDateString();
      const updatedAms = await Promise.all(
        ams.map(async (am) => {
          const profile = am.leaveProfile;
          // If leave endDate is set and has passed, automatically revert to Available
          if (profile?.isOnLeave && profile.endDate && todayStr > profile.endDate) {
            const newProfile = {
              ...profile,
              isOnLeave: false,
              stopAssignment: false,
              startDate: '',
              endDate: '',
              backupAmName: '',
            };
            try {
              const userRef = doc(firestore, 'users', am.uid);
              await updateDoc(userRef, { leaveProfile: newProfile });
            } catch (err) {
              console.error(`Failed to auto-update expired leave for AM ${am.uid}:`, err);
            }
            return { ...am, leaveProfile: newProfile };
          }
          return am;
        })
      );

      setAccountManagers(updatedAms);
    } catch (error) {
      console.error("Failed to fetch account managers", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch Account Managers.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAMs();
  }, []);

  const handleUpdateLeave = async (uid: string, newProfile: any) => {
    setSavingId(uid);
    try {
      const todayStr = getAestDateString();
      // If leave endDate has passed, automatically set isOnLeave to false
      if (newProfile.isOnLeave && newProfile.endDate && todayStr > newProfile.endDate) {
        newProfile.isOnLeave = false;
        newProfile.stopAssignment = false;
        newProfile.startDate = '';
        newProfile.endDate = '';
        newProfile.backupAmName = '';
        toast({ 
          title: 'Notice', 
          description: 'The selected leave end date has passed. Status automatically set to Available.' 
        });
      }

      const userRef = doc(firestore, 'users', uid);
      await updateDoc(userRef, { leaveProfile: newProfile });
      setAccountManagers(prev => prev.map(am => am.uid === uid ? { ...am, leaveProfile: newProfile } : am));
      toast({ title: 'Success', description: 'Leave profile updated successfully.' });
    } catch (error) {
      console.error("Failed to update leave profile", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update leave profile.' });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader /></div>;
  }

  if (accountManagers.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No Account Managers found in the system.</div>;
  }

  const getName = (am: UserProfile) => am.displayName || [am.firstName, am.lastName].filter(Boolean).join(' ') || am.email;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account Manager</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Leave Dates</TableHead>
            <TableHead>Backup AM</TableHead>
            <TableHead>Stop Assignments</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accountManagers.map((am) => {
            const leaveProfile = am.leaveProfile || { isOnLeave: false, backupAmName: 'none', stopAssignment: false, startDate: '', endDate: '' };
            const isExpired = hasLeaveEnded(leaveProfile);
            const isEffectivelyOnLeave = leaveProfile.isOnLeave && !isExpired;
            
            // Backup AM options (exclude self)
            const backupOptions = accountManagers.filter(b => b.uid !== am.uid);

            return (
              <TableRow key={am.uid}>
                <TableCell className="font-medium">
                  {getName(am)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={isEffectivelyOnLeave}
                      onCheckedChange={(checked) => {
                        if (checked && isExpired) {
                          // Clear previous expired dates so user can enter new dates
                          handleUpdateLeave(am.uid, { ...leaveProfile, isOnLeave: true, startDate: '', endDate: '' });
                        } else {
                          handleUpdateLeave(am.uid, { ...leaveProfile, isOnLeave: checked });
                        }
                      }}
                      disabled={savingId === am.uid}
                    />
                    <Badge variant={isEffectivelyOnLeave ? 'destructive' : 'secondary'}>
                      {isEffectivelyOnLeave ? 'On Leave' : 'Available'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    {isEffectivelyOnLeave ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-10">Start:</span>
                          <Input 
                            type="date" 
                            className="h-8 text-sm px-2 py-1 w-36" 
                            value={leaveProfile.startDate || ''} 
                            onChange={(e) => handleUpdateLeave(am.uid, { ...leaveProfile, startDate: e.target.value })}
                            disabled={savingId === am.uid}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-10">End:</span>
                          <Input 
                            type="date" 
                            className="h-8 text-sm px-2 py-1 w-36" 
                            value={leaveProfile.endDate || ''} 
                            onChange={(e) => handleUpdateLeave(am.uid, { ...leaveProfile, endDate: e.target.value })}
                            disabled={savingId === am.uid}
                          />
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Select 
                    value={leaveProfile.backupAmName || 'none'}
                    onValueChange={(val) => handleUpdateLeave(am.uid, { ...leaveProfile, backupAmName: val === 'none' ? '' : val })}
                    disabled={!isEffectivelyOnLeave || savingId === am.uid}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select Backup AM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {backupOptions.map(b => {
                        const bName = getName(b);
                        return <SelectItem key={b.uid} value={bName}>{bName}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={Boolean(leaveProfile.stopAssignment && isEffectivelyOnLeave)}
                      onCheckedChange={(checked) => handleUpdateLeave(am.uid, { ...leaveProfile, stopAssignment: checked })}
                      disabled={!isEffectivelyOnLeave || savingId === am.uid}
                    />
                    <span className="text-sm text-muted-foreground">
                      {(leaveProfile.stopAssignment && isEffectivelyOnLeave) ? 'Yes' : 'No'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {savingId === am.uid && <Loader />}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
