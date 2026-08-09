'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { Card, CardContent } from '@/components/ui/card';
import { DeedOfVariationDialog } from '@/components/admin/deed-of-variation-dialog';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  FileCheck,
  CheckCircle2,
  Lock,
  Calendar,
  DollarSign,
  Send,
  Save,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { PresaleRecord, PresaleMainDetails, PresaleDeedOfVariation, PresalesDetails } from '@/lib/presale-types';

interface TerritoryPresaleWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  franchiseeId: string;
  franchiseeName?: string;
  onSuccess?: () => void;
}

export function TerritoryPresaleWizard({
  open,
  onOpenChange,
  franchiseeId,
  franchiseeName = '',
  onSuccess,
}: TerritoryPresaleWizardProps) {
  const { userProfile, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [deedDialogOpen, setDeedDialogOpen] = useState(false);

  // Form states
  const [recordId, setRecordId] = useState(franchiseeId);
  const [status, setStatus] = useState<PresaleRecord['status']>('Step 1: Main Details');

  const [mainDetails, setMainDetails] = useState<PresaleMainDetails>({
    tradingEntity: franchiseeName || '',
    mainContact: '',
    mobileNumber: '',
    email: '',
    abn: '',
    dateListedForSale: new Date().toISOString().split('T')[0],
    address: '',
  });

  const [deedOfVariation, setDeedOfVariation] = useState<PresaleDeedOfVariation>({
    status: 'not_started',
  });

  const [presalesDetails, setPresalesDetails] = useState<PresalesDetails>({
    commencementDate: '01/02/2020',
    expiryDate: '01/02/2025',
    ultimateExpiryDate: '',
    unlimitedTermOffer: 'Yes',
    unlimitedTermFee: 25000,
    renewalTermsYears: 5,
    termOnFranchiseeIM: 'Unlimited',
    dateBusinessStarted: '2015-02-01',
    totalDailyRunTime: '5 - 6 hrs',
    lowPrice: 50000,
    highPrice: 75000,
    serviceRevenue: 53301,
    serviceRevenueYear: '01/04/2021 - 31/03/2022',
    mpexCommission: 3,
    mpexCommissionYear: '01/04/2021 - 31/03/2022',
    sendleCommission: 0,
    sendleCommissionYear: '01/04/2021 - 31/03/2022',
    salesCommissionPercent: 10,
    nabAccreditation: 'No',
    nabAccreditationFee: 0,
    salePrice: 82500,
  });

  const isAdminOrOps =
    isSuperAdmin ||
    ['admin', 'operations', 'Operations', 'Operations Manager', 'Sales Manager'].includes(
      userProfile?.activeRole || userProfile?.role || ''
    );

  const isDeedSigned =
    deedOfVariation.status === 'signed_online' ||
    deedOfVariation.status === 'pdf_uploaded';

  const handleStepClick = (targetStep: 1 | 2 | 3 | 4) => {
    if ((targetStep === 3 || targetStep === 4) && !isDeedSigned) {
      toast({
        title: 'Deed of Variation Required',
        description: 'The Deed of Variation must be signed before proceeding to Step 3 or Step 4.',
        variant: 'destructive',
      });
      return;
    }
    setActiveStep(targetStep);
  };

  useEffect(() => {
    if (!open || !franchiseeId) return;

    async function loadPresale() {
      setLoading(true);
      try {
        const res = await fetch(`/api/franchisees/presales?franchiseeId=${franchiseeId}`);
        const json = await res.json();
        if (json.success && json.data) {
          const d: PresaleRecord = json.data;
          setRecordId(d.id || franchiseeId);
          setStatus(d.status || 'Draft');
          if (d.mainDetails) setMainDetails(d.mainDetails);
          if (d.deedOfVariation) setDeedOfVariation(d.deedOfVariation);
          if (d.presalesDetails) setPresalesDetails(d.presalesDetails);
        }
      } catch (err) {
        console.error('Failed to load presale record', err);
      } finally {
        setLoading(false);
      }
    }
    loadPresale();
  }, [open, franchiseeId]);

  const handleSave = async (customDeed?: PresaleDeedOfVariation) => {
    setSaving(true);
    try {
      const finalDeed = customDeed || deedOfVariation;
      const res = await fetch('/api/franchisees/presales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          franchiseeId,
          franchiseeName: mainDetails.tradingEntity || franchiseeName,
          mainDetails,
          deedOfVariation: finalDeed,
          presalesDetails,
          userRole: userProfile?.activeRole || userProfile?.role || 'user',
          userUid: userProfile?.uid || '',
          userName: userProfile?.displayName || '',
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast({
          title: 'Presale Saved',
          description: 'Territory presale process details updated successfully.',
        });
        if (onSuccess) onSuccess();
      } else {
        toast({
          title: 'Error Saving Presale',
          description: json.message || 'Failed to save presale details.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeedSaved = (updatedDeed: PresaleDeedOfVariation) => {
    setDeedOfVariation(updatedDeed);
    handleSave(updatedDeed);
  };

  const [sendingImEmail, setSendingImEmail] = useState(false);
  const [imRecipientEmail, setImRecipientEmail] = useState('');
  const [imEmailDialogOpen, setImEmailDialogOpen] = useState(false);

  const handleSendImEmail = async () => {
    const targetEmail = imRecipientEmail || mainDetails.email;
    if (!targetEmail) {
      toast({
        title: 'Email Required',
        description: 'Please enter a valid recipient email address.',
        variant: 'destructive',
      });
      return;
    }

    if (!presalesDetails.territoryMapUrl) {
      toast({
        title: 'Territory Map Required',
        description: 'You cannot send out the IM confirmation email without uploading the territory map image first.',
        variant: 'destructive',
      });
      return;
    }

    setSendingImEmail(true);
    try {
      const res = await fetch('/api/franchisees/presales/send-im-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          franchiseeId,
          recipientEmail: targetEmail,
          recipientName: mainDetails.mainContact || mainDetails.tradingEntity,
          presalesDetails: {
            ...presalesDetails,
            territoryName: presalesDetails.territoryName || mainDetails.tradingEntity || franchiseeName,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast({
          title: 'IM Email Sent',
          description: `Franchisee IM confirmation email sent to ${targetEmail}.`,
        });
        setPresalesDetails((prev) => ({
          ...prev,
          imStatus: 'sent',
          sentAt: json.dateSent,
          sentToEmail: targetEmail,
        }));
        setStatus('Step 4: Franchisee IM Confirmation');
        setImEmailDialogOpen(false);
        if (onSuccess) onSuccess();
      } else {
        toast({
          title: 'Failed to Send Email',
          description: json.message || 'Error sending IM email.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Unexpected error occurred while sending email.',
        variant: 'destructive',
      });
    } finally {
      setSendingImEmail(false);
    }
  };

  const handleMapImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Territory map image should be less than 8MB.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPresalesDetails((prev) => ({
        ...prev,
        territoryMapUrl: dataUrl,
      }));
      toast({
        title: 'Territory Map Uploaded',
        description: 'Territory map image attached successfully.',
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto bg-background p-6">
          <DialogHeader className="bg-[#095c7b] text-white p-4 -m-6 mb-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                  <Building2 className="h-6 w-6 text-[#eaf143]" />
                  Mark Territory For Sale - Presales Process
                </DialogTitle>
                <DialogDescription className="text-slate-200 text-xs mt-1">
                  Territory: <strong className="text-white">{mainDetails.tradingEntity || franchiseeName || franchiseeId}</strong>
                </DialogDescription>
              </div>
              <Badge variant="outline" className="border-white/40 bg-white/10 text-white font-semibold px-3 py-1 text-xs">
                Status: {status}
              </Badge>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader className="mx-auto text-[#095c7b]" />
              <p className="text-sm text-slate-500 font-medium">Loading territory presale details...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stepper Navigation */}
              <div className="grid grid-cols-4 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <button
                  type="button"
                  onClick={() => handleStepClick(1)}
                  className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    activeStep === 1
                      ? 'bg-[#095c7b] text-white shadow'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold">STEP 1</span>
                  <span>Main Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStepClick(2)}
                  className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    activeStep === 2
                      ? 'bg-[#095c7b] text-white shadow'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold">STEP 2</span>
                  <span>Deed of Variation</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStepClick(3)}
                  className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    activeStep === 3
                      ? 'bg-[#095c7b] text-white shadow'
                      : !isDeedSigned
                      ? 'text-slate-400 bg-slate-50 cursor-not-allowed opacity-80'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1">
                    STEP 3 {!isDeedSigned && <Lock className="h-3 w-3 text-amber-500" />}
                  </span>
                  <span>Signed Status</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStepClick(4)}
                  className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    activeStep === 4
                      ? 'bg-[#095c7b] text-white shadow'
                      : !isDeedSigned || !isAdminOrOps
                      ? 'text-slate-400 bg-slate-50 cursor-not-allowed opacity-80'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1">
                    STEP 4 {(!isDeedSigned || !isAdminOrOps) && <Lock className="h-3 w-3 text-amber-500" />}
                  </span>
                  <span>Franchisee IM & Map</span>
                </button>
              </div>

              {/* STEP 1: MAIN DETAILS */}
              {activeStep === 1 && (
                <div className="space-y-4">
                  <div className="bg-[#095c7b] text-white py-1.5 px-4 text-center text-xs font-bold tracking-widest uppercase rounded">
                    MAIN DETAILS
                  </div>

                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/60 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* TRADING ENTITY */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[140px]">
                          TRADING ENTITY *
                        </span>
                        <Input
                          value={mainDetails.tradingEntity}
                          onChange={(e) => setMainDetails({ ...mainDetails, tradingEntity: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="Kaypeez Pty Ltd"
                        />
                      </div>

                      {/* MAIN CONTACT */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[140px]">
                          MAIN CONTACT *
                        </span>
                        <Input
                          value={mainDetails.mainContact}
                          onChange={(e) => setMainDetails({ ...mainDetails, mainContact: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="Saffat Riad"
                        />
                      </div>

                      {/* MOBILE NUMBER */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[140px]">
                          MOBILE NUMBER *
                        </span>
                        <Input
                          value={mainDetails.mobileNumber}
                          onChange={(e) => setMainDetails({ ...mainDetails, mobileNumber: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="0433168170"
                        />
                      </div>

                      {/* EMAIL */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[140px]">
                          EMAIL *
                        </span>
                        <Input
                          type="email"
                          value={mainDetails.email}
                          onChange={(e) => setMainDetails({ ...mainDetails, email: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="saffat99@yahoo.com"
                        />
                      </div>

                      {/* PERSONAL EMAIL */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[140px]">
                          PERSONAL EMAIL
                        </span>
                        <Input
                          type="email"
                          value={mainDetails.personalEmail || ''}
                          onChange={(e) => setMainDetails({ ...mainDetails, personalEmail: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="personal@gmail.com"
                        />
                      </div>

                      {/* ABN */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[140px]">
                          ABN *
                        </span>
                        <Input
                          value={mainDetails.abn}
                          onChange={(e) => setMainDetails({ ...mainDetails, abn: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="75151402845"
                        />
                      </div>

                      {/* DATE LISTED FOR SALE */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[140px]">
                          DATE LISTED FOR SALE *
                        </span>
                        <Input
                          type="date"
                          value={mainDetails.dateListedForSale}
                          onChange={(e) => setMainDetails({ ...mainDetails, dateListedForSale: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                        />
                      </div>
                    </div>

                    {/* ADDRESS */}
                    <div className="flex bg-white border border-slate-300 rounded shadow-sm overflow-hidden min-h-[90px]">
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[140px] flex items-start pt-3">
                        ADDRESS *
                      </span>
                      <Textarea
                        value={mainDetails.address}
                        onChange={(e) => setMainDetails({ ...mainDetails, address: e.target.value })}
                        className="border-0 focus-visible:ring-0 text-xs font-medium resize-none min-h-[85px] p-3"
                        placeholder="Barton 20/ 10 Ovens St Griffith ACT 2603"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: SEND OUT DEED OF VARIATION */}
              {activeStep === 2 && (
                <div className="space-y-4">
                  <div className="bg-[#095c7b] text-white py-1.5 px-4 text-center text-xs font-bold tracking-widest uppercase rounded">
                    DEED OF VARIATION - EXIT PROGRAM
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-[#095c7b]/10 text-[#095c7b] rounded-xl">
                        <FileCheck className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-slate-800">
                          Deed of Variation Online Digital Signing
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          To list this territory for sale, the franchisee or authorized signatory must execute the
                          Deed of Variation. You can sign directly online using the interactive digital signature pad
                          or upload a signed PDF version.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <Card className="border border-slate-200 hover:border-[#095c7b] transition-all">
                        <CardContent className="p-4 space-y-3">
                          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <Send className="h-4 w-4 text-[#095c7b]" /> Online Interactive Signing
                          </h4>
                          <p className="text-xs text-slate-500">
                            Fill in legal name, draw or type signature online, and complete the Deed of Variation immediately.
                          </p>
                          <Button
                            type="button"
                            onClick={() => setDeedDialogOpen(true)}
                            className="w-full bg-[#095c7b] hover:bg-[#07465e] text-white text-xs gap-2"
                          >
                            <FileCheck className="h-4 w-4" /> Open Deed of Variation Modal
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="border border-slate-200 hover:border-[#095c7b] transition-all">
                        <CardContent className="p-4 space-y-3">
                          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Current Signing Status
                          </h4>
                          <p className="text-xs text-slate-500">
                            {deedOfVariation.status === 'not_started' && 'No Deed of Variation has been completed yet.'}
                            {deedOfVariation.status === 'signed_online' && `Signed Online by ${deedOfVariation.signerName}`}
                            {deedOfVariation.status === 'pdf_uploaded' && `Signed PDF Uploaded: ${deedOfVariation.pdfFileName}`}
                          </p>
                          <Badge
                            className={
                              deedOfVariation.status === 'not_started'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }
                          >
                            {deedOfVariation.status === 'not_started' ? 'Pending Deed' : 'Deed Completed'}
                          </Badge>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: DEED FILLED AND SIGNED STATUS */}
              {activeStep === 3 && (
                <div className="space-y-4">
                  <div className="bg-[#095c7b] text-white py-1.5 px-4 text-center text-xs font-bold tracking-widest uppercase rounded">
                    DEED OF VARIATION VERIFICATION STATUS
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-4">
                    {deedOfVariation.status === 'not_started' ? (
                      <div className="py-8 space-y-3">
                        <Clock className="h-12 w-12 text-amber-500 mx-auto" />
                        <h4 className="font-bold text-slate-800 text-base">Deed of Variation Pending</h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          The Deed of Variation has not been completed yet. Please proceed to Step 2 to sign online or upload the signed PDF.
                        </p>
                        <Button
                          onClick={() => setActiveStep(2)}
                          className="bg-[#095c7b] hover:bg-[#07465e] text-white text-xs gap-2"
                        >
                          Go to Step 2: Deed of Variation
                        </Button>
                      </div>
                    ) : (
                      <div className="py-6 space-y-4">
                        <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-300">
                          <CheckCircle2 className="h-10 w-10" />
                        </div>
                        <h4 className="font-bold text-emerald-900 text-lg">
                          Deed of Variation Filled & Signed
                        </h4>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-w-lg mx-auto text-left space-y-2 text-xs">
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-slate-500">Signing Method:</span>
                            <strong className="text-slate-800 capitalize">
                              {deedOfVariation.status === 'signed_online' ? 'Online Digital Signature' : 'Uploaded PDF'}
                            </strong>
                          </div>
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-slate-500">Completed Date:</span>
                            <strong className="text-slate-800">
                              {deedOfVariation.signedAt ? new Date(deedOfVariation.signedAt).toLocaleString('en-AU') : 'N/A'}
                            </strong>
                          </div>
                          {deedOfVariation.signerName && (
                            <div className="flex justify-between border-b pb-1">
                              <span className="text-slate-500">Signer Name:</span>
                              <strong className="text-slate-800">{deedOfVariation.signerName}</strong>
                            </div>
                          )}
                          {deedOfVariation.pdfFileName && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Document File:</span>
                              <strong className="text-slate-800">{deedOfVariation.pdfFileName}</strong>
                            </div>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          onClick={() => setDeedDialogOpen(true)}
                          className="gap-2 border-[#095c7b] text-[#095c7b]"
                        >
                          <FileCheck className="h-4 w-4" /> View Signed Deed Document
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: FRANCHISEE IM & TERRITORY MAP (Operations & Franchisee E-Sign Workflow) */}
              {activeStep === 4 && (
                <div className="space-y-4">
                  <div className="bg-[#095c7b] text-white py-1.5 px-4 text-center text-xs font-bold tracking-widest uppercase rounded flex items-center justify-between">
                    <span>FRANCHISEE INFORMATION MEMORANDUM & TERRITORY MAP</span>
                    {isAdminOrOps ? (
                      <Badge className="bg-emerald-500 text-white text-[10px] uppercase font-bold">
                        Operations / Admin Edit Mode
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500 text-white text-[10px] uppercase font-bold flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Read-Only for Franchisees
                      </Badge>
                    )}
                  </div>

                  {/* E-SIGN STATUS ALERT CARD */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        presalesDetails.imStatus === 'signed_online' || status === 'Active Presale'
                          ? 'bg-emerald-100 text-emerald-700'
                          : presalesDetails.imStatus === 'sent'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          Franchisee IM Confirmation Status:
                          <Badge className={
                            presalesDetails.imStatus === 'signed_online' || status === 'Active Presale'
                              ? 'bg-emerald-600 text-white font-bold text-xs'
                              : presalesDetails.imStatus === 'sent'
                              ? 'bg-blue-600 text-white font-bold text-xs'
                              : 'bg-amber-500 text-white font-bold text-xs'
                          }>
                            {presalesDetails.imStatus === 'signed_online' || status === 'Active Presale'
                              ? 'Signed & Confirmed (Active Presale)'
                              : presalesDetails.imStatus === 'sent'
                              ? 'Sent to Franchisee (Pending Signature)'
                              : 'Not Sent Yet'}
                          </Badge>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {presalesDetails.imStatus === 'signed_online' || status === 'Active Presale'
                            ? `Confirmed & E-signed by ${presalesDetails.signerName || 'Franchisee'} on ${presalesDetails.signedAt ? new Date(presalesDetails.signedAt).toLocaleString('en-AU') : 'N/A'}`
                            : presalesDetails.imStatus === 'sent'
                            ? `Email sent to ${presalesDetails.sentToEmail || mainDetails.email} on ${presalesDetails.sentAt ? new Date(presalesDetails.sentAt).toLocaleString('en-AU') : 'N/A'}`
                            : 'Fill in all IM schedule fields below, upload territory map, and send confirmation email.'}
                        </p>
                      </div>
                    </div>

                    {isAdminOrOps && (
                      <Button
                        type="button"
                        onClick={() => {
                          if (!presalesDetails.territoryMapUrl) {
                            toast({
                              title: 'Territory Map Required',
                              description: 'You cannot send out the IM confirmation email without uploading the territory map image first.',
                              variant: 'destructive',
                            });
                            return;
                          }
                          const defaultTo = Array.from(new Set([mainDetails.email, mainDetails.personalEmail].map((e) => (e || '').trim()).filter(Boolean))).join(', ');
                          setImRecipientEmail(defaultTo);
                          setImEmailDialogOpen(true);
                        }}
                        className="bg-[#095c7b] hover:bg-[#07465e] text-white text-xs gap-2 shrink-0 font-bold"
                      >
                        <Send className="h-4 w-4" /> Send Confirmation Email
                      </Button>
                    )}
                  </div>

                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/60 space-y-4">
                    <h3 className="text-xs font-extrabold text-[#095c7b] uppercase tracking-wider">
                      1. Proposed Territory Profile & Schedule (Docx Schedule Content)
                    </h3>

                    {/* Schedule Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      
                      {/* TERRITORY NAME */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden md:col-span-2">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[200px]">
                          TERRITORY NAME *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.territoryName || mainDetails.tradingEntity || franchiseeName}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, territoryName: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-semibold"
                          placeholder="MailPlus Waterloo Alexandria"
                        />
                      </div>

                      {/* DATE BUSINESS STARTED */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[200px]">
                          DATE BUSINESS STARTED *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.dateBusinessStarted}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, dateBusinessStarted: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="1/02/2022"
                        />
                      </div>

                      {/* NUMBER OF OWNERS */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[200px]">
                          NUMBER OF OWNERS *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.numberOfOwners || '1'}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, numberOfOwners: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="1"
                        />
                      </div>

                      {/* REASON FOR SALE */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden md:col-span-2">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[200px]">
                          REASON FOR SALE *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.reasonForSale || 'Moving'}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, reasonForSale: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="Moving"
                        />
                      </div>

                      {/* LAST 12 MONTHS SERVICE REVENUE (EX GST) */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[200px]">
                          LAST 12M SERVICE REVENUE *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.serviceRevenue}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, serviceRevenue: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="$300,437.26 (+gst)"
                        />
                      </div>

                      {/* FRANCHISE FEES ON SERVICE REVENUE */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[200px]">
                          FRANCHISE FEES (%) *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.franchiseFeesOnServiceRevenue || '25%'}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, franchiseFeesOnServiceRevenue: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="25%"
                        />
                      </div>

                      {/* MARKETING LEVY */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[200px]">
                          MARKETING LEVY (%) *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.marketingLevy || '5%'}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, marketingLevy: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="5%"
                        />
                      </div>

                      {/* LAST 12M MAILPLUS EXPRESS REVENUE */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[200px]">
                          LAST 12M EXPRESS REVENUE *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.expressRevenue || `Product Commission $${presalesDetails.mpexCommission || 856.60}`}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, expressRevenue: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="Product Commission $856.60"
                        />
                      </div>

                      {/* SALE PRICE */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden md:col-span-2">
                        <span className="bg-[#095c7b] text-white text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[200px]">
                          SALE PRICE ($) *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.salePrice}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, salePrice: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-sm font-extrabold text-[#095c7b]"
                          placeholder="$335,000.00 NEG"
                        />
                      </div>

                      {/* TOTAL AVERAGE DAILY RUN TIME */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden md:col-span-2">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[200px]">
                          AVG DAILY RUN TIME *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.totalDailyRunTime || 'Between 8.5 to 9.5 hours per day'}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, totalDailyRunTime: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="Between 8.5 to 9.5 hours per day"
                        />
                      </div>

                      {/* CURRENT MORNING SHIFT */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[200px]">
                          CURRENT MORNING SHIFT *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.currentMorningShift || '6:00am to 11:00am'}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, currentMorningShift: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="6:00am to 11:00am"
                        />
                      </div>

                      {/* CURRENT AFTERNOON SHIFT */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[200px]">
                          CURRENT AFTERNOON SHIFT *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.currentAfternoonShift || '1:00pm to 4:00pm'}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, currentAfternoonShift: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="1:00pm to 4:00pm"
                        />
                      </div>

                      {/* FRANCHISE TERM */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden md:col-span-2">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[200px]">
                          FRANCHISE TERM *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.franchiseTerm || presalesDetails.termOnFranchiseeIM || 'Unlimited'}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, franchiseTerm: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="Unlimited"
                        />
                      </div>

                    </div>

                    {/* TERRITORY MAP UPLOAD SECTION */}
                    <div className="space-y-3 pt-4 border-t border-slate-200">
                      <h3 className="text-xs font-extrabold text-[#095c7b] uppercase tracking-wider flex items-center justify-between">
                        <span>2. Territory Map Attachment</span>
                        {isAdminOrOps && (
                          <label className="cursor-pointer bg-[#095c7b] hover:bg-[#07465e] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm">
                            Upload Territory Map Image
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleMapImageUpload}
                            />
                          </label>
                        )}
                      </h3>

                      {presalesDetails.territoryMapUrl ? (
                        <div className="bg-white border border-slate-300 rounded-xl p-3 text-center space-y-2">
                          <img
                            src={presalesDetails.territoryMapUrl}
                            alt="Territory Map Preview"
                            className="max-h-64 mx-auto rounded-lg object-contain border border-slate-200"
                          />
                          <p className="text-[11px] text-emerald-700 font-bold">Territory Map Attached Successfully</p>
                        </div>
                      ) : (
                        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-6 text-center space-y-2">
                          <p className="text-xs text-slate-500">No territory map uploaded yet. Click above to upload a map image.</p>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t pt-4 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={activeStep === 1}
                    onClick={() => setActiveStep((prev) => (prev > 1 ? ((prev - 1) as any) : 1))}
                    className="text-xs"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={activeStep === 4}
                    onClick={() => setActiveStep((prev) => (prev < 4 ? ((prev + 1) as any) : 4))}
                    className="text-xs"
                  >
                    Next Step
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">
                    Close
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={saving}
                    className="bg-[#095c7b] hover:bg-[#07465e] text-white text-xs gap-2 font-semibold"
                  >
                    {saving ? <Loader className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    Save Presale Process
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* EMAIL PREVIEW & DISPATCH DIALOG */}
      <Dialog open={imEmailDialogOpen} onOpenChange={setImEmailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Send className="h-5 w-5 text-[#095c7b]" />
              Preview Franchisee IM Confirmation Email
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Please review the exact email content and recipients below before confirming email dispatch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* TERRITORY MAP MANDATORY VALIDATION WARNING */}
            {!presalesDetails.territoryMapUrl && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-center gap-3 text-amber-800 text-xs">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold">Territory Map Required</p>
                  <p className="text-[11px] text-amber-700">
                    A territory map image attachment is required before sending the Franchisee IM email. Please close this dialog and upload a map image under "Territory Map Attachment".
                  </p>
                </div>
              </div>
            )}

            {/* EMAIL METADATA GRID */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between border-b pb-1.5">
                <span className="font-bold text-slate-500 w-24">From:</span>
                <span className="font-semibold text-slate-800">Greg Hart &lt;greg.hart@mailplus.com.au&gt;</span>
              </div>
              <div className="flex items-center justify-between border-b pb-1.5">
                <span className="font-bold text-slate-500 w-24">CC:</span>
                <span className="font-semibold text-slate-800">Michael McDaid &lt;michael.mcdaid@mailplus.com.au&gt;</span>
              </div>
              <div className="flex items-center justify-between border-b pb-1.5">
                <span className="font-bold text-slate-500 w-24">To (Franchisee):</span>
                <Input
                  type="email"
                  value={imRecipientEmail}
                  onChange={(e) => setImRecipientEmail(e.target.value)}
                  placeholder="franchisee@example.com"
                  className="text-xs font-medium bg-white max-w-sm h-8"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500 w-24">Subject:</span>
                <span className="font-semibold text-[#095c7b]">
                  Action Required: Confirm &amp; Sign Franchisee IM Schedule ({presalesDetails.territoryName || mainDetails.tradingEntity || franchiseeName})
                </span>
              </div>
            </div>

            {/* LIVE EMAIL CONTENT PREVIEW BOX */}
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Email Body HTML Content Preview
              </Label>
              <div className="border border-slate-300 rounded-xl p-5 bg-[#f4f7f8] space-y-4">
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden max-w-lg mx-auto shadow-sm">
                  <div className="bg-[#095c7b] p-4 text-center">
                    <img
                      src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD"
                      alt="MailPlus Logo"
                      className="h-8 w-auto mx-auto"
                    />
                  </div>
                  <div className="p-6 space-y-3 text-slate-700 leading-relaxed text-xs">
                    <p className="font-bold text-[#095c7b] text-sm">
                      Hi {mainDetails.mainContact || mainDetails.tradingEntity || 'Franchisee'},
                    </p>
                    <p>
                      The Operations team has prepared the <strong>Franchisee Information Memorandum (IM) Schedule &amp; Territory Profile</strong> for your territory (<strong>{presalesDetails.territoryName || mainDetails.tradingEntity || franchiseeName}</strong>).
                    </p>
                    <p>
                      Please click the button below to review all territory profile details, inspect the attached territory map, and digitally confirm/e-sign the document.
                    </p>
                    <div className="py-2 text-center">
                      <span className="inline-block bg-[#095c7b] text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm">
                        Review &amp; E-Sign Franchisee IM &rarr;
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Link URL: https://prospectplus.com.au/franchisee-im/dov_...
                    </p>
                    <div className="pt-2 border-t text-xs">
                      <p className="font-bold text-slate-800">Greg Hart</p>
                      <p className="text-slate-500 text-[11px]">MailPlus Operations &amp; Presales Team</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 text-center border-t text-[10px] text-slate-400">
                    &copy; 2026 MailPlus. All rights reserved.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImEmailDialogOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendImEmail}
              disabled={sendingImEmail || !presalesDetails.territoryMapUrl}
              className="bg-[#095c7b] hover:bg-[#07465e] text-white text-xs font-bold gap-2"
            >
              {sendingImEmail ? <Loader className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              Confirm &amp; Send Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deed of Variation Dialog */}
      <DeedOfVariationDialog
        open={deedDialogOpen}
        onOpenChange={setDeedDialogOpen}
        mainDetails={mainDetails}
        deedOfVariation={deedOfVariation}
        onSaveDeed={handleDeedSaved}
      />
    </>
  );
}

