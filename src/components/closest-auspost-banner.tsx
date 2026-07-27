'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { MapPin, Navigation, Copy, Check, ExternalLink, Loader2, Building2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function calculateDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
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

interface LocationItem {
  id: string;
  name: string;
  address1?: string;
  address2?: string;
  suburb?: string;
  state?: string;
  postCode?: string;
  phone?: string;
  siteAccessCode?: string;
  distanceKm: number | null;
  isPostcodeMatch: boolean;
  isSuburbMatch: boolean;
}

interface ClosestAusPostBannerProps {
  lead: any;
  ausPostParentLpoId?: string | null;
  ausPostLpoName?: string | null;
  ausPostLpoCompany?: any;
  lpoConnectActive?: boolean;
}

export function ClosestAusPostBanner({
  lead,
  ausPostParentLpoId,
  ausPostLpoName,
  ausPostLpoCompany,
  lpoConnectActive,
}: ClosestAusPostBannerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [closestLocations, setClosestLocations] = useState<LocationItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [linkedLpoDetails, setLinkedLpoDetails] = useState<any>(null);

  // Extract site address & coordinates directly from root lead fields
  const leadLatStr = lead?.latitude ?? lead?.address?.lat;
  const leadLngStr = lead?.longitude ?? lead?.address?.lng;
  const leadLat = leadLatStr != null && !isNaN(Number(leadLatStr)) ? Number(leadLatStr) : null;
  const leadLng = leadLngStr != null && !isNaN(Number(leadLngStr)) ? Number(leadLngStr) : null;

  const leadZip = (lead?.zip || lead?.address?.zip || (lead as any)?.postcode || '').toString().trim();
  const leadCity = (lead?.city || lead?.address?.city || (lead as any)?.suburb || '').toString().trim();
  const leadState = (lead?.state || lead?.address?.state || '').toString().trim();

  // Fetch Linked LPO full details if parent LPO ID exists
  useEffect(() => {
    const fetchLpoDetails = async () => {
      if (!ausPostParentLpoId) {
        setLinkedLpoDetails(null);
        return;
      }
      try {
        const compRef = doc(firestore, 'companies', ausPostParentLpoId);
        const compSnap = await getDoc(compRef);
        if (compSnap.exists()) {
          setLinkedLpoDetails({ id: compSnap.id, ...compSnap.data() });
          return;
        }
        const leadRef = doc(firestore, 'leads', ausPostParentLpoId);
        const leadSnap = await getDoc(leadRef);
        if (leadSnap.exists()) {
          setLinkedLpoDetails({ id: leadSnap.id, ...leadSnap.data() });
          return;
        }
        const locRef = doc(firestore, 'partner_locations', ausPostParentLpoId);
        const locSnap = await getDoc(locRef);
        if (locSnap.exists()) {
          setLinkedLpoDetails({ id: locSnap.id, ...locSnap.data() });
          return;
        }
      } catch (e) {
        console.error('Error fetching Linked LPO address details:', e);
      }
    };
    fetchLpoDetails();
  }, [ausPostParentLpoId]);

  const fetchClosestLocations = useCallback(async () => {
    setLoading(true);
    try {
      const locationsSnap = await getDocs(collection(firestore, 'partner_locations'));
      const ausPostLocs: any[] = [];

      locationsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const locType = (data.locationType || data.type || '').toString().trim();
        if (locType.toLowerCase() === 'auspost') {
          ausPostLocs.push({ id: docSnap.id, ...data });
        }
      });

      if (ausPostLocs.length === 0) {
        setClosestLocations([]);
        setLoading(false);
        return;
      }

      const scored: LocationItem[] = ausPostLocs.map((loc) => {
        const locLat = parseFloat(loc.lat || loc.latitude);
        const locLng = parseFloat(loc.lng || loc.longitude);
        const hasCoords = leadLat !== null && leadLng !== null && !isNaN(locLat) && !isNaN(locLng);
        const distanceKm = hasCoords ? calculateDistanceInKm(leadLat, leadLng, locLat, locLng) : null;

        const locPostcode = (loc.postCode || loc.postcode || '').toString().trim();
        const locSuburb = (loc.suburb || loc.city || '').toString().trim().toLowerCase();

        const isPostcodeMatch = Boolean(leadZip && locPostcode === leadZip);
        const isSuburbMatch = Boolean(leadCity && locSuburb === leadCity.toLowerCase());

        return {
          id: loc.id || loc.internalId,
          name: loc.name || 'AusPost Partner',
          address1: loc.address1,
          address2: loc.address2,
          suburb: loc.suburb,
          state: loc.state,
          postCode: loc.postCode || loc.postcode,
          phone: loc.phone,
          siteAccessCode: loc.siteAccessCode,
          distanceKm,
          isPostcodeMatch,
          isSuburbMatch,
        };
      });

      // Sort priority: lowest distance, then postcode match, then suburb match
      scored.sort((a, b) => {
        if (a.distanceKm !== null && b.distanceKm !== null) {
          return a.distanceKm - b.distanceKm;
        }
        if (a.distanceKm !== null) return -1;
        if (b.distanceKm !== null) return 1;

        if (a.isPostcodeMatch && !b.isPostcodeMatch) return -1;
        if (b.isPostcodeMatch && !a.isPostcodeMatch) return 1;

        if (a.isSuburbMatch && !b.isSuburbMatch) return -1;
        if (b.isSuburbMatch && !a.isSuburbMatch) return 1;

        return 0;
      });

      // Keep top 3 closest locations
      setClosestLocations(scored.slice(0, 3));
      setSelectedIdx(0);
    } catch (err) {
      console.error('Failed to fetch closest AusPost partner locations:', err);
      setClosestLocations([]);
    } finally {
      setLoading(false);
    }
  }, [leadLat, leadLng, leadZip, leadCity, leadState]);

  useEffect(() => {
    fetchClosestLocations();
  }, [fetchClosestLocations]);

  const hasAnyAddressData = Boolean(leadLat !== null || leadZip || leadCity || leadState || lead?.street || lead?.address1 || lead?.address?.street);

  if (!hasAnyAddressData) {
    return (
      <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 mt-4">
        <MapPin className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>No site address details provided to determine closest AusPost locations.</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-muted-foreground flex items-center justify-center gap-2 mt-4">
        <Loader2 className="w-4 h-4 animate-spin text-red-600" />
        <span>Finding closest AusPost locations...</span>
      </div>
    );
  }

  if (closestLocations.length === 0) {
    return (
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-muted-foreground flex items-center gap-2 mt-4">
        <Building2 className="w-4 h-4 text-red-600 shrink-0" />
        <span>No AusPost partner locations found nearby.</span>
      </div>
    );
  }

  const currentLoc = closestLocations[selectedIdx] || closestLocations[0];

  const formattedAddress = [
    currentLoc.address1,
    currentLoc.address2,
    currentLoc.suburb,
    currentLoc.state,
    currentLoc.postCode
  ]
    .filter(Boolean)
    .join(', ');

  const getDistanceBadgeText = (loc: LocationItem) => {
    if (loc.distanceKm !== null) {
      if (loc.distanceKm < 1) {
        return `${Math.round(loc.distanceKm * 1000)} m away`;
      }
      return `${loc.distanceKm.toFixed(1)} km away`;
    }
    if (loc.isPostcodeMatch) {
      return `Postcode Match (${loc.postCode || leadZip})`;
    }
    if (loc.isSuburbMatch) {
      return `Suburb Match (${loc.suburb || leadCity})`;
    }
    return 'AusPost Partner';
  };

  const handleCopyAddress = () => {
    const textToCopy = `${currentLoc.name}: ${formattedAddress}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast({
      title: 'Address Copied',
      description: 'AusPost partner location address copied to clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${currentLoc.name}, ${formattedAddress}`)}`;

  const hasLinkedLpo = Boolean(ausPostParentLpoId || ausPostLpoName);

  // Format Linked LPO Address
  const getLinkedLpoAddress = () => {
    const comp = ausPostLpoCompany || linkedLpoDetails;
    if (!comp) return null;
    const addr = comp.address || comp;
    const parts = [
      addr.address1,
      addr.street || addr.address,
      addr.city || addr.suburb || addr.locality,
      addr.state,
      addr.zip || addr.postcode || addr.postCode
    ].filter(p => p && String(p).trim() !== '' && String(p).trim() !== 'undefined');
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const linkedLpoAddress = getLinkedLpoAddress();

  return (
    <div className="p-3.5 rounded-xl border-2 border-red-200/80 dark:border-red-900/50 bg-gradient-to-br from-red-50/70 via-rose-50/30 to-background dark:from-red-950/20 dark:via-rose-950/10 dark:to-background space-y-2.5 mt-4 shadow-sm">
      {/* 1. Top Header Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
            AusPost
          </span>
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
            Closest AusPost Locations
          </h4>
        </div>
      </div>

      {/* 2. Active Linked LPO Section (If Active Linked LPO present) */}
      {hasLinkedLpo && (
        <div className="p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 text-xs space-y-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Link2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Linked LPO:</span>
              {ausPostParentLpoId ? (
                <a
                  href={`/companies/${ausPostParentLpoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center gap-1 font-bold"
                >
                  {ausPostLpoName || linkedLpoDetails?.companyName || linkedLpoDetails?.name || ausPostParentLpoId}
                  <ExternalLink className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                </a>
              ) : (
                <span>{ausPostLpoName || 'Active LPO'}</span>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 shrink-0",
                lpoConnectActive
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200 font-bold"
                  : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300"
              )}
            >
              {lpoConnectActive ? 'LPO-Connect Active' : 'LPO-Connect Inactive'}
            </Badge>
          </div>

          {/* Full Address of Linked LPO */}
          {linkedLpoAddress ? (
            <p className="text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-1 pt-0.5 font-medium leading-tight">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span>{linkedLpoAddress}</span>
            </p>
          ) : (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 italic">
              Linked LPO ID: {ausPostParentLpoId}
            </p>
          )}
        </div>
      )}

      {/* 3. Location Selector Tabs Row (Placed BELOW the Linked LPO section) */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <span className="text-[11px] font-semibold text-muted-foreground mr-1">Closest 3 Locations:</span>
        <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-900/80 p-0.5 rounded-lg border border-red-200/80 dark:border-red-900/60 shadow-xs">
          {closestLocations.map((loc, idx) => {
            const isSelected = idx === selectedIdx;
            const distLabel = loc.distanceKm !== null
              ? (loc.distanceKm < 1 ? `${Math.round(loc.distanceKm * 1000)}m` : `${loc.distanceKm.toFixed(1)}km`)
              : (loc.isPostcodeMatch ? 'Postcode' : loc.isSuburbMatch ? 'Suburb' : '');

            return (
              <button
                key={loc.id || idx}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer",
                  isSelected
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
                title={`${loc.name}${distLabel ? ` (${distLabel})` : ''}`}
              >
                <span>#{idx + 1}</span>
                {distLabel && <span className="opacity-90">{distLabel}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Selected Location Card Content */}
      <div className="space-y-1 pt-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-foreground leading-snug truncate">{currentLoc.name}</p>
          <Badge
            variant="outline"
            className="bg-red-100/80 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800 text-[10px] font-semibold shrink-0"
          >
            <Navigation className="w-2.5 h-2.5 mr-1 text-red-600" />
            {getDistanceBadgeText(currentLoc)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-normal flex items-start gap-1">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <span className="truncate">{formattedAddress}</span>
        </p>
      </div>

      {/* Phone / Access Code Footer */}
      {(currentLoc.phone || currentLoc.siteAccessCode) && (
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-red-100 dark:border-red-900/30 flex-wrap">
          {currentLoc.phone && (
            <span>
              <strong className="font-semibold text-foreground">Phone:</strong> {currentLoc.phone}
            </span>
          )}
          {currentLoc.siteAccessCode && (
            <span>
              <strong className="font-semibold text-foreground">Access Code:</strong> {currentLoc.siteAccessCode}
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
          onClick={handleCopyAddress}
        >
          {copied ? <Check className="w-3 h-3 mr-1 text-emerald-600" /> : <Copy className="w-3 h-3 mr-1" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs px-2 bg-background border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950 text-red-700 dark:text-red-300 font-medium"
          asChild
        >
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3 h-3 mr-1 text-red-600" />
            Directions
          </a>
        </Button>
      </div>
    </div>
  );
}
