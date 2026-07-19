'use client';

import React, { useState, useEffect } from 'react';
import { collection, doc, getDocs, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Info, X, Trash2, MapPin } from 'lucide-react';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { sendLpoConversionToNetSuite } from '@/services/netsuite';

// Haversine formula for calculating distance in kilometers
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface LpoConversionWizardProps {
  lead: any;
  onSuccess: (updatedLead: any) => void;
}

export function LpoConversionWizard({ lead, onSuccess }: LpoConversionWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(lead.conversionStep || 1);
  const [loading, setLoading] = useState(false);

  // Step 1: LPO Lead info & Partner location linking
  const [lpoName, setLpoName] = useState(lead.lpoName || '');
  const [lpoOwnerName, setLpoOwnerName] = useState(lead.lpoOwnerName || '');
  const [email, setEmail] = useState(lead.email || '');
  const [phone, setPhone] = useState(lead.phone || '');
  const [address1, setAddress1] = useState(lead.address1 || '');
  const [address2, setAddress2] = useState(lead.address2 || '');
  const [city, setCity] = useState(lead.city || '');
  const [state, setState] = useState(lead.state || '');
  const [postcode, setPostcode] = useState(lead.postcode || '');
  const [lat, setLat] = useState<number | null>(lead.lat ? parseFloat(lead.lat) : null);
  const [lng, setLng] = useState<number | null>(lead.lng ? parseFloat(lead.lng) : null);

  const [partnerLocations, setPartnerLocations] = useState<any[]>([]);
  const [selectedPartnerLocation, setSelectedPartnerLocation] = useState<any>(null);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Step 2: Onboarding Status
  const [inductedByKerry, setInductedByKerry] = useState<string>(lead.inductedByKerry || 'Yes');
  const [ampoRate, setAmpoRate] = useState<string>(lead.ampoRate || '10');
  const [pmpoRate, setPmpoRate] = useState<string>(lead.pmpoRate || '10');
  const [packageRate, setPackageRate] = useState<string>(lead.packageRate || '20');
  const [additionalBagRate, setAdditionalBagRate] = useState<string>(lead.additionalBagRate || '3.5');

  // Step 3: Operations Overview
  const [operatesCollectionDelivery, setOperatesCollectionDelivery] = useState<string>(lead.operatesCollectionDelivery || 'Yes');
  const [lastDailySweepTime, setLastDailySweepTime] = useState<string>(lead.lastDailySweepTime || '02:00 pm');
  const [franchiseeAccess, setFranchiseeAccess] = useState<string>(lead.franchiseeAccess || 'Car Park');

  // Step 4: Franchisee mapping
  const [franchisees, setFranchisees] = useState<any[]>([]);
  const [selectedFranchiseeIds, setSelectedFranchiseeIds] = useState<string[]>([]);
  const [linkedFranchisees, setLinkedFranchisees] = useState<any[]>([]);
  const [suburbViewFranchisee, setSuburbViewFranchisee] = useState<any | null>(null);

  // Load Partner Locations & Franchisees
  useEffect(() => {
    async function fetchData() {
      setLoadingLocations(true);
      try {
        // Fetch all partner locations
        const locationsSnap = await getDocs(collection(firestore, 'partner_locations'));
        const locs: any[] = [];
        locationsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.locationType === 'AusPost' || data.type === 'AusPost') {
            locs.push({ id: docSnap.id, ...data });
          }
        });

        // Compute distances if lead has coords
        const sortedLocs = locs.map((loc) => {
          let distance = 99999;
          const locLat = parseFloat(loc.lat || loc.latitude);
          const locLng = parseFloat(loc.lng || loc.longitude);
          if (lat && lng && !isNaN(locLat) && !isNaN(locLng)) {
            distance = calculateDistance(lat, lng, locLat, locLng);
          }
          return { ...loc, distance };
        });

        // Sort by distance (closest first), fallback to postcode match, then suburb match
        sortedLocs.sort((a, b) => {
          if (a.distance !== b.distance) return a.distance - b.distance;
          const postcodeA = a.postCode || a.postcode || '';
          const postcodeB = b.postCode || b.postcode || '';
          if (postcodeA === postcode && postcodeB !== postcode) return -1;
          if (postcodeB === postcode && postcodeA !== postcode) return 1;
          const suburbA = (a.suburb || '').toLowerCase();
          const suburbB = (b.suburb || '').toLowerCase();
          const leadSuburb = city.toLowerCase();
          if (suburbA === leadSuburb && suburbB !== leadSuburb) return -1;
          if (suburbB === leadSuburb && suburbA !== leadSuburb) return 1;
          return 0;
        });

        setPartnerLocations(sortedLocs);

        // Preselect linked location if exists
        if (lead.linkedPartnerLocationId) {
          const preselected = sortedLocs.find(l => l.id === lead.linkedPartnerLocationId);
          if (preselected) {
            setSelectedPartnerLocation(preselected);
          }
        } else if (sortedLocs.length > 0 && sortedLocs[0].distance < 50) {
          // Auto select if very close
          setSelectedPartnerLocation(sortedLocs[0]);
        }

        // Fetch Franchisees
        const franchiseesSnap = await getDocs(collection(firestore, 'franchisees'));
        const fList: any[] = [];
        franchiseesSnap.forEach((docSnap) => {
          const data = docSnap.data();
          fList.push({ id: docSnap.id, ...data });
        });
        // Sort alphabetically by name / main contact
        fList.sort((a, b) => {
          const nameA = (a.name || a.mainContact || '').toLowerCase();
          const nameB = (b.name || b.mainContact || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setFranchisees(fList);

        // Prepopulate linked franchisees
        if (lead.linkedFranchisees && Array.isArray(lead.linkedFranchisees)) {
          setLinkedFranchisees(lead.linkedFranchisees);
          setSelectedFranchiseeIds(lead.linkedFranchisees.map((f: any) => f.franchiseeId));
        }
      } catch (err) {
        console.error('Error fetching conversion data:', err);
      } finally {
        setLoadingLocations(false);
      }
    }
    fetchData();
  }, [lat, lng, postcode, city, lead]);

  const handleLinkFranchisees = () => {
    const updated = selectedFranchiseeIds.map((id) => {
      const existing = linkedFranchisees.find((lf) => lf.franchiseeId === id);
      if (existing) return existing;
      const original = franchisees.find((f) => f.id === id);
      return {
        franchiseeId: id,
        name: original?.name || original?.mainContact || 'Unknown Franchisee',
        introducedToProgram: 'Yes',
        agreedToCommercials: 'Yes',
        canReturnBeforeCutoff: 'Yes',
        faceToFaceIntroHeld: 'Yes',
        ausPostSuburbsJson: original?.ausPostSuburbsJson || [],
      };
    });
    setLinkedFranchisees(updated);
  };

  const handleUpdateFranchiseeField = (franchiseeId: string, field: string, value: string) => {
    setLinkedFranchisees(prev =>
      prev.map(f => f.franchiseeId === franchiseeId ? { ...f, [field]: value } : f)
    );
  };

  const handleDeleteLinkedFranchisee = (franchiseeId: string) => {
    setLinkedFranchisees(prev => prev.filter(f => f.franchiseeId !== franchiseeId));
    setSelectedFranchiseeIds(prev => prev.filter(id => id !== franchiseeId));
  };

  const handleNextStep = async () => {
    setLoading(true);
    try {
      const docRef = doc(firestore, 'lpo_leads', lead.id);
      if (step === 1) {
        const step1Data = {
          lpoName,
          lpoOwnerName,
          email,
          phone,
          address1,
          address2,
          city,
          state,
          postcode,
          linkedPartnerLocationId: selectedPartnerLocation?.id || null,
          linkedPartnerLocationName: selectedPartnerLocation?.name || null,
          status: 'Linked to Partner Location',
          conversionStep: 2,
          updatedAt: serverTimestamp()
        };
        await updateDoc(docRef, step1Data);
        onSuccess({ id: lead.id, ...step1Data });
      } else if (step === 2) {
        const step2Data = {
          inductedByKerry,
          ampoRate: parseFloat(ampoRate) || 0,
          pmpoRate: parseFloat(pmpoRate) || 0,
          packageRate: parseFloat(packageRate) || 0,
          additionalBagRate: parseFloat(additionalBagRate) || 0,
          status: 'Induction',
          conversionStep: 3,
          updatedAt: serverTimestamp()
        };
        await updateDoc(docRef, step2Data);
        onSuccess({ id: lead.id, ...step2Data });
      } else if (step === 3) {
        const step3Data = {
          operatesCollectionDelivery,
          lastDailySweepTime,
          franchiseeAccess,
          status: 'Operations Setup',
          conversionStep: 4,
          updatedAt: serverTimestamp()
        };
        await updateDoc(docRef, step3Data);
        onSuccess({ id: lead.id, ...step3Data });
      }
      setStep((s: number) => s + 1);
    } catch (err) {
      console.error('Error saving step progress:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save progress for this step.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackStep = async () => {
    if (step === 1) return;
    setLoading(true);
    try {
      const docRef = doc(firestore, 'lpo_leads', lead.id);
      const prevStep = step - 1;
      await updateDoc(docRef, {
        conversionStep: prevStep,
        updatedAt: serverTimestamp()
      });
      onSuccess({ id: lead.id, conversionStep: prevStep });
      setStep(prevStep);
    } catch (err) {
      console.error('Error going back step:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save progress when going back.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const conversionData = {
        lpoName,
        lpoOwnerName,
        email,
        phone,
        address1,
        address2,
        city,
        state,
        postcode,
        linkedPartnerLocationId: selectedPartnerLocation?.id || null,
        linkedPartnerLocationName: selectedPartnerLocation?.name || null,
        inductedByKerry,
        ampoRate: parseFloat(ampoRate) || 0,
        pmpoRate: parseFloat(pmpoRate) || 0,
        packageRate: parseFloat(packageRate) || 0,
        additionalBagRate: parseFloat(additionalBagRate) || 0,
        operatesCollectionDelivery,
        lastDailySweepTime,
        franchiseeAccess,
        linkedFranchisees: linkedFranchisees.map(f => ({
          franchiseeId: f.franchiseeId,
          name: f.name,
          introducedToProgram: f.introducedToProgram,
          agreedToCommercials: f.agreedToCommercials,
          canReturnBeforeCutoff: f.canReturnBeforeCutoff,
          faceToFaceIntroHeld: f.faceToFaceIntroHeld
        })),
        isConverted: true,
        status: 'Franchisees Assigned', // Update status to Franchisees Assigned on conversion
        convertedAt: new Date().toISOString()
      };

      // 1. Update LPO Lead Document
      const docRef = doc(firestore, 'lpo_leads', lead.id);
      await updateDoc(docRef, conversionData);

      // 2. Add Activity Log
      await addDoc(collection(firestore, 'lpo_leads', lead.id, 'activity'), {
        type: 'StatusChange',
        notes: `LPO Lead converted. Linked to partner location ${selectedPartnerLocation?.name || 'none'} and status updated to 'Franchisees Assigned'.`,
        author: 'System User',
        createdAt: serverTimestamp()
      });

      // 3. Send payload to NetSuite Mock API
      await sendLpoConversionToNetSuite(lead.id, conversionData);

      toast({
        title: 'Conversion Saved',
        description: 'LPO lead has been successfully converted and synced.'
      });

      onSuccess({ id: lead.id, ...conversionData });
    } catch (err) {
      console.error('Error submitting LPO lead conversion:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save lead conversion details.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#f4f7f8] overflow-hidden shadow-sm rounded-2xl border border-slate-200/80">
      
      {/* Sage-green theme wrapping */}
      <div className="bg-[#eef6ed] p-6 border-b border-[#095c7b]/10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#095c7b] bg-[#095c7b]/10 px-3 py-1 rounded-full">
            Step {step} of 4
          </span>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-1.5">
            {step === 1 && 'LPO Information'}
            {step === 2 && 'Onboarding Status'}
            {step === 3 && 'Operations Overview'}
            {step === 4 && 'Franchisee Information & Readiness'}
            <Info className="h-4.5 w-4.5 text-[#095c7b] cursor-pointer" />
          </h2>
        </div>
      </div>

      <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          
          {/* STEP 1: LPO Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="space-y-2">
                  <Label htmlFor="lpoName" className="font-semibold text-slate-700">LPO Name *</Label>
                  <Input id="lpoName" value={lpoName} onChange={(e) => setLpoName(e.target.value)} className="focus-visible:ring-[#095c7b]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lpoOwner" className="font-semibold text-slate-700">LPO Owner Name *</Label>
                  <Input id="lpoOwner" value={lpoOwnerName} onChange={(e) => setLpoOwnerName(e.target.value)} className="focus-visible:ring-[#095c7b]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold text-slate-700">Contact Email *</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="focus-visible:ring-[#095c7b]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-semibold text-slate-700">Contact Phone *</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="focus-visible:ring-[#095c7b]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address1" className="font-semibold text-slate-700">Address line 1</Label>
                  <Input id="address1" value={address1} onChange={(e) => setAddress1(e.target.value)} className="focus-visible:ring-[#095c7b]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address2" className="font-semibold text-slate-700">Address line 2</Label>
                  <Input id="address2" value={address2} onChange={(e) => setAddress2(e.target.value)} className="focus-visible:ring-[#095c7b]" />
                </div>
                <div className="grid grid-cols-3 gap-2 md:col-span-2">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="font-semibold text-slate-700">Suburb *</Label>
                    <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="focus-visible:ring-[#095c7b]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="font-semibold text-slate-700">State *</Label>
                    <Input id="state" value={state} onChange={(e) => setState(e.target.value)} className="focus-visible:ring-[#095c7b]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcode" className="font-semibold text-slate-700">Postcode *</Label>
                    <Input id="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} className="focus-visible:ring-[#095c7b]" />
                  </div>
                </div>
              </div>

              {/* Close Partner Location Check */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-[#095c7b] flex items-center gap-1.5">
                    <MapPin className="h-5 w-5" />
                    AusPost Partner Locations
                  </h3>
                  {selectedPartnerLocation && (
                    <Badge className="bg-[#095c7b] text-white">
                      Linked: {selectedPartnerLocation.name}
                    </Badge>
                  )}
                </div>

                {selectedPartnerLocation ? (
                  <div className="p-4 rounded-lg border border-[#095c7b] bg-[#eef6ed] text-sm flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">
                        {selectedPartnerLocation.name}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          (ID: {selectedPartnerLocation.internalId || selectedPartnerLocation.id})
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedPartnerLocation.address1 ? `${selectedPartnerLocation.address1}, ` : ''}
                        {selectedPartnerLocation.suburb || selectedPartnerLocation.city}, {selectedPartnerLocation.state}{' '}
                        {selectedPartnerLocation.postCode || selectedPartnerLocation.postcode}
                      </p>
                    </div>
                    <div className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setSelectedPartnerLocation(null)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                      >
                        Unlink Location
                      </Button>
                    </div>
                  </div>
                ) : loadingLocations ? (
                  <div className="text-center py-6 text-slate-500 text-sm">Searching nearby AusPost locations...</div>
                ) : partnerLocations.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm">No AusPost partner locations found.</div>
                ) : (
                  <div className="max-h-[220px] overflow-y-auto space-y-2">
                    {partnerLocations.map((loc) => {
                      return (
                        <div
                          key={loc.id}
                          onClick={() => setSelectedPartnerLocation(loc)}
                          className="p-3 rounded-lg border text-sm transition-all cursor-pointer flex justify-between items-center border-slate-200 bg-slate-50 hover:bg-slate-100"
                        >
                          <div>
                            <p className="font-bold text-slate-800">{loc.name} <span className="text-xs font-normal text-slate-500">(ID: {loc.internalId || loc.id})</span></p>
                            <p className="text-xs text-slate-500 mt-0.5">{loc.address1 ? `${loc.address1}, ` : ''}{loc.suburb || loc.city}, {loc.state} {loc.postCode || loc.postcode}</p>
                          </div>
                          <div className="text-right">
                            {loc.distance < 99999 ? (
                              <p className="text-xs font-semibold text-slate-600 mb-1">{loc.distance.toFixed(1)} km away</p>
                            ) : (
                              <p className="text-xs text-slate-400 mb-1">Distance unknown</p>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-[#095c7b] text-[#095c7b] hover:bg-[#095c7b]/5"
                            >
                              Link Location
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Onboarding Status */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
                <Label className="font-semibold text-slate-700 block">Has the LPO been Inducted by Kerry? *</Label>
                <select
                  value={inductedByKerry}
                  onChange={(e) => setInductedByKerry(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              {/* Service Rates Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-[#095c7b] text-white hover:bg-[#095c7b]">
                    <TableRow className="hover:bg-[#095c7b]">
                      <TableHead className="font-bold text-white">SERVICE</TableHead>
                      <TableHead className="font-bold text-white">DESCRIPTION</TableHead>
                      <TableHead className="font-bold text-white w-[180px]">AGREED RATE ($ EXC. GST)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold text-slate-800">
                        Pick up and Delivery from PO <Badge variant="secondary" className="ml-2 bg-slate-100 text-[#095c7b]">AMPO</Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">One-Way: LPO Pickup & Site Delivery</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                          <span className="text-rose-500 font-bold">$*</span>
                          <input
                            type="text"
                            value={ampoRate}
                            onChange={(e) => setAmpoRate(e.target.value)}
                            className="bg-transparent border-none text-slate-800 w-full focus:outline-none font-bold"
                          />
                        </div>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-semibold text-slate-800">
                        Outgoing Mail Lodgement <Badge variant="secondary" className="ml-2 bg-slate-100 text-[#095c7b]">PMPO</Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">One-Way: Site Pickup & LPO Lodgement</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                          <span className="text-rose-500 font-bold">$*</span>
                          <input
                            type="text"
                            value={pmpoRate}
                            onChange={(e) => setPmpoRate(e.target.value)}
                            className="bg-transparent border-none text-slate-800 w-full focus:outline-none font-bold"
                          />
                        </div>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-semibold text-slate-800">
                        Package: Pickup from PO & Lodge Outgoing Mail <Badge variant="secondary" className="ml-2 bg-slate-100 text-[#095c7b]">Package: AMPO & PMPO</Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">Round Trip: Site ↔ LPO Pickup & Delivery</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                          <span className="text-rose-500 font-bold">$*</span>
                          <input
                            type="text"
                            value={packageRate}
                            onChange={(e) => setPackageRate(e.target.value)}
                            className="bg-transparent border-none text-slate-800 w-full focus:outline-none font-bold"
                          />
                        </div>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-semibold text-slate-800">
                        Additional LPO Bag
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">—</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                          <span className="text-rose-500 font-bold">$*</span>
                          <input
                            type="text"
                            value={additionalBagRate}
                            onChange={(e) => setAdditionalBagRate(e.target.value)}
                            className="bg-transparent border-none text-slate-800 w-full focus:outline-none font-bold"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <p className="text-xs text-slate-500 italic mt-2">
                Upon submission, the Service Commencement Form (SCF) will be emailed to the LPO for their review and acceptance of the Terms & Conditions. The service rates cannot be changed once the page is submitted.
              </p>
            </div>
          )}

          {/* STEP 3: Operations Overview */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">Does the LPO currently operate it's own collection and delivery service? *</Label>
                  <select
                    value={operatesCollectionDelivery}
                    onChange={(e) => setOperatesCollectionDelivery(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sweepTime" className="font-semibold text-slate-700">Last Daily Sweep Time for Red Van *</Label>
                    <Input id="sweepTime" value={lastDailySweepTime} onChange={(e) => setLastDailySweepTime(e.target.value)} placeholder="02:00 pm" className="focus-visible:ring-[#095c7b]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="access" className="font-semibold text-slate-700">What is the access for the Franchisee?</Label>
                    <Input id="access" value={franchiseeAccess} onChange={(e) => setFranchiseeAccess(e.target.value)} placeholder="Car Park" className="focus-visible:ring-[#095c7b]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Franchisee Information & Readiness */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Franchisee Link Form */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">Select MailPlus Franchisees *</Label>
                  <MultiSelectCombobox
                    options={franchisees.map(f => ({ value: f.id, label: f.name || f.mainContact || 'Unknown' }))}
                    selected={selectedFranchiseeIds}
                    onSelectedChange={(val) => {
                      setSelectedFranchiseeIds(val);
                    }}
                    placeholder="Link franchisee profiles..."
                  />
                </div>
                <Button onClick={handleLinkFranchisees} className="bg-[#095c7b] hover:bg-[#053647] text-white w-full font-bold">
                  LINK FRANCHISEES
                </Button>
              </div>

              {/* Franchisees Table */}
              {linkedFranchisees.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-[#095c7b] text-white hover:bg-[#095c7b]">
                      <TableRow className="hover:bg-[#095c7b]">
                        <TableHead className="font-bold text-white w-[80px]">ACTION</TableHead>
                        <TableHead className="font-bold text-white">FRANCHISEE</TableHead>
                        <TableHead className="font-bold text-white text-xs">INTRODUCED TO THE PROGRAM AND RECEIVED THE OVERVIEW PRESENTATION?</TableHead>
                        <TableHead className="font-bold text-white text-xs">AGREED TO THE COMMERCIALS?</TableHead>
                        <TableHead className="font-bold text-white text-xs">CAN RETURN TO THE LPO BEFORE THE CUT-OFF TIME?</TableHead>
                        <TableHead className="font-bold text-white text-xs">FACE-TO-FACE INTRODUCTION HELD BETWEEN LPO & FRANCHISEE?</TableHead>
                        <TableHead className="font-bold text-white text-right">FRANCHISEE SUBURB SELECTION</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linkedFranchisees.map((fran) => (
                        <TableRow key={fran.franchiseeId}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLinkedFranchisee(fran.franchiseeId)}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </Button>
                          </TableCell>
                          <TableCell className="font-semibold text-slate-800">{fran.name}</TableCell>
                          
                          <TableCell>
                            <select
                              value={fran.introducedToProgram}
                              onChange={(e) => handleUpdateFranchiseeField(fran.franchiseeId, 'introducedToProgram', e.target.value)}
                              className="border border-slate-200 rounded px-2 py-1 text-xs bg-slate-50 font-medium text-slate-800 focus:outline-none"
                            >
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </TableCell>

                          <TableCell>
                            <select
                              value={fran.agreedToCommercials}
                              onChange={(e) => handleUpdateFranchiseeField(fran.franchiseeId, 'agreedToCommercials', e.target.value)}
                              className="border border-slate-200 rounded px-2 py-1 text-xs bg-slate-50 font-medium text-slate-800 focus:outline-none"
                            >
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </TableCell>

                          <TableCell>
                            <select
                              value={fran.canReturnBeforeCutoff}
                              onChange={(e) => handleUpdateFranchiseeField(fran.franchiseeId, 'canReturnBeforeCutoff', e.target.value)}
                              className="border border-slate-200 rounded px-2 py-1 text-xs bg-slate-50 font-medium text-slate-800 focus:outline-none"
                            >
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </TableCell>

                          <TableCell>
                            <select
                              value={fran.faceToFaceIntroHeld}
                              onChange={(e) => handleUpdateFranchiseeField(fran.franchiseeId, 'faceToFaceIntroHeld', e.target.value)}
                              className="border border-slate-200 rounded px-2 py-1 text-xs bg-slate-50 font-medium text-slate-800 focus:outline-none"
                            >
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const fullFran = franchisees.find(f => f.id === fran.franchiseeId);
                                setSuburbViewFranchisee(fullFran || fran);
                              }}
                              className="border-[#095c7b] text-[#095c7b] hover:bg-[#095c7b]/5"
                            >
                              VIEW
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer controls */}
        <div className="p-6 bg-slate-100/50 border-t border-slate-200/80 flex justify-between items-center">
          <Button
            variant="outline"
            disabled={step === 1 || loading}
            onClick={handleBackStep}
            className="border-slate-300 font-semibold"
          >
            BACK
          </Button>

          {step < 4 ? (
            <Button
              onClick={handleNextStep}
              disabled={loading}
              className="bg-[#eaf143] hover:bg-[#d6dd34] text-slate-800 font-bold px-8 rounded-full shadow-sm"
            >
              {loading ? 'SAVING...' : 'NEXT'}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || linkedFranchisees.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 rounded-full shadow-sm"
            >
              {loading ? 'SAVING...' : 'SUBMIT'}
            </Button>
          )}
        </div>

      {/* Suburb mapping viewer Dialog */}
      {suburbViewFranchisee && (
        <Dialog open={!!suburbViewFranchisee} onOpenChange={() => setSuburbViewFranchisee(null)}>
          <DialogContent className="max-w-2xl bg-white p-6 rounded-xl shadow-xl z-[70]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Mapped Suburbs - {suburbViewFranchisee.name || suburbViewFranchisee.mainContact}
              </DialogTitle>
              <DialogDescription>
                Australia Post mapped suburbs for this franchisee.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 max-h-[300px] overflow-y-auto">
              {!suburbViewFranchisee.ausPostSuburbsJson || suburbViewFranchisee.ausPostSuburbsJson.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No AusPost suburbs mapped for this franchisee.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Suburb</TableHead>
                      <TableHead className="font-semibold">Post Code</TableHead>
                      <TableHead className="font-semibold">State</TableHead>
                      <TableHead className="font-semibold">Primary Op</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suburbViewFranchisee.ausPostSuburbsJson.map((sub: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-slate-800">{sub.suburbs}</TableCell>
                        <TableCell className="text-slate-600">{sub.post_code}</TableCell>
                        <TableCell className="text-slate-600">{sub.state}</TableCell>
                        <TableCell className="text-slate-500">
                          {Array.isArray(sub.primary_op) ? sub.primary_op.join(', ') : sub.primary_op}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setSuburbViewFranchisee(null)} className="bg-[#095c7b] hover:bg-[#053647] text-white">
                CLOSE
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
