"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_ROLE_ACCESS } from '@/hooks/use-permissions';
import { getAllUsers } from '@/services/firebase';
import type { UserProfile } from '@/lib/types';

const AVAILABLE_ROLES = [
  'user', 'Outbound Admin', 'Field Sales', 'Field Sales Admin', 'Lead Gen', 'Lead Gen Admin', 'Franchisee',
  'Sales Manager', 'Dashback', 'Account Managers', 'Account Manager', 'Marketing Admin',
  'Marketing Manager', 'Customer Success', 'Customer Service', 'super user',
  'Operations', 'Finance', 'Finanace Manager', 'Finance Manager', 'Data Admin'
];

const FEATURES = [
  { id: 'executiveDashboard', label: 'Executive Dashboard' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'marketingGroup', label: 'Marketing Group' },
  { id: 'fieldSalesD2D', label: 'Door-to-Door' },
  { id: 'captureVisit', label: 'Capture Visit' },
  { id: 'visitNotes', label: 'Visit Notes' },
  { id: 'routesCoverage', label: 'Routes & Coverage' },
  { id: 'teamSchedules', label: 'Team Schedules' },
  { id: 'newLead', label: 'Create Lead' },
  { id: 'outboundLeads', label: 'Outbound Leads' },
  { id: 'inboundLeads', label: 'Inbound Leads' },
  { id: 'importLeads', label: 'Import Leads' },
  { id: 'unassignedLeads', label: 'Unassigned Leads' },
  { id: 'accountManagerPipeline', label: 'AM Pipeline' },
  { id: 'customerSuccessPipeline', label: 'CS Pipeline' },
  { id: 'reporting', label: 'Outbound & Field Reporting' },
  { id: 'inboundReporting', label: 'Inbound Reporting' },
  { id: 'amReporting', label: 'AM Reporting' },
  { id: 'deploymentHistory', label: 'Deployment History' },
  { id: 'signedCustomers', label: 'Signed Customers' },
  { id: 'scans', label: 'Scans' },
  { id: 'historyAppointments', label: 'History: Appointments' },
  { id: 'historyCallsTranscripts', label: 'History: Calls & Transcripts' },
  { id: 'checkIns', label: 'Check-ins' },
  { id: 'franchisees', label: 'Franchisees Directory' }
];

export default function RoleSettingsPage() {
  const { userProfile, loading, isSuperAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!loading) {
      if (!isSuperAdmin && userProfile?.activeRole !== 'admin') {
        router.push('/');
        return;
      }
      
      const fetchPermissions = async () => {
        try {
          const docRef = doc(firestore, 'settings', 'roleAccessMatrix');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().features) {
            setMatrix(docSnap.data().features);
          } else {
            setMatrix(DEFAULT_ROLE_ACCESS);
          }
          
          const fetchedUsers = await getAllUsers();
          setUsers(fetchedUsers.sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email)));
        } catch (error) {
          console.error("Error fetching permissions", error);
          toast({ title: 'Error loading permissions', variant: 'destructive' });
        } finally {
          setFetching(false);
        }
      };
      
      fetchPermissions();
    }
  }, [loading, isSuperAdmin, userProfile, router, toast]);

  if (loading || fetching) {
    return <div className="flex h-[400px] items-center justify-center"><Loader /></div>;
  }

  const handleToggle = (featureId: string, role: string) => {
    setMatrix(prev => {
      const currentRoles = prev[featureId] || [];
      const newRoles = currentRoles.includes(role)
        ? currentRoles.filter(r => r !== role)
        : [...currentRoles, role];
        
      return { ...prev, [featureId]: newRoles };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(firestore, 'settings', 'roleAccessMatrix'), { features: matrix });
      toast({ title: 'Permissions updated successfully' });
    } catch (error) {
      console.error("Error saving permissions", error);
      toast({ title: 'Error saving permissions', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filteredRoles = AVAILABLE_ROLES.filter(role => {
    if (selectedUser !== 'all') {
      const user = users.find(u => u.uid === selectedUser);
      if (user) {
        const userRoles = user.assignedRoles || (user.role ? [user.role] : []);
        // admin role bypasses, but is not in AVAILABLE_ROLES. 
        // So we only filter against what they have assigned.
        if (!userRoles.includes(role as any)) {
          return false;
        }
      }
    }
    
    if (selectedRole !== 'all') {
      if (role !== selectedRole) {
        return false;
      }
    }
    
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Role Access Management</h1>
        <p className="text-muted-foreground">Configure which roles can access specific features and sidebar items.</p>
        <div className="mt-2 text-sm text-amber-800 bg-amber-50 p-3 rounded-md border border-amber-200">
          <strong>Note:</strong> The "admin" role always has full access and is not listed here. Check the boxes to grant access to other roles.
        </div>
      </div>
      
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Access Matrix</CardTitle>
            <CardDescription>Changes will take effect immediately for all users.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by User..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.uid} value={u.uid}>{u.displayName || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by Role..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {AVAILABLE_ROLES.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleSave} disabled={saving} className="shrink-0 w-full sm:w-auto">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-t">
              <tr>
                <th className="px-4 py-3 font-medium sticky left-0 bg-muted/50 z-10 min-w-[200px] border-r">Feature</th>
                {filteredRoles.map(role => (
                  <th key={role} className="px-2 py-4 font-medium text-center min-w-[100px] border-r align-bottom">
                    <div className="writing-mode-vertical transform -rotate-180 whitespace-nowrap mx-auto" style={{ writingMode: 'vertical-rl' }}>
                      {role}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y border-b">
              {FEATURES.map(feature => (
                <tr key={feature.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium sticky left-0 bg-background z-10 border-r">
                    {feature.label}
                  </td>
                  {filteredRoles.map(role => {
                    const isAllowed = (matrix[feature.id] || []).includes(role);
                    return (
                      <td key={`${feature.id}-${role}`} className="px-2 py-3 text-center border-r hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleToggle(feature.id, role)}>
                        <input 
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer pointer-events-none"
                          checked={isAllowed}
                          readOnly
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
