'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { Card, CardContent } from '@/components/ui/card';
import { DeedOfVariationDialog } from '@/components/admin/deed-of-variation-dialog';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useGoogleMapsScript } from '@/hooks/use-google-maps';
import {
  Building2,
  FileCheck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Send,
  Save,
  Clock,
  ShieldAlert,
  Copy,
  ExternalLink,
  PenTool,
  MapPin,
  Mail,
  Calendar,
  Search,
} from 'lucide-react';
import { PresaleRecord, PresaleMainDetails, PresaleDeedOfVariation, PresalesDetails, StepStatus } from '@/lib/presale-types';
import { encodePresaleId } from '@/lib/presale-token';

function parseClientAddress(rawAddress: any): {
  streetNumberAndName: string;
  suburb: string;
  state: string;
  postcode: string;
} {
  if (!rawAddress) return { streetNumberAndName: '', suburb: '', state: '', postcode: '' };
  if (typeof rawAddress === 'object' && rawAddress !== null) {
    return {
      streetNumberAndName: rawAddress.streetNumberAndName || rawAddress.street || rawAddress.address1 || '',
      suburb: rawAddress.suburb || rawAddress.city || '',
      state: rawAddress.state || '',
      postcode: rawAddress.postcode || rawAddress.zip || '',
    };
  }
  const str = String(rawAddress).trim();
  if (!str) return { streetNumberAndName: '', suburb: '', state: '', postcode: '' };

  if (str.includes(',')) {
    const parts = str.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 4) {
      return { streetNumberAndName: parts[0], suburb: parts[1], state: parts[2], postcode: parts[3] };
    }
    if (parts.length === 3) {
      const pcMatch = parts[2].match(/\b(\d{4})\b/);
      const stMatch = parts[2].match(/\b(ACT|NSW|NT|QLD|SA|TAS|VIC|WA)\b/i);
      return {
        streetNumberAndName: parts[0],
        suburb: parts[1],
        state: stMatch ? stMatch[1].toUpperCase() : '',
        postcode: pcMatch ? pcMatch[1] : '',
      };
    }
    if (parts.length === 2) {
      const pcMatch = parts[1].match(/\b(\d{4})\b/);
      const stMatch = parts[1].match(/\b(ACT|NSW|NT|QLD|SA|TAS|VIC|WA)\b/i);
      const sub = parts[1].replace(/\b(ACT|NSW|NT|QLD|SA|TAS|VIC|WA)\b/gi, '').replace(/\b\d{4}\b/g, '').trim();
      return {
        streetNumberAndName: parts[0],
        suburb: sub,
        state: stMatch ? stMatch[1].toUpperCase() : '',
        postcode: pcMatch ? pcMatch[1] : '',
      };
    }
  }

  let postcode = '';
  let remaining = str;
  const pcMatch = remaining.match(/\b(\d{4})\b$/);
  if (pcMatch) {
    postcode = pcMatch[1];
    remaining = remaining.substring(0, pcMatch.index).trim();
  }

  let state = '';
  const stateMatch = remaining.match(/\b(ACT|NSW|NT|QLD|SA|TAS|VIC|WA)\b/i);
  if (stateMatch) {
    state = stateMatch[1].toUpperCase();
    const stateIndex = stateMatch.index || 0;
    const beforeState = remaining.substring(0, stateIndex).trim();
    const words = beforeState.split(/\s+/);
    if (words.length > 1) {
      const suburb = words.pop() || '';
      const streetNumberAndName = words.join(' ');
      return { streetNumberAndName, suburb, state, postcode };
    }
  }

  return { streetNumberAndName: str, suburb: '', state: '', postcode };
}

