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
import { discoverCompanyBranches } from '@/ai/flows/discover-multisite-branches-flow';
import { createChildSiteLead, findFranchiseeForAddress } from '@/services/firebase';
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
  parentCompany,
  allSystemRecords = [],
  map,
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

  // Creation tracking
  const [creatingLeadIds, setCreatingLeadIds] = useState<Set<string>>(new Set());
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());
  const [isBatchCreating, setIsBatchCreating] = useState(false);

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
      
      const locSuburb = (loc.suburb || '').trim().toLowerCase();
      const locPostcode = (loc.postcode || '').trim().toLowerCase();
      const locStreet = (loc.street || '').trim().toLowerCase();
      const locFullAddr = (loc.formattedAddress || '').trim().toLowerCase();

      const matchedRecord = allSystemRecords.find((rec) => {
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

        if (!isNameMatch) return false;

        const recAddress = rec.address as Address | undefined;
        const recCity = ((recAddress?.city || (rec as any).city || '') as string).trim().toLowerCase();
        const recZip = ((recAddress?.zip || (rec as any).zip || '') as string).trim().toLowerCase();
        const recStreet = ((recAddress?.street || (rec as any).street || '') as string).trim().toLowerCase();

        if (loc.lat != null && loc.lng != null && rec.latitude != null && rec.longitude != null && window.google?.maps?.geometry) {
          const p1 = new window.google.maps.LatLng(loc.lat, loc.lng);
          const p2 = new window.google.maps.LatLng(rec.latitude, rec.longitude);
          const dist = window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
          if (dist <= 300) return true;
        }

        if (locPostcode && recZip && locPostcode === recZip) {
          if (locSuburb && recCity && (locSuburb.includes(recCity) || recCity.includes(locSuburb))) return true;
          if (locStreet && recStreet && (locStreet.includes(recStreet) || recStreet.includes(locStreet))) return true;
        }

        if (locSuburb && recCity && (locSuburb.includes(recCity) || recCity.includes(locSuburb))) {
          if (locStreet && recStreet && (locStreet.includes(recStreet) || recStreet.includes(locStreet))) return true;
          if (isParentOrChild) return true;
        }

        if (locFullAddr && recStreet && recCity && locFullAddr.includes(recStreet) && locFullAddr.includes(recCity)) return true;

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

    // CHANNEL 2: Google Places Search
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
                const street = `${getComponent('street_number')} ${getComponent('route')}`.trim();
                const lat = place.geometry?.location?.lat();
                const lng = place.geometry?.location?.lng();

                const match = matchLocationToDatabase({
                  name: place.name || coreName,
                  formattedAddress: place.formatted_address || place.vicinity,
                  suburb,
                  postcode,
                  street,
                  lat,
                  lng,
                });

                const isAlreadyAdded = rawDiscovered.some((existing) => {
                  const addrMatch = existing.formattedAddress.toLowerCase() === (place.formatted_address || '').toLowerCase();
                  const suburbMatch = suburb && existing.suburb && existing.suburb.toLowerCase() === suburb.toLowerCase();
                  return addrMatch || (suburbMatch && existing.name.toLowerCase().includes(coreName.toLowerCase()));
                });

                if (!isAlreadyAdded) {
                  rawDiscovered.push({
                    id: `gplaces-${pIdx}-${Date.now()}`,
                    name: place.name || `${coreName} Branch`,
                    formattedAddress: place.formatted_address || place.vicinity || 'Address N/A',
                    street,
                    suburb,
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
    if (isOpen && (parentCompany || companyNameInput)) {
      performDiscovery();
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
        <div className="shrink-0 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            <div className="sm:col-span-5 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Company Name</label>
              <Input
                placeholder="e.g. Bunnings, TNT Express, Harvey Norman..."
                value={companyNameInput}
                onChange={(e) => setCompanyNameInput(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div className="sm:col-span-5 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Website URL (Optional)</label>
              <Input
                placeholder="e.g. www.bunnings.com.au"
                value={websiteUrlInput}
                onChange={(e) => setWebsiteUrlInput(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                size="sm"
                onClick={performDiscovery}
                disabled={searching || !companyNameInput.trim()}
                className="w-full h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-sm"
              >
                {searching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
                Scan Website
              </Button>
            </div>
          </div>

          {parentCompany && (
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              <Building className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Linking child leads to Parent Lead: <strong>{parentCompany.companyName}</strong> ({parentCompany.id})</span>
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
                      placeholder="Filter by suburb, state, franchisee..."
                      className="pl-8 h-7 text-xs bg-background"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
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
                              onClick={() => handleCreateChildLeadInNetSuite(item)}
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
                <div className="py-16 text-center text-muted-foreground text-xs space-y-2">
                  <Building className="h-8 w-8 text-slate-300 mx-auto" />
                  <p>No branch locations match the current filter. Try scanning a company website or clearing filters.</p>
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
    </Dialog>
  );
}
