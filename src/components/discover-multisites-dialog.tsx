'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { MapLead, Lead, Address } from '@/lib/types';
import { discoverCompanyBranches, findCompanyWebsite } from '@/ai/flows/discover-multisite-branches-flow';
import { createChildSiteLead, findFranchiseeForAddress } from '@/services/firebase';
import { firestore } from '@/lib/firebase';
import { doc, updateDoc, collection, getDocs, getDoc, setDoc } from 'firebase/firestore';
import {
  Building,
  MapPin,
  Globe,
  ExternalLink,
  PlusCircle,
  CheckCircle2,
  Search,
  Sparkles,
  Bot,
  RefreshCw,
  Phone,
  Mail,
  Store,
  Send,
  Loader2,
  Check,
  CheckSquare,
  Square,
  AlertTriangle,
  Save,
  Compass,
} from 'lucide-react';

export interface DiscoveredLocation {
  id: string;
  name: string;
  formattedAddress: string;
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  phone?: string;
  email?: string;
  website?: string;
  source: 'AI / Website' | 'Hunter.io' | 'Google Maps';
  status: 'Signed Customer' | 'Lead' | 'Not in System';
  existingRecord?: MapLead;
  place?: any;
  servicingFranchisee?: { name: string; internalId: string };
  isCreatingLead?: boolean;
  createdLeadId?: string;
}

import { EnterMultiSiteLeadDialog } from '@/components/enter-multisite-lead-dialog';

interface DiscoverMultiSitesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  parentCompany?: MapLead | Lead | null;
  allSystemRecords?: MapLead[];
  map?: google.maps.Map | null;
  onAddMultiSiteLead?: (location: DiscoveredLocation | google.maps.places.PlaceResult) => void;
  onLocationsUpdated?: () => void;
}

