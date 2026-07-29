'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { getLeadsFromFirebase, getLeadContacts, logActivity, getAllFranchisees, getAllUsers } from '@/services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { Lead, Franchisee, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Phone, Mail, CheckCircle, ShieldAlert, UserCheck, UserPlus } from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const isAssignedToUserOrAm = (lead: Lead): boolean => {
  const am = lead.accountManagerAssigned?.trim();
  const dialer = lead.dialerAssigned?.trim();

  const isAmAssigned = Boolean(am && am !== 'Unassigned' && am !== 'unassigned');
  const isDialerAssigned = Boolean(dialer && dialer !== 'Unassigned' && dialer !== 'unassigned' && dialer !== 'Aleyna Harnett');

  return isAmAssigned || isDialerAssigned;
};

export default function FranchiseeLeadVerificationClient() {
  const { userProfile, isSuperAdmin } = useAuth();
  const { canView } = usePermissions();
  const { toast } = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingLeadId, setProcessingLeadId] = useState<string | null>(null);

  // Email Franchisee Modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedLeadForEmail, setSelectedLeadForEmail] = useState<Lead | null>(null);
  const [emailNotes, setEmailNotes] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Assign Lead Modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedLeadForAssign, setSelectedLeadForAssign] = useState<Lead | null>(null);
  const [targetBucket, setTargetBucket] = useState<'outbound' | 'account_manager'>('outbound');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  const isAdminOrSuperAdmin = 
    isSuperAdmin || 
    userProfile?.activeRole === 'admin' || 
    (userProfile?.activeRole as string) === 'superadmin' || 
    canView('franchiseeVerification');

  const fetchVerificationLeads = useCallback(async () => {
    setLoading(true);
    try {
      const [allLeads, frs, allSystemUsers] = await Promise.all([
        getLeadsFromFirebase({ summary: true }),
        getAllFranchisees(),
        getAllUsers()
      ]);
      setFranchisees(frs);
      setUsers(allSystemUsers.filter(u => !u.disabled));

      // Filter leads: candidate for verification AND NOT YET ASSIGNED to a user or account manager
      const pendingLeads = allLeads.filter(l => {
        const isCandidate = 
          l.dialerAssigned === 'Aleyna Harnett' || 
          l.franchiseeReviewPending === true ||
          !l.bucket || l.bucket === '' || l.bucket === 'blank' ||
          (l.customerSource === 'Franchisee Generated' && l.bucket === 'outbound');

        return isCandidate && !isAssignedToUserOrAm(l);
      });

      // Fetch contacts only for the filtered pending leads
      const pendingLeadsWithContacts = await Promise.all(
        pendingLeads.map(async (l) => {
          try {
            const contacts = await getLeadContacts(l.id);
            return { ...l, contacts, contactCount: contacts.length };
          } catch {
            return l;
          }
        })
      );

      setLeads(pendingLeadsWithContacts);
    } catch (error) {
      console.error('Failed to fetch verification leads:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load franchisee leads for verification.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdminOrSuperAdmin) {
      fetchVerificationLeads();
    } else {
      setLoading(false);
    }
  }, [isAdminOrSuperAdmin, fetchVerificationLeads]);

  const filteredAssignees = useMemo(() => {
    const sortedUsers = [...users].sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
    if (targetBucket === 'account_manager') {
      const ams = sortedUsers.filter(u => 
        u.assignedRoles?.some(r => ['Account Manager', 'Account Managers', 'account managers'].includes(r)) ||
        u.activeRole === 'Account Manager' || u.activeRole === 'admin' || u.activeRole === 'superadmin'
      );
      return ams.length > 0 ? ams : sortedUsers;
    } else {
      const reps = sortedUsers.filter(u => 
        u.assignedRoles?.some(r => ['user', 'Dialer', 'dialers', 'Outbound Rep'].includes(r)) ||
        u.activeRole === 'user' || u.activeRole === 'admin' || u.activeRole === 'superadmin'
      );
      return reps.length > 0 ? reps : sortedUsers;
    }
  }, [users, targetBucket]);

  if (!isAdminOrSuperAdmin) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-8 text-center space-y-4">
            <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-destructive">Access Restricted</h2>
            <p className="text-muted-foreground">
              This verification page is restricted strictly to users with <strong>Admin</strong> and <strong>Superadmin</strong> roles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleOpenAssignModal = (lead: Lead, bucket: 'outbound' | 'account_manager') => {
    setSelectedLeadForAssign(lead);
    setTargetBucket(bucket);
    setSelectedAssignee('');
    setAssignModalOpen(true);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedLeadForAssign) return;
    if (!selectedAssignee) {
      toast({ variant: 'destructive', title: 'Assignee Required', description: 'Please select a user or account manager to assign.' });
      return;
    }

    setProcessingLeadId(selectedLeadForAssign.id);
    setIsAssigning(true);
    try {
      const updateData: Partial<Lead> = {
        bucket: targetBucket,
        franchiseeReviewPending: false,
      };

      if (targetBucket === 'account_manager') {
        updateData.accountManagerAssigned = selectedAssignee;
        updateData.salesRepAssigned = selectedAssignee;
        updateData.isPriority = true;
      } else {
        updateData.dialerAssigned = selectedAssignee;
        updateData.salesRepAssigned = selectedAssignee;
      }

      await updateDoc(doc(firestore, 'leads', selectedLeadForAssign.id), updateData as any);
      await logActivity(selectedLeadForAssign.id, {
        type: 'Update',
        notes: `Franchisee lead verified by ${userProfile?.displayName || 'Admin'} and assigned to ${selectedAssignee} in ${targetBucket === 'account_manager' ? 'Account Manager' : 'Outbound'} bucket.`,
        author: userProfile?.displayName || 'Admin'
      });

      toast({
        title: 'Lead Verified & Assigned',
        description: `Lead "${selectedLeadForAssign.companyName}" successfully moved to ${targetBucket === 'account_manager' ? 'Account Manager' : 'Outbound'} bucket and assigned to ${selectedAssignee}.`,
      });

      setLeads(prev => prev.filter(l => l.id !== selectedLeadForAssign.id));
      setAssignModalOpen(false);
    } catch (err) {
      console.error('Failed to update lead assignment:', err);
      toast({
        variant: 'destructive',
        title: 'Assignment Failed',
        description: 'Could not assign lead to selected user.',
      });
    } finally {
      setIsAssigning(false);
      setProcessingLeadId(null);
    }
  };

  const handleOpenEmailModal = (lead: Lead) => {
    setSelectedLeadForEmail(lead);
    setEmailNotes(`Hi, regarding lead ${lead.companyName} (${lead.address?.city || ''}): could you please provide additional details?`);
    setEmailModalOpen(true);
  };

  const handleSendEmailToFranchisee = async () => {
    if (!selectedLeadForEmail) return;
    setIsSendingEmail(true);

    try {
      const franchiseeObj = franchisees.find(f => 
        f.name?.toLowerCase() === selectedLeadForEmail.franchisee?.toLowerCase() ||
        f.internalId === selectedLeadForEmail.franchisee
      );

      const franchiseeEmail = franchiseeObj?.email;

      if (!franchiseeEmail) {
        toast({
          variant: 'destructive',
          title: 'Franchisee Email Not Found',
          description: `Could not locate contact email for franchisee ${selectedLeadForEmail.franchisee || 'assigned'}.`,
        });
        return;
      }

      window.location.href = `mailto:${franchiseeEmail}?subject=${encodeURIComponent(`Query regarding lead: ${selectedLeadForEmail.companyName}`)}&body=${encodeURIComponent(emailNotes)}`;

      await logActivity(selectedLeadForEmail.id, {
        type: 'Email',
        notes: `Sent query to franchisee (${selectedLeadForEmail.franchisee}): ${emailNotes}`,
        author: userProfile?.displayName || 'Admin'
      });

      toast({
        title: 'Mail Client Opened',
        description: `Opened email draft to franchisee ${selectedLeadForEmail.franchisee || ''}.`,
      });

      setEmailModalOpen(false);
    } catch (err) {
      console.error('Failed to email franchisee:', err);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <UserCheck className="w-7 h-7" /> Franchisee Lead Verification
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review unassigned franchisee-entered leads, verify interaction details, and assign them to the appropriate user or Account Manager.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchVerificationLeads} disabled={loading}>
          {loading ? <Loader /> : 'Refresh List'}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader />
        </div>
      ) : leads.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-semibold">No Unassigned Franchisee Leads</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              All franchisee-entered leads have been checked, verified, and assigned to users or account managers.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Unassigned Leads Pending Verification ({leads.length})</CardTitle>
            <CardDescription>
              Review leads entered by franchisees that have not yet been assigned to a user or account manager. Select a bucket and assign a user to complete verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company & Address</TableHead>
                    <TableHead>Franchisee</TableHead>
                    <TableHead>Contact & Phone</TableHead>
                    <TableHead>Brochures / Chat</TableHead>
                    <TableHead>Status / Bucket</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        <Link href={`/leads/${lead.id}`} className="text-primary font-semibold hover:underline block">
                          {lead.companyName}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[lead.address?.street, lead.address?.city, lead.address?.state, lead.address?.zip].filter(Boolean).join(', ')}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50">
                          {lead.franchisee || 'Unassigned'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <p className="font-medium text-slate-900">{(lead as any).contact?.firstName || lead.contacts?.[0]?.firstName} {(lead as any).contact?.lastName || lead.contacts?.[0]?.lastName}</p>
                        <p className="text-muted-foreground">{lead.customerPhone || (lead as any).contact?.phone || lead.contacts?.[0]?.phone || 'No phone'}</p>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <span className={`inline-block px-2 py-0.5 rounded font-medium ${lead.droppedOffBrochures ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                            Brochures: {lead.droppedOffBrochures ? 'Yes ✅' : 'No'}
                          </span>
                          <br />
                          <span className={`inline-block px-2 py-0.5 rounded font-medium ${lead.hadConversationWithContact ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                            Conversation: {lead.hadConversationWithContact ? 'Yes ✅' : 'No'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={lead.isPriority ? 'bg-amber-500 text-white' : 'bg-slate-600 text-white'}>
                          {lead.bucket === 'account_manager' ? 'Account Manager' : 'Outbound'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                          disabled={processingLeadId === lead.id}
                          onClick={() => handleOpenAssignModal(lead, 'account_manager')}
                        >
                          AM Bucket
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={processingLeadId === lead.id}
                          onClick={() => handleOpenAssignModal(lead, 'outbound')}
                        >
                          Outbound Bucket
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEmailModal(lead)}
                          title="Contact Franchisee"
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process & Assign Lead Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              <UserPlus className="w-5 h-5 text-primary" /> Process & Assign Lead
            </DialogTitle>
            <DialogDescription>
              Assign <strong>{selectedLeadForAssign?.companyName}</strong> to a bucket and select the responsible user or Account Manager.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Target Bucket</Label>
              <Select 
                value={targetBucket} 
                onValueChange={(val: 'outbound' | 'account_manager') => {
                  setTargetBucket(val);
                  setSelectedAssignee('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Bucket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="account_manager">Account Manager Bucket</SelectItem>
                  <SelectItem value="outbound">Outbound Sales Bucket</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {targetBucket === 'account_manager' ? 'Assign Account Manager' : 'Assign Outbound Sales Rep / User'}
              </Label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder={targetBucket === 'account_manager' ? "Select Account Manager..." : "Select Outbound User..."} />
                </SelectTrigger>
                <SelectContent>
                  {filteredAssignees.map(u => (
                    <SelectItem key={u.uid} value={u.displayName || u.email}>
                      {u.displayName || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmAssignment} disabled={isAssigning || !selectedAssignee}>
              {isAssigning ? <Loader /> : 'Confirm & Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Franchisee Modal */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Franchisee</DialogTitle>
            <DialogDescription>
              Send an email query to franchisee {selectedLeadForEmail?.franchisee} regarding lead {selectedLeadForEmail?.companyName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Textarea
              rows={4}
              value={emailNotes}
              onChange={(e) => setEmailNotes(e.target.value)}
              placeholder="Enter message to franchisee..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSendEmailToFranchisee} disabled={isSendingEmail}>
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