export default function DedicatedTerritoryPresalePage() {
  const params = useParams();
  const router = useRouter();
  const franchiseeId = params?.franchiseeId as string;

  const { userProfile, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const { isLoaded } = useGoogleMapsScript();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [deedDialogOpen, setDeedDialogOpen] = useState(false);

  const [recordId, setRecordId] = useState(franchiseeId);
  const [status, setStatus] = useState<PresaleRecord['status']>('Step 1: Main Details');

  const [step1Status, setStep1Status] = useState<StepStatus>('Completed');
  const [step2Status, setStep2Status] = useState<StepStatus>('Not Started');
  const [step3Status, setStep3Status] = useState<StepStatus>('Not Started');
  const [step4Status, setStep4Status] = useState<StepStatus>('Not Started');

  const [mainDetails, setMainDetails] = useState<PresaleMainDetails>({
    franchiseeName: '',
    tradingEntity: '',
    mainContact: '',
    mobileNumber: '',
    email: '',
    abn: '',
    dateListedForSale: new Date().toISOString().split('T')[0],
    address: '',
    streetNumberAndName: '',
    suburb: '',
    state: '',
    postcode: '',
    dateBusinessStarted: '',
    expiryDate: '',
    ultimateExpiryDate: '',
    unlimitedTermOffer: 'No',
  });

  const [verifyingABN, setVerifyingABN] = useState(false);

  const handleVerifyABN = async () => {
    const abnToVerify = mainDetails.abn ? mainDetails.abn.replace(/\s+/g, '') : '';
    if (!abnToVerify) {
      toast({
        title: 'Empty ABN',
        description: 'Please enter an ABN to verify.',
        variant: 'destructive',
      });
      return;
    }

    setVerifyingABN(true);
    try {
      const res = await fetch(`/api/abn-lookup?abn=${encodeURIComponent(abnToVerify)}`);
      const json = await res.json();
      if (json.success && json.valid) {
        toast({
          title: 'ABN Validated!',
          description: json.entityName
            ? `ABN is valid. Trading Entity set to "${json.entityName}".`
            : 'ABN Modulus 89 checksum validated successfully.',
        });
        setMainDetails((prev) => ({
          ...prev,
          tradingEntity: json.entityName || prev.tradingEntity,
          abn: json.formattedABN || abnToVerify,
        }));
      } else {
        toast({
          title: 'Invalid ABN',
          description: json.message || 'The entered ABN is invalid according to ATO checksum rules.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'ABN Check Error',
        description: err.message || 'Failed to check ABN.',
        variant: 'destructive',
      });
    } finally {
      setVerifyingABN(false);
    }
  };

  const [deedOfVariation, setDeedOfVariation] = useState<PresaleDeedOfVariation>({
    status: 'not_started',
    selectedOption: 'option_2',
    party3Name: 'Mail Plus Pty Ltd ACN 609 801 195 of Level 14, Suite 11, 175 Pitt Street, Sydney, NSW, 2000 (MailPlus)',
  });

  const [presalesDetails, setPresalesDetails] = useState<PresalesDetails>({
    commencementDate: '',
    expiryDate: '',
    ultimateExpiryDate: '',
    unlimitedTermOffer: 'No',
    unlimitedTermFee: 0,
    renewalTermsYears: 0,
    termOnFranchiseeIM: '',
    dateBusinessStarted: '',
    totalDailyRunTime: '',
    lowPrice: 0,
    highPrice: 0,
    serviceRevenue: 0,
    serviceRevenueYear: '',
    mpexCommission: 0,
    mpexCommissionYear: '',
    sendleCommission: 0,
    sendleCommissionYear: '',
    salesCommissionPercent: 0,
    nabAccreditation: 'No',
    nabAccreditationFee: 0,
    salePrice: 0,
  });

  // Google Places Autocomplete state
  const [addressPredictions, setAddressPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  const dummyDivRef = useCallback((node: HTMLDivElement | null) => {
    if (node && isLoaded && typeof window !== 'undefined' && window.google && !placesService.current) {
      placesService.current = new window.google.maps.places.PlacesService(node);
    }
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined' && window.google && !autocompleteService.current) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  const isAdminOrOps =
    isSuperAdmin ||
    ['admin', 'operations', 'Operations', 'Operations Manager', 'Sales Manager'].includes(
      userProfile?.activeRole || userProfile?.role || ''
    );

  const isDeedSigned =
    step2Status === 'Completed' ||
    step3Status === 'Completed' ||
    deedOfVariation.status === 'signed_online' ||
    deedOfVariation.status === 'pdf_uploaded';

  useEffect(() => {
    if (!franchiseeId) return;

    async function loadPresale() {
      setLoading(true);
      try {
        const res = await fetch(`/api/franchisees/presales?franchiseeId=${franchiseeId}`);
        const json = await res.json();
        if (json.success && json.data) {
          const d: PresaleRecord = json.data;
          setRecordId(d.id || franchiseeId);
          setStatus(d.status || 'Step 1: Main Details');
          setStep1Status(d.step1Status || 'Completed');
          setStep2Status(d.step2Status || 'Not Started');
          setStep3Status(d.step3Status || 'Not Started');
          setStep4Status(d.step4Status || 'Not Started');

          if (d.mainDetails) {
            const rawAddr = d.mainDetails.address || d.mainDetails.streetNumberAndName;
            const parsed = parseClientAddress(rawAddr);

            const street = d.mainDetails.streetNumberAndName || parsed.streetNumberAndName || '';
            const suburb = d.mainDetails.suburb || parsed.suburb || '';
            const state = d.mainDetails.state || parsed.state || '';
            const postcode = d.mainDetails.postcode || parsed.postcode || '';

            const bizStarted = d.mainDetails.dateBusinessStarted || d.presalesDetails?.dateBusinessStarted || '';
            const expDate = d.mainDetails.expiryDate || d.presalesDetails?.expiryDate || '';

            const franName = (d.franchiseeName && d.franchiseeName !== franchiseeId ? d.franchiseeName : '') || (d.mainDetails?.franchiseeName && d.mainDetails?.franchiseeName !== franchiseeId ? d.mainDetails?.franchiseeName : '') || '';

            setMainDetails((prev) => ({
              ...prev,
              ...d.mainDetails,
              franchiseeName: franName || (prev.franchiseeName !== franchiseeId ? prev.franchiseeName : '') || '',
              streetNumberAndName: street,
              suburb,
              state,
              postcode,
              dateBusinessStarted: bizStarted,
              expiryDate: expDate,
            }));
          }
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
  }, [franchiseeId]);

  // Google Places Input Handler
  const handleStreetInputChange = (val: string) => {
    const fullAddr = [val, mainDetails.suburb, mainDetails.state, mainDetails.postcode].filter(Boolean).join(', ');
    setMainDetails((prev) => ({ ...prev, streetNumberAndName: val, address: fullAddr }));

    if (autocompleteService.current && val.trim().length > 2) {
      autocompleteService.current.getPlacePredictions(
        { input: val, componentRestrictions: { country: 'au' } },
        (preds, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && preds) {
            setAddressPredictions(preds);
            setShowPredictions(true);
          } else {
            setAddressPredictions([]);
            setShowPredictions(false);
          }
        }
      );
    } else {
      setAddressPredictions([]);
      setShowPredictions(false);
    }
  };

  const handleSelectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current) return;
    placesService.current.getDetails(
      { placeId: prediction.place_id, fields: ['address_components', 'formatted_address'] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.address_components) {
          const comps = place.address_components;
          const getComp = (type: string, useShort = false) => {
            const c = comps.find((comp) => comp.types.includes(type));
            return useShort ? c?.short_name : c?.long_name;
          };

          const streetNo = getComp('street_number') || '';
          const route = getComp('route') || '';
          const street = `${streetNo} ${route}`.trim() || prediction.structured_formatting.main_text;
          const suburb = getComp('locality') || getComp('postal_town') || '';
          const state = getComp('administrative_area_level_1', true) || '';
          const postcode = getComp('postal_code') || '';
          const fullAddr = [street, suburb, state, postcode].filter(Boolean).join(', ');

          setMainDetails((prev) => ({
            ...prev,
            streetNumberAndName: street,
            suburb,
            state,
            postcode,
            address: fullAddr,
          }));
          setAddressPredictions([]);
          setShowPredictions(false);
        }
      }
    );
  };

  // Date Business Started Handler (Auto computes 5-year expiry date)
  const handleDateBusinessStartedChange = (startedStr: string) => {
    let expDate = mainDetails.expiryDate || '';
    if (startedStr) {
      const parts = startedStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10) + 5;
        expDate = `${year}-${parts[1]}-${parts[2]}`;
      }
    }

    setMainDetails((prev) => ({
      ...prev,
      dateBusinessStarted: startedStr,
      expiryDate: expDate,
    }));
    setPresalesDetails((prev) => ({
      ...prev,
      dateBusinessStarted: startedStr,
      expiryDate: expDate,
    }));
  };

  const handleSave = async (customDeed?: PresaleDeedOfVariation) => {
    setSaving(true);
    try {
      const finalDeed = customDeed || deedOfVariation;
      const fullAddr = [
        mainDetails.streetNumberAndName,
        mainDetails.suburb,
        mainDetails.state,
        mainDetails.postcode,
      ].filter(Boolean).join(', ') || mainDetails.address;

      const updatedMain = {
        ...mainDetails,
        address: fullAddr,
      };

      const res = await fetch('/api/franchisees/presales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          franchiseeId,
          franchiseeName: mainDetails.tradingEntity || franchiseeId,
          mainDetails: updatedMain,
          deedOfVariation: finalDeed,
          presalesDetails: {
            ...presalesDetails,
            dateBusinessStarted: mainDetails.dateBusinessStarted || presalesDetails.dateBusinessStarted,
            expiryDate: mainDetails.expiryDate || presalesDetails.expiryDate,
            ultimateExpiryDate: mainDetails.ultimateExpiryDate || presalesDetails.ultimateExpiryDate,
            unlimitedTermOffer: mainDetails.unlimitedTermOffer || presalesDetails.unlimitedTermOffer,
          },
          userRole: userProfile?.activeRole || userProfile?.role || 'user',
          userUid: userProfile?.uid || '',
          userName: userProfile?.displayName || '',
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast({
          title: 'Presale Saved & Profile Synced',
          description: 'Territory presale process and user profile details updated successfully.',
        });
        if (json.data) {
          setStatus(json.data.status);
          setStep1Status(json.data.step1Status || 'Completed');
          setStep2Status(json.data.step2Status || 'Not Started');
          setStep3Status(json.data.step3Status || 'Not Started');
          setStep4Status(json.data.step4Status || 'Not Started');
        }
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

  const [deedEmailDialogOpen, setDeedEmailDialogOpen] = useState(false);
  const [deedRecipientEmail, setDeedRecipientEmail] = useState('');

  const handleSendDeedEmail = async () => {
    const targetEmail = deedRecipientEmail || mainDetails.email;
    if (!targetEmail) {
      toast({
        title: 'Email Required',
        description: 'Please enter a recipient email address.',
        variant: 'destructive',
      });
      return;
    }

    setSendingEmail(true);
    try {
      const res = await fetch('/api/franchisees/presales/send-deed-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          franchiseeId,
          recipientEmail: targetEmail,
          recipientName: mainDetails.mainContact || mainDetails.tradingEntity,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: 'Deed Email Sent!',
          description: `Deed of Variation email link sent to ${targetEmail}.`,
        });
        if (json.dateSent) {
          setDeedOfVariation((prev) => ({
            ...prev,
            status: prev.status === 'not_started' ? 'sent' : prev.status,
            dateSent: json.dateSent,
            sentAt: json.dateSent,
            sentToEmail: targetEmail,
          }));
          setStep2Status('In Progress');
        }
        setDeedEmailDialogOpen(false);
      } else {
        toast({
          title: 'Failed to Send Email',
          description: json.message || 'Error sending email.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'An error occurred while sending email.',
        variant: 'destructive',
      });
    } finally {
      setSendingEmail(false);
    }
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
            territoryName: presalesDetails.territoryName || mainDetails.tradingEntity || mainDetails.franchiseeName || '',
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
        setStep4Status('In Progress');
        setImEmailDialogOpen(false);
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
    };
    reader.readAsDataURL(file);
  };

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

  const handleDeedSaved = (updatedDeed: PresaleDeedOfVariation) => {
    setDeedOfVariation(updatedDeed);
    handleSave(updatedDeed);
  };

  const copyPublicLink = () => {
    const token = encodePresaleId(franchiseeId);
    const url = `${window.location.origin}/deed-of-variation/${token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Public Deed Link Copied!',
      description: 'Encrypted public signing link copied to clipboard. You can send this link to the franchisee or signer.',
    });
  };

  const getStatusBadge = (s: StepStatus) => {
    switch (s) {
      case 'Completed':
        return <Badge className="bg-emerald-600 text-white text-[10px]">Completed</Badge>;
      case 'In Progress':
        return <Badge className="bg-[#095c7b] text-white text-[10px]">In Progress</Badge>;
      case 'Pending Review':
        return <Badge className="bg-purple-600 text-white text-[10px]">Pending Review</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-300">Not Started</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 w-full">
      {/* Hidden dummy div for PlacesService initialization */}
      <div ref={dummyDivRef} className="hidden" />

      <div className="w-full space-y-6">
        {/* Top Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="gap-2 border-slate-300 text-slate-700 bg-white hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="text-xs text-slate-500">
              <Link href="/admin/franchisees/directory" className="hover:underline text-slate-700 font-medium">
                Franchisees Directory
              </Link>{' '}
              / <span className="text-slate-900 font-bold">Presale Process</span>
            </div>
          </div>

          <Badge variant="outline" className="border-slate-300 bg-white text-slate-800 font-semibold px-3 py-1 text-xs w-fit">
            Overall Stage: {status}
          </Badge>
        </div>

        {/* Page Main Header Banner */}
        <div className="bg-[#095c7b] text-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-3 text-white">
              <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-[#eaf143] shrink-0" />
              <span>Mark Territory For Sale - Presales Process</span>
            </h1>
            <p className="text-xs text-slate-200 mt-1">
              Territory: <strong className="text-white font-semibold">{mainDetails.tradingEntity || franchiseeId}</strong>
            </p>
          </div>

          <Button
            onClick={() => handleSave()}
            disabled={saving}
            className="bg-[#eaf143] hover:bg-[#d6dc3d] text-slate-900 font-bold text-xs gap-2 shrink-0 w-full sm:w-auto"
          >
            {saving ? <Loader className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            Save Presale Process
          </Button>
        </div>

        {loading ? (
          <div className="py-24 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <Loader className="mx-auto text-[#095c7b]" />
            <p className="text-sm text-slate-500 font-medium">Loading territory presale details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stepper Header Navigation with Stage Status Badges & Navigation Locks */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => handleStepClick(1)}
                className={`flex flex-col items-center justify-center py-3 px-3 rounded-xl text-xs font-semibold transition-all ${
                  activeStep === 1
                    ? 'bg-[#095c7b] text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 flex-wrap justify-center">
                  <span className="font-bold text-sm">STEP 1</span>
                  {getStatusBadge(step1Status)}
                </div>
                <span>Main Details</span>
              </button>

              <button
                type="button"
                onClick={() => handleStepClick(2)}
                className={`flex flex-col items-center justify-center py-3 px-3 rounded-xl text-xs font-semibold transition-all ${
                  activeStep === 2
                    ? 'bg-[#095c7b] text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 flex-wrap justify-center">
                  <span className="font-bold text-sm">STEP 2</span>
                  {getStatusBadge(step2Status)}
                </div>
                <span>Deed of Variation</span>
              </button>

              <button
                type="button"
                onClick={() => handleStepClick(3)}
                className={`flex flex-col items-center justify-center py-3 px-3 rounded-xl text-xs font-semibold transition-all ${
                  activeStep === 3
                    ? 'bg-[#095c7b] text-white shadow-md'
                    : !isDeedSigned
                    ? 'text-slate-400 bg-slate-50 cursor-not-allowed opacity-80'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 flex-wrap justify-center">
                  <span className="font-bold text-sm flex items-center gap-1">
                    STEP 3 {!isDeedSigned && <Lock className="h-3 w-3 text-amber-500" />}
                  </span>
                  {getStatusBadge(step3Status)}
                </div>
                <span>Signed Status</span>
              </button>

              <button
                type="button"
                onClick={() => handleStepClick(4)}
                className={`flex flex-col items-center justify-center py-3 px-3 rounded-xl text-xs font-semibold transition-all ${
                  activeStep === 4
                    ? 'bg-[#095c7b] text-white shadow-md'
                    : !isDeedSigned || !isAdminOrOps
                    ? 'text-slate-400 bg-slate-50 cursor-not-allowed opacity-80'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 flex-wrap justify-center">
                  <span className="font-bold text-sm flex items-center gap-1">
                    STEP 4 {(!isDeedSigned || !isAdminOrOps) && <Lock className="h-3 w-3 text-amber-500" />}
                  </span>
                  {getStatusBadge(step4Status)}
                </div>
                <span>Presales Details</span>
              </button>
            </div>

            {/* STEP 1: MAIN DETAILS (Separated Address & Business Dates) */}
            {activeStep === 1 && (
              <div className="space-y-4">
                <div className="bg-[#095c7b] text-white py-2.5 px-4 sm:px-6 text-xs font-bold tracking-widest uppercase rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span>MAIN DETAILS</span>
                  <span className="text-[11px] font-normal text-slate-200">Step Status: {step1Status}</span>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* FRANCHISEE NAME */}
                    <div className="flex flex-col sm:flex-row sm:items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-slate-300 whitespace-nowrap w-full sm:w-auto sm:min-w-[170px]">
                        FRANCHISEE NAME *
                      </span>
                      <Input
                        value={(mainDetails.franchiseeName && mainDetails.franchiseeName !== franchiseeId) ? mainDetails.franchiseeName : ''}
                        onChange={(e) => setMainDetails({ ...mainDetails, franchiseeName: e.target.value })}
                        className="border-0 focus-visible:ring-0 text-xs font-medium h-10 sm:h-11 flex-1 w-full"
                        placeholder=""
                      />
                    </div>

                    {/* TRADING ENTITY */}
                    <div className="flex flex-col sm:flex-row sm:items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-slate-300 whitespace-nowrap w-full sm:w-auto sm:min-w-[170px]">
                        TRADING ENTITY *
                      </span>
                      <Input
                        value={mainDetails.tradingEntity || ''}
                        onChange={(e) => setMainDetails({ ...mainDetails, tradingEntity: e.target.value })}
                        className="border-0 focus-visible:ring-0 text-xs font-medium h-10 sm:h-11 flex-1 w-full"
                        placeholder=""
                      />
                    </div>

                    {/* MAIN CONTACT */}
                    <div className="flex flex-col sm:flex-row sm:items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-slate-300 whitespace-nowrap w-full sm:w-auto sm:min-w-[170px]">
                        MAIN CONTACT *
                      </span>
                      <Input
                        value={mainDetails.mainContact || ''}
                        onChange={(e) => setMainDetails({ ...mainDetails, mainContact: e.target.value })}
                        className="border-0 focus-visible:ring-0 text-xs font-medium h-10 sm:h-11 flex-1 w-full"
                        placeholder=""
                      />
                    </div>

                    {/* MOBILE NUMBER */}
                    <div className="flex flex-col sm:flex-row sm:items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-slate-300 whitespace-nowrap w-full sm:w-auto sm:min-w-[170px]">
                        MOBILE NUMBER *
                      </span>
                      <Input
                        value={mainDetails.mobileNumber || ''}
                        onChange={(e) => setMainDetails({ ...mainDetails, mobileNumber: e.target.value })}
                        className="border-0 focus-visible:ring-0 text-xs font-medium h-10 sm:h-11 flex-1 w-full"
                        placeholder=""
                      />
                    </div>

                    {/* EMAIL */}
                    <div className="flex flex-col sm:flex-row sm:items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-slate-300 whitespace-nowrap w-full sm:w-auto sm:min-w-[170px]">
                        EMAIL *
                      </span>
                      <Input
                        type="email"
                        value={mainDetails.email || ''}
                        onChange={(e) => setMainDetails({ ...mainDetails, email: e.target.value })}
                        className="border-0 focus-visible:ring-0 text-xs font-medium h-10 sm:h-11 flex-1 w-full"
                        placeholder=""
                      />
                    </div>

                    {/* PERSONAL EMAIL */}
                    <div className="flex flex-col sm:flex-row sm:items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-slate-300 whitespace-nowrap w-full sm:w-auto sm:min-w-[170px]">
                        PERSONAL EMAIL
                      </span>
                      <Input
                        type="email"
                        value={mainDetails.personalEmail || ''}
                        onChange={(e) => setMainDetails({ ...mainDetails, personalEmail: e.target.value })}
                        className="border-0 focus-visible:ring-0 text-xs font-medium h-10 sm:h-11 flex-1 w-full"
                        placeholder=""
                      />
                    </div>

                    {/* ABN WITH VERIFY BUTTON */}
                    <div className="flex flex-col sm:flex-row sm:items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-slate-300 whitespace-nowrap w-full sm:w-auto sm:min-w-[170px]">
                        ABN *
                      </span>
                      <div className="flex items-center flex-1 w-full pr-2">
                        <Input
                          value={mainDetails.abn || ''}
                          onChange={(e) => setMainDetails({ ...mainDetails, abn: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium h-10 sm:h-11 flex-1 w-full"
                          placeholder=""
                        />
                        <Button
                          type="button"
                          onClick={handleVerifyABN}
                          disabled={verifyingABN || !mainDetails.abn}
                          className="bg-[#095c7b] hover:bg-[#074760] text-white text-[11px] h-8 px-3 rounded-md shrink-0 gap-1.5 font-semibold"
                        >
                          {verifyingABN ? <Loader className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                          Verify ABN
                        </Button>
                      </div>
                    </div>

                    {/* DATE LISTED FOR SALE */}
                    <div className="flex flex-col sm:flex-row sm:items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-slate-300 whitespace-nowrap w-full sm:w-auto sm:min-w-[170px]">
                        DATE LISTED FOR SALE *
                      </span>
                      <Input
                        type="date"
                        value={mainDetails.dateListedForSale}
                        onChange={(e) => setMainDetails({ ...mainDetails, dateListedForSale: e.target.value })}
                        className="border-0 focus-visible:ring-0 text-xs font-medium h-10 sm:h-11 flex-1 w-full"
                      />
                    </div>

                    {/* DATE BUSINESS STARTED */}
                    <div className="flex flex-col sm:flex-row sm:items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-slate-300 whitespace-nowrap w-full sm:w-auto sm:min-w-[170px]">
                        BUSINESS STARTED *
                      </span>
                      <Input
                        type="date"
                        value={mainDetails.dateBusinessStarted || ''}
                        onChange={(e) => handleDateBusinessStartedChange(e.target.value)}
                        className="border-0 focus-visible:ring-0 text-xs font-medium h-10 sm:h-11 flex-1 w-full"
                      />
                    </div>

                    {/* EXPIRY DATE (AUTO-CALCULATED 5 YRS) */}
                    <div className="flex flex-col sm:flex-row sm:items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-slate-300 whitespace-nowrap w-full sm:w-auto sm:min-w-[170px] flex items-center gap-1">
                        EXPIRY DATE (5 YRS) *
                      </span>
                      <Input
                        type="date"
                        value={mainDetails.expiryDate || ''}
                        onChange={(e) => setMainDetails({ ...mainDetails, expiryDate: e.target.value })}
                        className="border-0 focus-visible:ring-0 text-xs font-medium h-10 sm:h-11 flex-1 w-full bg-slate-50"
                      />
                    </div>

                    {/* ULTIMATE EXPIRY DATE */}
                    <div className="flex flex-col sm:flex-row sm:items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-slate-300 whitespace-nowrap w-full sm:w-auto sm:min-w-[170px]">
                        ULTIMATE EXPIRY DATE
                      </span>
                      <Input
                        type="date"
                        value={mainDetails.ultimateExpiryDate || ''}
                        onChange={(e) => setMainDetails({ ...mainDetails, ultimateExpiryDate: e.target.value })}
                        className="border-0 focus-visible:ring-0 text-xs font-medium h-10 sm:h-11 flex-1 w-full"
                      />
                    </div>

                    {/* UNLIMITED TERM OFFER */}
                    <div className="flex flex-col sm:flex-row sm:items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-slate-300 whitespace-nowrap w-full sm:w-auto sm:min-w-[170px]">
                        UNLIMITED TERM OFFER
                      </span>
                      <Select
                        value={mainDetails.unlimitedTermOffer || 'No'}
                        onValueChange={(val) => setMainDetails({ ...mainDetails, unlimitedTermOffer: val })}
                      >
                        <SelectTrigger className="border-0 focus:ring-0 text-xs font-medium h-10 sm:h-11 flex-1 w-full">
                          <SelectValue placeholder="Select Option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* SEPARATED ADDRESS & GOOGLE AUTOCOMPLETE SECTION */}
                  <div className="pt-2 border-t border-slate-200 space-y-4">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#095c7b]" /> ADDRESS DETAILS (GOOGLE AUTOCOMPLETE)
                    </h4>

                    {/* STREET NO & NAME INPUT WITH GOOGLE DROPDOWN */}
                    <div className="relative">
                      <div className="flex flex-col sm:flex-row sm:items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-slate-300 whitespace-nowrap w-full sm:w-auto sm:min-w-[170px]">
                          STREET NO & NAME *
                        </span>
                        <Input
                          value={mainDetails.streetNumberAndName || ''}
                          onChange={(e) => handleStreetInputChange(e.target.value)}
                          onFocus={() => addressPredictions.length > 0 && setShowPredictions(true)}
                          className="border-0 focus-visible:ring-0 text-xs font-medium h-10 sm:h-11 flex-1 w-full"
                          placeholder=""
                        />
                      </div>

                      {/* Google Predictions Dropdown */}
                      {showPredictions && addressPredictions.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                          {addressPredictions.map((pred) => (
                            <button
                              key={pred.place_id}
                              type="button"
                              onClick={() => handleSelectPrediction(pred)}
                              className="w-full text-left px-4 py-2.5 text-xs text-slate-800 hover:bg-[#095c7b]/10 border-b border-slate-100 last:border-0 flex items-center gap-2 transition-colors"
                            >
                              <MapPin className="h-3.5 w-3.5 text-[#095c7b] shrink-0" />
                              <span>{pred.description}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* SUBURB */}
                      <div className="flex flex-col sm:flex-row sm:items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-slate-300 whitespace-nowrap sm:min-w-[100px]">
                          SUBURB *
                        </span>
                        <Input
                          value={mainDetails.suburb || ''}
                          onChange={(e) => setMainDetails({ ...mainDetails, suburb: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium h-10 sm:h-11 flex-1 w-full"
                          placeholder=""
                        />
                      </div>

                      {/* STATE */}
                      <div className="flex flex-col sm:flex-row sm:items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-slate-300 whitespace-nowrap sm:min-w-[80px]">
                          STATE *
                        </span>
                        <Input
                          value={mainDetails.state || ''}
                          onChange={(e) => setMainDetails({ ...mainDetails, state: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium h-10 sm:h-11 flex-1 w-full"
                          placeholder=""
                        />
                      </div>

                      {/* POSTCODE */}
                      <div className="flex flex-col sm:flex-row sm:items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase px-3 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-slate-300 whitespace-nowrap sm:min-w-[100px]">
                          POSTCODE *
                        </span>
                        <Input
                          value={mainDetails.postcode || ''}
                          onChange={(e) => setMainDetails({ ...mainDetails, postcode: e.target.value })}
                          className="border-0 focus-visible:ring-0 text-xs font-medium h-10 sm:h-11 flex-1 w-full"
                          placeholder=""
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: DEED OF VARIATION (Email Link & Dual Signatures) */}
            {activeStep === 2 && (
              <div className="space-y-4">
                <div className="bg-[#095c7b] text-white py-2.5 px-6 text-xs font-bold tracking-widest uppercase rounded-lg shadow-sm flex items-center justify-between">
                  <span>DEED OF VARIATION - EXIT PROGRAM ASSISTANCE OFFER</span>
                  <span className="text-[11px] font-normal text-slate-200">Step Status: {step2Status}</span>
                </div>

                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  {/* Sent / Signed Dates Info Banner */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1 text-xs">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-[#095c7b]" /> Email Notification Status:
                      </div>
                      <p className="text-slate-600">
                        Date Email Sent:{' '}
                        <strong className="text-slate-900">
                          {deedOfVariation.dateSent
                            ? new Date(deedOfVariation.dateSent).toLocaleString('en-AU')
                            : 'Not Sent Yet'}
                        </strong>
                      </p>
                      {deedOfVariation.sentToEmail && (
                        <p className="text-[11px] text-slate-500">Sent to: {deedOfVariation.sentToEmail}</p>
                      )}
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1 text-xs">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Digital Signature Status:
                      </div>
                      <p className="text-slate-600">
                        Date Signed:{' '}
                        <strong className="text-slate-900">
                          {deedOfVariation.signedAt
                            ? new Date(deedOfVariation.signedAt).toLocaleString('en-AU')
                            : 'Not Signed Yet'}
                        </strong>
                      </p>
                      {deedOfVariation.signerName && (
                        <p className="text-[11px] text-slate-500">Signer: {deedOfVariation.signerName}</p>
                      )}
                    </div>
                  </div>

                  {/* Public Sign Link Card */}
                  <div className="bg-blue-50/70 border border-blue-200 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-blue-900 text-sm flex items-center gap-2">
                        <PenTool className="h-4 w-4 text-[#095c7b]" /> Public-Facing Digital Signing Link
                      </h4>
                      <p className="text-xs text-blue-700">
                        Send the email template to the franchisee or copy the public link directly for them to execute online.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        onClick={() => {
                          const defaultTo = Array.from(new Set([mainDetails.email, mainDetails.personalEmail].map((e) => (e || '').trim()).filter(Boolean))).join(', ');
                          setDeedRecipientEmail(defaultTo);
                          setDeedEmailDialogOpen(true);
                        }}
                        disabled={sendingEmail}
                        className="bg-[#095c7b] hover:bg-[#07465e] text-white text-xs gap-1.5 font-semibold"
                      >
                        {sendingEmail ? <Loader className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                        Send Deed Email
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={copyPublicLink}
                        className="text-xs gap-1.5 border-blue-300 text-blue-800 hover:bg-blue-100 bg-white"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy Link
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.open(`/deed-of-variation/${encodePresaleId(franchiseeId)}`, '_blank')}
                        className="text-xs gap-1.5 border-slate-300 text-slate-700 bg-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Open Link
                      </Button>
                    </div>
                  </div>

                  {/* Deed Execution Cards */}
                  <div className="border border-slate-200 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-[#095c7b]" /> Deed Execution Summary (Dual Signatures)
                      </h4>
                      {isDeedSigned ? (
                        <Badge className="bg-emerald-600 text-white gap-1 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Signed & Executed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-xs">
                          Pending Execution
                        </Badge>
                      )}
                    </div>

                    {/* Signature Preview Boxes matching screenshot */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="space-y-2 bg-white p-4 rounded-lg border border-slate-200 text-xs">
                        <p className="font-bold text-slate-900 leading-tight">
                          Executed by Mail Plus Pty Ltd ACN 609 801 195 in accordance with section 127(1) of the Corporations Act 2001 (Cth):
                        </p>
                        <div className="border-b border-dashed border-slate-400 pt-6 pb-1 text-slate-500 italic text-[11px]">
                          Signature of sole director and sole company secretary
                        </div>
                        <div className="font-bold text-slate-900 pt-1">Chris Burgess</div>
                        <div className="text-[10px] text-slate-400">Name (please print)</div>
                      </div>

                      <div className="space-y-2 bg-white p-4 rounded-lg border border-slate-200 text-xs">
                        <p className="font-bold text-slate-900 leading-tight">
                          Executed by {mainDetails.tradingEntity || 'Franchisee'} in accordance with section 127(1) of the Corporations Act 2001 (Cth):
                        </p>
                        <div className="border-b border-dashed border-slate-400 pt-6 pb-1 text-slate-500 italic text-[11px]">
                          {deedOfVariation.signatureDataUrl ? (
                            <img src={deedOfVariation.signatureDataUrl} alt="Signature" className="h-8 max-w-[150px] object-contain" />
                          ) : (
                            'Signature of sole trader / franchisee'
                          )}
                        </div>
                        <div className="font-bold text-slate-900 pt-1">{deedOfVariation.signerName || mainDetails.mainContact || 'Franchisee Name'}</div>
                        <div className="text-[10px] text-slate-400">Name (please print)</div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => setDeedDialogOpen(true)}
                      className="bg-[#095c7b] hover:bg-[#07465e] text-white text-xs font-bold gap-2 w-full h-11"
                    >
                      <PenTool className="h-4 w-4" />
                      {isDeedSigned ? 'View / Re-sign Deed of Variation' : 'Complete Online Signing Modal'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: SIGNED STATUS */}
            {activeStep === 3 && (
              <div className="space-y-4">
                <div className="bg-[#095c7b] text-white py-2.5 px-6 text-xs font-bold tracking-widest uppercase rounded-lg shadow-sm flex items-center justify-between">
                  <span>SIGNED STATUS VERIFICATION</span>
                  <span className="text-[11px] font-normal text-slate-200">Step Status: {step3Status}</span>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
                      <div>
                        <h4 className="font-bold text-emerald-900 text-sm">Deed of Variation Executed Successfully</h4>
                        <p className="text-xs text-emerald-700">
                          Verification is complete. You may now view and finalize Step 4 Presales details.
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => handleStepClick(4)}
                      className="bg-[#095c7b] hover:bg-[#07465e] text-white text-xs font-bold gap-1.5"
                    >
                      Proceed to Step 4 Presales Details &rarr;
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: FRANCHISEE IM & TERRITORY MAP (Operations & Franchisee E-Sign Workflow) */}
            {activeStep === 4 && (
              <div className="space-y-4">
                <div className="bg-[#095c7b] text-white py-2.5 px-6 text-xs font-bold tracking-widest uppercase rounded-lg shadow-sm flex items-center justify-between">
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
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 flex-wrap">
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

                <div className="bg-emerald-50/60 p-4 sm:p-6 rounded-2xl border border-emerald-200/60 space-y-4">
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
                        value={presalesDetails.territoryName || mainDetails.tradingEntity || mainDetails.franchiseeName || ''}
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

            {/* Bottom Action Footer Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (activeStep > 1) handleStepClick((activeStep - 1) as any);
                }}
                disabled={activeStep === 1}
                className="text-xs gap-1.5 border-slate-300 text-slate-700"
              >
                Previous Step
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={saving}
                  className="bg-[#eaf143] hover:bg-[#d6dc3d] text-slate-900 font-bold text-xs gap-1.5"
                >
                  {saving ? <Loader className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                  Save Draft
                </Button>

                {activeStep < 4 && (
                  <Button
                    type="button"
                    onClick={() => {
                      const next = (activeStep + 1) as any;
                      handleStepClick(next);
                    }}
                    className="bg-[#095c7b] hover:bg-[#07465e] text-white font-bold text-xs gap-1.5"
                  >
                    Next Step &rarr;
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Deed Signing Dialog */}
      <DeedOfVariationDialog
        open={deedDialogOpen}
        onOpenChange={setDeedDialogOpen}
        mainDetails={mainDetails}
        deedOfVariation={deedOfVariation}
        onSaveDeed={handleDeedSaved}
      />

      {/* DEED EMAIL PREVIEW & DISPATCH DIALOG */}
      <Dialog open={deedEmailDialogOpen} onOpenChange={setDeedEmailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#095c7b]" />
              Preview Deed of Variation Email
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Please review the exact email content, sender, and recipients below before confirming email dispatch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
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
                  value={deedRecipientEmail}
                  onChange={(e) => setDeedRecipientEmail(e.target.value)}
                  placeholder="franchisee@example.com"
                  className="text-xs font-medium bg-white max-w-sm h-8"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500 w-24">Subject:</span>
                <span className="font-semibold text-[#095c7b]">
                  Deed of Variation - Exit Program Assistance Offer ({mainDetails.tradingEntity || franchiseeId})
                </span>
              </div>
            </div>

            {/* LIVE EMAIL CONTENT PREVIEW BOX */}
            <div className="space-y-1.5">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Email Body HTML Content Preview
              </span>
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
                      Please find below the digital link to review and execute the <strong>Deed of Variation - Exit Program Assistance Offer</strong> for your territory (<strong>{mainDetails.tradingEntity || franchiseeId}</strong>).
                    </p>
                    <p>
                      Executing this Deed of Variation allows MailPlus to officially process your territory presales valuation and list your territory under the Exit Program.
                    </p>
                    <div className="py-2 text-center">
                      <span className="inline-block bg-[#095c7b] text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm">
                        Review &amp; Sign Deed of Variation &rarr;
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Link URL: https://prospectplus.com.au/deed-of-variation/{encodePresaleId(franchiseeId)}
                    </p>
                    <div className="pt-2 border-t text-xs">
                      <p className="font-bold text-slate-800">MailPlus Operations &amp; Presales Team</p>
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
              onClick={() => setDeedEmailDialogOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendDeedEmail}
              disabled={sendingEmail}
              className="bg-[#095c7b] hover:bg-[#07465e] text-white text-xs font-bold gap-2"
            >
              {sendingEmail ? <Loader className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              Confirm &amp; Send Deed Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FRANCHISEE IM EMAIL PREVIEW & DISPATCH DIALOG */}
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
                  Action Required: Confirm &amp; Sign Franchisee IM Schedule ({presalesDetails.territoryName || mainDetails.tradingEntity || franchiseeId})
                </span>
              </div>
            </div>

            {/* LIVE EMAIL CONTENT PREVIEW BOX */}
            <div className="space-y-1.5">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Email Body HTML Content Preview
              </span>
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
                      The Operations team has prepared the <strong>Franchisee Information Memorandum (IM) Schedule &amp; Territory Profile</strong> for your territory (<strong>{presalesDetails.territoryName || mainDetails.tradingEntity || franchiseeId}</strong>).
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
    </div>
  );
}
