

'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { getAllUsers, updateUser } from '@/services/firebase';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { Lock, Mail, UserX, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { CreateUserDialog } from './create-user-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';


export function UserManagementTable() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userToToggle, setUserToToggle] = useState<UserProfile | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState<string | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newRole, setNewRole] = useState<UserProfile['role'] | ''>('');
  const [newLinkedSalesRep, setNewLinkedSalesRep] = useState('');
  const [newLinkedBDR, setNewLinkedBDR] = useState('');


  const { toast } = useToast();
  const { sendPasswordReset } = useAuth();
  
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
        const fetchedUsers = await getAllUsers();
        setUsers(fetchedUsers);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch users.' });
    } finally {
        setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  useEffect(() => {
    if (userToEdit) {
      setNewRole(userToEdit.role || 'user');
      setNewLinkedSalesRep(userToEdit.linkedSalesRep || '');
      setNewLinkedBDR(userToEdit.linkedBDR || '');
    }
  }, [userToEdit]);

  const handleToggleActivation = async () => {
    if (!userToToggle) return;
    setIsToggling(true);
    try {
        await updateUser(userToToggle.uid, { disabled: !userToToggle.disabled });
        
        setUsers(prev => prev.map(u => u.uid === userToToggle.uid ? { ...u, disabled: !u.disabled } : u));
        toast({ title: 'Success', description: `User has been ${userToToggle.disabled ? 'enabled' : 'disabled'}.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message, duration: 10000 });
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

  const handleUpdateUser = async () => {
    if (!userToEdit || !newRole) return;
    setIsUpdating(true);
    try {
      const updateData: Partial<UserProfile> = { role: newRole };
      if (newRole === 'Field Sales') {
        updateData.linkedSalesRep = newLinkedSalesRep;
        updateData.linkedBDR = newLinkedBDR;
      } else {
        updateData.linkedSalesRep = '';
        updateData.linkedBDR = '';
      }
      
      await updateUser(userToEdit.uid, updateData);
      
      setUsers(prev => prev.map(u => u.uid === userToEdit.uid ? { ...u, ...updateData } : u));
      toast({ title: 'Success', description: `User details have been updated.` });
      setUserToEdit(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };


  if (loading) {
    return <div className="flex justify-center p-8"><Loader /></div>;
  }

  return (
    <>
      <CreateUserDialog isOpen={isCreateUserOpen} onOpenChange={setIsCreateUserOpen} onUserCreated={fetchUsers} />
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
                    <Button variant="outline" size="sm" onClick={() => setUserToEdit(user)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
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

      <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit User: {userToEdit?.displayName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="role-select">Role</Label>
                    <Select value={newRole} onValueChange={(value) => setNewRole(value as UserProfile['role'])}>
                        <SelectTrigger id="role-select">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="user">Dialer (user)</SelectItem>
                            <SelectItem value="admin">Admin (admin)</SelectItem>
                            <SelectItem value="Field Sales">Field Sales</SelectItem>
                            <SelectItem value="Field Sales Admin">Field Sales Admin</SelectItem>
                            <SelectItem value="Lead Gen">Lead Gen</SelectItem>
                            <SelectItem value="Lead Gen Admin">Lead Gen Admin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {newRole === 'Field Sales' && (
                    <>
                        <div className="space-y-2">
                        <Label>Account Manager</Label>
                        <Select value={newLinkedSalesRep} onValueChange={setNewLinkedSalesRep}>
                            <SelectTrigger>
                            <SelectValue placeholder="Select an Account Manager" />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="Kerina Helliwell">Kerina Helliwell</SelectItem>
                            <SelectItem value="Lee Russell">Lee Russell</SelectItem>
                            <SelectItem value="Luke Forbes">Luke Forbes</SelectItem>
                            </SelectContent>
                        </Select>
                        </div>
                        <div className="space-y-2">
                        <Label>BDR</Label>
                        <Select value={newLinkedBDR} onValueChange={setNewLinkedBDR}>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a BDR" />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="Lachlan Ball">Lachlan Ball</SelectItem>
                            <SelectItem value="Grant Leddy">Grant Leddy</SelectItem>
                            </SelectContent>
                        </Select>
                        </div>
                    </>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setUserToEdit(null)}>Cancel</Button>
                <Button onClick={handleUpdateUser} disabled={isUpdating || !newRole}>
                    {isUpdating ? <Loader /> : 'Save Changes'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
