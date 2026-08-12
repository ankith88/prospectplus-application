'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { Upload, FileText, CheckCircle2, AlertCircle, Sparkles, Building, Calendar, DollarSign, Users, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface UploadAgreementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  franchiseeId: string;
  franchiseeName: string;
  onSuccess?: () => void;
}

export function UploadAgreementDialog({
  isOpen,
  onClose,
  franchiseeId,
  franchiseeName,
  onSuccess,
}: UploadAgreementDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'scraping' | 'completed' | 'error'>('idle');
  const [stepMessage, setStepMessage] = useState('');
  const [extractedResult, setExtractedResult] = useState<any | null>(null);
  const [linkedUsersCount, setLinkedUsersCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState('');

  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== 'application/pdf' && !selected.name.endsWith('.pdf')) {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please select a PDF document (.pdf).',
        });
        return;
      }
      setFile(selected);
      setExtractedResult(null);
      setUploadStep('idle');
    }
  };

  const handleUploadAndScrape = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStep('uploading');
    setStepMessage('Uploading PDF document to cloud storage...');
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userUid', user?.uid || '');
      formData.append('userName', userProfile?.displayName || user?.email || 'Admin');

      // Update progress message for AI step
      setTimeout(() => {
        setUploadStep('scraping');
        setStepMessage('AI scanning & scraping agreement details with Gemini...');
      }, 1500);

      const response = await fetch(`/api/franchisees/${franchiseeId}/upload-agreement`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUploadStep('completed');
        setExtractedResult(data.extractedData);
        setLinkedUsersCount(data.updatedUserCount || 0);

        toast({
          title: 'Agreement Uploaded & Scraped',
          description: `Successfully extracted details and updated ${data.updatedUserCount || 0} linked user record(s).`,
        });

        if (onSuccess) {
          onSuccess();
        }
      } else {
        setUploadStep('error');
        setErrorMessage(data.message || 'Failed to upload and scrape agreement.');
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: data.message || 'An error occurred during agreement processing.',
        });
      }
    } catch (err: any) {
      console.error('[Upload Agreement Dialog] Error:', err);
      setUploadStep('error');
      setErrorMessage(err.message || 'Network error during agreement upload.');
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: err.message || 'Network error during upload.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetAndClose = () => {
    setFile(null);
    setIsUploading(false);
    setUploadStep('idle');
    setExtractedResult(null);
    setErrorMessage('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Upload className="w-5 h-5 text-[#095c7b]" />
            Upload Franchisee Agreement
          </DialogTitle>
          <DialogDescription>
            Upload signed Franchisee Agreement PDF for <span className="font-semibold text-slate-800">{franchiseeName}</span> (ID: {franchiseeId}). AI will automatically scan and store scraped details in linked user records.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* File Select / Dropzone */}
          {uploadStep !== 'completed' && (
            <div className="border-2 border-dashed border-slate-300 hover:border-[#095c7b] rounded-xl p-6 text-center transition-colors bg-slate-50/50">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                disabled={isUploading}
                id="agreement-file-input"
                className="hidden"
              />
              <label
                htmlFor="agreement-file-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#095c7b]">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {file ? file.name : 'Click to select or drag and drop Franchisee Agreement PDF'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB PDF Document` : 'Accepts PDF files up to 25MB'}
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Upload & Scraping Progress */}
          {isUploading && (
            <div className="p-4 border rounded-xl bg-blue-50/60 border-blue-200 flex items-center gap-4">
              <Loader className="w-6 h-6 text-[#095c7b]" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">{stepMessage}</span>
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                </div>
                <div className="w-full bg-blue-200 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full bg-[#095c7b] transition-all duration-500 ${
                      uploadStep === 'uploading' ? 'w-1/3 animate-pulse' : 'w-4/5 animate-pulse'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {uploadStep === 'error' && (
            <div className="p-4 border rounded-xl bg-red-50 border-red-200 flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage || 'Failed to upload agreement.'}</span>
            </div>
          )}

          {/* Extracted AI Results Preview */}
          {uploadStep === 'completed' && extractedResult && (
            <div className="space-y-4">
              <div className="p-4 border rounded-xl bg-emerald-50/70 border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Agreement Scraped & Records Updated!</h4>
                    <p className="text-xs text-slate-600">
                      Successfully saved agreement metadata and updated <strong className="text-emerald-700">{linkedUsersCount} linked user account(s)</strong>.
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white">AI Scraped</Badge>
              </div>

              {/* Scraped Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Entity & Contact */}
                <div className="p-4 border rounded-xl bg-white space-y-2 shadow-sm">
                  <div className="flex items-center gap-2 font-bold text-slate-900 border-b pb-2 text-sm">
                    <Building className="w-4 h-4 text-[#095c7b]" /> Entity & Contact
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Entity Name</span>
                    <span className="font-medium text-slate-800">{extractedResult.entityName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">ACN / ABN</span>
                    <span className="font-medium text-slate-800">{extractedResult.acnAbn || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Registered Address</span>
                    <span className="font-medium text-slate-800">{extractedResult.registeredAddress || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Contact Email</span>
                    <span className="font-medium text-slate-800">{extractedResult.contactEmail || 'N/A'}</span>
                  </div>
                </div>

                {/* Dates & Terms */}
                <div className="p-4 border rounded-xl bg-white space-y-2 shadow-sm">
                  <div className="flex items-center gap-2 font-bold text-slate-900 border-b pb-2 text-sm">
                    <Calendar className="w-4 h-4 text-[#095c7b]" /> Dates & Key Terms
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Commencement Date</span>
                    <span className="font-medium text-slate-800">{extractedResult.commencementDate || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Expiry Date</span>
                    <span className="font-medium text-slate-800">{extractedResult.expiryDate || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Term Duration</span>
                    <span className="font-medium text-slate-800">{extractedResult.termDuration || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Renewal Terms</span>
                    <span className="font-medium text-slate-800">{extractedResult.renewalTerms || 'N/A'}</span>
                  </div>
                </div>

                {/* Financial Fees */}
                <div className="p-4 border rounded-xl bg-white space-y-2 shadow-sm">
                  <div className="flex items-center gap-2 font-bold text-slate-900 border-b pb-2 text-sm">
                    <DollarSign className="w-4 h-4 text-emerald-600" /> Commercial & Financial Fees
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Deposit</span>
                      <span className="font-medium text-slate-800">${extractedResult.depositAmount?.toLocaleString() || '0'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Service Fee</span>
                      <span className="font-medium text-slate-800">{extractedResult.franchiseServiceFee || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Marketing Levy</span>
                      <span className="font-medium text-slate-800">{extractedResult.marketingLevy || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Training Fee</span>
                      <span className="font-medium text-slate-800">${extractedResult.trainingFee?.toLocaleString() || '0'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Transfer Fee</span>
                      <span className="font-medium text-slate-800">${extractedResult.transferFee?.toLocaleString() || '0'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Renewal Fee</span>
                      <span className="font-medium text-slate-800">{extractedResult.renewalFee || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Guarantors & People */}
                <div className="p-4 border rounded-xl bg-white space-y-2 shadow-sm">
                  <div className="flex items-center gap-2 font-bold text-slate-900 border-b pb-2 text-sm">
                    <Users className="w-4 h-4 text-purple-600" /> Guarantors & Management
                  </div>
                  {extractedResult.guarantors && extractedResult.guarantors.length > 0 ? (
                    extractedResult.guarantors.map((g: any, i: number) => (
                      <div key={i} className="pt-1 border-t first:border-none first:pt-0">
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase">Guarantor #{i + 1}</span>
                        <p className="font-semibold text-slate-900">{g.name}</p>
                        {g.address && <p className="text-slate-500 text-[11px]">{g.address}</p>}
                        {g.email && <p className="text-slate-500 text-[11px]">{g.email}</p>}
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 italic">No guarantors specified.</p>
                  )}
                  {extractedResult.manager && extractedResult.manager.name && (
                    <div className="pt-2 border-t">
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Nominated Manager</span>
                      <p className="font-semibold text-slate-900">{extractedResult.manager.name}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t pt-4 flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={resetAndClose} disabled={isUploading}>
            {uploadStep === 'completed' ? 'Close' : 'Cancel'}
          </Button>
          {uploadStep !== 'completed' && (
            <Button
              onClick={handleUploadAndScrape}
              disabled={!file || isUploading}
              className="bg-[#095c7b] hover:bg-[#07465e] text-white gap-2 font-semibold"
            >
              {isUploading ? (
                <>
                  <Loader className="w-4 h-4" /> Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" /> Upload & AI Scrape
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
