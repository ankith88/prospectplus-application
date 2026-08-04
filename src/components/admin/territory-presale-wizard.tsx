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
  const [status, setStatus] = useState<PresaleRecord['status']>('Draft');

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

  // Role permissions check for Step 4
  const isAdminOrOps =
    isSuperAdmin ||
    ['admin', 'operations', 'Operations', 'Operations Manager', 'Sales Manager'].includes(
      userProfile?.activeRole || userProfile?.role || ''
    );

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto bg-[#f4f7f8] p-6">
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
                  onClick={() => setActiveStep(1)}
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
                  onClick={() => setActiveStep(2)}
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
                  onClick={() => setActiveStep(3)}
                  className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    activeStep === 3
                      ? 'bg-[#095c7b] text-white shadow'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold">STEP 3</span>
                  <span>Signed Status</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    activeStep === 4
                      ? 'bg-[#095c7b] text-white shadow'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1">
                    STEP 4 {!isAdminOrOps && <Lock className="h-3 w-3 text-amber-300" />}
                  </span>
                  <span>Presales Details</span>
                </button>
              </div>

              {/* STEP 1: MAIN DETAILS (Screenshot 1 Layout) */}
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

              {/* STEP 4: PRESALES DETAILS (Screenshot 2 Layout - ONLY Operations / Admin Team) */}
              {activeStep === 4 && (
                <div className="space-y-4">
                  <div className="bg-[#095c7b] text-white py-1.5 px-4 text-center text-xs font-bold tracking-widest uppercase rounded flex items-center justify-between">
                    <span>PRESALES DETAILS</span>
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

                  {!isAdminOrOps && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3 text-xs text-amber-800">
                      <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                      <span>
                        Notice: Presales contract and pricing details can ONLY be modified by the Operations or Admin team.
                      </span>
                    </div>
                  )}

                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/60 space-y-4">
                    {/* Top Contract Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* COMMENCEMENT DATE */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-2.5 py-2 border-r border-slate-300 whitespace-nowrap min-w-[130px]">
                          COMMENCEMENT DATE *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.commencementDate}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, commencementDate: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="01/02/2020"
                        />
                      </div>

                      {/* EXPIRY DATE */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-2.5 py-2 border-r border-slate-300 whitespace-nowrap min-w-[130px]">
                          EXPIRY DATE *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.expiryDate}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, expiryDate: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="01/02/2025"
                        />
                      </div>

                      {/* ULTIMATE EXPIRY DATE */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-2.5 py-2 border-r border-slate-300 whitespace-nowrap min-w-[140px]">
                          ULTIMATE EXPIRY DATE *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.ultimateExpiryDate}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, ultimateExpiryDate: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="dd/mm/yyyy"
                        />
                      </div>

                      {/* UNLIMITED TERM OFFER */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-2.5 py-2 border-r border-slate-300 whitespace-nowrap min-w-[130px]">
                          UNLIMITED TERM OFFER *
                        </span>
                        <Select
                          disabled={!isAdminOrOps}
                          value={presalesDetails.unlimitedTermOffer}
                          onValueChange={(val) => setPresalesDetails({ ...presalesDetails, unlimitedTermOffer: val })}
                        >
                          <SelectTrigger className="border-0 focus:ring-0 text-xs font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yes">Yes</SelectItem>
                            <SelectItem value="No">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* UNLIMITED TERM FEE ($) */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-2.5 py-2 border-r border-slate-300 whitespace-nowrap min-w-[140px]">
                          UNLIMITED TERM FEE ($) *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          type="number"
                          value={presalesDetails.unlimitedTermFee}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, unlimitedTermFee: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="25000"
                        />
                      </div>

                      {/* RENEWAL TERMS (YEARS) */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-2.5 py-2 border-r border-slate-300 whitespace-nowrap min-w-[140px]">
                          RENEWAL TERMS (YEARS) *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          type="number"
                          value={presalesDetails.renewalTermsYears}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, renewalTermsYears: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="5"
                        />
                      </div>
                    </div>

                    {/* Presales Details Grid (Screenshot 2) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {/* TERM ON FRANCHISEE IM */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden md:col-span-2">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[180px]">
                          TERM ON FRANCHISEE IM *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.termOnFranchiseeIM}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, termOnFranchiseeIM: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="Unlimited"
                        />
                      </div>

                      {/* DATE BUSINESS STARTED */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[180px]">
                          DATE BUSINESS STARTED *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          type="date"
                          value={presalesDetails.dateBusinessStarted}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, dateBusinessStarted: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                        />
                      </div>

                      {/* TOTAL DAILY RUN TIME */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[180px]">
                          TOTAL DAILY RUN TIME *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.totalDailyRunTime}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, totalDailyRunTime: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="5 - 6 hrs"
                        />
                      </div>

                      {/* LOW PRICE ($) */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[180px]">
                          LOW PRICE ($) *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          type="number"
                          value={presalesDetails.lowPrice}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, lowPrice: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="50000"
                        />
                      </div>

                      {/* HIGH PRICE ($) */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[180px]">
                          HIGH PRICE ($) *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          type="number"
                          value={presalesDetails.highPrice}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, highPrice: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="75000"
                        />
                      </div>

                      {/* SERVICE REVENUE ($) + YEAR */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[180px]">
                          SERVICE REVENUE ($) *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          type="number"
                          value={presalesDetails.serviceRevenue}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, serviceRevenue: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="53301"
                        />
                      </div>
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[120px]">
                          YEAR *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.serviceRevenueYear}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, serviceRevenueYear: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="01/04/2021 - 31/03/2022"
                        />
                      </div>

                      {/* MPEX COMMISSION ($) + YEAR */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[180px]">
                          MPEX COMMISSION ($) *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          type="number"
                          value={presalesDetails.mpexCommission}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, mpexCommission: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="3"
                        />
                      </div>
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[120px]">
                          YEAR *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.mpexCommissionYear}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, mpexCommissionYear: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="01/04/2021 - 31/03/2022"
                        />
                      </div>

                      {/* SENDLE COMMISSION ($) + YEAR */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[180px]">
                          SENDLE COMMISSION ($) *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          type="number"
                          value={presalesDetails.sendleCommission}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, sendleCommission: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[120px]">
                          YEAR *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          value={presalesDetails.sendleCommissionYear}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, sendleCommissionYear: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="01/04/2021 - 31/03/2022"
                        />
                      </div>

                      {/* SALES COMMISSION (%) */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[180px]">
                          SALES COMMISSION (%) *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          type="number"
                          value={presalesDetails.salesCommissionPercent}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, salesCommissionPercent: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="10"
                        />
                      </div>

                      {/* NAB ACCREDITATION & FEE */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[140px]">
                          NAB ACCREDITATION*
                        </span>
                        <Select
                          disabled={!isAdminOrOps}
                          value={presalesDetails.nabAccreditation}
                          onValueChange={(val) => setPresalesDetails({ ...presalesDetails, nabAccreditation: val })}
                        >
                          <SelectTrigger className="border-0 focus:ring-0 text-xs font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yes">Yes</SelectItem>
                            <SelectItem value="No">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[180px]">
                          NAB ACCREDITATION FEE ($) *
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          type="number"
                          value={presalesDetails.nabAccreditationFee}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, nabAccreditationFee: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium"
                          placeholder="0"
                        />
                      </div>

                      {/* SALE PRICE */}
                      <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden md:col-span-2">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 border-r border-slate-300 whitespace-nowrap min-w-[180px]">
                          SALE PRICE*
                        </span>
                        <Input
                          disabled={!isAdminOrOps}
                          type="number"
                          value={presalesDetails.salePrice}
                          onChange={(e) => setPresalesDetails({ ...presalesDetails, salePrice: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-semibold text-[#095c7b] text-sm"
                          placeholder="82500"
                        />
                      </div>
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
