'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, getDocs, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { prepareForFirestore } from '@/services/firebase';
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
import { Info, X, Trash2, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { sendLpoConversionToNetSuite } from '@/services/netsuite';
import { validateABN } from '@/lib/utils';

// Helper to construct standard ServiceSelection[] array from LPO rate fields
export function buildLpoServicesArray(ampoRate: any, pmpoRate: any, packageRate: any, additionalBagRate: any, startDate?: string) {
  const am = parseFloat(String(ampoRate)) || 0;
  const pm = parseFloat(String(pmpoRate)) || 0;
  const pkg = parseFloat(String(packageRate)) || 0;
  const add = parseFloat(String(additionalBagRate)) || 0;

  const todayStr = startDate || new Date().toISOString().split('T')[0];

  const services: any[] = [];
  if (am > 0) {
    services.push({
      startDate: todayStr,
      frequency: 'Adhoc',
      rate: am,
      name: 'AMPO',
    });
  }
  if (pm > 0) {
    services.push({
      startDate: todayStr,
      frequency: 'Adhoc',
      rate: pm,
      name: 'PMPO',
    });
  }
  if (pkg > 0) {
    services.push({
      startDate: todayStr,
      frequency: 'Adhoc',
      rate: pkg,
      name: 'Package: AMPO & PMPO',
    });
  }
  if (add > 0) {
    services.push({
      startDate: todayStr,
      frequency: 'Adhoc',
      rate: add,
      name: 'Additional Mail Bag',
    });
  }

  return services;
}

// Helper to determine initial wizard step from lead status or conversionStep
function getInitialStep(lead: any): number {
  if (!lead) return 1;

  // Check salesProcess and status fields first with case-insensitive matching
  const statusStr = (lead.salesProcess || lead.status || lead.stage || '').toLowerCase().trim();

  if (statusStr.includes('franchisee') || statusStr.includes('readiness') || statusStr.includes('completed')) {
    return 4;
  }
  if (statusStr.includes('operation')) {
    return 3;
  }
  if (statusStr.includes('induction') || statusStr.includes('service') || statusStr.includes('rate') || statusStr.includes('onboarding')) {
    return 2;
  }

  // Fallback to conversionStep if present
  if (typeof lead.conversionStep === 'number' && lead.conversionStep >= 1 && lead.conversionStep <= 4) {
    return lead.conversionStep;
  }

  return 1;
}

// Helper to extract suburb mappings from franchisee record
function getFranchiseeSuburbs(fran: any): any[] {
  if (!fran) return [];
  if (Array.isArray(fran.ausPostSuburbsJson) && fran.ausPostSuburbsJson.length > 0) {
    return fran.ausPostSuburbsJson;
  }
  if (Array.isArray(fran.territoryJson) && fran.territoryJson.length > 0) {
    return fran.territoryJson;
  }
  if (typeof fran.ausPostSuburbsRaw === 'string' && fran.ausPostSuburbsRaw.trim()) {
    try {
      const parsed = JSON.parse(fran.ausPostSuburbsRaw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  if (typeof fran.custentity_ap_suburbs_json === 'string' && fran.custentity_ap_suburbs_json.trim()) {
    try {
      const parsed = JSON.parse(fran.custentity_ap_suburbs_json);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  return [];
}

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
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(() => getInitialStep(lead));
  const [loading, setLoading] = useState(false);

  // Step 1: LPO Lead info & Partner location linking
  const [lpoName, setLpoName] = useState(lead.lpoName || '');
  const [lpoOwnerName, setLpoOwnerName] = useState(lead.lpoOwnerName || '');
  const [email, setEmail] = useState(lead.email || '');
  const [phone, setPhone] = useState(lead.phone || '');
  const [abn, setAbn] = useState(lead.abn || '');
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
    const unmappedNames: string[] = [];

    const updated = selectedFranchiseeIds.map((id) => {
      const existing = linkedFranchisees.find((lf) => lf.franchiseeId === id);
      const original = franchisees.find((f) => f.id === id);
      const suburbs = getFranchiseeSuburbs(original || existing);
      const franName = original?.name || original?.mainContact || existing?.name || 'Unknown Franchisee';

      if (suburbs.length === 0 && !unmappedNames.includes(franName)) {
        unmappedNames.push(franName);
      }

      if (existing) {
        return {
          ...existing,
          ausPostSuburbsJson: suburbs
        };
      }

      return {
        franchiseeId: id,
        name: franName,
        introducedToProgram: 'Yes',
        agreedToCommercials: 'Yes',
        canReturnBeforeCutoff: 'Yes',
        faceToFaceIntroHeld: 'Yes',
        ausPostSuburbsJson: suburbs,
      };
    });

    setLinkedFranchisees(updated);

    if (unmappedNames.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Missing Suburb Mappings',
        description: `Warning: The following franchisee(s) have NO suburb mappings assigned: ${unmappedNames.join(', ')}`
      });
    } else if (selectedFranchiseeIds.length > 0) {
      toast({
        title: 'Franchisees Linked',
        description: `Successfully linked ${selectedFranchiseeIds.length} franchisee(s) with active suburb mappings.`
      });
    }
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
        if (!abn.trim()) {
          toast({
            variant: 'destructive',
            title: 'ABN Required',
            description: 'Please enter the Australian Business Number (ABN) to proceed.'
          });
          setLoading(false);
          return;
        }
        if (!validateABN(abn)) {
          toast({
            variant: 'destructive',
            title: 'Invalid ABN',
            description: 'Please enter a valid 11-digit Australian Business Number (ABN).'
          });
          setLoading(false);
          return;
        }

        const step1Data = {
          lpoName,
          lpoOwnerName,
          email,
          phone,
          abn: abn.trim(),
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
        await addDoc(collection(firestore, 'lpo_leads', lead.id, 'activity'), {
          type: 'StepProgress',
          notes: `Step 1 completed: Linked to Partner Location "${selectedPartnerLocation?.name || 'Partner Location'}" (ABN: ${abn.trim()}). Status updated to "Linked to Partner Location".`,
          author: 'System User',
          createdAt: serverTimestamp()
        });
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
        await addDoc(collection(firestore, 'lpo_leads', lead.id, 'activity'), {
          type: 'StepProgress',
          notes: `Step 2 completed: Onboarding status recorded (Inducted by Kerry: ${inductedByKerry}, AM PO: $${ampoRate}, PM PO: $${pmpoRate}). Status updated to "Induction".`,
          author: 'System User',
          createdAt: serverTimestamp()
        });
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
        await addDoc(collection(firestore, 'lpo_leads', lead.id, 'activity'), {
          type: 'StepProgress',
          notes: `Step 3 completed: Operations setup recorded (Collection & Delivery: ${operatesCollectionDelivery}, Sweep Time: ${lastDailySweepTime}). Status updated to "Operations Setup".`,
          author: 'System User',
          createdAt: serverTimestamp()
        });
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
      if (!abn.trim() || !validateABN(abn)) {
        toast({
          variant: 'destructive',
          title: 'Invalid or Missing ABN',
          description: 'A valid 11-digit Australian Business Number (ABN) is required to complete conversion.'
        });
        setLoading(false);
        return;
      }

      // Generate ProspectPlus ID
      const timestampSuffix = Date.now().toString().slice(-5);
      const parentProspectPlusId = `MP-LPO-${timestampSuffix}`;

      // Split contact name
      const nameParts = (lpoOwnerName || '').trim().split(' ');
      const firstName = nameParts[0] || 'LPO';
      const lastName = nameParts.slice(1).join(' ') || 'Owner';

      const primaryContact = {
        name: lpoOwnerName || lead.lpoOwnerName || 'LPO Owner',
        email: email || lead.email || '',
        phone: phone || lead.phone || '',
        mobile: phone || lead.phone || '',
        isPrimary: true,
      };

      const leadAddress = {
        street: [address1, address2].filter(Boolean).join(', ') || '',
        city: city || '',
        state: state || '',
        zip: postcode || '',
        country: 'Australia',
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        partnerLocationId: selectedPartnerLocation?.id || undefined,
        partnerLocationName: selectedPartnerLocation?.name || undefined
      };

      const parentLeadPayload = {
        prospectPlusId: parentProspectPlusId,
        companyName: lpoName || lead.lpoName || 'LPO Lead',
        abn: abn.trim(),
        websiteUrl: lead.websiteUrl || '',
        industryCategory: 'Postal / Retail Services',
        customerPhone: phone || '',
        customerServiceEmail: email || '',
        contacts: [primaryContact],
        address: leadAddress,
        city: city || '',
        state: state || '',
        zip: postcode || '',
        latitude: lat ?? undefined,
        longitude: lng ?? undefined,
        
        // Assigned to MailPlus Pty Ltd (435)
        franchisee: 'MailPlus Pty Ltd',
        franchisee_id: '435',
        franchiseeInternalId: '435',

        // Lead Assigned to Kerry O'Neill
        assignedTo: "Kerry O'Neill",
        assignedToName: "Kerry O'Neill",
        assignedToEmail: "kerry.oneill@mailplus.com.au",
        accountManagerAssigned: "Kerry O'Neill",
        salesRep: "Kerry O'Neill",
        
        // Campaign Classification
        campaign: 'LPO Network Onboarding',
        campaignName: 'LPO Network Onboarding',

        // Lead Type & LPO Linking
        leadType: 'Service',
        lpoLeadId: lead.id,
        lpoLeadName: lpoName || lead.lpoName || 'LPO Lead',

        // Hierarchy & Bucket
        parentLeadId: null,
        isParentLead: true,
        isChildLead: false,
        bucket: 'lpo_network' as const,
        source: 'LPO Lead Conversion',
        leadSource: 'LPO Expressions of Interest',

        // Agreed rates & operations setup
        ampoRate: parseFloat(ampoRate) || 0,
        pmpoRate: parseFloat(pmpoRate) || 0,
        packageRate: parseFloat(packageRate) || 0,
        additionalBagRate: parseFloat(additionalBagRate) || 0,
        services: buildLpoServicesArray(ampoRate, pmpoRate, packageRate, additionalBagRate),
        operatesCollectionDelivery: operatesCollectionDelivery || 'Yes',
        lastDailySweepTime: lastDailySweepTime || '02:00 pm',
        franchiseeAccess: franchiseeAccess || 'Car Park',
        inductedByKerry: inductedByKerry || 'Yes',

        status: 'New' as const,
        syncedWithNetSuite: false,
        netSuiteSyncStatus: 'pending',
        dateLeadEntered: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      // Prepare contacts list to copy
      const contactsToCopy = (lead.contacts && Array.isArray(lead.contacts) && lead.contacts.length > 0)
        ? lead.contacts
        : [primaryContact];

      // 1. Create Parent Lead Document in 'leads' collection
      const parentLeadDocRef = await addDoc(collection(firestore, 'leads'), prepareForFirestore({
        ...parentLeadPayload,
        contactCount: contactsToCopy.length
      }));
      const parentLeadId = parentLeadDocRef.id;

      // 1b. Create contacts subcollection under leads/{parentLeadId}/contacts
      for (const contactObj of contactsToCopy) {
        await addDoc(
          collection(firestore, 'leads', parentLeadId, 'contacts'),
          prepareForFirestore({
            ...contactObj,
            isPrimary: true,
            syncedWithNetSuite: false,
            createdAt: new Date().toISOString()
          })
        );
      }

      // 2. Create Child Lead Documents in 'leads' collection for each linked franchisee
      const createdChildLeadIds: string[] = [];
      for (const linkedZee of linkedFranchisees) {
        const childProspectPlusId = `MP-LPO-${Math.floor(10000 + Math.random() * 90000)}`;
        const zeeName = linkedZee.name || 'Linked Franchisee';
        const zeeId = linkedZee.franchiseeId || '435';

        const childLeadPayload = {
          ...parentLeadPayload,
          prospectPlusId: childProspectPlusId,
          companyName: `${lpoName || lead.lpoName || 'LPO Lead'} - ${zeeName}`,
          parentLeadId: parentLeadId,
          isParentLead: false,
          isChildLead: true,
          franchisee: zeeName,
          franchisee_id: zeeId,
          franchiseeInternalId: zeeId,
          status: 'New' as const,
          contactCount: contactsToCopy.length,
          createdAt: new Date().toISOString(),
        };

        const childDocRef = await addDoc(collection(firestore, 'leads'), prepareForFirestore(childLeadPayload));
        const childLeadId = childDocRef.id;
        createdChildLeadIds.push(childLeadId);

        // 2b. Create contacts subcollection under leads/{childLeadId}/contacts
        for (const contactObj of contactsToCopy) {
          await addDoc(
            collection(firestore, 'leads', childLeadId, 'contacts'),
            prepareForFirestore({
              ...contactObj,
              isPrimary: true,
              syncedWithNetSuite: false,
              createdAt: new Date().toISOString()
            })
          );
        }
      }

      // 3. Update LPO Lead Document
      const conversionData = {
        lpoName,
        lpoOwnerName,
        lpoContactName: lpoOwnerName,
        email,
        lpoContactEmail: email,
        phone,
        lpoContactPhone: phone,
        abn: abn.trim(),
        address1,
        address2,
        city,
        state,
        postcode,
        linkedPartnerLocationId: selectedPartnerLocation?.id || null,
        linkedPartnerLocationName: selectedPartnerLocation?.name || null,
        linkedPartnerLocation: selectedPartnerLocation?.name || selectedPartnerLocation?.id || '',
        inductedByKerry,
        ampoRate: parseFloat(ampoRate) || 0,
        pmpoRate: parseFloat(pmpoRate) || 0,
        packageRate: parseFloat(packageRate) || 0,
        additionalBagRate: parseFloat(additionalBagRate) || 0,
        servicesAndRates: {
          ampoRate: parseFloat(ampoRate) || 0,
          pmpoRate: parseFloat(pmpoRate) || 0,
          packageRate: parseFloat(packageRate) || 0,
          additionalBagRate: parseFloat(additionalBagRate) || 0,
          inductedByKerry,
          operatesCollectionDelivery,
          lastDailySweepTime,
          franchiseeAccess
        },
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
        createdParentLeadId: parentLeadId,
        createdChildLeadIds,
        status: 'Franchisees Assigned',
        convertedAt: new Date().toISOString()
      };

      const docRef = doc(firestore, 'lpo_leads', lead.id);
      await updateDoc(docRef, conversionData);

      // 4. Add Activity Log to LPO Lead
      await addDoc(collection(firestore, 'lpo_leads', lead.id, 'activity'), {
        type: 'StatusChange',
        notes: `LPO Lead converted. Created Parent Lead (ID: ${parentLeadId}) assigned to MailPlus Pty Ltd (435) and ${createdChildLeadIds.length} Child Lead(s).`,
        author: 'System User',
        createdAt: serverTimestamp()
      });

      // 5. Local logging (NetSuite 2673 API discontinued)
      await sendLpoConversionToNetSuite(lead.id, conversionData);

      toast({
        title: 'Conversion Complete',
        description: `Created Parent Lead & ${createdChildLeadIds.length} Child Lead(s) in 'LPO Network' bucket. Redirecting...`
      });

      onSuccess({ id: lead.id, ...conversionData });

      // 6. Redirect user to newly created Parent Lead profile page
      router.push(`/leads/${parentLeadId}`);
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
      
      {/* Interactive Stepper Navigation Bar */}
      <div className="bg-[#eef6ed] p-5 border-b border-[#095c7b]/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {step === 1 && 'Step 1: LPO Information & Location'}
              {step === 2 && 'Step 2: Onboarding & Service Rates'}
              {step === 3 && 'Step 3: Operations Overview'}
              {step === 4 && 'Step 4: Franchisee Linkage & Readiness'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any step pill below to jump directly to that step for editing.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/70 backdrop-blur px-3 py-1 rounded-full border border-slate-200 text-xs font-semibold text-[#095c7b]">
            <Info className="h-4 w-4" />
            <span>Active Progress: Step {getInitialStep(lead)} of 4</span>
          </div>
        </div>

        {/* 4-Step Pill Navigation Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
          {[
            { num: 1, title: 'LPO Information', desc: 'Owner, ABN, Address' },
            { num: 2, title: 'Onboarding & Rates', desc: 'Induction & Pricing' },
            { num: 3, title: 'Operations', desc: 'Sweep & Access' },
            { num: 4, title: 'Franchisees', desc: 'Readiness Checklist' }
          ].map((s) => {
            const isActive = step === s.num;
            const initialProgress = getInitialStep(lead);
            const isCompleted = s.num < initialProgress || (s.num < 4 && (lead?.conversionStep || 1) > s.num);

            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num)}
                className={`p-3 rounded-xl border text-left transition-all duration-150 relative overflow-hidden group ${
                  isActive
                    ? 'bg-[#095c7b] text-white border-[#095c7b] shadow-md ring-2 ring-[#095c7b]/20'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 shadow-sm hover:border-[#095c7b]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-[#095c7b]/10 group-hover:text-[#095c7b]'
                  }`}>
                    Step {s.num}
                  </span>
                  {isCompleted && !isActive && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-[#eaf143] animate-pulse" />
                  )}
                </div>
                <div className="font-bold text-xs mt-2 line-clamp-1">{s.title}</div>
                <div className={`text-[10px] line-clamp-1 mt-0.5 ${isActive ? 'text-slate-200' : 'text-slate-400'}`}>
                  {s.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          
          {/* STEP 1: LPO Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="space-y-2">
                  <Label htmlFor="lpoName" className="font-semibold text-slate-700">LPO Name <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
                  <Input id="lpoName" value={lpoName} onChange={(e) => setLpoName(e.target.value)} className="focus-visible:ring-[#095c7b]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lpoOwner" className="font-semibold text-slate-700">LPO Owner Name <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
                  <Input id="lpoOwner" value={lpoOwnerName} onChange={(e) => setLpoOwnerName(e.target.value)} className="focus-visible:ring-[#095c7b]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold text-slate-700">Contact Email <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="focus-visible:ring-[#095c7b]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-semibold text-slate-700">Contact Phone <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="focus-visible:ring-[#095c7b]" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="abn" className="font-semibold text-slate-700">ABN (Australian Business Number) <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
                  <Input 
                    id="abn" 
                    value={abn} 
                    placeholder="e.g. 51 824 753 556" 
                    onChange={(e) => setAbn(e.target.value)} 
                    className="focus-visible:ring-[#095c7b]" 
                  />
                  {abn.trim() ? (
                    validateABN(abn) ? (
                      <p className="text-xs text-emerald-600 font-medium">Valid 11-digit ABN.</p>
                    ) : (
                      <p className="text-xs text-rose-600 font-medium">Invalid ABN format (must be a valid 11-digit Australian Business Number).</p>
                    )
                  ) : (
                    <p className="text-xs text-slate-400 font-normal">Mandatory 11-digit ABN for NetSuite integration.</p>
                  )}
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
                    <Label htmlFor="city" className="font-semibold text-slate-700">Suburb <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
                    <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="focus-visible:ring-[#095c7b]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="font-semibold text-slate-700">State <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
                    <Input id="state" value={state} onChange={(e) => setState(e.target.value)} className="focus-visible:ring-[#095c7b]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcode" className="font-semibold text-slate-700">Postcode <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
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
                <Label className="font-semibold text-slate-700 block">Has the LPO been Inducted by Kerry? <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
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
                          <span className="text-rose-500 font-bold">$</span>
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
                          <span className="text-rose-500 font-bold">$</span>
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
                          <span className="text-rose-500 font-bold">$</span>
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
                          <span className="text-rose-500 font-bold">$</span>
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
                  <Label className="font-semibold text-slate-700">Does the LPO currently operate it's own collection and delivery service? <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
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
                    <Label htmlFor="sweepTime" className="font-semibold text-slate-700">Last Daily Sweep Time for Red Van <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
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
                  <Label className="font-semibold text-slate-700">Select MailPlus Franchisees <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
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
                      {linkedFranchisees.map((fran) => {
                        const fullFran = franchisees.find(f => f.id === fran.franchiseeId);
                        const suburbs = getFranchiseeSuburbs(fullFran || fran);
                        const hasSuburbs = suburbs.length > 0;

                        return (
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
                            <TableCell className="font-semibold text-slate-800">
                              <div>{fran.name}</div>
                              {hasSuburbs ? (
                                <Badge variant="secondary" className="mt-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium flex items-center gap-1 w-fit">
                                  <MapPin className="h-3 w-3 text-emerald-600" />
                                  {suburbs.length} Suburb(s) Mapped
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="mt-1 bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-semibold flex items-center gap-1 w-fit">
                                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                                  No Suburb Mappings Assigned
                                </Badge>
                              )}
                            </TableCell>
                            
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
                                  setSuburbViewFranchisee(fullFran || fran);
                                }}
                                className="border-[#095c7b] text-[#095c7b] hover:bg-[#095c7b]/5"
                              >
                                VIEW SUBURBS
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#095c7b]" />
                Mapped Suburbs - {suburbViewFranchisee.name || suburbViewFranchisee.mainContact}
              </DialogTitle>
              <DialogDescription>
                Australia Post mapped suburbs for this franchisee.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 max-h-[350px] overflow-y-auto">
              {(() => {
                const subs = getFranchiseeSuburbs(suburbViewFranchisee);
                if (subs.length === 0) {
                  return (
                    <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                      <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto" />
                      <p className="font-bold text-amber-900 text-sm">No Suburb Mappings Assigned</p>
                      <p className="text-xs text-amber-700">This franchisee currently does not have any Australia Post suburbs mapped to their territory.</p>
                    </div>
                  );
                }

                return (
                  <div>
                    <div className="mb-3 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center justify-between">
                      <span>Total Mapped Suburbs: <strong>{subs.length}</strong></span>
                      <Badge className="bg-emerald-600 text-white">Active Territory</Badge>
                    </div>
                    <Table>
                      <TableHeader className="bg-slate-100">
                        <TableRow>
                          <TableHead className="font-semibold text-slate-700">Suburb</TableHead>
                          <TableHead className="font-semibold text-slate-700">Post Code</TableHead>
                          <TableHead className="font-semibold text-slate-700">State</TableHead>
                          <TableHead className="font-semibold text-slate-700">Primary Op</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subs.map((sub: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-slate-800">{sub.suburbs || sub.suburb || sub.name || '—'}</TableCell>
                            <TableCell className="text-slate-600">{sub.post_code || sub.postcode || sub.zip || '—'}</TableCell>
                            <TableCell className="text-slate-600">{sub.state || '—'}</TableCell>
                            <TableCell className="text-slate-500 text-xs">
                              {Array.isArray(sub.primary_op) ? sub.primary_op.join(', ') : (sub.primary_op || '—')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
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
