
'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader } from '../ui/loader';
import { getAllUsers } from '@/services/firebase';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { Lock, Mail, UserX } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

// This would ideally be a server action calling Firebase Admin SDK
async function toggleUserActivation(uid: string, disabled: boolean) {
    console.log(`Simulating user activation toggle for UID ${uid} to ${disabled ? 'disabled' : 'enabled'}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    throw new Error("Client-side user activation is not implemented for security reasons. This requires a backend function.");
}


export function UserManagementTable() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userToToggle, setUserToToggle] = useState<UserProfile | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState<string | null>(null);

  const { toast } = useToast();
  const { sendPasswordReset } = useAuth();
  
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const fetchedUsers = await getAllUsers();
        setUsers(fetchedUsers);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch users.' });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [toast]);
  
  const handleToggleActivation = async () => {
    if (!userToToggle) return;
    setIsToggling(true);
    try {
        // In a real application, this would call a server action.
        await toggleUserActivation(userToToggle.uid, !userToToggle.disabled);
        
        setUsers(prev => prev.map(u => u.uid === userToToggle.uid ? { ...u, disabled: !u.disabled } : u));
        toast({ title: 'Success', description: `User has been ${userToToggle.disabled ? 'enabled' : 'disabled'}.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Action Not Implemented', description: error.message, duration: 10000 });
    } finally {
        setIsToggling(false);
        setUserToToggle(null);
    }
  };
  
  const handleSendResetEmail = async (email: string) => {
    setIsSendingReset(email);
    try {
        await sendPasswordReset(email);
        toast({ title: 'Success', description: `Password reset email sent to ${email}.` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: `Could not send reset email.` });
    } finally {
        setIsSendingReset(null);
    }
  };


  if (loading) {
    return <div className="flex justify-center p-8"><Loader /></div>;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">{user.displayName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell><Badge variant="outline">{user.role || 'N/A'}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={user.disabled ? 'destructive' : 'secondary'}>
                      {user.disabled ? 'Disabled' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleSendResetEmail(user.email)} disabled={!!isSendingReset}>
                        {isSendingReset === user.email ? <Loader/> : <Mail className="mr-2 h-4 w-4" />}
                        Reset Password
                    </Button>
                    <Button variant={user.disabled ? "secondary" : "destructive"} size="sm" onClick={() => setUserToToggle(user)}>
                        <UserX className="mr-2 h-4 w-4" />
                        {user.disabled ? 'Enable' : 'Disable'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

       <AlertDialog open={!!userToToggle} onOpenChange={(open) => !open && setUserToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will {userToToggle?.disabled ? 'enable' : 'disable'} the user account for{' '}
              <span className="font-bold">{userToToggle?.displayName}</span>. 
              {userToToggle?.disabled ? ' They will be able to log in again.' : ' They will no longer be able to log in.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isToggling}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleActivation} disabled={isToggling} className={userToToggle?.disabled ? '' : 'bg-destructive hover:bg-destructive/90'}>
              {isToggling ? <Loader /> : (userToToggle?.disabled ? 'Enable' : 'Disable')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
