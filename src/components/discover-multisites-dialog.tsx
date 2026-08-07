'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import type { MapLead, Lead, Address } from '@/lib/types';
import { Building, MapPin, Globe, ExternalLink, PlusCircle, CheckCircle2, AlertCircle, Search, Sparkles } from 'lucide-react';

interface DiscoveredLocation {
  place: google.maps.places.PlaceResult;
  existingRecord?: MapLead;
  status: 'Signed Customer' | 'Lead' | 'Not in System';
  formattedAddress: string;
}

interface DiscoverMultiSitesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  parentCompany: MapLead | Lead | null;
  allSystemRecords: MapLead[];
  map: google.maps.Map | null;
  onAddMultiSiteLead: (place: google.maps.places.PlaceResult) => void;
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

  const matchLocationToDatabase = useCallback(
    (place: google.maps.places.PlaceResult): { status: 'Signed Customer' | 'Lead' | 'Not in System'; existingRecord?: MapLead } => {
      if (!place.address_components && !place.vicinity) {
        return { status: 'Not in System' };
      }

      const getComponent = (type: string, useShort = false) => {
        const comp = place.address_components?.find((c) => c.types.includes(type));
        return (useShort ? comp?.short_name : comp?.long_name) || '';
      };

      const placeSuburb = (getComponent('locality') || getComponent('postal_town') || '').trim().toLowerCase();
      const placePostcode = (getComponent('postal_code') || '').trim().toLowerCase();
      const placeStreet = (getComponent('street_number') + ' ' + getComponent('route')).trim().toLowerCase();
      const placeLat = place.geometry?.location?.lat();
      const placeLng = place.geometry?.location?.lng();

      const matchedRecord = allSystemRecords.find((rec) => {
        const recAddress = rec.address as Address | undefined;
        const recCity = ((recAddress?.city || (rec as any).city || '') as string).trim().toLowerCase();
        const recZip = ((recAddress?.zip || (rec as any).zip || '') as string).trim().toLowerCase();
        const recStreet = ((recAddress?.street || (rec as any).street || '') as string).trim().toLowerCase();

        // 1. Check Lat/Lng proximity match if available
        if (placeLat != null && placeLng != null && rec.latitude != null && rec.longitude != null && window.google?.maps?.geometry) {
          const p1 = new window.google.maps.LatLng(placeLat, placeLng);
          const p2 = new window.google.maps.LatLng(rec.latitude, rec.longitude);
          const dist = window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
          if (dist <= 250) return true; // within 250 meters
        }

        // 2. Postcode AND (Suburb OR Street) match
        if (placePostcode && recZip && placePostcode === recZip) {
          if (placeSuburb && recCity && (placeSuburb.includes(recCity) || recCity.includes(placeSuburb))) {
            return true;
          }
          if (placeStreet && recStreet && (placeStreet.includes(recStreet) || recStreet.includes(placeStreet))) {
            return true;
          }
        }

        // 3. Exact Suburb match AND partial company name match
        if (placeSuburb && recCity && placeSuburb === recCity) {
          const coreName = (parentCompany?.companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const recName = (rec.companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (coreName && recName.includes(coreName)) {
            return true;
          }
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
    if (!parentCompany || !map) return;

    setSearching(true);
    setDiscoveredLocations([]);

    const coreName = parentCompany.companyName.split(' - ')[0];

    const placesService = new window.google.maps.places.PlacesService(map);
    const request: google.maps.places.TextSearchRequest = {
      query: `${coreName} Australia`,
      region: 'AU',
    };

    placesService.textSearch(request, async (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
        const operationalResults = results.filter((p) => p.business_status !== 'CLOSED_PERMANENTLY');

        const detailedPromises = operationalResults.map((place): Promise<DiscoveredLocation | null> => {
          return new Promise((resolve) => {
            if (!place.place_id) {
              const match = matchLocationToDatabase(place);
              resolve({
                place,
                existingRecord: match.existingRecord,
                status: match.status,
                formattedAddress: place.formatted_address || place.vicinity || 'Address N/A',
              });
              return;
            }

            placesService.getDetails(
              {
                placeId: place.place_id,
                fields: [
                  'name',
                  'formatted_address',
                  'address_components',
                  'website',
                  'formatted_phone_number',
                  'geometry',
                  'place_id',
                  'business_status',
                  'vicinity',
                ],
              },
              (detailedPlace, detailStatus) => {
                const targetPlace = detailStatus === google.maps.places.PlacesServiceStatus.OK && detailedPlace ? detailedPlace : place;
                const match = matchLocationToDatabase(targetPlace);
                resolve({
                  place: targetPlace,
                  existingRecord: match.existingRecord,
                  status: match.status,
                  formattedAddress: targetPlace.formatted_address || targetPlace.vicinity || 'Address N/A',
                });
              }
            );
          });
        });

        const list = (await Promise.all(detailedPromises)).filter((item): item is DiscoveredLocation => item !== null);
        setDiscoveredLocations(list);
      } else {
        toast({ variant: 'destructive', title: 'Search Complete', description: `No branch locations found for ${coreName}.` });
      }
      setSearching(false);
    });
  }, [parentCompany, map, matchLocationToDatabase, toast]);

  useEffect(() => {
    if (isOpen && parentCompany) {
      performDiscovery();
    }
  }, [isOpen, parentCompany, performDiscovery]);

  if (!parentCompany) return null;

  const countSigned = discoveredLocations.filter((l) => l.status === 'Signed Customer').length;
  const countLeads = discoveredLocations.filter((l) => l.status === 'Lead').length;
  const countNew = discoveredLocations.filter((l) => l.status === 'Not in System').length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] md:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building className="h-5 w-5 text-primary" />
            Discover Multi-sites for {parentCompany.companyName}
          </DialogTitle>
          <DialogDescription>
            Automated search for all Australian locations of {parentCompany.companyName} cross-referenced against your existing database.
          </DialogDescription>
        </DialogHeader>

        {searching ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader />
            <p className="text-sm text-muted-foreground animate-pulse flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              Searching Google Places across Australia and matching database records...
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Summary Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-4 rounded-xl border">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Total Locations</span>
                <p className="text-2xl font-bold">{discoveredLocations.length}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-emerald-600 font-medium">Signed Customers</span>
                <p className="text-2xl font-bold text-emerald-700">{countSigned}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-blue-600 font-medium">Leads in Pipeline</span>
                <p className="text-2xl font-bold text-blue-700">{countLeads}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-purple-600 font-medium">New Opportunities</span>
                <p className="text-2xl font-bold text-purple-700">{countNew}</p>
              </div>
            </div>

            {/* Discovered Locations List */}
            <ScrollArea className="max-h-[55vh] pr-2">
              {discoveredLocations.length > 0 ? (
                <div className="space-y-3">
                  {discoveredLocations.map((item, idx) => (
                    <Card key={item.place.place_id || idx} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-base">{item.place.name}</h4>
                          {item.status === 'Signed Customer' && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Signed Customer
                            </Badge>
                          )}
                          {item.status === 'Lead' && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold">
                              <Sparkles className="h-3 w-3 mr-1" /> Lead in Pipeline
                            </Badge>
                          )}
                          {item.status === 'Not in System' && (
                            <Badge variant="secondary" className="text-xs font-semibold">
                              Not in System
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span>{item.formattedAddress}</span>
                        </p>

                        {item.place.website && (
                          <a
                            href={item.place.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                          >
                            <Globe className="h-3 w-3" />
                            <span>Visit Website</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                        {item.status === 'Signed Customer' && item.existingRecord && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => window.open(`/companies/${item.existingRecord!.id}`, '_blank')}
                          >
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View Customer
                          </Button>
                        )}

                        {item.status === 'Lead' && item.existingRecord && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => window.open(`/leads/${item.existingRecord!.id}`, '_blank')}
                          >
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View Lead
                          </Button>
                        )}

                        {item.status === 'Not in System' && (
                          <Button
                            size="sm"
                            className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={() => {
                              onAddMultiSiteLead(item.place);
                              onOpenChange(false);
                            }}
                          >
                            <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Multi-site Lead
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No multi-site locations discovered for this company.
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="border-t pt-3 flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={performDiscovery} disabled={searching}>
            <Search className="mr-2 h-4 w-4" /> Re-scan Locations
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