export function DiscoverMultiSitesDialog({
  isOpen,
  onOpenChange,
  parentCompany = null,
  allSystemRecords = [],
  map = null,
  onAddMultiSiteLead,
  onLocationsUpdated,
}: DiscoverMultiSitesDialogProps) {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  
  const [searching, setSearching] = useState(false);
  const [discoveredLocations, setDiscoveredLocations] = useState<DiscoveredLocation[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'lead' | 'signed'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [scanSummary, setScanSummary] = useState<string | null>(null);

  // Search & input form states
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [websiteUrlInput, setWebsiteUrlInput] = useState('');

  // Creation & website tracking
  const [creatingLeadIds, setCreatingLeadIds] = useState<Set<string>>(new Set());
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());
  const [isBatchCreating, setIsBatchCreating] = useState(false);
  const [isFindingWebsite, setIsFindingWebsite] = useState(false);
  const [isSavingWebsite, setIsSavingWebsite] = useState(false);
  const [fetchedSystemRecords, setFetchedSystemRecords] = useState<MapLead[]>([]);

  // Add Multi-Site Location modal state
  const [selectedLocationForModal, setSelectedLocationForModal] = useState<DiscoveredLocation | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleOpenAddLocationModal = (item: DiscoveredLocation) => {
    setSelectedLocationForModal(item);
    setIsAddModalOpen(true);
  };

  // Load all system records from Firestore when dialog opens if allSystemRecords prop is empty
  useEffect(() => {
    if (!isOpen) return;
    async function loadSystemRecords() {
      try {
        const [leadsSnap, companiesSnap] = await Promise.all([
          getDocs(collection(firestore, 'leads')),
          getDocs(collection(firestore, 'companies')),
        ]);

        const leadsData: MapLead[] = leadsSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            companyName: data.companyName || data.tradingName || 'Unnamed Lead',
            address: data.address || {
              street: data.street || '',
              city: data.city || '',
              state: data.state || '',
              zip: data.zip || '',
            },
            latitude: data.latitude || data.lat,
            longitude: data.longitude || data.lng,
            isCompany: false,
            status: data.status || 'Lead',
            ...data,
          } as any;
        });

        const companiesData: MapLead[] = companiesSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            companyName: data.companyName || data.tradingName || 'Unnamed Company',
            address: data.address || {
              street: data.street || '',
              city: data.city || '',
              state: data.state || '',
              zip: data.zip || '',
            },
            latitude: data.latitude || data.lat,
            longitude: data.longitude || data.lng,
            isCompany: true,
            status: data.status || 'Signed Customer',
            ...data,
          } as any;
        });

        setFetchedSystemRecords([...leadsData, ...companiesData]);
      } catch (err) {
        console.warn('Failed to load system records for address matching:', err);
      }
    }

    loadSystemRecords();
  }, [isOpen]);

  // Initialize input state from parentCompany when opened
  useEffect(() => {
    if (isOpen) {
      if (parentCompany) {
        setCompanyNameInput(parentCompany.companyName || '');
        setWebsiteUrlInput(parentCompany.websiteUrl || (parentCompany as any).website || '');
      } else if (!companyNameInput) {
        setCompanyNameInput('');
        setWebsiteUrlInput('');
      }
    }
  }, [isOpen, parentCompany]);

  const handleAutoFindWebsite = async () => {
    const targetName = companyNameInput.trim() || parentCompany?.companyName || '';
    const companyEmail =
      (parentCompany as any)?.companyEmail ||
      (parentCompany as any)?.email ||
      (parentCompany as any)?.contactEmail ||
      (parentCompany as any)?.contacts?.[0]?.email ||
      (parentCompany as any)?.primaryContact?.email;
    if (!targetName && !companyEmail) {
      toast({ variant: 'destructive', title: 'Company Name Required', description: 'Enter a company name to find its website.' });
      return;
    }
    setIsFindingWebsite(true);
    try {
      const res = await findCompanyWebsite(targetName, companyEmail);
      if (res.success && res.websiteUrl) {
        setWebsiteUrlInput(res.websiteUrl);
        toast({
          title: 'Website Discovered',
          description: `Found official website (${res.source || 'Web'}): ${res.websiteUrl}`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Website Not Found',
          description: `Could not automatically find website for ${targetName}. Please enter it manually.`,
        });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Website Search Error', description: err.message || String(err) });
    } finally {
      setIsFindingWebsite(false);
    }
  };

  const handleSaveWebsiteToRecord = async () => {
    if (!parentCompany?.id || !websiteUrlInput.trim()) {
      toast({ variant: 'destructive', title: 'No Record or Website', description: 'Enter a website URL and ensure a parent lead/company is selected.' });
      return;
    }
    setIsSavingWebsite(true);
    try {
      const urlToSave = websiteUrlInput.trim();
      const targetId = parentCompany.id;

      // Check both 'leads' and 'companies' collections in Firestore
      const leadRef = doc(firestore, 'leads', targetId);
      const companyRef = doc(firestore, 'companies', targetId);

      const [leadSnap, companySnap] = await Promise.all([
        getDoc(leadRef),
        getDoc(companyRef),
      ]);

      const updatePayload = {
        websiteUrl: urlToSave,
        website: urlToSave,
        updatedAt: new Date().toISOString(),
      };

      const updatePromises: Promise<any>[] = [];
      const updatedCollections: string[] = [];

      if (leadSnap.exists()) {
        updatePromises.push(setDoc(leadRef, updatePayload, { merge: true }));
        updatedCollections.push('leads');
      }

      if (companySnap.exists()) {
        updatePromises.push(setDoc(companyRef, updatePayload, { merge: true }));
        updatedCollections.push('companies');
      }

      // If neither document existed by exact ID, fallback to setDoc with merge on primary collection
      if (updatePromises.length === 0) {
        const isComp = (parentCompany as any).isCompany || (parentCompany as any).customerStatus === 'Signed Customer';
        const primaryRef = isComp ? companyRef : leadRef;
        updatePromises.push(setDoc(primaryRef, updatePayload, { merge: true }));
        updatedCollections.push(isComp ? 'companies' : 'leads');
      }

      await Promise.all(updatePromises);

      toast({
        title: 'Website Saved to Record',
        description: `Saved ${urlToSave} to field "websiteUrl" on ${parentCompany.companyName} (${updatedCollections.join(' & ')}).`,
      });
      onLocationsUpdated?.();
    } catch (err: any) {
      console.error('Failed to save websiteUrl to Firestore:', err);
      toast({
        variant: 'destructive',
        title: 'Error Saving Website',
        description: err.message || String(err),
      });
    } finally {
      setIsSavingWebsite(false);
    }
  };

  const matchLocationToDatabase = useCallback(
    (
      loc: { name: string; formattedAddress?: string; suburb?: string; state?: string; postcode?: string; street?: string; lat?: number; lng?: number }
    ): { status: 'Signed Customer' | 'Lead' | 'Not in System'; existingRecord?: MapLead } => {
      const activeName = parentCompany?.companyName || companyNameInput || '';
      const parentCoreName = activeName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/limited|pty|ltd|inc|group|australia/g, '')
        .trim();
      
      const locNameClean = loc.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/limited|pty|ltd|inc|group|australia/g, '')
        .trim();
      
      const cleanAddressStr = (addr: string) =>
        (addr || '')
          .toLowerCase()
          .replace(/street/g, 'st')
          .replace(/road/g, 'rd')
          .replace(/avenue/g, 'ave')
          .replace(/level/g, 'lvl')
          .replace(/suite/g, 'ste')
          .replace(/drive/g, 'dr')
          .replace(/[^a-z0-9]/g, '')
          .trim();

      const locSuburb = (loc.suburb || '').trim().toLowerCase();
      const locPostcode = (loc.postcode || '').trim().toLowerCase();
      const locStreetClean = cleanAddressStr(loc.street || '');
      const locFullAddrClean = cleanAddressStr(loc.formattedAddress || '');

      const recordsToSearch = allSystemRecords.length > 0 ? allSystemRecords : fetchedSystemRecords;

      const matchedRecord = recordsToSearch.find((rec) => {
        const isParentOrChild = rec.id === parentCompany?.id || (rec as any).parentLeadId === parentCompany?.id || (rec as any).parentId === parentCompany?.id;
        const recNameClean = (rec.companyName || '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .replace(/limited|pty|ltd|inc|group|australia/g, '')
          .trim();

        const isNameMatch =
          isParentOrChild ||
          (parentCoreName.length >= 3 && recNameClean.includes(parentCoreName)) ||
          (parentCoreName.length >= 3 && parentCoreName.includes(recNameClean)) ||
          (locNameClean.length >= 3 && recNameClean.includes(locNameClean)) ||
          (locNameClean.length >= 3 && locNameClean.includes(recNameClean));

        const recAddress = rec.address as Address | undefined;
        const recCity = ((recAddress?.city || (rec as any).city || '') as string).trim().toLowerCase();
        const recZip = ((recAddress?.zip || (rec as any).zip || '') as string).trim().toLowerCase();
        const recStreetRaw = ((recAddress?.street || (rec as any).street || '') as string).trim().toLowerCase();
        const recStreetClean = cleanAddressStr(recStreetRaw);
        const recFullAddrClean = cleanAddressStr(`${recStreetRaw} ${recCity} ${recZip}`);

        // 1. Lat/Lng proximity match if available (within 300 meters)
        if (loc.lat != null && loc.lng != null && rec.latitude != null && rec.longitude != null && window.google?.maps?.geometry) {
          const p1 = new window.google.maps.LatLng(loc.lat, loc.lng);
          const p2 = new window.google.maps.LatLng(rec.latitude, rec.longitude);
          const dist = window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
          if (dist <= 300) return true;
        }

        // 2. Normalized Street Address + Suburb match
        if (locStreetClean.length >= 4 && recStreetClean.length >= 4) {
          const streetOverlap = locStreetClean.includes(recStreetClean) || recStreetClean.includes(locStreetClean);
          const suburbOverlap = !locSuburb || !recCity || locSuburb.includes(recCity) || recCity.includes(locSuburb);
          const zipOverlap = !locPostcode || !recZip || locPostcode === recZip;

          if (streetOverlap && (suburbOverlap || zipOverlap)) {
            return true;
          }
        }

        // 3. Full Address String inclusion match
        if (locFullAddrClean.length >= 8 && recStreetClean.length >= 4) {
          if (locFullAddrClean.includes(recStreetClean) && (!recCity || locFullAddrClean.includes(recCity))) {
            return true;
          }
        }
        if (recFullAddrClean.length >= 8 && locStreetClean.length >= 4) {
          if (recFullAddrClean.includes(locStreetClean) && (!locSuburb || recFullAddrClean.includes(locSuburb))) {
            return true;
          }
        }

        // 4. Name Match + Suburb / Postcode match
        if (isNameMatch && locPostcode && recZip && locPostcode === recZip) {
          if (!locSuburb || !recCity || locSuburb.includes(recCity) || recCity.includes(locSuburb)) {
            return true;
          }
        }

        // 5. Linked parent or child record
        if (isParentOrChild) {
          if (locSuburb && recCity && (locSuburb.includes(recCity) || recCity.includes(locSuburb))) return true;
          if (locPostcode && recZip && locPostcode === recZip) return true;
        }

        return false;
      });

      if (matchedRecord) {
        return {
          status: matchedRecord.isCompany ? 'Signed Customer' : 'Lead',
          existingRecord: matchedRecord,
        };
      }

      return { status: 'Not in System' };
    },
    [allSystemRecords, parentCompany, companyNameInput]
  );

  const performDiscovery = useCallback(async () => {
    const targetName = companyNameInput.trim() || parentCompany?.companyName || '';
    if (!targetName) {
      toast({ variant: 'destructive', title: 'Company Name Required', description: 'Please enter a company name to discover branches.' });
      return;
    }

    setSearching(true);
    setDiscoveredLocations([]);
    setScanSummary(null);
    setSelectedLocationIds(new Set());

    const coreName = targetName.split(' - ')[0].trim();
    const websiteUrl = websiteUrlInput.trim() || parentCompany?.websiteUrl || (parentCompany as any)?.website || '';
    const rawDiscovered: DiscoveredLocation[] = [];

    // CHANNEL 1: AI & Web Scraper + Hunter.io
    try {
      const aiResult = await discoverCompanyBranches({
        companyName: coreName,
        websiteUrl,
      });

      if (aiResult.success && aiResult.data?.branches) {
        if (aiResult.data.companySummary) {
          setScanSummary(aiResult.data.companySummary);
        }

        aiResult.data.branches.forEach((b, idx) => {
          const match = matchLocationToDatabase({
            name: b.name || `${coreName} - ${b.suburb}`,
            formattedAddress: b.fullAddress,
            suburb: b.suburb,
            state: b.state,
            postcode: b.postcode,
            street: b.street,
          });

          rawDiscovered.push({
            id: `ai-${idx}-${Date.now()}`,
            name: b.name || `${coreName} ${b.suburb}`,
            formattedAddress: b.fullAddress || `${b.suburb}, ${b.state} Australia`,
            street: b.street,
            suburb: b.suburb,
            state: b.state,
            postcode: b.postcode,
            phone: b.phone,
            email: b.email,
            source: (b.source as any) || 'AI / Website',
            status: match.status,
            existingRecord: match.existingRecord,
            place: {
              name: b.name || `${coreName} - ${b.suburb}`,
              formatted_address: b.fullAddress,
              formatted_phone_number: b.phone,
              vicinity: b.fullAddress,
              street: b.street,
              suburb: b.suburb,
              state: b.state,
              postcode: b.postcode,
            },
          });
        });
      }
    } catch (aiErr) {
      console.warn('AI branch discovery warning:', aiErr);
    }

    // CHANNEL 2: Google Places Search for Full Address Enrichment
    if (window.google?.maps?.places) {
      try {
        const dummyNode = document.createElement('div');
        const placesService = map
          ? new window.google.maps.places.PlacesService(map)
          : new window.google.maps.places.PlacesService(dummyNode);

        const request: google.maps.places.TextSearchRequest = {
          query: `${coreName} Australia`,
          region: 'AU',
        };

        await new Promise<void>((resolve) => {
          placesService.textSearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
              const operationalResults = results.filter((p) => p.business_status !== 'CLOSED_PERMANENTLY');

              operationalResults.forEach((place, pIdx) => {
                const getComponent = (type: string, useShort = false) => {
                  const comp = place.address_components?.find((c) => c.types.includes(type));
                  return (useShort ? comp?.short_name : comp?.long_name) || '';
                };

                const suburb = getComponent('locality') || getComponent('postal_town');
                const postcode = getComponent('postal_code');
                const state = getComponent('administrative_area_level_1', true);
                const street = `${getComponent('street_number')} ${getComponent('route')}`.trim();
                const lat = place.geometry?.location?.lat();
                const lng = place.geometry?.location?.lng();

                const match = matchLocationToDatabase({
                  name: place.name || coreName,
                  formattedAddress: place.formatted_address || place.vicinity,
                  suburb,
                  state,
                  postcode,
                  street,
                  lat,
                  lng,
                });

                // Find if an existing item was discovered by AI in the same suburb
                const existingIndex = rawDiscovered.findIndex((existing) => {
                  const addrMatch = (existing.formattedAddress || '').toLowerCase() === (place.formatted_address || '').toLowerCase();
                  const suburbMatch = suburb && existing.suburb && existing.suburb.toLowerCase() === suburb.toLowerCase();
                  return addrMatch || (suburbMatch && (existing.name.toLowerCase().includes(coreName.toLowerCase()) || coreName.toLowerCase().includes(existing.name.toLowerCase())));
                });

                if (existingIndex >= 0) {
                  // Enrich existing item with Google Places full street address
                  const existing = rawDiscovered[existingIndex];
                  const fullAddr = place.formatted_address || place.vicinity || existing.formattedAddress;
                  rawDiscovered[existingIndex] = {
                    ...existing,
                    formattedAddress: fullAddr,
                    street: street || existing.street || fullAddr.split(',')[0],
                    suburb: suburb || existing.suburb,
                    state: state || existing.state,
                    postcode: postcode || existing.postcode,
                    phone: place.formatted_phone_number || existing.phone,
                    status: match.status !== 'Not in System' ? match.status : existing.status,
                    existingRecord: match.existingRecord || existing.existingRecord,
                    place: place || existing.place,
                  };
                } else {
                  rawDiscovered.push({
                    id: `gplaces-${pIdx}-${Date.now()}`,
                    name: place.name || `${coreName} Branch`,
                    formattedAddress: place.formatted_address || place.vicinity || 'Address N/A',
                    street,
                    suburb,
                    state,
                    postcode,
                    phone: place.formatted_phone_number,
                    website: place.website,
                    source: 'Google Maps',
                    status: match.status,
                    existingRecord: match.existingRecord,
                    place,
                  });
                }
              });
            }
            resolve();
          });
        });
      } catch (gErr) {
        console.warn('Google Places text search warning:', gErr);
      }
    }

    // CHANNEL 3: Targeted Google Places Street Address Resolution for items lacking full address
    if (window.google?.maps?.places) {
      try {
        const dummyNode = document.createElement('div');
        const placesService = map
          ? new window.google.maps.places.PlacesService(map)
          : new window.google.maps.places.PlacesService(dummyNode);

        for (let i = 0; i < rawDiscovered.length; i++) {
          const item = rawDiscovered[i];
          const fullAddrStr = item.formattedAddress || '';
          if (!item.street || fullAddrStr === `${item.suburb}, ${item.state} Australia` || fullAddrStr.split(',').length < 3) {
            const targetedQuery = `${coreName} ${item.suburb || ''} ${item.state || ''} office Australia`.trim();
            await new Promise<void>((resTarget) => {
              placesService.textSearch({ query: targetedQuery, region: 'AU' }, (tResults, tStatus) => {
                if (tStatus === google.maps.places.PlacesServiceStatus.OK && tResults && tResults.length > 0) {
                  const place = tResults[0];
                  const getComp = (type: string, useShort = false) => {
                    const comp = place.address_components?.find((c) => c.types.includes(type));
                    return (useShort ? comp?.short_name : comp?.long_name) || '';
                  };
                  const suburb = getComp('locality') || getComp('postal_town') || item.suburb;
                  const postcode = getComp('postal_code') || item.postcode;
                  const state = getComp('administrative_area_level_1', true) || item.state;
                  const streetNumRoute = `${getComp('street_number')} ${getComp('route')}`.trim();
                  const fullAddr = place.formatted_address || place.vicinity;

                  if (fullAddr) {
                    rawDiscovered[i] = {
                      ...item,
                      formattedAddress: fullAddr,
                      street: streetNumRoute || fullAddr.split(',')[0] || item.street,
                      suburb: suburb || item.suburb,
                      state: state || item.state,
                      postcode: postcode || item.postcode,
                      phone: place.formatted_phone_number || item.phone,
                      place: place || item.place,
                    };
                  }
                }
                resTarget();
              });
            });
          }
        }
      } catch (tErr) {
        console.warn('Targeted street address resolution warning:', tErr);
      }
    }

    // RESOLVE SERVICING FRANCHISEE FOR EACH DISCOVERED BRANCH
    const enrichedList = await Promise.all(
      rawDiscovered.map(async (item) => {
        try {
          const franchiseeInfo = await findFranchiseeForAddress(
            item.suburb || '',
            item.state || '',
            item.postcode || ''
          );
          return { ...item, servicingFranchisee: franchiseeInfo };
        } catch (fErr) {
          console.warn('Franchisee resolution error for location:', item.name, fErr);
          return { ...item, servicingFranchisee: { name: 'MailPlus Pty Ltd', internalId: '435' } };
        }
      })
    );

    setDiscoveredLocations(enrichedList);
    setSearching(false);

    if (enrichedList.length === 0) {
      toast({ variant: 'destructive', title: 'Scan Complete', description: `No multi-site branch locations found for ${coreName}.` });
    } else {
      toast({
        title: 'Multi-Site Discovery Complete',
        description: `Found ${enrichedList.length} total branch sites across Australia with servicing franchisee territory mapping.`,
      });
    }
  }, [companyNameInput, websiteUrlInput, parentCompany, map, matchLocationToDatabase, toast]);

  useEffect(() => {
    if (isOpen) {
      if (parentCompany) {
        setCompanyNameInput(parentCompany.companyName || '');
        setWebsiteUrlInput(parentCompany.websiteUrl || (parentCompany as any).website || '');
      }
      setScanSummary(null);
      setDiscoveredLocations([]);
      setSearchFilter('');
      setActiveTab('all');
    }
  }, [isOpen, parentCompany]);

  // Create Child Lead & Sync to NetSuite handler
  const handleCreateChildLeadInNetSuite = async (item: DiscoveredLocation) => {
    const targetParentId = parentCompany?.id || (item.existingRecord ? ((item.existingRecord as any).parentLeadId || item.existingRecord.id) : null);
    
    if (!targetParentId) {
      toast({
        variant: 'destructive',
        title: 'Parent Lead Context Missing',
        description: 'To sync child leads to NetSuite, please select or view a parent company lead in the system first.',
      });
      return;
    }

    setCreatingLeadIds((prev) => new Set(prev).add(item.id));
    try {
      const siteAddress: Address = {
        address1: item.street || '',
        street: item.street || '',
        city: item.suburb || '',
        state: item.state || '',
        zip: item.postcode || '',
        country: 'Australia',
      };

      const localManager = {
        id: crypto.randomUUID(),
        name: item.name,
        email: item.email || '',
        phone: item.phone || '',
        title: 'Local Site Contact',
      };

      const customFranchisee = item.servicingFranchisee || { name: 'MailPlus Pty Ltd', internalId: '435' };
      const copiedContacts = (parentCompany as any)?.contacts || [];

      // Call NetSuite child lead creation service
      const childLeadId = await createChildSiteLead(
        targetParentId,
        item.name,
        siteAddress,
        localManager,
        copiedContacts,
        `Created via Website Branch Discovery (${item.source})`,
        userProfile?.displayName || userProfile?.email || 'User',
        item.email || '',
        item.phone || '',
        customFranchisee
      );

      toast({
        title: 'Child Lead Synced to NetSuite',
        description: `Created child lead "${item.name}" (NetSuite ID: ${childLeadId}) & assigned to ${customFranchisee.name}.`,
      });

      // Update location status in state
      setDiscoveredLocations((prev) =>
        prev.map((loc) =>
          loc.id === item.id
            ? {
                ...loc,
                status: 'Lead',
                createdLeadId: childLeadId,
              }
            : loc
        )
      );

      if (onLocationsUpdated) {
        onLocationsUpdated();
      }
    } catch (error: any) {
      console.error('Failed to create child lead in NetSuite:', error);
      toast({
        variant: 'destructive',
        title: 'NetSuite Child Lead Failed',
        description: error.message || 'Could not sync child lead to NetSuite.',
      });
    } finally {
      setCreatingLeadIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // Batch create selected child leads in NetSuite
  const handleBatchCreateSelected = async () => {
    const itemsToCreate = filteredLocations.filter(
      (loc) => selectedLocationIds.has(loc.id) && loc.status === 'Not in System' && !loc.createdLeadId
    );

    if (itemsToCreate.length === 0) {
      toast({ variant: 'destructive', title: 'No Locations Selected', description: 'Please select new branch locations to create.' });
      return;
    }

    setIsBatchCreating(true);
    let successCount = 0;

    for (const item of itemsToCreate) {
      try {
        await handleCreateChildLeadInNetSuite(item);
        successCount++;
      } catch (e) {
        console.error(`Batch creation error for ${item.name}:`, e);
      }
    }

    setIsBatchCreating(false);
    setSelectedLocationIds(new Set());
    toast({
      title: 'Batch Sync Complete',
      description: `Created ${successCount} of ${itemsToCreate.length} child leads in NetSuite.`,
    });
  };

  const filteredLocations = useMemo(() => {
    return discoveredLocations.filter((item) => {
      if (activeTab === 'new' && item.status !== 'Not in System') return false;
      if (activeTab === 'lead' && item.status !== 'Lead') return false;
      if (activeTab === 'signed' && item.status !== 'Signed Customer') return false;

      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(q);
        const addrMatch = item.formattedAddress.toLowerCase().includes(q);
        const suburbMatch = item.suburb?.toLowerCase().includes(q);
        const stateMatch = item.state?.toLowerCase().includes(q);
        const franchiseeMatch = item.servicingFranchisee?.name.toLowerCase().includes(q);
        return nameMatch || addrMatch || suburbMatch || stateMatch || franchiseeMatch;
      }

      return true;
    });
  }, [discoveredLocations, activeTab, searchFilter]);

  const countSigned = discoveredLocations.filter((l) => l.status === 'Signed Customer').length;
  const countLeads = discoveredLocations.filter((l) => l.status === 'Lead').length;
  const countNew = discoveredLocations.filter((l) => l.status === 'Not in System' && !l.createdLeadId).length;

  const allFilteredSelected = filteredLocations.length > 0 && filteredLocations.every((l) => selectedLocationIds.has(l.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedLocationIds(new Set());
    } else {
      const newSet = new Set<string>();
      filteredLocations.forEach((l) => {
        if (l.status === 'Not in System' && !l.createdLeadId) {
          newSet.add(l.id);
        }
      });
      setSelectedLocationIds(newSet);
    }
  };

  const toggleSelectLocation = (id: string) => {
    setSelectedLocationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] md:w-full h-[90vh] max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Building className="h-5 w-5 text-primary" />
            Discover Company Website Branches & Sync NetSuite Leads
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Crawl company websites via AI, match each branch address to its servicing MailPlus Franchisee, and create child leads with NetSuite API sync.
          </DialogDescription>
        </DialogHeader>

        {/* Company Search Controls Header */}
        <div className="shrink-0 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            <div className="sm:col-span-4 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Company Name</label>
              <Input
                value={companyNameInput}
                onChange={(e) => setCompanyNameInput(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div className="sm:col-span-5 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Website URL</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAutoFindWebsite}
                  disabled={isFindingWebsite || !companyNameInput.trim()}
                  className="h-4 text-[10px] text-purple-700 hover:text-purple-900 p-0 font-semibold flex items-center gap-1"
                >
                  {isFindingWebsite ? <Loader2 className="h-3 w-3 animate-spin" /> : <Compass className="h-3 w-3" />}
                  Auto-Find Website
                </Button>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  value={websiteUrlInput}
                  onChange={(e) => setWebsiteUrlInput(e.target.value)}
                  className="h-8 text-xs bg-white flex-1"
                />
                {parentCompany?.id && websiteUrlInput.trim() && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSaveWebsiteToRecord}
                    disabled={isSavingWebsite}
                    className="h-8 text-[11px] px-2.5 bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 font-semibold shrink-0"
                    title="Save confirmed website URL to company/lead record"
                  >
                    {isSavingWebsite ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                    Save to Record
                  </Button>
                )}
              </div>
            </div>
            <div className="sm:col-span-3 flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={performDiscovery}
                disabled={searching || !companyNameInput.trim()}
                className="w-full h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-sm"
              >
                {searching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
                Scan Website Branches
              </Button>
            </div>
          </div>

          {parentCompany && (
            <div className="flex items-center justify-between text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                <Building className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Linking child leads to Parent: <strong>{parentCompany.companyName}</strong> ({parentCompany.id})</span>
              </div>
              {websiteUrlInput && (
                <div className="flex items-center gap-1.5 text-[11px] text-purple-700 font-medium">
                  <Globe className="h-3 w-3" />
                  <span>Target Website: <strong>{websiteUrlInput}</strong></span>
                </div>
              )}
            </div>
          )}
        </div>

        {searching ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 my-auto">
            <Loader />
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-slate-800 animate-pulse flex items-center justify-center gap-2">
                <Bot className="h-4 w-4 text-purple-600 animate-spin" />
                Scanning company website, location store pages & matching MailPlus territory franchisees...
              </p>
              <p className="text-xs text-muted-foreground">
                Analyzing store locator pages, extracting suburb/postcode mapping, and checking NetSuite system records...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden pt-2">
            {/* AI Insights & Metrics */}
            <div className="shrink-0 space-y-2">
              {scanSummary && (
                <div className="bg-purple-50/80 border border-purple-200 text-purple-900 px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
                  <span><strong>AI Web Summary:</strong> {scanSummary}</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-muted/40 p-2.5 rounded-xl border">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Discovered Locations</span>
                  <p className="text-xl font-bold text-slate-900">{discoveredLocations.length}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider flex items-center gap-1">
                    <PlusCircle className="h-3 w-3" /> New Sites (Not in System)
                  </span>
                  <p className="text-xl font-bold text-purple-700">{countNew}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Leads in Pipeline
                  </span>
                  <p className="text-xl font-bold text-blue-700">{countLeads}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Signed Customers
                  </span>
                  <p className="text-xl font-bold text-emerald-700">{countSigned}</p>
                </div>
              </div>

              {/* Tabs & Search & Batch Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
                  <Button
                    size="sm"
                    variant={activeTab === 'all' ? 'secondary' : 'ghost'}
                    className="text-xs h-7 px-2.5 font-medium"
                    onClick={() => setActiveTab('all')}
                  >
                    All ({discoveredLocations.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTab === 'new' ? 'secondary' : 'ghost'}
                    className="text-xs h-7 px-2.5 font-medium text-purple-700 hover:text-purple-800"
                    onClick={() => setActiveTab('new')}
                  >
                    New ({countNew})
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTab === 'lead' ? 'secondary' : 'ghost'}
                    className="text-xs h-7 px-2.5 font-medium text-blue-700 hover:text-blue-800"
                    onClick={() => setActiveTab('lead')}
                  >
                    Leads ({countLeads})
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTab === 'signed' ? 'secondary' : 'ghost'}
                    className="text-xs h-7 px-2.5 font-medium text-emerald-700 hover:text-emerald-800"
                    onClick={() => setActiveTab('signed')}
                  >
                    Signed ({countSigned})
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {selectedLocationIds.size > 0 && (
                    <Button
                      size="sm"
                      onClick={handleBatchCreateSelected}
                      disabled={isBatchCreating}
                      className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm"
                    >
                      {isBatchCreating ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Send className="mr-1.5 h-3 w-3" />}
                      Create {selectedLocationIds.size} Child Leads in NetSuite
                    </Button>
                  )}

                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-8 h-7 text-xs bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Discovered Locations List */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5">
              {filteredLocations.length > 0 ? (
                <div className="space-y-2.5 pb-2">
                  {filteredLocations.map((item) => {
                    const isCreating = creatingLeadIds.has(item.id);
                    const isSelected = selectedLocationIds.has(item.id);

                    return (
                      <Card
                        key={item.id}
                        className={`p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-slate-200 transition-all ${
                          isSelected ? 'bg-purple-50/50 border-purple-300' : 'hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          {item.status === 'Not in System' && !item.createdLeadId && (
                            <button
                              type="button"
                              className="mt-0.5 text-slate-400 hover:text-purple-600 transition-colors"
                              onClick={() => toggleSelectLocation(item.id)}
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-purple-600" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          )}

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-sm text-slate-900">{item.name}</h4>

                              {/* Servicing Franchisee Badge */}
                              <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-200 text-[11px] font-semibold flex items-center gap-1">
                                <Store className="h-3 w-3 text-indigo-600" />
                                Serviced by: {item.servicingFranchisee?.name || 'MailPlus Pty Ltd'}
                              </Badge>

                              {/* Status Badges */}
                              {item.createdLeadId && (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[11px] font-semibold">
                                  <Check className="h-3 w-3 mr-1" /> Created &amp; Synced (NetSuite ID: {item.createdLeadId})
                                </Badge>
                              )}
                              {!item.createdLeadId && item.status === 'Signed Customer' && (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Signed Customer in System
                                </Badge>
                              )}
                              {!item.createdLeadId && item.status === 'Lead' && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-semibold">
                                  <Sparkles className="h-3 w-3 mr-1" /> Lead in Pipeline
                                </Badge>
                              )}
                              {!item.createdLeadId && item.status === 'Not in System' && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[11px] font-semibold">
                                  <PlusCircle className="h-3 w-3 mr-1" /> Not in System
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span>{item.formattedAddress}</span>
                            </p>

                            {item.existingRecord && (
                              <div className="mt-1.5 bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-md text-[11px] flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 font-semibold">
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                  Address Match Flagged: "{item.existingRecord.companyName}" registered in system ({item.status})
                                </span>
                                <a
                                  href={item.status === 'Signed Customer' ? `/companies/${item.existingRecord.id}` : `/leads/${item.existingRecord.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-amber-800 hover:underline font-bold inline-flex items-center gap-1 shrink-0"
                                >
                                  View Record <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}

                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap pt-0.5">
                              {item.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-slate-400" /> {item.phone}
                                </span>
                              )}
                              {item.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3 text-slate-400" /> {item.email}
                                </span>
                              )}
                              {item.website && (
                                <a
                                  href={item.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  <Globe className="h-3 w-3" /> Visit Website
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                          {item.status === 'Signed Customer' && item.existingRecord && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-medium"
                              onClick={() => window.open(`/companies/${item.existingRecord!.id}`, '_blank')}
                            >
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View Customer
                            </Button>
                          )}

                          {item.status === 'Lead' && item.existingRecord && !item.createdLeadId && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 border-blue-300 text-blue-800 hover:bg-blue-50 font-medium"
                              onClick={() => window.open(`/leads/${item.existingRecord!.id}`, '_blank')}
                            >
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View Lead
                            </Button>
                          )}

                          {(item.status === 'Not in System' || item.createdLeadId) && (
                            <Button
                              size="sm"
                              disabled={isCreating || Boolean(item.createdLeadId)}
                              className={`text-xs h-8 font-medium shadow-sm ${
                                item.createdLeadId
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-purple-600 hover:bg-purple-700 text-white'
                              }`}
                              onClick={() => handleOpenAddLocationModal(item)}
                            >
                              {isCreating ? (
                                <>
                                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Syncing to NetSuite...
                                </>
                              ) : item.createdLeadId ? (
                                <>
                                  <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-700" /> Synced to NetSuite
                                </>
                              ) : (
                                <>
                                  <Send className="mr-1.5 h-3.5 w-3.5" /> Create Child Lead (NetSuite)
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="py-14 text-center text-muted-foreground text-xs space-y-3 max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto shadow-sm">
                    <Search className="h-6 w-6" />
                  </div>
                  <p className="font-bold text-slate-800 text-sm">Ready to Discover Multi-Site Locations</p>
                  <p className="text-slate-500 leading-relaxed">
                    Click <strong className="text-slate-900 font-semibold">Scan Website Branches</strong> above to crawl official office pages, Hunter.io, and Google Maps for <strong>{parentCompany?.companyName || 'this company'}</strong>, or click <strong className="text-purple-700 font-semibold">Auto-Find Website</strong> if the domain is missing.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 pt-2 border-t flex flex-row justify-between items-center">
          <Button variant="outline" size="sm" className="text-xs" onClick={performDiscovery} disabled={searching}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${searching ? 'animate-spin' : ''}`} /> Re-Scan Website
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      <EnterMultiSiteLeadDialog
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        parentCompany={parentCompany}
        initialLocation={selectedLocationForModal}
        onSuccess={() => {
          if (selectedLocationForModal) {
            setDiscoveredLocations((prev) =>
              prev.map((loc) =>
                loc.id === selectedLocationForModal.id
                  ? { ...loc, status: 'Lead' }
                  : loc
              )
            );
          }
          if (onLocationsUpdated) {
            onLocationsUpdated();
          }
        }}
      />
    </Dialog>
  );
}
