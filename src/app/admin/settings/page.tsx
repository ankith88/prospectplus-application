

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, ShieldAlert, Phone } from 'lucide-react';
import { UserManagementTable } from '@/components/admin/user-management-table';
import { CreateUserDialog } from '@/components/admin/create-user-dialog';

export default function AdminSettingsPage() {
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const { userProfile, loading: authLoading, isSuperAdmin } = useAuth();
  const router = useRouter();



  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.replace('/leads');
    }
  }, [userProfile, authLoading, router, isSuperAdmin]);

  const handleUserCreated = useCallback(() => {
    // This is a dummy function to trigger re-render in child component
    // The actual fetching is handled inside UserManagementTable
  }, []);

  if (authLoading || !isSuperAdmin) {
    return <div className="flex h-full items-center justify-center"><Loader /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
       <CreateUserDialog isOpen={isCreateUserOpen} onOpenChange={setIsCreateUserOpen} onUserCreated={handleUserCreated} />
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
          <p className="text-muted-foreground">Manage users and system settings.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => router.push('/admin/settings/telephony')} className="border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 text-[#095c7b] dark:text-[#38bdf8] font-medium">
            <Phone className="mr-2 h-4 w-4" />
            Telephony Switch
          </Button>
          <Button variant="outline" onClick={() => router.push('/admin/services')}>
            Service Line Items & Commissions
          </Button>
          <Button variant="outline" onClick={() => router.push('/admin/settings/cancellation-reasons')}>
            Cancellation Hierarchy
          </Button>
          <Button variant="outline" onClick={() => router.push('/admin/settings/roles')}>
            <ShieldAlert className="mr-2 h-4 w-4" />
            Role Permissions
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Create, deactivate, and manage system users.</CardDescription>
          </div>
          <Button onClick={() => setIsCreateUserOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        </CardHeader>
        <CardContent>
            <UserManagementTable />
        </CardContent>
      </Card>
    </div>
  );
}
