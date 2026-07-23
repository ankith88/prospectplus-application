'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { MapPin, Navigation, Copy, Check, ExternalLink, Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

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

interface ClosestAusPostBannerProps {
  lead: any;
}

export function ClosestAusPostBanner({ lead }: ClosestAusPostBannerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [closestLocation, setClosestLocation] = useState<{
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
  } | null>(null);

  // Extract site address & coordinates directly from root lead fields
  const leadLatStr = lead?.latitude ?? lead?.address?.lat;
  const leadLngStr = lead?.longitude ?? lead?.address?.lng;
  const leadLat = leadLatStr != null && !isNaN(Number(leadLatStr)) ? Number(leadLatStr) : null;
  const leadLng = leadLngStr != null && !isNaN(Number(leadLngStr)) ? Number(leadLngStr) : null;

  const leadZip = (lead?.zip || lead?.address?.zip || (lead as any)?.postcode || '').toString().trim();
  const leadCity = (lead?.city || lead?.address?.city || (lead as any)?.suburb || '').toString().trim();
  const leadState = (lead?.state || lead?.address?.state || '').toString().trim();

  const fetchClosestLocation = useCallback(async () => {
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
        setClosestLocation(null);
        setLoading(false);
        return;
      }

      const scored = ausPostLocs.map((loc) => {
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

      const topMatch = scored[0];
      setClosestLocation(topMatch || null);
    } catch (err) {
      console.error('Failed to fetch closest AusPost partner location:', err);
      setClosestLocation(null);
    } finally {
      setLoading(false);
    }
  }, [leadLat, leadLng, leadZip, leadCity, leadState]);

  useEffect(() => {
    fetchClosestLocation();
  }, [fetchClosestLocation]);

  const hasAnyAddressData = Boolean(leadLat !== null || leadZip || leadCity || leadState || lead?.street || lead?.address1 || lead?.address?.street);

  if (!hasAnyAddressData) {
    return (
      <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 mt-4">
        <MapPin className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>No site address details provided to determine the closest AusPost location.</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-muted-foreground flex items-center justify-center gap-2 mt-4">
        <Loader2 className="w-4 h-4 animate-spin text-red-600" />
        <span>Finding closest AusPost location...</span>
      </div>
    );
  }

  if (!closestLocation) {
    return (
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-muted-foreground flex items-center gap-2 mt-4">
        <Building2 className="w-4 h-4 text-red-600 shrink-0" />
        <span>No AusPost partner locations found nearby.</span>
      </div>
    );
  }

  const formattedAddress = [
    closestLocation.address1,
    closestLocation.address2,
    closestLocation.suburb,
    closestLocation.state,
    closestLocation.postCode
  ]
    .filter(Boolean)
    .join(', ');

  const getDistanceBadgeText = () => {
    if (closestLocation.distanceKm !== null) {
      if (closestLocation.distanceKm < 1) {
        return `${Math.round(closestLocation.distanceKm * 1000)} m away`;
      }
      return `${closestLocation.distanceKm.toFixed(1)} km away`;
    }
    if (closestLocation.isPostcodeMatch) {
      return `Postcode Match (${closestLocation.postCode || leadZip})`;
    }
    if (closestLocation.isSuburbMatch) {
      return `Suburb Match (${closestLocation.suburb || leadCity})`;
    }
    return 'AusPost Partner';
  };

  const handleCopyAddress = () => {
    const textToCopy = `${closestLocation.name}: ${formattedAddress}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast({
      title: 'Address Copied',
      description: 'AusPost partner location address copied to clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${closestLocation.name}, ${formattedAddress}`)}`;

  return (
    <div className="p-3.5 rounded-xl border-2 border-red-200/80 dark:border-red-900/50 bg-gradient-to-br from-red-50/70 via-rose-50/30 to-background dark:from-red-950/20 dark:via-rose-950/10 dark:to-background space-y-2 mt-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
            AusPost
          </span>
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
            Closest AusPost Location
          </h4>
        </div>
        <Badge
          variant="outline"
          className="bg-red-100/80 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800 text-[11px] font-semibold"
        >
          <Navigation className="w-3 h-3 mr-1 text-red-600" />
          {getDistanceBadgeText()}
        </Badge>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground leading-snug">{closestLocation.name}</p>
        <p className="text-xs text-muted-foreground leading-normal flex items-start gap-1">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <span>{formattedAddress}</span>
        </p>
      </div>

      {(closestLocation.phone || closestLocation.siteAccessCode) && (
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-red-100 dark:border-red-900/30 flex-wrap">
          {closestLocation.phone && (
            <span>
              <strong className="font-semibold text-foreground">Phone:</strong> {closestLocation.phone}
            </span>
          )}
          {closestLocation.siteAccessCode && (
            <span>
              <strong className="font-semibold text-foreground">Access Code:</strong> {closestLocation.siteAccessCode}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground"
          onClick={handleCopyAddress}
        >
          {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs px-2.5 bg-background border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950 text-red-700 dark:text-red-300 font-medium"
          asChild
        >
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5 mr-1 text-red-600" />
            Directions
          </a>
        </Button>
      </div>
    </div>
  );
}
