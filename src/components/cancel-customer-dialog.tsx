"use client";

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';
import { LossReasonPicker } from '@/components/loss-reason-picker';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/services/firebase';
import { firestore } from '@/lib/firebase';
import { collection, doc, updateDoc, addDoc, getDocs } from 'firebase/firestore';
import { deactivateLocalMileAccessForLead } from '@/services/localmile-deactivation';
import type { Lead } from '@/lib/types';

export interface CancelCustomerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  onSuccess?: (updatedLeadDetails?: Partial<Lead>) => void;
}

export function CancelCustomerDialog({
  isOpen,
  onOpenChange,
  lead,
  onSuccess,
}: CancelCustomerDialogProps) {
  const { user, userProfile, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const isAdmin =
    userProfile?.activeRole === 'admin' ||
    userProfile?.role === 'admin' ||
    isSuperAdmin;

  const [cancellationThemes, setCancellationThemes] = useState<any[]>([]);
  const [requestedBy, setRequestedBy] = useState('');
  const [cancellationDate, setCancellationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [selectedWhyId, setSelectedWhyId] = useState('');
  const [selectedReasonId, setSelectedReasonId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const defaultRequestedBy =
        lead?.contacts?.[0]?.name ||
        (lead as any)?.contactName ||
        userProfile?.displayName ||
        '';
      setRequestedBy(defaultRequestedBy);
      setCancellationDate(new Date().toISOString().split('T')[0]);
      setSelectedThemeId('');
      setSelectedWhyId('');
      setSelectedReasonId('');

      const fetchHierarchy = async () => {
        try {
          const snap = await getDocs(collection(firestore, 'cancellation_hierarchy'));
          setCancellationThemes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.error('Error fetching cancellation hierarchy:', e);
        }
      };
      fetchHierarchy();
    }
  }, [isOpen, lead, userProfile]);

  const handleConfirmCancellation = async () => {
    if (!lead || !lead.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No customer selected for cancellation.',
      });
      return;
    }

    if (
      !selectedThemeId ||
      !selectedWhyId ||
      !selectedReasonId ||
      !requestedBy ||
      !cancellationDate
    ) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please fill in all cancellation fields, including theme and reason.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedThemeObj = cancellationThemes.find((t) => t.id === selectedThemeId);
      const selectedWhyObj = selectedThemeObj?.whys?.find(
        (w: any) => w.id === selectedWhyId
      );
      const selectedReasonObj = selectedWhyObj?.reasons?.find(
        (r: any) => r.id === selectedReasonId
      );

      const userDisplayName =
        userProfile?.displayName || user?.displayName || user?.email || 'System';
      const userEmail = userProfile?.email || user?.email || 'System';
      const nowIso = new Date().toISOString();

      if (isAdmin) {
        // Direct cancellation for Admin users
        const updates: any = {
          customerStatus: 'Lost Customer',
          status: 'Lost Customer',
          cancellationRequested: false,
          cancellationReason: selectedReasonObj?.name || '',
          cancellationReasonId: selectedReasonId,
          cancellationTheme: selectedThemeObj?.name || '',
          cancellationThemeId: selectedThemeId,
          cancellationCategory: selectedWhyObj?.name || '',
          cancellationWhyId: selectedWhyId,
          cancellationdate: cancellationDate,
          cancellationDate: cancellationDate,
        };

        await updateDoc(doc(firestore, 'leads', lead.id), updates);

        const leadAny = lead as any;
        await addDoc(collection(firestore, 'cancellations'), {
          leadId: lead.id,
          companyName: lead.companyName || `${leadAny.firstName || ''} ${leadAny.lastName || ''}`.trim(),
          contactName: lead.contacts?.[0]?.name || leadAny.contactName || '',
          contactEmail: lead.customerServiceEmail || leadAny.email || '',
          contactPhone: lead.customerPhone || leadAny.phone || '',
          requestedDate: nowIso,
          cancellationDate,
          trueServiceCancellationDate: cancellationDate,
          cancellationReason: selectedReasonObj?.name || '',
          cancellationReasonId: selectedReasonId,
          cancellationTheme: selectedThemeObj?.name || '',
          cancellationThemeId: selectedThemeId,
          cancellationWhyId: selectedWhyId,
          cancellationCategory: selectedWhyObj?.name || '',
          status: 'Cancelled',
          notes: `Direct cancellation completed by Admin ${userDisplayName}`,
          originalServices: lead.services || [],
          requestedBy,
          processedBy: `${userDisplayName} (${userEmail})`,
          processedAt: nowIso,
          createdBy: `${userDisplayName} (${userEmail})`,
          createdAt: nowIso,
          callsCount: 0,
        });

        await logActivity(lead.id, {
          type: 'Update',
          notes: `Direct customer cancellation completed by Admin ${userDisplayName}. Effective Date: ${cancellationDate}. Theme: ${selectedThemeObj?.name}, Why: ${selectedWhyObj?.name}, Reason: ${selectedReasonObj?.name}.`,
          author: userDisplayName,
        });

        // Deactivate LocalMile access if active
        deactivateLocalMileAccessForLead(lead.id, lead.contacts).catch(err => {
          console.error("Failed to deactivate LocalMile access during direct cancellation:", err);
        });

        toast({
          title: 'Customer Cancelled',
          description: `${lead.companyName || 'Customer'} has been directly cancelled.`,
        });

        onOpenChange(false);
        onSuccess?.(updates);
      } else {
        // Non-admin cancellation request
        const updates: any = {
          bucket: 'customer_success',
          cancellationRequested: true,
          cancellationReason: selectedReasonObj?.name || '',
          cancellationReasonId: selectedReasonId,
          cancellationTheme: selectedThemeObj?.name || '',
          cancellationThemeId: selectedThemeId,
          cancellationCategory: selectedWhyObj?.name || '',
          cancellationWhyId: selectedWhyId,
          cancellationdate: cancellationDate,
          cancellationDate: cancellationDate,
        };

        await updateDoc(doc(firestore, 'leads', lead.id), updates);

        const leadAny = lead as any;
        await addDoc(collection(firestore, 'cancellations'), {
          leadId: lead.id,
          companyName: lead.companyName || `${leadAny.firstName || ''} ${leadAny.lastName || ''}`.trim(),
          contactName: lead.contacts?.[0]?.name || leadAny.contactName || '',
          contactEmail: lead.customerServiceEmail || leadAny.email || '',
          contactPhone: lead.customerPhone || leadAny.phone || '',
          requestedDate: nowIso,
          cancellationDate,
          cancellationReason: selectedReasonObj?.name || '',
          cancellationReasonId: selectedReasonId,
          cancellationTheme: selectedThemeObj?.name || '',
          cancellationThemeId: selectedThemeId,
          cancellationWhyId: selectedWhyId,
          cancellationCategory: selectedWhyObj?.name || '',
          status: 'Pending',
          originalServices: lead.services || [],
          requestedBy,
          createdBy: `${userDisplayName} (${userEmail})`,
          createdAt: nowIso,
          callsCount: 0,
        });

        await logActivity(lead.id, {
          type: 'Update',
          notes: `Cancellation request submitted by ${requestedBy}. Requested Date: ${cancellationDate}. Theme: ${selectedThemeObj?.name}, Why: ${selectedWhyObj?.name}, Reason: ${selectedReasonObj?.name}.`,
          author: userDisplayName,
        });

        toast({
          title: 'Request Submitted',
          description: 'Cancellation request has been submitted to Customer Success.',
        });

        onOpenChange(false);
        onSuccess?.(updates);
      }
    } catch (e: any) {
      console.error('Cancellation failed:', e);
      toast({
        variant: 'destructive',
        title: 'Cancellation Failed',
        description: e.message || 'Failed to process customer cancellation.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isAdmin ? 'Cancel Customer' : 'Request Customer Cancellation'}
          </DialogTitle>
          <DialogDescription>
            {isAdmin
              ? 'Directly cancel this signed customer account and set status to Lost Customer.'
              : 'Submit a customer cancellation request to be processed by the Customer Success team.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="requestedBy">Person Requesting / Authorising Cancellation*</Label>
            <Input
              id="requestedBy"
              placeholder="e.g. Customer Contact Name or Representative"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancelDate">Cancellation Effective Date*</Label>
            <Input
              id="cancelDate"
              type="date"
              value={cancellationDate}
              onChange={(e) => setCancellationDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <LossReasonPicker
            cancellationThemes={cancellationThemes}
            selectedThemeId={selectedThemeId}
            selectedWhyId={selectedWhyId}
            selectedReasonId={selectedReasonId}
            onSelect={(tId, wId, rId) => {
              setSelectedThemeId(tId);
              setSelectedWhyId(wId);
              setSelectedReasonId(rId);
            }}
            disabled={isSubmitting}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmCancellation}
            className="bg-destructive hover:bg-destructive/90 text-white"
            disabled={
              isSubmitting ||
              !requestedBy ||
              !cancellationDate ||
              !selectedThemeId ||
              !selectedWhyId ||
              !selectedReasonId
            }
          >
            {isSubmitting ? (
              <Loader />
            ) : isAdmin ? (
              'Cancel Customer'
            ) : (
              'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
