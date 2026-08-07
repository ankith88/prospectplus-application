
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UserRole } from '@/lib/types';
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
import { getAllUsers, updateUser, getAllFranchisees, deleteUserCompletely, unlinkUserFromFranchiseeCompletely } from '@/services/firebase';
import type { UserProfile, AdminApprovalRequest, Franchisee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { Lock, Mail, UserX, UserCheck, Edit, Search, ArrowUpDown, LogOut, CheckSquare, X, BellRing, Clock, ShieldAlert, CheckCircle2, AlertTriangle, Trash2, Unlink } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';
import { CreateUserDialog } from './create-user-dialog';
import { SendNotificationDialog } from './send-notification-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  getAllAdminApprovalRequests, 
  createAdminApprovalRequest, 
  approveAdminAccessRequest, 
  rejectAdminAccessRequest, 
  ORIGINAL_ADMIN_UID, 
  SUPER_ADMIN_REQUIRING_APPROVAL_UID 
} from '@/services/admin-approval';

export function UserManagementTable() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<AdminApprovalRequest[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userToToggle, setUserToToggle] = useState<UserProfile | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState<string | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newAssignedRoles, setNewAssignedRoles] = useState<UserRole[]>([]);
  const [newDefaultRole, setNewDefaultRole] = useState<UserRole | ''>('');
  const [newLinkedSalesRep, setNewLinkedSalesRep] = useState('');
  const [newLinkedBDR, setNewLinkedBDR] = useState('');
  const [newFranchisee, setNewFranchisee] = useState('');
  const [newFranchiseeId, setNewFranchiseeId] = useState('');
  const [newFranchiseeRole, setNewFranchiseeRole] = useState<'owner' | 'investor'>('owner');
  const [newPersonalEmail, setNewPersonalEmail] = useState('');
  const [newAbn, setNewAbn] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newSuburb, setNewSuburb] = useState('');
  const [newState, setNewState] = useState('');
  const [newPostcode, setNewPostcode] = useState('');
  const [newBsb, setNewBsb] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newMobileNumber, setNewMobileNumber] = useState('');
  const [newAircallPhoneNumber, setNewAircallPhoneNumber] = useState('');
  const [allFranchisees, setAllFranchisees] = useState<Franchisee[]>([]);

  // Bulk Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBulkLoggingOut, setIsBulkLoggingOut] = useState(false);
  const [showBulkLogoutConfirm, setShowBulkLogoutConfirm] = useState(false);

  // Notification State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationTargetUsers, setNotificationTargetUsers] = useState<{ uid: string; displayName: string }[]>([]);

  // Deletion & Unlinking State
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  // Search, Tab and Sort State
  const [activeTab, setActiveTab] = useState<'active' | 'disabled' | 'all'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof UserProfile; direction: 'ascending' | 'descending' } | null>({ key: 'displayName', direction: 'ascending' });

  const { toast } = useToast();
  const { sendPasswordReset, userProfile, isSuperAdmin } = useAuth();

  const isOriginalAdmin = userProfile?.uid === ORIGINAL_ADMIN_UID;
  const isSuperAdminRequiringApproval = userProfile?.uid === SUPER_ADMIN_REQUIRING_APPROVAL_UID;
  
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
        const [fetchedUsers, fetchedRequests, fetchedFranchisees] = await Promise.all([
          getAllUsers(),
          getAllAdminApprovalRequests(),
          getAllFranchisees(),
        ]);
        setUsers(fetchedUsers);
        setApprovalRequests(fetchedRequests);
        setAllFranchisees(fetchedFranchisees);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch users.' });
    } finally {
        setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchUsers();

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const approvalSuccess = urlParams.get('approvalSuccess');
      const approvalMessage = urlParams.get('approvalMessage');
      const approvalError = urlParams.get('approvalError');

      if (approvalSuccess) {
        toast({ title: 'Approval Successful', description: approvalSuccess });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (approvalMessage) {
        toast({ title: 'Request Processed', description: approvalMessage });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (approvalError) {
        toast({ variant: 'destructive', title: 'Approval Error', description: approvalError });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [fetchUsers, toast]);
  
  useEffect(() => {
    if (userToEdit) {
      const assigned = userToEdit.assignedRoles || (userToEdit.role ? [userToEdit.role] : []);
      const isFranchiseeUser = assigned.includes('Franchisee') || userToEdit.role === 'Franchisee' || userToEdit.defaultRole === 'Franchisee';

      if (isFranchiseeUser) {
        setNewAssignedRoles(['Franchisee']);
        setNewDefaultRole('Franchisee');
      } else {
        setNewAssignedRoles(assigned);
        setNewDefaultRole(userToEdit.defaultRole || userToEdit.role || 'user');
      }

      const linkedFran = userToEdit.linkedFranchisees?.[0];

      setNewLinkedSalesRep(userToEdit.linkedSalesRep || '');
      setNewLinkedBDR(userToEdit.linkedBDR || '');
      setNewFranchisee(userToEdit.franchisee || linkedFran?.franchiseeName || '');
      setNewFranchiseeId(userToEdit.franchiseeId || userToEdit.franchiseeInternalId || linkedFran?.franchiseeId || '');
      setNewPhoneNumber(userToEdit.phoneNumber || '');
      setNewMobileNumber(userToEdit.mobileNumber || userToEdit.phoneNumber || '');
      setNewAircallPhoneNumber(userToEdit.aircallPhoneNumber || '');
      setNewFranchiseeRole(userToEdit.franchiseeRole || linkedFran?.relationship || 'owner');
      setNewPersonalEmail(userToEdit.personalEmail || '');
      setNewAbn(userToEdit.abn || '');
      setNewStreet(userToEdit.addressDetails?.street || '');
      setNewSuburb(userToEdit.addressDetails?.suburb || '');
      setNewState(userToEdit.addressDetails?.state || '');
      setNewPostcode(userToEdit.addressDetails?.postcode || '');
      setNewBsb(userToEdit.bankDetails?.bsb || '');
      setNewAccountNumber(userToEdit.bankDetails?.accountNumber || '');
      setNewAccountName(userToEdit.bankDetails?.accountName || '');
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

  const handleDeleteUser = async () => {
    if (!userToDelete || !userProfile?.uid) return;

    if (SUPER_ADMIN_UIDS.includes(userToDelete.uid)) {
      toast({
        variant: 'destructive',
        title: 'Action Forbidden',
        description: 'Super Admin accounts cannot be deleted.',
      });
      setUserToDelete(null);
      return;
    }

    if (userToDelete.uid === userProfile.uid) {
      toast({
        variant: 'destructive',
        title: 'Action Not Allowed',
        description: 'You cannot delete your own account.',
      });
      setUserToDelete(null);
      return;
    }

    setIsDeletingUser(true);
    try {
      await deleteUserCompletely(userToDelete.uid, userProfile.uid);
      setUsers(prev => prev.filter(u => u.uid !== userToDelete.uid));
      setSelectedUserIds(prev => prev.filter(id => id !== userToDelete.uid));
      toast({
        title: 'User Deleted Permanently',
        description: `User ${userToDelete.displayName || userToDelete.email} was completely deleted from Authentication and Firestore.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message || 'Could not delete user.',
      });
    } finally {
      setIsDeletingUser(false);
      setUserToDelete(null);
    }
  };

  const handleUnlinkFranchisee = async () => {
    if (!userToEdit || !userProfile?.uid) return;

    setIsUnlinking(true);
    try {
      await unlinkUserFromFranchiseeCompletely(userToEdit.uid, undefined, userProfile.uid);
      toast({
        title: 'User Unlinked Completely',
        description: `User ${userToEdit.displayName || userToEdit.email} has been completely unlinked from all franchisee records.`,
      });
      setNewFranchiseeId('');
      setNewFranchisee('');
      setShowUnlinkConfirm(false);
      setUserToEdit(null);
      await fetchUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Unlink Failed',
        description: error.message || 'Could not unlink user from franchisee.',
      });
    } finally {
      setIsUnlinking(false);
    }
  };
  
  const handleSendResetEmail = async (email: string) => {
    setIsSendingReset(email);
    try {
        const response = await fetch('/api/admin/users/send-password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to send reset email.');
        }
        toast({ 
          title: 'Reset Email Sent', 
          description: `Branded password reset email sent to ${email} from mailplusit@mailplus.com.au.` 
        });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || `Could not send reset email.` });
    } finally {
        setIsSendingReset(null);
    }
  };

  const handleUpdateUser = async () => {
    if (!userToEdit || !newDefaultRole || newAssignedRoles.length === 0) return;
    setIsUpdating(true);
    try {
      const userCurrentlyHasAdmin = (userToEdit.assignedRoles || []).includes('admin') || userToEdit.defaultRole === 'admin' || userToEdit.role === 'admin';
      const isTryingToGrantAdmin = newAssignedRoles.includes('admin') || newDefaultRole === 'admin';
      
      let effectiveAssignedRoles = [...newAssignedRoles];
      let effectiveDefaultRole = newDefaultRole;
      let approvalRequested = false;

      // Enforce: Franchisee role users cannot be assigned any other roles
      if (effectiveAssignedRoles.includes('Franchisee')) {
        effectiveAssignedRoles = ['Franchisee'];
        effectiveDefaultRole = 'Franchisee';
      }

      if (isSuperAdminRequiringApproval && isTryingToGrantAdmin && !userCurrentlyHasAdmin) {
        // Strip 'admin' from immediate update
        effectiveAssignedRoles = effectiveAssignedRoles.filter(r => r !== 'admin');
        if (effectiveDefaultRole === 'admin') {
          effectiveDefaultRole = (effectiveAssignedRoles[0] || 'user') as UserRole;
        }

        // Trigger admin approval request
        await createAdminApprovalRequest({
          targetUserId: userToEdit.uid,
          targetUserEmail: userToEdit.email,
          targetUserName: userToEdit.displayName || `${userToEdit.firstName || ''} ${userToEdit.lastName || ''}`.trim() || userToEdit.email,
          requestedByUid: userProfile?.uid || SUPER_ADMIN_REQUIRING_APPROVAL_UID,
          requestedByName: userProfile?.displayName || userProfile?.email || 'Super Admin',
        });
        approvalRequested = true;
      }

      const updateData: Partial<UserProfile> = { 
        assignedRoles: effectiveAssignedRoles, 
        defaultRole: effectiveDefaultRole as UserRole, 
        phoneNumber: newMobileNumber, 
        mobileNumber: newMobileNumber, 
        aircallPhoneNumber: effectiveAssignedRoles.includes('Franchisee') ? '' : newAircallPhoneNumber 
      };
      const isUnlinkingFranchisee = newFranchiseeId === 'none' || 
        (!effectiveAssignedRoles.includes('Franchisee') && !!(userToEdit.franchiseeId || userToEdit.franchisee || userToEdit.linkedFranchiseeIds?.length));

      if (isUnlinkingFranchisee) {
        await unlinkUserFromFranchiseeCompletely(userToEdit.uid, undefined, userProfile?.uid);
      }

      if (effectiveAssignedRoles.includes('Field Sales')) {
        updateData.linkedSalesRep = newLinkedSalesRep;
        updateData.linkedBDR = newLinkedBDR;
        updateData.franchisee = '';
      } else if (effectiveAssignedRoles.includes('Franchisee') && !isUnlinkingFranchisee) {
        updateData.franchisee = newFranchisee;
        updateData.franchiseeId = newFranchiseeId || undefined;
        updateData.franchiseeInternalId = newFranchiseeId || undefined;
        updateData.franchiseeRole = newFranchiseeRole;
        updateData.personalEmail = newPersonalEmail;
        updateData.abn = newAbn;
        updateData.addressDetails = {
          street: newStreet,
          suburb: newSuburb,
          state: newState,
          postcode: newPostcode,
          fullAddress: [newStreet, newSuburb, newState, newPostcode].filter(Boolean).join(', '),
        };
        updateData.bankDetails = {
          bsb: newBsb,
          accountNumber: newAccountNumber,
          accountName: newAccountName,
        };
        if (newFranchiseeId && newFranchiseeId !== 'none') {
          updateData.linkedFranchisees = [{
            franchiseeId: newFranchiseeId,
            franchiseeName: newFranchisee,
            relationship: newFranchiseeRole,
            isDefault: true,
          }];
          updateData.activeFranchiseeId = newFranchiseeId;
        }
        updateData.linkedSalesRep = '';
        updateData.linkedBDR = '';
      } else {
        updateData.linkedSalesRep = '';
        updateData.linkedBDR = '';
        updateData.franchisee = '';
      }
      
      await updateUser(userToEdit.uid, updateData);
      
      if (approvalRequested) {
        toast({
          title: 'Role Request Submitted',
          description: `User details updated. A request to grant Admin access to ${userToEdit.email} has been sent to Original Admin for approval.`,
          duration: 10000,
        });
      } else {
        toast({ title: 'Success', description: `User details have been updated.` });
      }

      setUserToEdit(null);
      await fetchUsers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApproveRequest = async (request: AdminApprovalRequest) => {
    if (!userProfile?.uid) return;
    setProcessingRequestId(request.id);
    try {
      await approveAdminAccessRequest({
        requestId: request.id,
        actionedByUid: userProfile.uid,
        actionedByName: userProfile.displayName || userProfile.email || 'Original Admin',
      });
      toast({ title: 'Admin Granted', description: `Admin access granted to ${request.userEmail}.` });
      await fetchUsers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (request: AdminApprovalRequest) => {
    if (!userProfile?.uid) return;
    setProcessingRequestId(request.id);
    try {
      await rejectAdminAccessRequest({
        requestId: request.id,
        actionedByUid: userProfile.uid,
        actionedByName: userProfile.displayName || userProfile.email || 'Original Admin',
      });
      toast({ title: 'Request Rejected', description: `Admin access request rejected for ${request.userEmail}.` });
      await fetchUsers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
    } finally {
      setProcessingRequestId(null);
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

  const userCounts = useMemo(() => {
    const active = users.filter(u => !u.disabled).length;
    const disabled = users.filter(u => !!u.disabled).length;
    const all = users.length;
    return { active, disabled, all };
  }, [users]);

  // Process users for display (Search, Tab and Sort)
  const processedUsers = useMemo(() => {
    let result = [...users];

    if (activeTab === 'active') {
      result = result.filter(u => !u.disabled);
    } else if (activeTab === 'disabled') {
      result = result.filter(u => !!u.disabled);
    }

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
  }, [users, activeTab, searchTerm, sortConfig]);

  const activeBDRs = useMemo(() => {
    return users.filter(u => u.assignedRoles?.includes('user') && !u.disabled);
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
        {/* Pending Admin Approval Requests Banner */}
        {approvalRequests.filter(r => r.status === 'pending').length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950/20 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Pending Admin Access Approvals ({approvalRequests.filter(r => r.status === 'pending').length})
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  Super Admin requested Admin access for the following user(s). Requests require approval from Original Admin.
                </p>
                <div className="mt-3 space-y-2">
                  {approvalRequests.filter((r: AdminApprovalRequest) => r.status === 'pending').map((req: AdminApprovalRequest) => (
                    <div key={req.id} className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-md border border-amber-200 dark:border-amber-900 text-xs">
                      <div>
                        <span className="font-semibold">{req.userName}</span> ({req.userEmail})
                        <span className="text-muted-foreground ml-2">Requested by {req.requestedByName}</span>
                      </div>
                      {isOriginalAdmin ? (
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-3"
                            disabled={processingRequestId === req.id}
                            onClick={() => handleApproveRequest(req)}
                          >
                            {processingRequestId === req.id ? <Loader /> : 'Approve Admin Access'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            className="h-7 text-xs px-3"
                            disabled={processingRequestId === req.id}
                            onClick={() => handleRejectRequest(req)}
                          >
                            {processingRequestId === req.id ? <Loader /> : 'Reject'}
                          </Button>
                        </div>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200">
                          <Clock className="mr-1 h-3 w-3" /> Awaiting Original Admin Approval
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <Tabs 
            value={activeTab} 
            onValueChange={(val) => { 
              setActiveTab(val as 'active' | 'disabled' | 'all'); 
              setSelectedUserIds([]); 
            }}
          >
            <TabsList className="bg-muted p-1">
              <TabsTrigger value="active" className="gap-2 text-xs sm:text-sm">
                Active Users
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs font-normal">
                  {userCounts.active}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="disabled" className="gap-2 text-xs sm:text-sm">
                Disabled Users
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs font-normal">
                  {userCounts.disabled}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2 text-xs sm:text-sm">
                All Users
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs font-normal">
                  {userCounts.all}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2 flex-1 lg:justify-end">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
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
            {selectedUserIds.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                <span className="text-sm font-medium whitespace-nowrap">{selectedUserIds.length} selected</span>
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
                <TableHead>Admin Approval</TableHead>
                <TableHead>Franchise</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedUsers.length > 0 ? (
                processedUsers.map((user) => {
                  const pendingReq = approvalRequests.find((r: AdminApprovalRequest) => r.userId === user.uid && r.status === 'pending');
                  const isPending = user.adminApprovalStatus === 'pending' || !!pendingReq;
                  const isApproved = user.adminApprovalStatus === 'approved';
                  const isRejected = user.adminApprovalStatus === 'rejected';

                  return (
                  <TableRow key={user.uid} data-state={selectedUserIds.includes(user.uid) && "selected"}>
                    <TableCell>
                        <Checkbox 
                            checked={selectedUserIds.includes(user.uid)}
                            onCheckedChange={(checked) => handleSelectUser(user.uid, !!checked)}
                        />
                    </TableCell>
                    <TableCell className="font-medium">{user.displayName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant="outline">{user.defaultRole}</Badge></TableCell>
                    <TableCell>
                      {isPending ? (
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 whitespace-nowrap">
                            <Clock className="mr-1 h-3 w-3" /> Pending Admin Approval
                          </Badge>
                          {isOriginalAdmin && pendingReq && (
                            <Button
                              size="sm"
                              className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={processingRequestId === pendingReq.id}
                              onClick={() => handleApproveRequest(pendingReq)}
                            >
                              Approve
                            </Button>
                          )}
                        </div>
                      ) : isApproved ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 whitespace-nowrap">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Admin Approved
                        </Badge>
                      ) : isRejected ? (
                        <Badge variant="outline" className="text-red-600 border-red-200">
                          Rejected
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>{user.franchisee || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={user.disabled ? 'destructive' : 'secondary'}>
                        {user.disabled ? 'Disabled' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => handleNotifySingle(user)} 
                          title="Send Alert Notification"
                        >
                            <BellRing className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => setUserToEdit(user)} 
                          title="Edit User Details"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => handleSendResetEmail(user.email)} 
                          disabled={isSendingReset === user.email}
                          title="Send Password Reset Email"
                        >
                            {isSendingReset === user.email ? <Loader className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant={user.disabled ? "secondary" : "outline"} 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => setUserToToggle(user)}
                          title={user.disabled ? 'Enable User Account' : 'Disable User Account'}
                        >
                            {user.disabled ? <UserCheck className="h-4 w-4 text-emerald-600" /> : <UserX className="h-4 w-4 text-amber-600" />}
                        </Button>
                        {isSuperAdmin && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setUserToDelete(user)}
                            disabled={SUPER_ADMIN_UIDS.includes(user.uid) || user.uid === userProfile?.uid}
                            title={
                              SUPER_ADMIN_UIDS.includes(user.uid)
                                ? 'Super Admin accounts cannot be deleted'
                                : user.uid === userProfile?.uid
                                ? 'You cannot delete your own logged-in account'
                                : 'Delete User Permanently'
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    {activeTab === 'disabled' 
                      ? 'No disabled users found.' 
                      : activeTab === 'active' 
                      ? 'No active users found.' 
                      : 'No users found.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

       <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete User Account Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span>
                Are you sure you want to completely delete the user account for{' '}
                <strong className="text-foreground">{userToDelete?.displayName || userToDelete?.email}</strong> ({userToDelete?.email})?
              </span>
              <span className="block text-destructive font-medium pt-2">
                ⚠️ Warning: This action CANNOT be undone. The user will be permanently removed from both <strong>Firebase Authentication</strong> and the <strong>Firestore Database</strong>.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingUser}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeletingUser}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
            >
              {isDeletingUser ? <Loader /> : 'Delete User Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnlinkConfirm} onOpenChange={setShowUnlinkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Unlink className="h-5 w-5" /> Unlink User from Franchisee?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                Are you sure you want to completely remove the franchisee link for{' '}
                <strong className="text-foreground">{userToEdit?.displayName || userToEdit?.email}</strong>?
              </span>
              <span className="block text-xs text-muted-foreground pt-1">
                This will remove all franchisee association fields from the user document, update the franchisee records, and archive the link history.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnlinking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlinkFranchisee}
              disabled={isUnlinking}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {isUnlinking ? <Loader /> : 'Unlink User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
            <DialogHeader>
                <DialogTitle>Edit User: {userToEdit?.displayName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                {newAssignedRoles.includes('Franchisee') ? (
                    <div className="space-y-1 pb-1">
                        <Label>User Role</Label>
                        <div>
                          <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200">
                            Franchisee
                          </Badge>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <Label>Assigned Roles</Label>
                            <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-48 overflow-y-auto">
                                {[
                                  'user', 'Outbound Admin', 'admin', 'Field Sales', 'Field Sales Admin', 'Lead Gen', 'Lead Gen Admin',
                                  'Franchisee', 'Dashback', 'Sales Manager', 'Account Managers', 'Marketing Manager', 'Customer Success', 'Customer Service',
                                  'Operations', 'Finance', 'Finanace Manager', 'Finance Manager', 'Data Admin'
                                ].map((role) => (
                                    <div key={role} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`role-${role}`}
                                            checked={newAssignedRoles.includes(role as UserRole)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    if (role === 'Franchisee') {
                                                      setNewAssignedRoles(['Franchisee']);
                                                      setNewDefaultRole('Franchisee');
                                                    } else {
                                                      setNewAssignedRoles(prev => [...prev.filter(r => r !== 'Franchisee'), role as UserRole]);
                                                    }
                                                } else {
                                                    setNewAssignedRoles(prev => prev.filter(r => r !== role));
                                                }
                                            }}
                                        />
                                        <label htmlFor={`role-${role}`} className="text-sm">{role}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="default-role-select">Default Role</Label>
                            <Select value={newDefaultRole} onValueChange={(value) => setNewDefaultRole(value as UserRole)}>
                                <SelectTrigger id="default-role-select">
                                    <SelectValue placeholder="Select default role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {newAssignedRoles.map((role) => (
                                        <SelectItem key={role} value={role}>{role}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                )}
                {userToEdit && (userToEdit.franchiseeId || userToEdit.franchisee || (userToEdit.linkedFranchiseeIds && userToEdit.linkedFranchiseeIds.length > 0)) && (
                    <div className="flex items-center justify-between p-3 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 text-xs">
                        <div>
                            <span className="font-semibold text-amber-900 dark:text-amber-200">Currently Linked Franchise: </span>
                            <span className="text-amber-800 dark:text-amber-300 font-medium">{userToEdit.franchisee || userToEdit.franchiseeId || 'Linked'}</span>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200"
                            onClick={() => setShowUnlinkConfirm(true)}
                        >
                            <Unlink className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                            Unlink User Completely
                        </Button>
                    </div>
                )}
                {newAssignedRoles.includes('Franchisee') && (
                    <div className="space-y-4 border p-3.5 rounded-md bg-muted/30 text-sm">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Link Franchise Entity*</Label>
                            <Select 
                                value={newFranchiseeId || 'none'} 
                                onValueChange={(val) => {
                                    if (val === 'none') {
                                        setNewFranchiseeId('none');
                                        setNewFranchisee('');
                                    } else {
                                        setNewFranchiseeId(val);
                                        const selectedFr = allFranchisees.find(f => String(f.internalId) === val);
                                        if (selectedFr) {
                                            setNewFranchisee(selectedFr.name);
                                        }
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select existing franchise..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    <SelectItem value="none">
                                        <span className="text-muted-foreground italic">(None - Unlinked)</span>
                                    </SelectItem>
                                    {allFranchisees.map((fr) => (
                                        <SelectItem key={fr.internalId} value={String(fr.internalId)}>
                                            {fr.name || 'Unnamed'} ({fr.internalId})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground">Select the official franchise entity to link with this user account or select (None - Unlinked) to disassociate.</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Franchisee Relationship / Type*</Label>
                            <Select value={newFranchiseeRole} onValueChange={(val: 'owner' | 'investor') => setNewFranchiseeRole(val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select designation..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="owner">Owner</SelectItem>
                                    <SelectItem value="investor">Investor</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground">Specify whether this user is an Owner or Investor of the linked franchise.</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Personal Email Address</Label>
                            <Input 
                                type="email" 
                                value={newPersonalEmail} 
                                onChange={(e) => setNewPersonalEmail(e.target.value)} 
                                placeholder="e.g. personal.email@gmail.com" 
                            />
                        </div>
                        <div className="pt-2 border-t space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">BUSINESS & BANK DETAILS</Label>
                            <div className="space-y-2">
                                <Label className="text-xs">ABN (Australian Business Number)</Label>
                                <Input 
                                    value={newAbn} 
                                    onChange={(e) => setNewAbn(e.target.value)} 
                                    placeholder="e.g. 12 345 678 901" 
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-xs">BSB</Label>
                                    <Input 
                                        value={newBsb} 
                                        onChange={(e) => setNewBsb(e.target.value)} 
                                        placeholder="000-000" 
                                    />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">Bank Account Number</Label>
                                    <Input 
                                        value={newAccountNumber} 
                                        onChange={(e) => setNewAccountNumber(e.target.value)} 
                                        placeholder="12345678" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Bank Account Name</Label>
                                <Input 
                                    value={newAccountName} 
                                    onChange={(e) => setNewAccountName(e.target.value)} 
                                    placeholder="e.g. Smith Logistics Pty Ltd" 
                                />
                            </div>
                        </div>
                        <div className="pt-2 border-t space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">ADDRESS DETAILS</Label>
                            <div className="space-y-2">
                                <Label className="text-xs">Street Address</Label>
                                <Input 
                                    value={newStreet} 
                                    onChange={(e) => setNewStreet(e.target.value)} 
                                    placeholder="123 High Street" 
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-xs">Suburb</Label>
                                    <Input 
                                        value={newSuburb} 
                                        onChange={(e) => setNewSuburb(e.target.value)} 
                                        placeholder="Sydney" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">State</Label>
                                    <Input 
                                        value={newState} 
                                        onChange={(e) => setNewState(e.target.value)} 
                                        placeholder="NSW" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Postcode</Label>
                                    <Input 
                                        value={newPostcode} 
                                        onChange={(e) => setNewPostcode(e.target.value)} 
                                        placeholder="2000" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {newAssignedRoles.includes('Field Sales') && (
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
                 <div className="space-y-2">
                     <Label htmlFor="mobile-number">Mobile Number</Label>
                     <Input id="mobile-number" value={newMobileNumber} onChange={(e) => setNewMobileNumber(e.target.value)} placeholder="e.g. 0412345678" />
                 </div>
                 {!newAssignedRoles.includes('Franchisee') && (
                   <div className="space-y-2">
                       <Label htmlFor="aircall-number">AirCall Number</Label>
                       <Input id="aircall-number" value={newAircallPhoneNumber} onChange={(e) => setNewAircallPhoneNumber(e.target.value)} placeholder="e.g. +61298765432" />
                   </div>
                 )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setUserToEdit(null)}>Cancel</Button>
                <Button onClick={handleUpdateUser} disabled={isUpdating || !newDefaultRole || newAssignedRoles.length === 0}>
                    {isUpdating ? <Loader /> : 'Save Changes'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
