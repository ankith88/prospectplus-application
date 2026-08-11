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
import type { MapLead, Lead, Address } from '@/lib/types';
import { discoverCompanyBranches } from '@/ai/flows/discover-multisite-branches-flow';
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
  source: 'AI / Web Search' | 'Hunter.io' | 'Google Search' | 'Google Maps' | string;
  status: 'Signed Customer' | 'Lead' | 'Not in System';
  existingRecord?: MapLead;
  place?: any;
}

interface DiscoverMultiSitesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  parentCompany: MapLead | Lead | null;
  allSystemRecords: MapLead[];
  map?: google.maps.Map | null;
  onAddMultiSiteLead: (location: DiscoveredLocation | google.maps.places.PlaceResult) => void;
}

export function DiscoverMultiSitesDialog({
  isOpen,
  onOpenChange,
  parentCompany,
  allSystemRecords,
  map,
  onAddMultiSiteLead,
}: DiscoverMultiSitesDialogProps) {
  const { toast } = useToast();
  const [searching, setSearching] = useState(false);
  const [discoveredLocations, setDiscoveredLocations] = useState<DiscoveredLocation[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'lead' | 'signed'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [scanSummary, setScanSummary] = useState<string | null>(null);

  const matchLocationToDatabase = useCallback(
    (
      loc: { name: string; formattedAddress?: string; suburb?: string; state?: string; postcode?: string; street?: string; lat?: number; lng?: number }
    ): { status: 'Signed Customer' | 'Lead' | 'Not in System'; existingRecord?: MapLead } => {
      const parentCoreName = (parentCompany?.companyName || '')
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
        // Must either be linked to parent company OR match parent/location company name
        const isParentOrChild = rec.id === parentCompany?.id || (rec as any).parentLeadId === parentCompany?.id || (rec as any).parentId === parentCompany?.id;
        const recNameClean = (rec.companyName || '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .replace(/limited|pty|ltd|inc|group|australia/g, '')
          .trim();

        // 1. Strict Name Guard: If not linked directly, the company name MUST match
        const isNameMatch =
          isParentOrChild ||
          (parentCoreName.length >= 3 && recNameClean.includes(parentCoreName)) ||
          (parentCoreName.length >= 3 && parentCoreName.includes(recNameClean)) ||
          (locNameClean.length >= 3 && recNameClean.includes(locNameClean)) ||
          (locNameClean.length >= 3 && locNameClean.includes(recNameClean));

        if (!isNameMatch) {
          return false;
        }

        const recAddress = rec.address as Address | undefined;
        const recCity = ((recAddress?.city || (rec as any).city || '') as string).trim().toLowerCase();
        const recZip = ((recAddress?.zip || (rec as any).zip || '') as string).trim().toLowerCase();
        const recStreet = ((recAddress?.street || (rec as any).street || '') as string).trim().toLowerCase();

        // 2. Lat/Lng proximity match if available (within 300 meters)
        if (loc.lat != null && loc.lng != null && rec.latitude != null && rec.longitude != null && window.google?.maps?.geometry) {
          const p1 = new window.google.maps.LatLng(loc.lat, loc.lng);
          const p2 = new window.google.maps.LatLng(rec.latitude, rec.longitude);
          const dist = window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
          if (dist <= 300) return true;
        }

        // 3. Exact Postcode AND (Suburb OR Street) match
        if (locPostcode && recZip && locPostcode === recZip) {
          if (locSuburb && recCity && (locSuburb.includes(recCity) || recCity.includes(locSuburb))) {
            return true;
          }
          if (locStreet && recStreet && (locStreet.includes(recStreet) || recStreet.includes(locStreet))) {
            return true;
          }
        }

        // 4. Suburb match AND Street match
        if (locSuburb && recCity && (locSuburb.includes(recCity) || recCity.includes(locSuburb))) {
          if (locStreet && recStreet && (locStreet.includes(recStreet) || recStreet.includes(locStreet))) {
            return true;
          }
          if (isParentOrChild) {
            return true;
          }
        }

        // 5. Full Address inclusion match
        if (locFullAddr && recStreet && recCity && locFullAddr.includes(recStreet) && locFullAddr.includes(recCity)) {
          return true;
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
    [allSystemRecords, parentCompany]
  );

  const performDiscovery = useCallback(async () => {
    if (!parentCompany) return;

    setSearching(true);
    setDiscoveredLocations([]);
    setScanSummary(null);

    const coreName = parentCompany.companyName.split(' - ')[0].trim();
    const websiteUrl = parentCompany.websiteUrl || (parentCompany as any).website || '';
    const discoveredList: DiscoveredLocation[] = [];

    // --- CHANNEL 1: AI & Web Scraper + Hunter.io ---
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

          discoveredList.push({
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

    // --- CHANNEL 2: Google Places Search (Client JS SDK or fallback) ---
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

                // Avoid duplicating locations already found by AI
                const isAlreadyAdded = discoveredList.some((existing) => {
                  const addrMatch = existing.formattedAddress.toLowerCase() === (place.formatted_address || '').toLowerCase();
                  const suburbMatch = suburb && existing.suburb && existing.suburb.toLowerCase() === suburb.toLowerCase();
                  return addrMatch || (suburbMatch && existing.name.toLowerCase().includes(coreName.toLowerCase()));
                });

                if (!isAlreadyAdded) {
                  discoveredList.push({
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

    setDiscoveredLocations(discoveredList);
    setSearching(false);

    if (discoveredList.length === 0) {
      toast({ variant: 'destructive', title: 'Scan Complete', description: `No multi-site branch locations found for ${coreName}.` });
    } else {
      toast({
        title: 'Multi-Site Discovery Complete',
        description: `Found ${discoveredList.length} total branch sites across Australia.`,
      });
    }
  }, [parentCompany, map, matchLocationToDatabase, toast]);

  useEffect(() => {
    if (isOpen && parentCompany) {
      performDiscovery();
    }
  }, [isOpen, parentCompany, performDiscovery]);

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
        return nameMatch || addrMatch || suburbMatch || stateMatch;
      }

      return true;
    });
  }, [discoveredLocations, activeTab, searchFilter]);

  if (!parentCompany) return null;

  const countSigned = discoveredLocations.filter((l) => l.status === 'Signed Customer').length;
  const countLeads = discoveredLocations.filter((l) => l.status === 'Lead').length;
  const countNew = discoveredLocations.filter((l) => l.status === 'Not in System').length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] md:w-full h-[88vh] max-h-[88vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Building className="h-5 w-5 text-primary" />
            Discover Multi-Sites for {parentCompany.companyName}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Multi-source discovery scanning Google web search results, online store locators, Hunter.io domain intelligence, and Google Places cross-referenced against your ProspectPlus database.
          </DialogDescription>
        </DialogHeader>

        {searching ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 my-auto">
            <Loader />
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-slate-800 animate-pulse flex items-center justify-center gap-2">
                <Globe className="h-4 w-4 text-purple-600 animate-spin" />
                Scraping Google search, online store locators, Hunter.io API & Google Places...
              </p>
              <p className="text-xs text-muted-foreground">
                Discovering physical branch addresses online and matching existing leads & signed customer records...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-hidden pt-1">
            {/* Top controls box (shrink-0) */}
            <div className="shrink-0 space-y-3">
              {/* Scan Summary Banner */}
              {scanSummary && (
                <div className="bg-purple-50/80 border border-purple-200 text-purple-900 px-3.5 py-2 rounded-lg text-xs flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
                  <span><strong>AI Insights:</strong> {scanSummary}</span>
                </div>
              )}

              {/* Metric Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-3 rounded-xl border">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Total Sites</span>
                  <p className="text-2xl font-bold text-slate-900">{discoveredLocations.length}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-emerald-600 font-medium uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Signed Customers
                  </span>
                  <p className="text-2xl font-bold text-emerald-700">{countSigned}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-blue-600 font-medium uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Leads in Pipeline
                  </span>
                  <p className="text-2xl font-bold text-blue-700">{countLeads}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-purple-600 font-medium uppercase tracking-wider flex items-center gap-1">
                    <PlusCircle className="h-3 w-3" /> New Sites (Not in System)
                  </span>
                  <p className="text-2xl font-bold text-purple-700">{countNew}</p>
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
                  <Button
                    size="sm"
                    variant={activeTab === 'all' ? 'secondary' : 'ghost'}
                    className="text-xs h-7 px-3 font-medium"
                    onClick={() => setActiveTab('all')}
                  >
                    All Sites ({discoveredLocations.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTab === 'new' ? 'secondary' : 'ghost'}
                    className="text-xs h-7 px-3 font-medium text-purple-700 hover:text-purple-800"
                    onClick={() => setActiveTab('new')}
                  >
                    Not in System ({countNew})
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTab === 'lead' ? 'secondary' : 'ghost'}
                    className="text-xs h-7 px-3 font-medium text-blue-700 hover:text-blue-800"
                    onClick={() => setActiveTab('lead')}
                  >
                    Leads in Pipeline ({countLeads})
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTab === 'signed' ? 'secondary' : 'ghost'}
                    className="text-xs h-7 px-3 font-medium text-emerald-700 hover:text-emerald-800"
                    onClick={() => setActiveTab('signed')}
                  >
                    Signed Customers ({countSigned})
                  </Button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter by suburb, state, name..."
                    className="pl-8 h-8 text-xs bg-background"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Locations List (Native Scroll Container flex-1 min-h-0 overflow-y-auto) */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-3">
              {filteredLocations.length > 0 ? (
                <div className="space-y-3 pb-2">
                  {filteredLocations.map((item) => (
                    <Card
                      key={item.id}
                      className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-sm transition-shadow border-slate-200"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm text-slate-900">{item.name}</h4>

                          {/* Status Badge */}
                          {item.status === 'Signed Customer' && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold">
                              <CheckCircle2 className="h-3 w-3 mr-1 shrink-0" /> Signed Customer in App
                            </Badge>
                          )}
                          {item.status === 'Lead' && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-semibold">
                              <Sparkles className="h-3 w-3 mr-1 shrink-0" /> Lead in Pipeline
                            </Badge>
                          )}
                          {item.status === 'Not in System' && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[11px] font-semibold">
                              <PlusCircle className="h-3 w-3 mr-1 shrink-0" /> Not in System
                            </Badge>
                          )}

                          {/* Source Tag */}
                          <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 font-normal">
                            {(item.source === 'AI / Web Search' || item.source === 'AI / Website') && <Globe className="h-3 w-3 mr-1 text-purple-600" />}
                            {item.source === 'Hunter.io' && <Mail className="h-3 w-3 mr-1 text-rose-600" />}
                            {item.source === 'Google Search' && <Search className="h-3 w-3 mr-1 text-blue-600" />}
                            {item.source === 'Google Maps' && <MapPin className="h-3 w-3 mr-1 text-amber-600" />}
                            {item.source}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>{item.formattedAddress}</span>
                        </p>

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

                      {/* Action Button */}
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

                        {item.status === 'Lead' && item.existingRecord && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 border-blue-300 text-blue-800 hover:bg-blue-50 font-medium"
                            onClick={() => window.open(`/leads/${item.existingRecord!.id}`, '_blank')}
                          >
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View Lead
                          </Button>
                        )}

                        {item.status === 'Not in System' && (
                          <Button
                            size="sm"
                            className="text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white shadow-sm font-medium"
                            onClick={() => {
                              onAddMultiSiteLead(item.place || item);
                              onOpenChange(false);
                            }}
                          >
                            <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Multi-Site Lead
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-muted-foreground text-xs space-y-2">
                  <Building className="h-8 w-8 text-slate-300 mx-auto" />
                  <p>No multi-site locations match the current tab or search filter.</p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 pt-3 border-t flex flex-row justify-between items-center">
          <Button variant="outline" size="sm" className="text-xs" onClick={performDiscovery} disabled={searching}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${searching ? 'animate-spin' : ''}`} /> Re-Scan Multi-Sites
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
