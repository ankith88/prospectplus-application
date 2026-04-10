
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Lock, Mail, UserX, Edit, Search, ArrowUpDown, LogOut, CheckSquare, X, BellRing } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { CreateUserDialog } from './create-user-dialog';
import { SendNotificationDialog } from './send-notification-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';

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
  const [newFranchisee, setNewFranchisee] = useState('');

  // Bulk Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBulkLoggingOut, setIsBulkLoggingOut] = useState(false);
  const [showBulkLogoutConfirm, setShowBulkLogoutConfirm] = useState(false);

  // Notification State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationTargetUsers, setNotificationTargetUsers] = useState<{ uid: string; displayName: string }[]>([]);

  // Search and Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof UserProfile; direction: 'ascending' | 'descending' } | null>({ key: 'displayName', direction: 'ascending' });

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
      setNewFranchisee(userToEdit.franchisee || '');
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
      const updateData: Partial<UserProfile> = { role: newRole as UserProfile['role'] };
      if (newRole === 'Field Sales') {
        updateData.linkedSalesRep = newLinkedSalesRep;
        updateData.linkedBDR = newLinkedBDR;
        updateData.franchisee = '';
      } else if (newRole === 'Franchisee') {
        updateData.franchisee = newFranchisee;
        updateData.linkedSalesRep = '';
        updateData.linkedBDR = '';
      } else {
        updateData.linkedSalesRep = '';
        updateData.linkedBDR = '';
        updateData.franchisee = '';
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

  const handleBulkLogout = async () => {
    if (selectedUserIds.length === 0) return;
    setIsBulkLoggingOut(true);
    try {
        const timestamp = new Date().toISOString();
        await Promise.all(selectedUserIds.map(uid => 
            updateUser(uid, { forceLogoutAt: timestamp } as any)
        ));
        toast({ title: 'Success', description: `Logout signal sent to ${selectedUserIds.length} users.` });
        setSelectedUserIds([]);
        setShowBulkLogoutConfirm(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
    } finally {
        setIsBulkLoggingOut(false);
    }
  };

  const handleNotifySelected = () => {
      const targets = users.filter(u => selectedUserIds.includes(u.uid)).map(u => ({ uid: u.uid, displayName: u.displayName || u.email }));
      setNotificationTargetUsers(targets);
      setIsNotificationOpen(true);
  };

  const handleNotifySingle = (user: UserProfile) => {
      setNotificationTargetUsers([{ uid: user.uid, displayName: user.displayName || user.email }]);
      setIsNotificationOpen(true);
  };

  const handleSelectUser = (uid: string, checked: boolean) => {
    setSelectedUserIds(prev => 
        checked ? [...prev, uid] : prev.filter(id => id !== uid)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedUserIds(checked ? processedUsers.map(u => u.uid) : []);
  };

  // Process users for display (Search and Sort)
  const processedUsers = useMemo(() => {
    let result = [...users];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(u => 
        (u.displayName || '').toLowerCase().includes(lowerSearch) || 
        u.email.toLowerCase().includes(lowerSearch)
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = (a[sortConfig.key] || '').toString().toLowerCase();
        const bValue = (b[sortConfig.key] || '').toString().toLowerCase();
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [users, searchTerm, sortConfig]);

  const activeBDRs = useMemo(() => {
    return users.filter(u => u.role === 'user' && !u.disabled);
  }, [users]);

  const requestSort = (key: keyof UserProfile) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof UserProfile) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader /></div>;
  }

  return (
    <>
      <CreateUserDialog isOpen={isCreateUserOpen} onOpenChange={setIsCreateUserOpen} onUserCreated={fetchUsers} />
      <SendNotificationDialog 
        isOpen={isNotificationOpen} 
        onOpenChange={setIsNotificationOpen} 
        users={notificationTargetUsers}
        onSuccess={() => setSelectedUserIds([])}
      />
      
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                    placeholder="Search by name or email..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {searchTerm && (
                    <Button variant="ghost" size="icon" onClick={() => setSearchTerm('')}>
                    <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
            {selectedUserIds.length > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                    <span className="text-sm font-medium">{selectedUserIds.length} selected</span>
                    <Button variant="outline" size="sm" onClick={handleNotifySelected}>
                        <BellRing className="mr-2 h-4 w-4" />
                        Send Alert
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowBulkLogoutConfirm(true)}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Log Out
                    </Button>
                </div>
            )}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                    <Checkbox 
                        checked={processedUsers.length > 0 && selectedUserIds.length === processedUsers.length}
                        onCheckedChange={handleSelectAll}
                    />
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('displayName')} className="group -ml-4">
                    Name{getSortIndicator('displayName')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('email')} className="group -ml-4">
                    Email{getSortIndicator('email')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('role')} className="group -ml-4">
                    Role{getSortIndicator('role')}
                  </Button>
                </TableHead>
                <TableHead>Franchise</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedUsers.length > 0 ? (
                processedUsers.map((user) => (
                  <TableRow key={user.uid} data-state={selectedUserIds.includes(user.uid) && "selected"}>
                    <TableCell>
                        <Checkbox 
                            checked={selectedUserIds.includes(user.uid)}
                            onCheckedChange={(checked) => handleSelectUser(user.uid, !!checked)}
                        />
                    </TableCell>
                    <TableCell className="font-medium">{user.displayName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant="outline">{user.role || 'N/A'}</Badge></TableCell>
                    <TableCell>{user.franchisee || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={user.disabled ? 'destructive' : 'secondary'}>
                        {user.disabled ? 'Disabled' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleNotifySingle(user)} title="Send Alert">
                          <BellRing className="h-4 w-4" />
                      </Button>
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
                  <TableCell colSpan={7} className="h-24 text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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

      <AlertDialog open={showBulkLogoutConfirm} onOpenChange={setShowBulkLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Log Out {selectedUserIds.length} Users?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate the current sessions for all selected users. They will be immediately redirected to the sign-in page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkLoggingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkLogout} disabled={isBulkLoggingOut}>
              {isBulkLoggingOut ? <Loader /> : 'Force Log Out'}
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
                            <SelectItem value="Franchisee">Franchisee</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {newRole === 'Franchisee' && (
                    <div className="space-y-2">
                        <Label>Franchise Name</Label>
                        <Input value={newFranchisee} onChange={(e) => setNewFranchisee(e.target.value)} placeholder="e.g. Sydney City" />
                    </div>
                )}
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
                            {activeBDRs.map((bdr) => (
                                <SelectItem key={bdr.uid} value={bdr.displayName || bdr.email}>
                                    {bdr.displayName || bdr.email}
                                </SelectItem>
                            ))}
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
