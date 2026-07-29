'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { getLeadsFromFirebase, updateLeadInFirebase, logActivity, getAllFranchisees } from '@/services/firebase';
import type { Lead, Franchisee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Phone, Mail, CheckCircle, ShieldAlert, UserCheck } from 'lucide-react';
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

export default function FranchiseeLeadVerificationClient() {
  const { userProfile, isSuperAdmin } = useAuth();
  const { canView } = usePermissions();
  const { toast } = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingLeadId, setProcessingLeadId] = useState<string | null>(null);

  // Email Franchisee Modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedLeadForEmail, setSelectedLeadForEmail] = useState<Lead | null>(null);
  const [emailNotes, setEmailNotes] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const isAdminOrSuperAdmin = 
    isSuperAdmin || 
    userProfile?.activeRole === 'admin' || 
    userProfile?.activeRole === 'superadmin' || 
    canView('franchiseeVerification');

  const fetchVerificationLeads = useCallback(async () => {
    setLoading(true);
    try {
      const [allLeads, frs] = await Promise.all([
        getLeadsFromFirebase(),
        getAllFranchisees()
      ]);
      setFranchisees(frs);

      // Filter leads assigned to Aleyna for check or flagged as franchiseeReviewPending
      const pendingLeads = allLeads.filter(l => 
        l.dialerAssigned === 'Aleyna Harnett' || 
        l.franchiseeReviewPending === true ||
        (l.customerSource === 'Franchisee Generated' && l.bucket === 'outbound')
      );
      setLeads(pendingLeads);
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

  const handleMoveBucket = async (lead: Lead, targetBucket: 'outbound' | 'account_manager') => {
    setProcessingLeadId(lead.id);
    try {
      const updateData: Partial<Lead> = {
        bucket: targetBucket,
        franchiseeReviewPending: false,
      };

      if (targetBucket === 'account_manager') {
        updateData.isPriority = true;
      }

      await updateLeadInFirebase(lead.id, updateData);
      await logActivity(lead.id, {
        type: 'Update',
        notes: `Franchisee lead verified by ${userProfile?.displayName || 'Admin'} and moved to ${targetBucket === 'account_manager' ? 'Account Manager' : 'Outbound'} bucket.`,
        author: userProfile?.displayName || 'Admin'
      });

      toast({
        title: 'Lead Bucket Updated',
        description: `Lead "${lead.companyName}" successfully moved to ${targetBucket === 'account_manager' ? 'Account Manager' : 'Outbound'} bucket.`,
      });

      setLeads(prev => prev.filter(l => l.id !== lead.id));
    } catch (err) {
      console.error('Failed to update lead bucket:', err);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not move lead bucket.',
      });
    } finally {
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
            Review franchisee-entered leads assigned for check, verify interaction details, and assign to appropriate pipeline buckets.
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
            <h3 className="text-lg font-semibold">No Pending Franchisee Leads</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              All franchisee-entered leads have been checked and processed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Leads Pending Verification ({leads.length})</CardTitle>
            <CardDescription>
              Review leads entered by franchisees. Move priority/verified leads to Account Manager or Outbound buckets.
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
                        <p className="font-medium text-slate-900">{lead.contact?.firstName} {lead.contact?.lastName}</p>
                        <p className="text-muted-foreground">{lead.customerPhone || lead.contact?.phone || 'No phone'}</p>
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
                          onClick={() => handleMoveBucket(lead, 'account_manager')}
                        >
                          AM Bucket
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={processingLeadId === lead.id}
                          onClick={() => handleMoveBucket(lead, 'outbound')}
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
