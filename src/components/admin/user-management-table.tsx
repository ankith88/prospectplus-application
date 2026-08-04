
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
import { getAllUsers, updateUser, getAllFranchisees } from '@/services/firebase';
import type { UserProfile, AdminApprovalRequest, Franchisee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { Lock, Mail, UserX, Edit, Search, ArrowUpDown, LogOut, CheckSquare, X, BellRing, Clock, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
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

  // Search, Tab and Sort State
  const [activeTab, setActiveTab] = useState<'active' | 'disabled' | 'all'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof UserProfile; direction: 'ascending' | 'descending' } | null>({ key: 'displayName', direction: 'ascending' });

  const { toast } = useToast();
  const { sendPasswordReset, userProfile } = useAuth();

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
      setNewAssignedRoles(userToEdit.assignedRoles || (userToEdit.role ? [userToEdit.role] : []));
      setNewDefaultRole(userToEdit.defaultRole || userToEdit.role || 'user');
      setNewLinkedSalesRep(userToEdit.linkedSalesRep || '');
      setNewLinkedBDR(userToEdit.linkedBDR || '');
      setNewFranchisee(userToEdit.franchisee || '');
      setNewFranchiseeId(userToEdit.franchiseeId || userToEdit.franchiseeInternalId || '');
      setNewPhoneNumber(userToEdit.phoneNumber || '');
      setNewMobileNumber(userToEdit.mobileNumber || userToEdit.phoneNumber || '');
      setNewAircallPhoneNumber(userToEdit.aircallPhoneNumber || '');
      setNewFranchiseeRole(userToEdit.franchiseeRole || 'owner');
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
    if (!userToEdit || !newDefaultRole || newAssignedRoles.length === 0) return;
    setIsUpdating(true);
    try {
      const userCurrentlyHasAdmin = (userToEdit.assignedRoles || []).includes('admin') || userToEdit.defaultRole === 'admin' || userToEdit.role === 'admin';
      const isTryingToGrantAdmin = newAssignedRoles.includes('admin') || newDefaultRole === 'admin';
      
      let effectiveAssignedRoles = [...newAssignedRoles];
      let effectiveDefaultRole = newDefaultRole;
      let approvalRequested = false;

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
        aircallPhoneNumber: newAircallPhoneNumber 
      };
      if (effectiveAssignedRoles.includes('Field Sales')) {
        updateData.linkedSalesRep = newLinkedSalesRep;
        updateData.linkedBDR = newLinkedBDR;
        updateData.franchisee = '';
      } else if (effectiveAssignedRoles.includes('Franchisee')) {
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
        if (newFranchiseeId) {
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
                    <Label>Assigned Roles</Label>
                    <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-48 overflow-y-auto">
                        {[
                          'user', 'Outbound Admin', 'admin', 'Field Sales', 'Field Sales Admin', 'Lead Gen', 'Lead Gen Admin',
                          'Franchisee', 'Dashback', 'Sales Manager', 'Account Managers', 'Marketing Admin', 'Marketing Manager', 'Customer Success', 'Customer Service',
                          'Operations', 'Finance', 'Finanace Manager', 'Finance Manager', 'Data Admin'
                        ].map((role) => (
                            <div key={role} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`role-${role}`}
                                    checked={newAssignedRoles.includes(role as UserRole)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            setNewAssignedRoles(prev => [...prev, role as UserRole]);
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
                {newAssignedRoles.includes('Franchisee') && (
                    <div className="space-y-3 border p-3 rounded-md bg-muted/30">
                        <div className="space-y-2">
                            <Label>Link Franchise Entity</Label>
                            <Select 
                                value={newFranchiseeId} 
                                onValueChange={(val) => {
                                    setNewFranchiseeId(val);
                                    const selectedFr = allFranchisees.find(f => String(f.internalId) === val);
                                    if (selectedFr) {
                                        setNewFranchisee(selectedFr.name);
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select existing franchise..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {allFranchisees.map((fr) => (
                                        <SelectItem key={fr.internalId} value={String(fr.internalId)}>
                                            {fr.name || 'Unnamed'} ({fr.internalId})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Franchise Display Name</Label>
                            <Input value={newFranchisee} onChange={(e) => setNewFranchisee(e.target.value)} placeholder="e.g. Alexandria" />
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
                 <div className="space-y-2">
                     <Label htmlFor="aircall-number">AirCall Number</Label>
                     <Input id="aircall-number" value={newAircallPhoneNumber} onChange={(e) => setNewAircallPhoneNumber(e.target.value)} placeholder="e.g. +61298765432" />
                 </div>
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
