
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { UserManagementTable } from '@/components/admin/user-management-table';
import { CreateUserDialog } from '@/components/admin/create-user-dialog';

export default function AdminSettingsPage() {
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  const isSuperAdmin = userProfile?.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.replace('/leads');
    }
  }, [userProfile, authLoading, router, isSuperAdmin]);

  if (authLoading || !isSuperAdmin) {
    return <div className="flex h-full items-center justify-center"><Loader /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
       <CreateUserDialog isOpen={isCreateUserOpen} onOpenChange={setIsCreateUserOpen} onUserCreated={() => {}} />
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground">Manage users and system settings.</p>
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
