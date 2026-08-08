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
import { firestore, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, doc, getDoc, updateDoc, addDoc, getDocs } from 'firebase/firestore';
import { deactivateLocalMileAccessForLead } from '@/services/localmile-deactivation';
import type { Lead } from '@/lib/types';
import { Paperclip, ExternalLink, Trash2, Plus } from 'lucide-react';

export interface CancelCustomerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  mode?: 'request' | 'cancel';
  onSuccess?: (updatedLeadDetails?: Partial<Lead>) => void;
}

export function CancelCustomerDialog({
  isOpen,
  onOpenChange,
  lead,
  mode,
  onSuccess,
}: CancelCustomerDialogProps) {
  const { user, userProfile, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const isAdmin =
    userProfile?.activeRole === 'admin' ||
    userProfile?.role === 'admin' ||
    isSuperAdmin;

  const isDirectCancel = mode ? mode === 'cancel' : isAdmin;

  const [cancellationThemes, setCancellationThemes] = useState<any[]>([]);
  const [requestedBy, setRequestedBy] = useState('');
  const [capturedBy, setCapturedBy] = useState('');
  const [cancellationDate, setCancellationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [selectedWhyId, setSelectedWhyId] = useState('');
  const [selectedReasonId, setSelectedReasonId] = useState('');
  const [proofAttachments, setProofAttachments] = useState<Array<{ name: string; url: string; size?: number; type?: string; uploadedAt?: string }>>([]);
  const [uploadingProofFile, setUploadingProofFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const defaultRequestedBy =
        lead?.contacts?.[0]?.name ||
        (lead as any)?.contactName ||
        '';
      const defaultCapturedBy =
        userProfile?.displayName ||
        user?.displayName ||
        user?.email ||
        '';
      setRequestedBy(defaultRequestedBy);
      setCapturedBy(defaultCapturedBy);
      setCancellationDate(new Date().toISOString().split('T')[0]);
      setSelectedThemeId('');
      setSelectedWhyId('');
      setSelectedReasonId('');
      setProofAttachments([]);

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
  }, [isOpen, lead, userProfile, user]);

  const handleProofFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingProofFile(true);
    try {
      const uploadedList = [...proofAttachments];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let fileUrl = '';

        try {
          const storageRef = ref(storage, `cancellations/proofs/${lead?.id || 'general'}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          fileUrl = await getDownloadURL(storageRef);
        } catch (storageErr) {
          console.warn('[Proof Upload] Storage fallback to Base64:', storageErr);
          fileUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }

        uploadedList.push({
          name: file.name,
          url: fileUrl,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        });
      }
      setProofAttachments(uploadedList);
      toast({
        title: 'Document Attached',
        description: `${files.length} proof document(s) attached.`,
      });
    } catch (err: any) {
      console.error('Error attaching proof file:', err);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: err.message || 'Failed to attach proof document.',
      });
    } finally {
      setUploadingProofFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveProofAttachment = (index: number) => {
    setProofAttachments(prev => prev.filter((_, i) => i !== index));
  };

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
      !requestedBy.trim() ||
      !capturedBy.trim() ||
      !cancellationDate ||
      !selectedThemeId ||
      !selectedWhyId ||
      !selectedReasonId
    ) {
      toast({
        variant: 'destructive',
        title: 'Missing required fields',
        description: 'Please select a Theme, Why (Category), and Reason, and fill out external contact, internal staff, and date.',
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

      const themeName = selectedThemeObj?.name || 'Unspecified';
      const whyName = selectedWhyObj?.name || 'Unspecified';
      const reasonName = selectedReasonObj?.name || 'Unspecified / Other';

      const staffName = capturedBy.trim() || userProfile?.displayName || user?.displayName || 'Staff';
      const userEmail = userProfile?.email || user?.email || 'System';
      const nowIso = new Date().toISOString();

      // Check both 'companies' and 'leads' collections so both stay in sync
      const companyRef = doc(firestore, 'companies', lead.id);
      const leadRef = doc(firestore, 'leads', lead.id);

      const [companySnap, leadSnap] = await Promise.all([
        getDoc(companyRef),
        getDoc(leadRef),
      ]);

      const existsInCompany = companySnap.exists();
      const existsInLead = leadSnap.exists();

      if (!existsInCompany && !existsInLead) {
        toast({
          variant: 'destructive',
          title: 'Cancellation Failed',
          description: `Customer document with ID "${lead.id}" not found in companies or leads.`,
        });
        setIsSubmitting(false);
        return;
      }

      if (isDirectCancel) {
        // Direct cancellation for Admin users
        const updates: any = {
          customerStatus: 'Lost Customer',
          status: 'Lost Customer',
          cancellationRequested: false,
          cancellationReason: reasonName,
          cancellationReasonId: selectedReasonId || '',
          cancellationTheme: themeName,
          cancellationThemeId: selectedThemeId || '',
          cancellationCategory: whyName,
          cancellationWhyId: selectedWhyId || '',
          cancellationdate: cancellationDate,
          cancellationDate: cancellationDate,
        };

        if (existsInCompany) {
          await updateDoc(companyRef, updates);
          await logActivity(
            lead.id,
            {
              type: 'Update',
              notes: `Direct customer cancellation completed by ${staffName}. Requested By (External): ${requestedBy.trim()}. Effective Date: ${cancellationDate}. Theme: ${themeName}, Why: ${whyName}, Reason: ${reasonName}.`,
              author: staffName,
            },
            'companies'
          );
        }

        if (existsInLead) {
          await updateDoc(leadRef, updates);
          await logActivity(
            lead.id,
            {
              type: 'Update',
              notes: `Direct customer cancellation completed by ${staffName}. Requested By (External): ${requestedBy.trim()}. Effective Date: ${cancellationDate}. Theme: ${themeName}, Why: ${whyName}, Reason: ${reasonName}.`,
              author: staffName,
            },
            'leads'
          );
        }

        const leadAny = lead as any;
        const cancelPayload = {
          source: 'company_profile',
          requestType: 'cancellation' as const,
          leadId: lead.id,
          prospectPlusId: leadAny.prospectPlusId || leadAny.prospectplusId || lead.id,
          netsuiteId: leadAny.netsuiteId || '',
          companyName: lead.companyName || `${leadAny.firstName || ''} ${leadAny.lastName || ''}`.trim(),
          contactName: lead.contacts?.[0]?.name || leadAny.contactName || '',
          contactEmail: lead.customerServiceEmail || leadAny.email || '',
          contactPhone: lead.customerPhone || leadAny.phone || '',
          requestedDate: nowIso,
          cancellationDate,
          trueServiceCancellationDate: cancellationDate,
          cancellationReason: reasonName,
          cancellationReasonId: selectedReasonId || '',
          cancellationTheme: themeName,
          cancellationThemeId: selectedThemeId || '',
          cancellationWhyId: selectedWhyId || '',
          cancellationCategory: whyName,
          status: 'Cancelled',
          attachments: proofAttachments,
          notes: `Direct cancellation completed by ${staffName}`,
          originalServices: lead.services || [],
          requestedBy: requestedBy.trim(),
          capturedBy: capturedBy.trim(),
          processedBy: `${staffName} (${userEmail})`,
          processedAt: nowIso,
          createdBy: `${staffName} (${userEmail})`,
          createdAt: nowIso,
          callsCount: 0,
        };

        await addDoc(collection(firestore, 'cancellations'), cancelPayload);
        await addDoc(collection(firestore, 'cs_requests'), cancelPayload);

        // Trigger email notification
        fetch('/api/notifications/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'cancellation_request',
            payload: {
              leadId: lead.id,
              netsuiteId: leadAny.netsuiteId || '',
              companyName: lead.companyName || `${leadAny.firstName || ''} ${leadAny.lastName || ''}`.trim(),
              contactName: lead.contacts?.[0]?.name || leadAny.contactName || '',
              contactEmail: lead.customerServiceEmail || leadAny.email || '',
              contactPhone: lead.customerPhone || leadAny.phone || '',
              requestedBy: requestedBy.trim(),
              capturedBy: capturedBy.trim(),
              cancellationTheme: themeName,
              cancellationWhy: whyName,
              cancellationReason: reasonName,
              cancellationNotes: '',
              cancellationDate,
              trueServiceCancellationDate: cancellationDate,
              processedBy: `${staffName} (${userEmail})`,
            }
          })
        }).catch(err => console.error("Error triggering cancellation email notification:", err));

        // Deactivate LocalMile access if active
        deactivateLocalMileAccessForLead(lead.id, lead.contacts, existsInCompany ? 'companies' : 'leads').catch(err => {
          console.error("Failed to deactivate LocalMile access during direct cancellation:", err);
        });

        toast({
          title: 'Customer Cancelled',
          description: `${lead.companyName || 'Customer'} has been directly cancelled.`,
        });

        onOpenChange(false);
        onSuccess?.(updates);
      } else {
        // Non-admin or explicit cancellation request
        const updates: any = {
          bucket: 'customer_success',
          cancellationRequested: true,
          cancellationReason: reasonName,
          cancellationReasonId: selectedReasonId || '',
          cancellationTheme: themeName,
          cancellationThemeId: selectedThemeId || '',
          cancellationCategory: whyName,
          cancellationWhyId: selectedWhyId || '',
          cancellationdate: cancellationDate,
          cancellationDate: cancellationDate,
        };

        if (existsInCompany) {
          await updateDoc(companyRef, updates);
          await logActivity(
            lead.id,
            {
              type: 'Update',
              notes: `Cancellation request submitted. External Contact: ${requestedBy.trim()} | Captured By (Internal): ${capturedBy.trim()}. Requested Date: ${cancellationDate}. Theme: ${themeName}, Why: ${whyName}, Reason: ${reasonName}.`,
              author: staffName,
            },
            'companies'
          );
        }

        if (existsInLead) {
          await updateDoc(leadRef, updates);
          await logActivity(
            lead.id,
            {
              type: 'Update',
              notes: `Cancellation request submitted. External Contact: ${requestedBy.trim()} | Captured By (Internal): ${capturedBy.trim()}. Requested Date: ${cancellationDate}. Theme: ${themeName}, Why: ${whyName}, Reason: ${reasonName}.`,
              author: staffName,
            },
            'leads'
          );
        }

        const leadAny = lead as any;
        const cancelReqPayload = {
          source: 'company_profile',
          requestType: 'cancellation' as const,
          leadId: lead.id,
          prospectPlusId: leadAny.prospectPlusId || leadAny.prospectplusId || lead.id,
          netsuiteId: leadAny.netsuiteId || '',
          companyName: lead.companyName || `${leadAny.firstName || ''} ${leadAny.lastName || ''}`.trim(),
          contactName: lead.contacts?.[0]?.name || leadAny.contactName || '',
          contactEmail: lead.customerServiceEmail || leadAny.email || '',
          contactPhone: lead.customerPhone || leadAny.phone || '',
          requestedDate: nowIso,
          cancellationDate,
          cancellationReason: reasonName,
          cancellationReasonId: selectedReasonId || '',
          cancellationTheme: themeName,
          cancellationThemeId: selectedThemeId || '',
          cancellationWhyId: selectedWhyId || '',
          cancellationCategory: whyName,
          status: 'Pending',
          attachments: proofAttachments,
          originalServices: lead.services || [],
          requestedBy: requestedBy.trim(),
          capturedBy: capturedBy.trim(),
          createdBy: `${staffName} (${userEmail})`,
          createdAt: nowIso,
          callsCount: 0,
        };

        await addDoc(collection(firestore, 'cancellations'), cancelReqPayload);
        await addDoc(collection(firestore, 'cs_requests'), cancelReqPayload);

        // Trigger email notification
        fetch('/api/notifications/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'cancellation_request',
            payload: {
              leadId: lead.id,
              netsuiteId: leadAny.netsuiteId || '',
              companyName: lead.companyName || `${leadAny.firstName || ''} ${leadAny.lastName || ''}`.trim(),
              contactName: lead.contacts?.[0]?.name || leadAny.contactName || '',
              contactEmail: lead.customerServiceEmail || leadAny.email || '',
              contactPhone: lead.customerPhone || leadAny.phone || '',
              requestedBy: requestedBy.trim(),
              capturedBy: capturedBy.trim(),
              cancellationTheme: themeName,
              cancellationWhy: whyName,
              cancellationReason: reasonName,
              cancellationNotes: '',
              cancellationDate,
              trueServiceCancellationDate: cancellationDate,
              processedBy: `${staffName} (${userEmail})`,
            }
          })
        }).catch(err => console.error("Error triggering cancellation email notification:", err));

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
            {isDirectCancel ? 'Cancel Customer Directly' : 'Request Customer Cancellation'}
          </DialogTitle>
          <DialogDescription>
            {isDirectCancel
              ? 'Directly cancel this signed customer account and set status to Lost Customer.'
              : 'Submit a customer cancellation request to be processed by the Customer Success team.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Section 1: External Contact */}
          <div className="space-y-2">
            <Label htmlFor="requestedBy" className="font-semibold text-slate-900 block">
              Person Requesting / Authorising Cancellation (External Contact)*
            </Label>
            <Input
              id="requestedBy"
              placeholder="e.g. Customer Contact Name or Representative"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Section 2: Internal Staff (Own section & row) */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <Label htmlFor="capturedBy" className="font-semibold text-slate-900 block">
              Captured / Submitted By (Internal Staff)*
            </Label>
            <Input
              id="capturedBy"
              placeholder="e.g. Internal Staff Member Name"
              value={capturedBy}
              onChange={(e) => setCapturedBy(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-[11px] text-slate-500">
              Internal MailPlus team member taking or recording this cancellation request.
            </p>
          </div>

          {/* Section 3: Cancellation Date */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <Label htmlFor="cancelDate" className="font-semibold text-slate-900 block">
              Cancellation Effective Date*
            </Label>
            <Input
              id="cancelDate"
              type="date"
              value={cancellationDate}
              onChange={(e) => setCancellationDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-3 border-t border-slate-200">
            <Label className="text-xs font-bold text-slate-800 block mb-2">
              Reason for Cancellation <span className="text-rose-600 font-bold">* Mandatory</span>
            </Label>
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

          {/* Proof Document Attachments */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-[#095c7b]" />
                Attach Proof Documents / Evidence
              </Label>
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#095c7b] text-white hover:bg-[#07475f] text-xs font-semibold transition-colors">
                {uploadingProofFile ? (
                  <Loader className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Attach Document
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleProofFileUpload}
                  disabled={uploadingProofFile || isSubmitting}
                />
              </label>
            </div>

            {proofAttachments.length > 0 ? (
              <div className="space-y-1.5 mt-2">
                {proofAttachments.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[#095c7b] font-medium hover:underline truncate max-w-[80%]"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{att.name}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveProofAttachment(idx)}
                      className="h-6 px-1.5 text-rose-600 hover:bg-rose-50 text-[11px]"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">No proof documents attached yet.</p>
            )}
          </div>
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
            className="bg-destructive hover:bg-destructive/90 text-white font-bold"
            disabled={
              isSubmitting ||
              !requestedBy.trim() ||
              !capturedBy.trim() ||
              !cancellationDate ||
              !selectedThemeId ||
              !selectedWhyId ||
              !selectedReasonId
            }
          >
            {isSubmitting ? (
              <Loader />
            ) : isDirectCancel ? (
              'Cancel Customer Directly'
            ) : (
              'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
