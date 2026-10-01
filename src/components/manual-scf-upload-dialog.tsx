'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { uploadAndAcceptManualScfAction } from '@/app/scf/[scfId]/actions';
import {
  FileText,
  Upload,
  Calendar as CalendarIcon,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { format } from 'date-fns';

interface ManualScfUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any;
  defaultScfId?: string;
  pendingScfs?: any[];
  onSuccess?: (scfId: string) => void;
}

export function ManualScfUploadDialog({
  isOpen,
  onOpenChange,
  lead,
  defaultScfId,
  pendingScfs = [],
  onSuccess,
}: ManualScfUploadDialogProps) {
  const { toast } = useToast();
  const { user, userProfile } = useAuth();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [acceptedDate, setAcceptedDate] = useState<string>(() =>
    format(new Date(), 'yyyy-MM-dd')
  );
  const [selectedScfId, setSelectedScfId] = useState<string>(defaultScfId || '');
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [customSignerName, setCustomSignerName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Sync defaultScfId when opened
  React.useEffect(() => {
    if (defaultScfId) {
      setSelectedScfId(defaultScfId);
    } else if (pendingScfs.length > 0) {
      // Pick first pending if available
      const firstPending = pendingScfs.find((s) => s.status === 'Pending') || pendingScfs[0];
      if (firstPending) {
        setSelectedScfId(firstPending.id);
      }
    }
  }, [defaultScfId, pendingScfs]);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setAcceptedDate(format(new Date(), 'yyyy-MM-dd'));
      setNotes('');
      setCustomSignerName('');
      setSelectedContact('');
      setIsUploading(false);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    const isExtensionValid = /\.(pdf|jpe?g|png|webp)$/i.test(file.name);

    if (!validTypes.includes(file.type) && !isExtensionValid) {
      toast({
        variant: 'destructive',
        title: 'Unsupported File Type',
        description: 'Please upload a PDF document or a scanned image (JPEG, PNG).',
      });
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File Too Large',
        description: 'The maximum allowed file size is 30MB.',
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast({
        variant: 'destructive',
        title: 'File Required',
        description: 'Please select a signed manual SCF document to upload.',
      });
      return;
    }

    if (!acceptedDate) {
      toast({
        variant: 'destructive',
        title: 'Accepted Date Required',
        description: 'Please select the date the customer agreed to the Terms & Conditions.',
      });
      return;
    }

    setIsUploading(true);

    try {
      // 1. Upload to Firebase Storage
      const fileExt = selectedFile.name.split('.').pop() || 'pdf';
      const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `scf_documents/${lead.id}_manual_${Date.now()}_${cleanFileName}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, selectedFile);
      const downloadUrl = await getDownloadURL(storageRef);

      // Determine signer name
      const contacts = lead.contacts || [];
      const foundContact = contacts.find((c: any) => c.id === selectedContact || c.name === selectedContact);
      const finalSignerName = customSignerName || foundContact?.name || lead.customerName || '';
      const finalSignerEmail = foundContact?.email || lead.customerServiceEmail || '';

      const uploaderDisplayName =
        userProfile?.displayName || user?.displayName || userProfile?.email || user?.email || 'Account Manager';

      // 2. Call Server Action to accept SCF & update Lead
      const result = await uploadAndAcceptManualScfAction({
        leadId: lead.id,
        scfId: selectedScfId || undefined,
        pdfUrl: downloadUrl,
        pdfName: selectedFile.name,
        acceptedAt: new Date(acceptedDate).toISOString(),
        signerName: finalSignerName,
        signerEmail: finalSignerEmail,
        uploaderName: uploaderDisplayName,
        uploaderEmail: user?.email || '',
        uploaderUid: user?.uid || '',
        notes: notes,
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      toast({
        title: 'Manual SCF Uploaded & T&Cs Accepted',
        description: `Terms & Conditions marked as accepted on ${format(new Date(acceptedDate), 'PP')}. The lead is now ready for Signup.`,
      });

      onOpenChange(false);
      if (onSuccess) {
        onSuccess(result.scfId || selectedScfId);
      }
    } catch (err: any) {
      console.error('Error uploading manual SCF:', err);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: err.message || 'Failed to upload manual SCF. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const contacts = lead?.contacts || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#095c7b]">
            <FileCheck className="h-6 w-6" />
            <DialogTitle className="text-xl">Upload Signed Manual SCF</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-slate-600">
            Upload the physical or scanned Service Commencement Form (SCF) received from the customer.
            Upon upload, the Terms &amp; Conditions will be formally recorded as accepted.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* File Upload Zone */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">
              Signed SCF Document (PDF / Image) <span className="text-red-500">*</span>
            </Label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
              <input
                type="file"
                id="manual-scf-file-input"
                className="hidden"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded p-2.5">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-blue-700 dark:text-blue-300 shrink-0">
                      ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                  <label
                    htmlFor="manual-scf-file-input"
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 cursor-pointer ml-2 underline shrink-0"
                  >
                    Change
                  </label>
                </div>
              ) : (
                <label
                  htmlFor="manual-scf-file-input"
                  className="flex flex-col items-center justify-center cursor-pointer space-y-2 py-2"
                >
                  <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-[#095c7b] hover:underline">
                      Click to choose file
                    </span>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      PDF, JPG, or PNG (Max 30MB)
                    </span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Date Accepted T&Cs */}
          <div className="space-y-1.5">
            <Label htmlFor="scf-accepted-date" className="text-sm font-semibold flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4 text-slate-500" />
              Date Accepted T&amp;C&apos;s <span className="text-red-500">*</span>
            </Label>
            <Input
              id="scf-accepted-date"
              type="date"
              value={acceptedDate}
              onChange={(e) => setAcceptedDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full"
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the date written on the manual agreement when the customer agreed to the Terms &amp; Conditions.
            </p>
          </div>

          {/* Associated Pending Quote / SCF (if available) */}
          {pendingScfs.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Link to Existing Quote</Label>
              <Select value={selectedScfId} onValueChange={setSelectedScfId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select quote / SCF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Create New Manual Record</SelectItem>
                  {pendingScfs.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      Quote {s.id.substring(0, 8)}... ({s.status}) - Created{' '}
                      {s.createdAt ? format(new Date(s.createdAt), 'dd/MM/yyyy') : 'N/A'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Associating with a pending quote will retain the services and rate structure quoted.
              </p>
            </div>
          )}

          {/* Signer Name */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Signer / Authorized Contact (Optional)</Label>
            {contacts.length > 0 ? (
              <div className="space-y-2">
                <Select
                  value={selectedContact}
                  onValueChange={(val) => {
                    setSelectedContact(val);
                    if (val !== 'other') {
                      setCustomSignerName('');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact who signed..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c: any) => (
                      <SelectItem key={c.id || c.name} value={c.name}>
                        {c.name} {c.email ? `(${c.email})` : ''} {c.isPrimary ? '★ Primary' : ''}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">Other / Not Listed</SelectItem>
                  </SelectContent>
                </Select>
                {selectedContact === 'other' && (
                  <Input
                    placeholder="Enter signer's full name"
                    value={customSignerName}
                    onChange={(e) => setCustomSignerName(e.target.value)}
                  />
                )}
              </div>
            ) : (
              <Input
                placeholder="Enter signer's full name (e.g. John Doe)"
                value={customSignerName}
                onChange={(e) => setCustomSignerName(e.target.value)}
              />
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Internal Notes (Optional)</Label>
            <Textarea
              placeholder="e.g. Hardcopy received during site visit, scanned and verified by Account Manager."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              <strong>Confirmation:</strong> Uploading this document marks the Terms &amp; Conditions as accepted and unlocks immediate Signup for this lead.
            </span>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="bg-[#095c7b] hover:bg-[#064258] text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading &amp; Accepting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Upload &amp; Accept T&amp;C&apos;s
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
