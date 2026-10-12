
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UserProfile, AdminApprovalRequest, Franchisee, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
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
import { Lock, Mail, MailCheck, UserX, UserCheck, Edit, Search, ArrowUpDown, LogOut, CheckSquare, X, BellRing, Clock, ShieldAlert, ShieldCheck, CheckCircle2, AlertTriangle, Trash2, Unlink, Key, Eye, EyeOff, RefreshCw, Plus, Building2, Store, Smartphone, Filter, User, RotateCcw, ChevronsUpDown, Check, Phone } from 'lucide-react';
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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface LinkedFranchiseeStateItem {
  franchiseeId: string;
  franchiseeName: string;
  relationship: 'owner' | 'investor';
  isDefault?: boolean;
}
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
  
  // Direct Password Reset State
  const [userToResetPassword, setUserToResetPassword] = useState<UserProfile | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [selectedEmailType, setSelectedEmailType] = useState<'welcome' | 'password_reset' | 'none'>('welcome');
  const [isDirectResetting, setIsDirectResetting] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newAssignedRoles, setNewAssignedRoles] = useState<UserRole[]>([]);
  const [newDefaultRole, setNewDefaultRole] = useState<UserRole | ''>('');
  const [newLinkedSalesRep, setNewLinkedSalesRep] = useState('');
  const [newLinkedBDR, setNewLinkedBDR] = useState('');
  const [newFranchisee, setNewFranchisee] = useState('');
  const [newFranchiseeId, setNewFranchiseeId] = useState('');
  const [newFranchiseeRole, setNewFranchiseeRole] = useState<'owner' | 'investor'>('owner');
  const [newLinkedFranchisees, setNewLinkedFranchisees] = useState<LinkedFranchiseeStateItem[]>([]);
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
  const [newTwoFactorOption, setNewTwoFactorOption] = useState<'disabled' | 'sms' | 'totp'>('disabled');
  const [isResetting2FA, setIsResetting2FA] = useState<string | null>(null);
  const [newAircallPhoneNumber, setNewAircallPhoneNumber] = useState('');
  const [newDialpadPhoneNumber, setNewDialpadPhoneNumber] = useState('');
  const [newDialpadUserId, setNewDialpadUserId] = useState('');
  const [newPreferredTelephonyProvider, setNewPreferredTelephonyProvider] = useState<'default' | 'aircall' | 'dialpad'>('default');
  const [isBulkSettingTelephony, setIsBulkSettingTelephony] = useState(false);
  const [allFranchisees, setAllFranchisees] = useState<Franchisee[]>([]);

  // Email Verification State
  const [verificationMap, setVerificationMap] = useState<Record<string, { emailVerified: boolean }>>({});
  const [isResendingVerification, setIsResendingVerification] = useState<string | null>(null);
  const [isManualVerifying, setIsManualVerifying] = useState<string | null>(null);
  const [isBulkVerifying, setIsBulkVerifying] = useState(false);
  const [isBulkResending, setIsBulkResending] = useState(false);

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
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [emailVerifiedFilter, setEmailVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [twoFactorFilter, setTwoFactorFilter] = useState<'all' | 'enabled' | 'disabled' | 'totp' | 'sms'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof UserProfile; direction: 'ascending' | 'descending' } | null>({ key: 'displayName', direction: 'ascending' });

  const { toast } = useToast();
  const { sendPasswordReset, userProfile, isSuperAdmin } = useAuth();

  const isOriginalAdmin = userProfile?.uid === ORIGINAL_ADMIN_UID;
  const isSuperAdminRequiringApproval = userProfile?.uid === SUPER_ADMIN_REQUIRING_APPROVAL_UID;
  
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
        const [fetchedUsers, fetchedRequests, fetchedFranchisees, verifyRes] = await Promise.all([
          getAllUsers(),
          getAllAdminApprovalRequests(),
          getAllFranchisees(),
          fetch('/api/admin/users/email-verification').then(r => r.json()).catch(() => ({ success: false })),
        ]);
        setUsers(fetchedUsers);
        setApprovalRequests(fetchedRequests);
        setAllFranchisees(fetchedFranchisees);
        if (verifyRes && verifyRes.success && verifyRes.verificationMap) {
          setVerificationMap(verifyRes.verificationMap);
        }
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

      let initialLinkedFrans: LinkedFranchiseeStateItem[] = [];
      if (userToEdit.linkedFranchisees && userToEdit.linkedFranchisees.length > 0) {
        initialLinkedFrans = userToEdit.linkedFranchisees.map((f: any, idx: number) => ({
          franchiseeId: String(f.franchiseeId || ''),
          franchiseeName: f.franchiseeName || f.franchiseeId || '',
          relationship: f.relationship || 'owner',
          isDefault: f.isDefault !== undefined ? f.isDefault : idx === 0,
        })).filter((f: any) => f.franchiseeId);
      } else if (userToEdit.franchiseeId || userToEdit.franchiseeInternalId || userToEdit.franchisee) {
        const fId = String(userToEdit.franchiseeId || userToEdit.franchiseeInternalId || 'default');
        initialLinkedFrans = [{
          franchiseeId: fId,
          franchiseeName: userToEdit.franchisee || fId,
          relationship: userToEdit.franchiseeRole || 'owner',
          isDefault: true,
        }];
      }
      setNewLinkedFranchisees(initialLinkedFrans);

      const displayNameParts = (userToEdit.displayName || userToEdit.name || '').trim().split(' ');
      setNewFirstName(userToEdit.firstName || displayNameParts[0] || '');
      setNewLastName(userToEdit.lastName || (displayNameParts.length > 1 ? displayNameParts.slice(1).join(' ') : ''));

      setNewLinkedSalesRep(userToEdit.linkedSalesRep || '');
      setNewLinkedBDR(userToEdit.linkedBDR || '');
      setNewFranchisee(userToEdit.franchisee || linkedFran?.franchiseeName || '');
      setNewFranchiseeId(userToEdit.franchiseeId || userToEdit.franchiseeInternalId || linkedFran?.franchiseeId || '');
      setNewPhoneNumber(userToEdit.phoneNumber || '');
      setNewMobileNumber(userToEdit.mobileNumber || userToEdit.phoneNumber || '');
      if (!userToEdit.requires2FA) {
        setNewTwoFactorOption('disabled');
      } else {
        setNewTwoFactorOption(userToEdit.twoFactorMethod === 'totp' ? 'totp' : 'sms');
      }
      setNewAircallPhoneNumber(userToEdit.aircallPhoneNumber || '');
      setNewDialpadPhoneNumber(userToEdit.dialpadPhoneNumber || '');
      setNewDialpadUserId(userToEdit.dialpadUserId || '');
      setNewPreferredTelephonyProvider(userToEdit.preferredTelephonyProvider || 'default');
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

  const handleReset2FA = async (targetUser: UserProfile, disable = false) => {
    if (!userProfile?.uid) return;
    setIsResetting2FA(targetUser.uid);
    try {
      const res = await fetch('/api/admin/users/reset-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: targetUser.uid,
          requestorUid: userProfile.uid,
          disable2FA: disable,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast({
        title: '2FA Reset Successful',
        description: data.message || `2FA state has been reset for ${targetUser.displayName || targetUser.email}.`,
      });
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, requires2FA: disable ? false : u.requires2FA, totpConfirmed: false, totpSecret: undefined, twoFactorVerifiedAt: null } : u));
      if (userToEdit && userToEdit.uid === targetUser.uid) {
        if (disable) setNewTwoFactorOption('disabled');
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Reset Failed',
        description: err.message || 'Failed to reset 2FA state.',
      });
    } finally {
      setIsResetting2FA(null);
    }
  };

  const handleResendVerificationEmail = async (targetUser: UserProfile) => {
    if (!targetUser.email) return;
    setIsResendingVerification(targetUser.uid);
    try {
      const res = await fetch('/api/admin/users/email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', email: targetUser.email }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Verification Email Sent', description: `Dispatched branded verification email to ${targetUser.email}.` });
      } else {
        toast({ variant: 'destructive', title: 'Failed to Send', description: data.message || 'Could not send verification email.' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'An error occurred.' });
    } finally {
      setIsResendingVerification(null);
    }
  };

  const handleManualVerifyUser = async (targetUser: UserProfile) => {
    setIsManualVerifying(targetUser.uid);
    try {
      const res = await fetch('/api/admin/users/email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'manual-verify', uid: targetUser.uid }),
      });
      const data = await res.json();
      if (data.success) {
        setVerificationMap(prev => ({ ...prev, [targetUser.uid]: { emailVerified: true } }));
        toast({ title: 'Email Verified', description: `${targetUser.displayName || targetUser.email} has been manually marked as verified.` });
      } else {
        toast({ variant: 'destructive', title: 'Failed to Verify', description: data.message || 'Could not update verification status.' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'An error occurred.' });
    } finally {
      setIsManualVerifying(null);
    }
  };

  const handleBulkResendVerification = async () => {
    if (!selectedUserIds.length) return;
    setIsBulkResending(true);
    try {
      const targetEmails = users.filter(u => selectedUserIds.includes(u.uid) && u.email).map(u => u.email as string);
      const res = await fetch('/api/admin/users/email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk-resend', emails: targetEmails }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Bulk Verification Sent', description: data.message });
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: data.message });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsBulkResending(false);
    }
  };

  const handleBulkManualVerify = async () => {
    if (!selectedUserIds.length) return;
    setIsBulkVerifying(true);
    try {
      const res = await fetch('/api/admin/users/email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk-verify', uids: selectedUserIds }),
      });
      const data = await res.json();
      if (data.success) {
        setVerificationMap(prev => {
          const next = { ...prev };
          selectedUserIds.forEach(id => { next[id] = { emailVerified: true }; });
          return next;
        });
        toast({ title: 'Bulk Verification Complete', description: data.message });
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: data.message });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsBulkVerifying(false);
    }
  };

  const handleBulkSetTelephonyProvider = async (provider: 'default' | 'aircall' | 'dialpad') => {
    if (!selectedUserIds.length) return;
    setIsBulkSettingTelephony(true);
    try {
      await Promise.all(
        selectedUserIds.map(uid => updateUser(uid, { preferredTelephonyProvider: provider }))
      );
      setUsers(prev => prev.map(u => selectedUserIds.includes(u.uid) ? { ...u, preferredTelephonyProvider: provider } : u));
      toast({
        title: 'Phone System Updated',
        description: `Successfully updated ${selectedUserIds.length} user(s) to ${provider === 'dialpad' ? 'Dialpad' : provider === 'aircall' ? 'AirCall' : 'System Default'}.`,
      });
      setSelectedUserIds([]);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: err.message || 'Could not update phone system.' });
    } finally {
      setIsBulkSettingTelephony(false);
    }
  };

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

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleDirectPasswordReset = async () => {
    if (!userToResetPassword || !resetPasswordInput.trim()) return;
    if (resetPasswordInput.trim().length < 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid Password',
        description: 'Password must be at least 6 characters long.',
      });
      return;
    }
    setIsDirectResetting(true);
    try {
      const response = await fetch('/api/admin/users/reset-password-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userToResetPassword.email,
          newPassword: resetPasswordInput.trim(),
          emailType: selectedEmailType,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to reset password.');
      }
      toast({
        title: 'Password Reset Successful',
        description: data.message || `Password for ${userToResetPassword.email} updated successfully.`,
      });
      setUserToResetPassword(null);
      setResetPasswordInput('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Password Reset Failed',
        description: error.message || 'Could not reset user password.',
      });
    } finally {
      setIsDirectResetting(false);
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

      const computedFirstName = newFirstName.trim();
      const computedLastName = newLastName.trim();
      const computedDisplayName = `${computedFirstName} ${computedLastName}`.trim() || userToEdit.email;

      const updateData: Partial<UserProfile> = { 
        firstName: computedFirstName,
        lastName: computedLastName,
        displayName: computedDisplayName,
        name: computedDisplayName,
        assignedRoles: effectiveAssignedRoles, 
        defaultRole: effectiveDefaultRole as UserRole, 
        phoneNumber: newMobileNumber, 
        mobileNumber: newMobileNumber, 
        requires2FA: newTwoFactorOption !== 'disabled',
        twoFactorMethod: newTwoFactorOption === 'totp' ? 'totp' : 'sms',
        aircallPhoneNumber: effectiveAssignedRoles.includes('Franchisee') ? '' : newAircallPhoneNumber,
        dialpadPhoneNumber: effectiveAssignedRoles.includes('Franchisee') ? '' : newDialpadPhoneNumber,
        dialpadUserId: effectiveAssignedRoles.includes('Franchisee') ? '' : newDialpadUserId,
        preferredTelephonyProvider: effectiveAssignedRoles.includes('Franchisee') ? 'default' : newPreferredTelephonyProvider,
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

        const validLinkedFrans = newLinkedFranchisees.filter(f => f.franchiseeId && f.franchiseeId !== 'none');
        if (validLinkedFrans.length > 0) {
          const hasDefault = validLinkedFrans.some(f => f.isDefault);
          if (!hasDefault) {
            validLinkedFrans[0].isDefault = true;
          }
          const defaultFran = validLinkedFrans.find(f => f.isDefault) || validLinkedFrans[0];

          updateData.linkedFranchisees = validLinkedFrans;
          updateData.linkedFranchiseeIds = validLinkedFrans.map(f => String(f.franchiseeId));
          updateData.activeFranchiseeId = defaultFran.franchiseeId;
          updateData.franchiseeId = defaultFran.franchiseeId;
          updateData.franchiseeInternalId = defaultFran.franchiseeId;
          updateData.franchisee = defaultFran.franchiseeName;
          updateData.franchiseeRole = defaultFran.relationship;
        } else if (newFranchiseeId && newFranchiseeId !== 'none') {
          updateData.linkedFranchisees = [{
            franchiseeId: newFranchiseeId,
            franchiseeName: newFranchisee,
            relationship: newFranchiseeRole,
            isDefault: true,
          }];
          updateData.linkedFranchiseeIds = [newFranchiseeId];
          updateData.activeFranchiseeId = newFranchiseeId;
          updateData.franchiseeId = newFranchiseeId;
          updateData.franchiseeInternalId = newFranchiseeId;
          updateData.franchisee = newFranchisee;
          updateData.franchiseeRole = newFranchiseeRole;
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

  // Filter users by active status tab
  const statusFilteredUsers = useMemo(() => {
    if (activeTab === 'active') {
      return users.filter(u => !u.disabled);
    } else if (activeTab === 'disabled') {
      return users.filter(u => !!u.disabled);
    }
    return users;
  }, [users, activeTab]);

  // Extract all available roles for the current status filter
  const availableRoles = useMemo(() => {
    const roleMap = new Map<string, number>();
    statusFilteredUsers.forEach(u => {
      const primaryRole = u.defaultRole || u.role || 'user';
      roleMap.set(primaryRole, (roleMap.get(primaryRole) || 0) + 1);

      if (Array.isArray(u.assignedRoles)) {
        u.assignedRoles.forEach(r => {
          if (r && r !== primaryRole) {
            roleMap.set(r, (roleMap.get(r) || 0) + 1);
          }
        });
      }
    });

    const standardRoleOrder = [
      'Franchisee',
      'user',
      'Field Sales',
      'Field Sales Admin',
      'Lead Gen',
      'Lead Gen Admin',
      'Outbound Admin',
      'admin',
      'Sales Manager',
      'Customer Success',
      'Customer Service',
      'Account Managers',
      'Account Manager',
      'Marketing Manager',
      'Operations',
      'Finance',
      'Finance Manager',
      'Dashback',
      'Data Admin',
      'super user',
    ];

    const roles = Array.from(roleMap.keys()).filter(r => (roleMap.get(r) || 0) > 0 || selectedRoles.includes(r));

    return roles.sort((a, b) => {
      const idxA = standardRoleOrder.indexOf(a);
      const idxB = standardRoleOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [statusFilteredUsers, selectedRoles]);

  // Filtered available roles based on inside-popover search
  const filteredAvailableRoles = useMemo(() => {
    if (!roleSearchTerm.trim()) return availableRoles;
    const term = roleSearchTerm.toLowerCase();
    return availableRoles.filter(r => r.toLowerCase().includes(term));
  }, [availableRoles, roleSearchTerm]);

  // Role counts under current status filter
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    availableRoles.forEach(role => {
      counts[role] = statusFilteredUsers.filter(u => {
        const primaryRole = u.defaultRole || u.role || 'user';
        return primaryRole === role || (Array.isArray(u.assignedRoles) && u.assignedRoles.includes(role as UserRole));
      }).length;
    });
    return counts;
  }, [availableRoles, statusFilteredUsers]);

  // Process users for display (Status, Role, Name, Email, Email Verified, 2FA, Search and Sort)
  const processedUsers = useMemo(() => {
    let result = [...statusFilteredUsers];

    // Multi-Select Role Filter
    if (selectedRoles.length > 0) {
      result = result.filter(u => {
        const primaryRole = u.defaultRole || u.role || 'user';
        const hasPrimary = selectedRoles.includes(primaryRole);
        const hasAssigned = Array.isArray(u.assignedRoles) && u.assignedRoles.some(r => selectedRoles.includes(r));
        return hasPrimary || hasAssigned;
      });
    }

    if (nameFilter.trim()) {
      const lowerName = nameFilter.trim().toLowerCase();
      result = result.filter(u => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        const dispName = (u.displayName || u.name || '').toLowerCase();
        return dispName.includes(lowerName) || fullName.includes(lowerName);
      });
    }

    if (emailFilter.trim()) {
      const lowerEmail = emailFilter.trim().toLowerCase();
      result = result.filter(u => 
        (u.email || '').toLowerCase().includes(lowerEmail) ||
        (u.personalEmail || '').toLowerCase().includes(lowerEmail)
      );
    }

    if (emailVerifiedFilter !== 'all') {
      result = result.filter(u => {
        const isVerified = Boolean(verificationMap[u.uid]?.emailVerified || u.emailVerified);
        return emailVerifiedFilter === 'verified' ? isVerified : !isVerified;
      });
    }

    if (twoFactorFilter !== 'all') {
      result = result.filter(u => {
        const has2FA = Boolean(u.requires2FA);
        if (twoFactorFilter === 'enabled') return has2FA;
        if (twoFactorFilter === 'disabled') return !has2FA;
        if (twoFactorFilter === 'totp') return has2FA && u.twoFactorMethod === 'totp';
        if (twoFactorFilter === 'sms') return has2FA && u.twoFactorMethod !== 'totp';
        return true;
      });
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(u => 
        (u.displayName || '').toLowerCase().includes(lowerSearch) || 
        (u.email || '').toLowerCase().includes(lowerSearch) ||
        (u.role || '').toLowerCase().includes(lowerSearch) ||
        (u.defaultRole || '').toLowerCase().includes(lowerSearch) ||
        (u.franchisee || '').toLowerCase().includes(lowerSearch)
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
  }, [statusFilteredUsers, selectedRoles, nameFilter, emailFilter, emailVerifiedFilter, twoFactorFilter, searchTerm, sortConfig, verificationMap]);

  const isAnyFilterActive = useMemo(() => {
    return (
      Boolean(nameFilter.trim()) ||
      Boolean(emailFilter.trim()) ||
      selectedRoles.length > 0 ||
      emailVerifiedFilter !== 'all' ||
      twoFactorFilter !== 'all' ||
      Boolean(searchTerm.trim())
    );
  }, [nameFilter, emailFilter, selectedRoles, emailVerifiedFilter, twoFactorFilter, searchTerm]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (nameFilter.trim()) count++;
    if (emailFilter.trim()) count++;
    if (selectedRoles.length > 0) count++;
    if (emailVerifiedFilter !== 'all') count++;
    if (twoFactorFilter !== 'all') count++;
    if (searchTerm.trim()) count++;
    return count;
  }, [nameFilter, emailFilter, selectedRoles, emailVerifiedFilter, twoFactorFilter, searchTerm]);

  const handleToggleRole = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
    setSelectedUserIds([]);
  };

  const handleResetFilters = () => {
    setNameFilter('');
    setEmailFilter('');
    setSelectedRoles([]);
    setEmailVerifiedFilter('all');
    setTwoFactorFilter('all');
    setSearchTerm('');
    setSelectedUserIds([]);
  };

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
                placeholder="Search by name, email, or role..."
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
                <Button variant="outline" size="sm" onClick={handleBulkResendVerification} disabled={isBulkResending}>
                  {isBulkResending ? <Loader className="mr-2 h-4 w-4" /> : <Mail className="mr-2 h-4 w-4" />}
                  Send Verification
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkManualVerify} disabled={isBulkVerifying}>
                  {isBulkVerifying ? <Loader className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4 text-emerald-600" />}
                  Mark Verified
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isBulkSettingTelephony}>
                      {isBulkSettingTelephony ? <Loader className="mr-2 h-4 w-4" /> : <Phone className="mr-2 h-4 w-4 text-[#095c7b] dark:text-[#38bdf8]" />}
                      Phone System
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBulkSetTelephonyProvider('dialpad')} className="cursor-pointer">
                      <span className="w-2 h-2 rounded-full bg-purple-600 mr-2"></span>
                      Route to Dialpad
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkSetTelephonyProvider('aircall')} className="cursor-pointer">
                      <span className="w-2 h-2 rounded-full bg-teal-600 mr-2"></span>
                      Route to AirCall
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkSetTelephonyProvider('default')} className="cursor-pointer">
                      <span className="w-2 h-2 rounded-full bg-slate-400 mr-2"></span>
                      Reset to System Default
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={() => setShowBulkLogoutConfirm(true)}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Dedicated Filters Section: Name, Email, Role, Email Verified, 2FA */}
        <div className="bg-card border border-border/80 rounded-lg p-3.5 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Filter className="h-4 w-4 text-[#095c7b] dark:text-[#38bdf8]" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-[#095c7b]/10 text-[#095c7b] dark:bg-[#38bdf8]/10 dark:text-[#38bdf8] font-medium border-0">
                  {activeFilterCount} active
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Showing <strong className="text-foreground">{processedUsers.length}</strong> of {statusFilteredUsers.length} users
              </span>
              {isAnyFilterActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground px-2 gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset Filters
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {/* User Name Filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">User Name</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by name..."
                  className="pl-8 pr-7 h-9 text-xs sm:text-sm bg-background"
                  value={nameFilter}
                  onChange={(e) => {
                    setNameFilter(e.target.value);
                    setSelectedUserIds([]);
                  }}
                />
                {nameFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setNameFilter('');
                      setSelectedUserIds([]);
                    }}
                    className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                    title="Clear name filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Email Filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by email..."
                  className="pl-8 pr-7 h-9 text-xs sm:text-sm bg-background"
                  value={emailFilter}
                  onChange={(e) => {
                    setEmailFilter(e.target.value);
                    setSelectedUserIds([]);
                  }}
                />
                {emailFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmailFilter('');
                      setSelectedUserIds([]);
                    }}
                    className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                    title="Clear email filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Multi-Select Role Filter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground font-medium">Roles</Label>
                {selectedRoles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setSelectedRoles([]); setSelectedUserIds([]); }}
                    className="text-[10px] text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Clear ({selectedRoles.length})
                  </button>
                )}
              </div>
              <Popover open={roleDropdownOpen} onOpenChange={setRoleDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={roleDropdownOpen}
                    className="w-full justify-between h-9 px-2.5 text-xs sm:text-sm font-normal bg-background hover:bg-muted/40 border-input"
                  >
                    <span className="truncate text-left flex-1">
                      {selectedRoles.length === 0
                        ? `All Roles (${statusFilteredUsers.length})`
                        : selectedRoles.length === 1
                        ? selectedRoles[0]
                        : `${selectedRoles.length} roles selected`}
                    </span>
                    <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2 z-[60]" align="start">
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search roles..."
                        value={roleSearchTerm}
                        onChange={(e) => setRoleSearchTerm(e.target.value)}
                        className="pl-7 pr-2 h-7 text-xs bg-background"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] px-1 text-muted-foreground border-b border-border/40 pb-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRoles(availableRoles);
                          setSelectedUserIds([]);
                        }}
                        className="text-[#095c7b] dark:text-[#38bdf8] hover:underline font-medium"
                      >
                        Select All ({availableRoles.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRoles([]);
                          setSelectedUserIds([]);
                        }}
                        className="hover:underline hover:text-foreground"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-0.5 pt-0.5">
                      {filteredAvailableRoles.length > 0 ? (
                        filteredAvailableRoles.map((role) => {
                          const isChecked = selectedRoles.includes(role);
                          const count = roleCounts[role] || 0;
                          return (
                            <div
                              key={role}
                              onClick={() => handleToggleRole(role)}
                              className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/80 cursor-pointer text-xs transition-colors select-none"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => handleToggleRole(role)}
                                  className="h-3.5 w-3.5 pointer-events-none"
                                />
                                <span className={cn("truncate", isChecked && "font-medium text-foreground")}>
                                  {role}
                                </span>
                              </div>
                              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 h-4 font-normal">
                                {count}
                              </Badge>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-3 text-center text-xs text-muted-foreground">
                          No roles found
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Email Verified Filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Email Verified</Label>
              <Select
                value={emailVerifiedFilter}
                onValueChange={(val: 'all' | 'verified' | 'unverified') => {
                  setEmailVerifiedFilter(val);
                  setSelectedUserIds([]);
                }}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm bg-background">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="verified">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Verified
                    </span>
                  </SelectItem>
                  <SelectItem value="unverified">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      Unverified / Pending
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 2FA Status Filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">2FA Status</Label>
              <Select
                value={twoFactorFilter}
                onValueChange={(val: 'all' | 'enabled' | 'disabled' | 'totp' | 'sms') => {
                  setTwoFactorFilter(val);
                  setSelectedUserIds([]);
                }}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm bg-background">
                  <SelectValue placeholder="All 2FA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All 2FA Statuses</SelectItem>
                  <SelectItem value="enabled">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      2FA Enabled (All)
                    </span>
                  </SelectItem>
                  <SelectItem value="totp">
                    <span className="flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-purple-600" />
                      Google Auth (TOTP)
                    </span>
                  </SelectItem>
                  <SelectItem value="sms">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-blue-600" />
                      SMS 2FA
                    </span>
                  </SelectItem>
                  <SelectItem value="disabled">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                      2FA Disabled (Off)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {isAnyFilterActive && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/30">
              <span className="text-[11px] text-muted-foreground mr-1">Active filters:</span>
              {nameFilter && (
                <Badge variant="outline" className="gap-1 text-[11px] font-normal py-0.5 pl-2 pr-1 bg-muted/40">
                  Name: <span className="font-medium text-foreground">{nameFilter}</span>
                  <button type="button" onClick={() => { setNameFilter(''); setSelectedUserIds([]); }} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {emailFilter && (
                <Badge variant="outline" className="gap-1 text-[11px] font-normal py-0.5 pl-2 pr-1 bg-muted/40">
                  Email: <span className="font-medium text-foreground">{emailFilter}</span>
                  <button type="button" onClick={() => { setEmailFilter(''); setSelectedUserIds([]); }} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedRoles.map((role) => (
                <Badge key={role} variant="outline" className="gap-1 text-[11px] font-normal py-0.5 pl-2 pr-1 bg-muted/40">
                  Role: <span className="font-medium text-foreground">{role}</span>
                  <button type="button" onClick={() => handleToggleRole(role)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {emailVerifiedFilter !== 'all' && (
                <Badge variant="outline" className="gap-1 text-[11px] font-normal py-0.5 pl-2 pr-1 bg-muted/40">
                  Email: <span className="font-medium text-foreground">{emailVerifiedFilter === 'verified' ? 'Verified' : 'Unverified'}</span>
                  <button type="button" onClick={() => { setEmailVerifiedFilter('all'); setSelectedUserIds([]); }} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {twoFactorFilter !== 'all' && (
                <Badge variant="outline" className="gap-1 text-[11px] font-normal py-0.5 pl-2 pr-1 bg-muted/40">
                  2FA: <span className="font-medium text-foreground">
                    {twoFactorFilter === 'enabled' ? 'Enabled' : twoFactorFilter === 'totp' ? 'Google Auth' : twoFactorFilter === 'sms' ? 'SMS' : 'Disabled'}
                  </span>
                  <button type="button" onClick={() => { setTwoFactorFilter('all'); setSelectedUserIds([]); }} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="outline" className="gap-1 text-[11px] font-normal py-0.5 pl-2 pr-1 bg-muted/40">
                  Search: <span className="font-medium text-foreground">{searchTerm}</span>
                  <button type="button" onClick={() => { setSearchTerm(''); setSelectedUserIds([]); }} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] text-[#095c7b] dark:text-[#38bdf8] hover:underline ml-1 font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Role Sub-Pills (Multi-Select Supported) */}
        <div className="w-full overflow-x-auto pb-1">
          <div className="inline-flex h-auto flex-wrap items-center justify-start gap-1 p-1 bg-muted/40 rounded-lg border border-border/50">
            <button
              type="button"
              onClick={() => {
                setSelectedRoles([]);
                setSelectedUserIds([]);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs py-1 px-2.5 rounded-md font-medium transition-all select-none",
                selectedRoles.length === 0
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              All Roles
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] font-normal">
                {statusFilteredUsers.length}
              </Badge>
            </button>
            {availableRoles.map((role) => {
              const count = roleCounts[role] || 0;
              const isSelected = selectedRoles.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleToggleRole(role)}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs py-1 px-2.5 rounded-md font-medium transition-all select-none border border-transparent",
                    isSelected
                      ? "bg-background text-[#095c7b] dark:text-[#38bdf8] shadow-xs font-semibold border-[#095c7b]/30 dark:border-[#38bdf8]/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 text-[#095c7b] dark:text-[#38bdf8]" />}
                  {role}
                  <Badge 
                    variant={isSelected ? "default" : "secondary"} 
                    className={cn(
                      "ml-1 px-1.5 py-0 text-[10px] font-normal",
                      isSelected && "bg-[#095c7b] text-white dark:bg-[#38bdf8] dark:text-slate-900"
                    )}
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
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
                <TableHead>Phone System</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead>Email Verified</TableHead>
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
                    <TableCell>
                      {user.linkedFranchisees && user.linkedFranchisees.length > 1 ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-xs text-foreground">{user.franchisee || user.linkedFranchisees[0].franchiseeName}</span>
                          <span className="text-[10px] text-muted-foreground font-semibold bg-[#095c7b]/10 text-[#095c7b] px-1.5 py-0.5 rounded w-fit">
                            +{user.linkedFranchisees.length - 1} more ({user.linkedFranchisees.map((f: any) => f.franchiseeName).join(', ')})
                          </span>
                        </div>
                      ) : (
                        <span>{user.franchisee || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.preferredTelephonyProvider === 'dialpad' ? (
                        <Badge className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 whitespace-nowrap text-[11px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mr-1.5 inline-block"></span> Dialpad
                        </Badge>
                      ) : user.preferredTelephonyProvider === 'aircall' ? (
                        <Badge className="bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 whitespace-nowrap text-[11px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mr-1.5 inline-block"></span> AirCall
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs font-normal">Default</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!user.requires2FA ? (
                        <span className="text-muted-foreground text-xs font-normal">Off</span>
                      ) : user.twoFactorMethod === 'totp' ? (
                        <Badge className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 whitespace-nowrap text-[11px] font-medium">
                          <Key className="mr-1 h-3 w-3 text-purple-600 dark:text-purple-400" /> Google Auth
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 whitespace-nowrap text-[11px] font-medium">
                          <Smartphone className="mr-1 h-3 w-3 text-blue-600 dark:text-blue-400" /> SMS 2FA
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {verificationMap[user.uid]?.emailVerified || user.emailVerified ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 whitespace-nowrap text-[11px] font-medium">
                          <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Verified
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 whitespace-nowrap text-[11px] font-medium">
                          <Clock className="mr-1 h-3 w-3 text-amber-600 dark:text-amber-400" /> Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.disabled ? 'destructive' : 'secondary'}>
                        {user.disabled ? 'Disabled' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {!(verificationMap[user.uid]?.emailVerified || user.emailVerified) && (
                          <>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 text-[#095c7b] hover:text-[#07465e] hover:bg-blue-50 dark:hover:bg-blue-950/30" 
                              onClick={() => handleResendVerificationEmail(user)} 
                              disabled={isResendingVerification === user.uid}
                              title="Resend Branded Verification Email"
                            >
                              {isResendingVerification === user.uid ? <Loader className="h-4 w-4" /> : <MailCheck className="h-4 w-4" />}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" 
                              onClick={() => handleManualVerifyUser(user)} 
                              disabled={isManualVerifying === user.uid}
                              title="Manually Mark Email Verified"
                            >
                              {isManualVerifying === user.uid ? <Loader className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                            </Button>
                          </>
                        )}
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
                          title="Send Password Reset Link Email"
                        >
                            {isSendingReset === user.email ? <Loader className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30" 
                          onClick={() => {
                            setUserToResetPassword(user);
                            const defaultPass = generateRandomPassword();
                            setResetPasswordInput(defaultPass);
                            setShowPasswordText(true);
                            setSelectedEmailType('welcome');
                          }}
                          title="Reset Password & Send Welcome Email"
                        >
                            <Key className="h-4 w-4" />
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
                  <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2 py-6">
                      <p className="font-medium text-foreground">No users found</p>
                      <p className="text-xs text-muted-foreground max-w-md">
                        {isAnyFilterActive 
                          ? 'No users match your active filters (name, email, role, email verification, or 2FA).' 
                          : activeTab === 'disabled'
                          ? 'No disabled users in the system.'
                          : activeTab === 'active'
                          ? 'No active users in the system.'
                          : 'No users found in the system.'}
                      </p>
                      {isAnyFilterActive && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleResetFilters} 
                          className="mt-1 h-8 text-xs gap-1.5"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Clear all filters
                        </Button>
                      )}
                    </div>
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
                <div className="grid grid-cols-2 gap-3 pb-2 border-b">
                    <div className="space-y-1.5">
                        <Label htmlFor="edit-first-name">First Name</Label>
                        <Input
                            id="edit-first-name"
                            value={newFirstName}
                            onChange={(e) => setNewFirstName(e.target.value)}
                            placeholder="e.g. John"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="edit-last-name">Last Name</Label>
                        <Input
                            id="edit-last-name"
                            value={newLastName}
                            onChange={(e) => setNewLastName(e.target.value)}
                            placeholder="e.g. Smith"
                        />
                    </div>
                </div>

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
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Building2 className="h-4 w-4 text-[#095c7b]" />
                                    Linked Franchise Entities ({newLinkedFranchisees.length})
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs bg-white border-[#095c7b]/30 text-[#095c7b] hover:bg-[#095c7b]/5"
                                    onClick={() => {
                                        setNewLinkedFranchisees(prev => [
                                            ...prev,
                                            { franchiseeId: '', franchiseeName: '', relationship: 'owner', isDefault: prev.length === 0 }
                                        ]);
                                    }}
                                >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    Add Franchise
                                </Button>
                            </div>

                            {newLinkedFranchisees.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic py-2">No franchises currently linked. Click &quot;Add Franchise&quot; above to link this user account to a franchise.</p>
                            ) : (
                                <div className="space-y-2">
                                    {newLinkedFranchisees.map((item, index) => (
                                        <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-md bg-white border border-border dark:bg-slate-900 shadow-xs">
                                            <div className="flex-1">
                                                <Select
                                                    value={item.franchiseeId || 'none'}
                                                    onValueChange={(val) => {
                                                        const selectedFr = allFranchisees.find(f => String(f.internalId) === val);
                                                        const name = selectedFr ? selectedFr.name : val;
                                                        setNewLinkedFranchisees(prev => prev.map((f, i) => i === index ? { 
                                                            ...f, 
                                                            franchiseeId: val === 'none' ? '' : val, 
                                                            franchiseeName: name 
                                                        } : f));
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="Select franchise..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-60">
                                                        <SelectItem value="none">
                                                            <span className="text-muted-foreground italic">(Select Franchise)</span>
                                                        </SelectItem>
                                                        {allFranchisees.map((fr) => (
                                                            <SelectItem key={fr.internalId} value={String(fr.internalId)}>
                                                                {fr.name || 'Unnamed'} ({fr.internalId})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="w-full sm:w-28">
                                                <Select
                                                    value={item.relationship}
                                                    onValueChange={(val: 'owner' | 'investor') => {
                                                        setNewLinkedFranchisees(prev => prev.map((f, i) => i === index ? { ...f, relationship: val } : f));
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 text-xs capitalize">
                                                        <SelectValue placeholder="Role" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="owner">Owner</SelectItem>
                                                        <SelectItem value="investor">Investor</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    type="button"
                                                    variant={item.isDefault ? 'default' : 'outline'}
                                                    size="sm"
                                                    className={`h-8 px-2 text-[11px] font-medium ${item.isDefault ? 'bg-[#095c7b] text-white hover:bg-[#074760]' : 'text-muted-foreground hover:text-foreground'}`}
                                                    onClick={() => {
                                                        setNewLinkedFranchisees(prev => prev.map((f, i) => ({ ...f, isDefault: i === index })));
                                                    }}
                                                    title={item.isDefault ? 'Primary / Default Franchise' : 'Set as Default Franchise'}
                                                >
                                                    {item.isDefault ? 'Primary' : 'Set Primary'}
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => {
                                                        setNewLinkedFranchisees(prev => {
                                                            const filtered = prev.filter((_, i) => i !== index);
                                                            if (item.isDefault && filtered.length > 0) {
                                                                filtered[0].isDefault = true;
                                                            }
                                                            return filtered;
                                                        });
                                                    }}
                                                    title="Remove link"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="text-[11px] text-muted-foreground">Link one or multiple franchise entities to this single user account. The user will be able to switch between them from the header bar after logging in.</p>
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

                 {/* 2FA Security Section */}
                 <div className="rounded-lg border p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                   <div className="space-y-1">
                     <Label className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                       <ShieldCheck className="h-4 w-4 text-[#095c7b]" />
                       Two-Factor Authentication (2FA)
                     </Label>
                     <p className="text-xs text-muted-foreground">
                       Choose the required 2FA verification method for this user on login.
                     </p>
                   </div>

                   <Select 
                     value={newTwoFactorOption} 
                     onValueChange={(val: 'disabled' | 'sms' | 'totp') => setNewTwoFactorOption(val)}
                     disabled={!isSuperAdmin}
                   >
                     <SelectTrigger className="bg-background">
                       <SelectValue placeholder="Select 2FA Method" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="disabled">Disabled (No 2FA Required)</SelectItem>
                       <SelectItem value="sms">SMS Verification (MailPlus SMS Gateway)</SelectItem>
                       <SelectItem value="totp">Google Authenticator (TOTP App Code)</SelectItem>
                     </SelectContent>
                   </Select>

                   {!isSuperAdmin && (
                     <p className="text-[11px] text-amber-600 dark:text-amber-400">
                       * Only Super Administrators can configure 2FA requirements.
                     </p>
                   )}

                   {newTwoFactorOption === 'sms' && !newMobileNumber && (
                     <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                       <AlertTriangle className="h-3.5 w-3.5" /> A valid Mobile Number above is required for SMS code delivery.
                     </p>
                   )}

                   {newTwoFactorOption === 'totp' && (
                     <div className="text-xs space-y-1 bg-purple-50/60 dark:bg-purple-950/40 p-2.5 rounded border border-purple-200/60 dark:border-purple-800/40">
                       <div className="font-medium text-purple-900 dark:text-purple-300 flex items-center gap-1">
                         <Key className="h-3.5 w-3.5 text-purple-600" />
                         {userToEdit?.totpConfirmed ? 'Google Authenticator Configured' : 'Setup Required on Next Login'}
                       </div>
                       <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80">
                         {userToEdit?.totpConfirmed 
                           ? 'User verifies rotating 6-digit codes generated in their Google Authenticator app.'
                           : 'User will be prompted with a QR code on their next login to connect their app.'}
                       </p>
                     </div>
                   )}

                   {userToEdit?.requires2FA && isSuperAdmin && (
                     <div className="pt-2 border-t flex items-center justify-between">
                       <span className="text-xs text-muted-foreground">Having login or verification issues?</span>
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         className="h-7 text-xs text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                         disabled={isResetting2FA === userToEdit.uid}
                         onClick={() => handleReset2FA(userToEdit)}
                       >
                         {isResetting2FA === userToEdit.uid ? <Loader className="h-3 w-3 mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                         Reset 2FA State
                       </Button>
                     </div>
                   )}
                 </div>
                 {!newAssignedRoles.includes('Franchisee') && (
                   <>
                   <div className="space-y-2">
                       <Label htmlFor="telephony-provider">Phone System Provider</Label>
                       <Select 
                         value={newPreferredTelephonyProvider} 
                         onValueChange={(val: any) => setNewPreferredTelephonyProvider(val)}
                       >
                         <SelectTrigger id="telephony-provider" className="bg-background">
                           <SelectValue placeholder="Select Phone System" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="default">🌐 System Default (Follows Global Switch)</SelectItem>
                           <SelectItem value="dialpad">🟣 Dialpad (User Override)</SelectItem>
                           <SelectItem value="aircall">🟢 AirCall (User Override)</SelectItem>
                         </SelectContent>
                       </Select>
                       <p className="text-[11px] text-muted-foreground">
                         Controls whether this user inherits the global switch or is directly routed to Dialpad or AirCall.
                       </p>
                   </div>
                   <div className="space-y-2">
                       <Label htmlFor="aircall-number">AirCall Number</Label>
                       <Input id="aircall-number" value={newAircallPhoneNumber} onChange={(e) => setNewAircallPhoneNumber(e.target.value)} placeholder="e.g. +61298765432" />
                   </div>
                   <div className="space-y-2">
                       <Label htmlFor="dialpad-number">Dialpad Number</Label>
                       <Input id="dialpad-number" value={newDialpadPhoneNumber} onChange={(e) => setNewDialpadPhoneNumber(e.target.value)} placeholder="e.g. +61298765432" />
                   </div>
                   <div className="space-y-2">
                       <Label htmlFor="dialpad-user-id">Dialpad User ID / Email</Label>
                       <Input id="dialpad-user-id" value={newDialpadUserId} onChange={(e) => setNewDialpadUserId(e.target.value)} placeholder="e.g. rep@mailplus.com.au or Dialpad ID" />
                   </div>
                   </>
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

      {/* Direct Password Reset & Welcome Email Dialog */}
      <Dialog open={!!userToResetPassword} onOpenChange={(open) => !open && setUserToResetPassword(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Key className="h-5 w-5 text-amber-600" /> Reset Password & Send Credentials
            </DialogTitle>
            <DialogDescription>
              Directly reset the Firebase Auth password for{' '}
              <strong className="text-foreground">{userToResetPassword?.displayName || userToResetPassword?.email}</strong> ({userToResetPassword?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-password-input">New Password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="new-password-input"
                    type={showPasswordText ? "text" : "password"}
                    placeholder="Enter new password (min 6 chars)"
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    className="pr-10 font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                  >
                    {showPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const generated = generateRandomPassword();
                    setResetPasswordInput(generated);
                    setShowPasswordText(true);
                  }}
                  title="Generate Random Password"
                >
                  <RefreshCw className="h-4 w-4 mr-1" /> Generate
                </Button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label>Notification Email Type</Label>
              <Select value={selectedEmailType} onValueChange={(val: 'welcome' | 'password_reset' | 'none') => setSelectedEmailType(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select notification email type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">
                    🎉 Welcome to Prospect+ Email
                  </SelectItem>
                  <SelectItem value="password_reset">
                    🔒 Password Reset Notice Email
                  </SelectItem>
                  <SelectItem value="none">
                    🚫 Do Not Send Email
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground pt-1">
                {selectedEmailType === 'welcome' && 'Sends the standard "Welcome to Prospect+" account creation email with login credentials.'}
                {selectedEmailType === 'password_reset' && 'Sends a "Password Reset Notice" email informing the user that an admin updated their password.'}
                {selectedEmailType === 'none' && 'Resets password in Firebase Auth without sending an email notification.'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToResetPassword(null)} disabled={isDirectResetting}>
              Cancel
            </Button>
            <Button
              onClick={handleDirectPasswordReset}
              disabled={isDirectResetting || !resetPasswordInput.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {isDirectResetting ? <Loader className="h-4 w-4 mr-2" /> : <Key className="h-4 w-4 mr-2" />}
              Reset Password & Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
