'use client';

import React, { useState, useEffect } from 'react';
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
import { updateLeadDetails, logActivity } from '@/services/firebase';
import type { Lead } from '@/lib/types';
import {
  FileText,
  Upload,
  Calendar as CalendarIcon,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

interface ManualSofUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onLeadUpdated?: (updatedLead: Partial<Lead>, oldLead: Lead) => void;
}

export function ManualSofUploadDialog({
  isOpen,
  onOpenChange,
  lead,
  onLeadUpdated,
}: ManualSofUploadDialogProps) {
  const { toast } = useToast();
  const { user, userProfile } = useAuth();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [signedDate, setSignedDate] = useState<string>(() =>
    format(new Date(), 'yyyy-MM-dd')
  );
  const [position, setPosition] = useState<string>('Director');
  const [signerName, setSignerName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setSignedDate(format(new Date(), 'yyyy-MM-dd'));
      setPosition(lead.sofDetails?.position || 'Director');
      setSignerName(lead.sofDetails?.signerName || lead.contacts?.[0]?.name || '');
      setNotes('');
      setIsUploading(false);
    }
  }, [isOpen, lead]);

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
        description: 'Please upload a PDF document or a scanned image (JPEG, PNG, WEBP).',
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
        description: 'Please select a signed manual Standing Order Form document to upload.',
      });
      return;
    }

    if (!signedDate) {
      toast({
        variant: 'destructive',
        title: 'Signed Date Required',
        description: 'Please select the date the Standing Order Form was signed.',
      });
      return;
    }

    if (!position.trim()) {
      toast({
        variant: 'destructive',
        title: 'Position Required',
        description: 'Please provide the signatory position or title (e.g. Director, Operations Manager).',
      });
      return;
    }

    setIsUploading(true);

    try {
      // 1. Upload to Firebase Storage
      const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `sof_documents/${lead.id}_manual_${Date.now()}_${cleanFileName}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, selectedFile);
      const downloadUrl = await getDownloadURL(storageRef);

      const uploaderDisplayName =
        userProfile?.displayName || user?.displayName || userProfile?.email || user?.email || 'Account Manager';

      const uploadTimestamp = new Date().toISOString();
      const formattedSignedDate = format(new Date(signedDate), 'dd/MM/yyyy');

      // 2. Build sofDetails payload
      const sofDetails = {
        signatureDataUrl: downloadUrl,
        position: position.trim(),
        date: formattedSignedDate,
        signedAt: new Date(signedDate).toISOString(),
        uploadedPdfUrl: downloadUrl,
        uploadedPdfName: selectedFile.name,
        uploadedAt: uploadTimestamp,
        uploadedBy: uploaderDisplayName,
        uploadedByEmail: user?.email || '',
        uploadedByUid: user?.uid || '',
        isManualUpload: true,
        signerName: signerName.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      // 3. Update lead in Firestore
      await updateLeadDetails(lead.id, lead, { sofDetails });

      // 4. Log activity
      await logActivity(lead.id, {
        type: 'Update',
        notes: `Uploaded manually signed Australia Post Standing Order Form (SOF / R9B). Signed on ${formattedSignedDate} by ${position.trim()}${signerName ? ` (${signerName.trim()})` : ''}. Uploaded on ${format(new Date(uploadTimestamp), 'dd/MM/yyyy HH:mm')} by ${uploaderDisplayName}.`,
        author: uploaderDisplayName,
      });

      toast({
        title: 'Standing Order Form Uploaded',
        description: 'The manual SOF document and upload date have been recorded successfully.',
      });

      onLeadUpdated?.({ sofDetails }, lead);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to upload manual SOF:', err);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: err.message || 'An error occurred while uploading the document.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 text-[#095C7B] border border-sky-100">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Upload Manual Standing Order Form (SOF)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Record a physical or externally signed Australia Post Standing Order Form (R9B).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* File Upload Box */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Signed SOF Document (PDF or Scan) <span className="text-rose-500">*</span>
            </Label>
            
            {!selectedFile ? (
              <label
                htmlFor="sof-file-upload"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-[#095C7B] bg-slate-50/50 hover:bg-sky-50/20 rounded-xl cursor-pointer transition-all group"
              >
                <div className="p-3 bg-white rounded-full border shadow-2xs group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5 text-slate-500 group-hover:text-[#095C7B]" />
                </div>
                <p className="text-xs font-semibold text-slate-700 mt-2">
                  Click to browse or drag &amp; drop file
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  PDF, JPEG, PNG, or WEBP (Max 30MB)
                </p>
                <input
                  id="sof-file-upload"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="p-3 bg-sky-50/60 border border-sky-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="p-2 bg-white rounded-lg border border-sky-200 shrink-0 text-[#095C7B]">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-800 truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Date Signed */}
            <div className="space-y-1.5">
              <Label htmlFor="signed-date" className="text-xs font-semibold text-slate-700">
                Date Signed <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="signed-date"
                  type="date"
                  value={signedDate}
                  onChange={(e) => setSignedDate(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>
            </div>

            {/* Position / Title */}
            <div className="space-y-1.5">
              <Label htmlFor="position" className="text-xs font-semibold text-slate-700">
                Signatory Position / Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="position"
                type="text"
                placeholder="e.g. Director, Operations Manager"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>
          </div>

          {/* Signatory Contact Name (Optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="signer-name" className="text-xs font-semibold text-slate-700">
              Signatory Full Name (Optional)
            </Label>
            <Input
              id="signer-name"
              type="text"
              placeholder="e.g. John Smith"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          {/* Internal Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold text-slate-700">
              Upload Notes / Reference (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any notes regarding how or where the physical document was obtained..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs resize-none h-18"
            />
          </div>

          {/* Upload Metadata Preview */}
          <div className="p-3 bg-slate-50 border rounded-lg text-[11px] text-slate-600 flex items-center justify-between">
            <span>Uploader: <strong>{userProfile?.displayName || user?.displayName || user?.email || 'Account Manager'}</strong></span>
            <span>Upload Date: <strong>{format(new Date(), 'dd/MM/yyyy')}</strong></span>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="bg-[#095C7B] hover:bg-[#095C7B]/90 text-white text-xs font-semibold h-9 min-w-[130px]"
            >
              {isUploading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Save &amp; Authorize SOF
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
