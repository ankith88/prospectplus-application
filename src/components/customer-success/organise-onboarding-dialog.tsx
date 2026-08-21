'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { createOnboardingRequest, DEFAULT_LIAM_UID, DEFAULT_LIAM_NAME } from '@/services/onboarding-service';
import { getAllUsers } from '@/services/firebase';
import type { Lead, UserProfile, OnboardingRequestPriority } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import { CalendarCheck, UserCheck } from 'lucide-react';

interface OrganiseOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  leadId?: string;
  onSuccess?: () => void;
}

export function OrganiseOnboardingDialog({
  open,
  onOpenChange,
  lead,
  companyName: propCompanyName,
  contactName: propContactName,
  contactEmail: propContactEmail,
  contactPhone: propContactPhone,
  leadId: propLeadId,
  onSuccess,
}: OrganiseOnboardingDialogProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const firstContact = lead?.contacts?.[0];
  const effectiveLeadId = lead?.id || propLeadId || '';
  const effectiveCompanyName = lead?.companyName || propCompanyName || '';
  const effectiveContactName = (lead as any)?.primaryContactPerson || firstContact?.name || (lead as any)?.contactName || propContactName || '';
  const effectiveContactEmail = firstContact?.email || (lead as any)?.email || propContactEmail || '';
  const effectiveContactPhone = firstContact?.phone || (lead as any)?.phone || propContactPhone || '';

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [priority, setPriority] = useState<OnboardingRequestPriority>('Standard');
  const [assignedToUid, setAssignedToUid] = useState<string>(DEFAULT_LIAM_UID);
  const [assignedToName, setAssignedToName] = useState<string>(DEFAULT_LIAM_NAME);
  const [preferredTimeframe, setPreferredTimeframe] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // Fetch users list for assigning
      getAllUsers()
        .then(uList => {
          setUsers(uList);
          // Check if Liam exists in users list to get accurate display name
          const liamUser = uList.find(u => u.uid === DEFAULT_LIAM_UID);
          if (liamUser) {
            setAssignedToName(liamUser.displayName || 'Liam');
          }
        })
        .catch(e => console.error('Error fetching users:', e));
    }
  }, [open]);

  const handleAssigneeChange = (uid: string) => {
    setAssignedToUid(uid);
    const found = users.find(u => u.uid === uid);
    if (found) {
      setAssignedToName(found.displayName || found.email || 'Assigned Rep');
    } else if (uid === DEFAULT_LIAM_UID) {
      setAssignedToName(DEFAULT_LIAM_NAME);
    }
  };

  const isLpoPlusOnboarding = Boolean(
    lead?.bucket === 'lpo_network' ||
    (lead?.bucket as string)?.toLowerCase() === 'lpo_network' ||
    lead?.bucket === 'lpo_plus' ||
    (lead as any)?.isLpoLead ||
    (lead as any)?.lpoLeadId ||
    (lead as any)?.lpoPlusStatus ||
    effectiveCompanyName?.toUpperCase().includes('LPO')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveLeadId || !effectiveCompanyName) {
      toast({ variant: 'destructive', title: 'Error', description: 'Missing company or lead information.' });
      return;
    }

    try {
      setSubmitting(true);
      await createOnboardingRequest({
        leadId: effectiveLeadId,
        companyId: effectiveLeadId,
        companyName: effectiveCompanyName,
        contactName: effectiveContactName || 'N/A',
        contactEmail: effectiveContactEmail,
        contactPhone: effectiveContactPhone,
        requestedByUid: user?.uid || '',
        requestedByName: userProfile?.displayName || user?.email || 'System User',
        priority,
        assignedToUid,
        assignedToName,
        preferredTimeframe,
        notes,
        isLpoPlus: isLpoPlusOnboarding,
      });

      toast({
        title: 'Onboarding Request Created',
        description: `Onboarding request for ${effectiveCompanyName} has been sent to ${assignedToName}.`,
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to create onboarding request:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to Submit Request',
        description: err.message || 'An error occurred while creating the onboarding request.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-bold text-xl">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Organise Onboarding Request
          </DialogTitle>
          <DialogDescription>
            Submit an onboarding request for Customer Success team. Default assignee is Liam.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* LPO.Plus Onboarding Indicator */}
          {isLpoPlusOnboarding && (
            <div className="flex items-center gap-2.5 p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 rounded-lg font-medium text-xs">
              <Badge className="bg-[#095c7b] text-white hover:bg-[#095c7b] shrink-0 font-bold px-2 py-0.5">LPO.Plus</Badge>
              <span>This is an Onboarding request for <strong>LPO.Plus</strong>.</span>
            </div>
          )}

          {/* Target Company Banner */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Target Customer</p>
            <p className="font-bold text-foreground text-base mt-0.5">{effectiveCompanyName}</p>
            <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
              <span>Contact: <strong>{effectiveContactName || 'N/A'}</strong></span>
              {effectiveContactEmail && <span>• {effectiveContactEmail}</span>}
              {effectiveContactPhone && <span>• {effectiveContactPhone}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Assigned To */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-primary" /> Assigned CS Rep
              </Label>
              <Select value={assignedToUid} onValueChange={handleAssigneeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select CS Rep" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_LIAM_UID}>
                    Liam (Default - Customer Success)
                  </SelectItem>
                  {users
                    .filter(u => u.uid !== DEFAULT_LIAM_UID)
                    .map(u => (
                      <SelectItem key={u.uid} value={u.uid}>
                        {u.displayName || u.email} {u.activeRole ? `(${u.activeRole})` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Priority Level</Label>
              <Select value={priority} onValueChange={(val: OnboardingRequestPriority) => setPriority(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard Priority</SelectItem>
                  <SelectItem value="Urgent">Urgent / High Value</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preferred Timeframe */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Preferred Onboarding Timeframe</Label>
            <Input
              placeholder="e.g. ASAP / Next Tuesday Morning / Specific Date"
              value={preferredTimeframe}
              onChange={e => setPreferredTimeframe(e.target.value)}
            />
          </div>

          {/* Notes / Special Instructions */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Special Notes & Requirements</Label>
            <Textarea
              placeholder="Provide any key information for Liam/CS team (e.g., custom requirements, key contacts, account setup notes)..."
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? <Loader className="w-4 h-4" /> : <CalendarCheck className="w-4 h-4" />}
              Submit Onboarding Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
