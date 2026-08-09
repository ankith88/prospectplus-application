'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Franchisee, SuburbMapping } from '@/lib/types';
import { getAllFranchisees } from '@/services/firebase';
import { GoogleMap, InfoWindowF, Autocomplete, PolygonF, MarkerF } from '@react-google-maps/api';
import { useGoogleMapsScript } from '@/hooks/use-google-maps';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { exportSuburbMappingsToCSV, CATEGORY_LABELS } from '@/lib/territory-export';
import { MapPin, User, Mail, Phone, CheckCircle2, AlertTriangle, X, Download, Layers, RefreshCw, Check, ChevronsUpDown } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: -25.2744,
  lng: 133.7751,
};

interface TerritoryOverlay {
  id: string;
  franchisee: Franchisee;
  suburb: string;
  postcode: string;
  state: string;
  categoryKey: string;
  categoryLabel: string;
  center: google.maps.LatLngLiteral;
}

// Helper to extract suburb, state, postcode from Google Place address components
const getAddressComponents = (place: google.maps.places.PlaceResult) => {
  let suburb = '';
  let state = '';
  let postcode = '';

  if (place.address_components) {
    for (const comp of place.address_components) {
      if (comp.types.includes('locality') || comp.types.includes('sublocality') || comp.types.includes('sublocality_level_1')) {
        if (!suburb) suburb = comp.long_name.trim();
      }
      if (comp.types.includes('administrative_area_level_1')) {
        state = comp.short_name.trim();
      }
      if (comp.types.includes('postal_code')) {
        postcode = comp.long_name.trim();
      }
    }
  }

  return { suburb, state, postcode };
};

const STATE_CENTERS: Record<string, google.maps.LatLngLiteral> = {
  NSW: { lat: -33.8688, lng: 151.2093 },
  VIC: { lat: -37.8136, lng: 144.9631 },
  QLD: { lat: -27.4698, lng: 153.0251 },
  WA:  { lat: -31.9505, lng: 115.8605 },
  SA:  { lat: -34.9285, lng: 138.6007 },
  TAS: { lat: -42.8821, lng: 147.3272 },
  ACT: { lat: -35.2809, lng: 149.1300 },
  NT:  { lat: -12.4634, lng: 130.8456 },
};

function inferStateFromPostcode(postcode?: string | number): string {
  if (!postcode) return '';
  const code = parseInt(String(postcode).trim(), 10);
  if (isNaN(code)) return '';

  if ((code >= 1000 && code <= 2599) || (code >= 2619 && code <= 2899) || (code >= 2921 && code <= 2999)) return 'NSW';
  if (code >= 2600 && code <= 2618) return 'ACT';
  if (code >= 3000 && code <= 3999) return 'VIC';
  if (code >= 4000 && code <= 4999) return 'QLD';
  if (code >= 5000 && code <= 5999) return 'SA';
  if (code >= 6000 && code <= 6999) return 'WA';
  if (code >= 7000 && code <= 7999) return 'TAS';
  if (code >= 800 && code <= 999) return 'NT';

  return '';
}

function getApproxStateCoordinates(state?: string, postcode?: string | number): google.maps.LatLngLiteral {
  let st = (state || '').trim().toUpperCase();
  if (!st || !STATE_CENTERS[st]) {
    st = inferStateFromPostcode(postcode);
  }

  const base = STATE_CENTERS[st] || STATE_CENTERS.NSW;
  return {
    lat: Number((base.lat + (Math.random() - 0.5) * 0.08).toFixed(6)),
    lng: Number((base.lng + (Math.random() - 0.5) * 0.08).toFixed(6)),
  };
}

// Generate a pastel color for each franchisee for clear visual distinction
const getFranchiseeColor = (internalId: string) => {
  let hash = 0;
  for (let i = 0; i < internalId.length; i++) {
    hash = internalId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 50%)`;
};

// Generates a multi-vertex smoothed polygon (16 vertices) around center lat/lng if no GeoJSON boundary is cached
function generatePolygonFallback(lat: number, lng: number, radiusKm: number = 2.4): google.maps.LatLngLiteral[][] {
  const points: google.maps.LatLngLiteral[] = [];
  const numVertices = 16;
  const latRadius = radiusKm / 111;
  const lngRadius = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  for (let i = 0; i < numVertices; i++) {
    const angle = (i * 2 * Math.PI) / numVertices;
    const factor = 0.88 + 0.24 * Math.sin(i * 3 + lat * 10);
    const pLat = lat + latRadius * Math.sin(angle) * factor;
    const pLng = lng + lngRadius * Math.cos(angle) * factor;
    points.push({ lat: Number(pLat.toFixed(6)), lng: Number(pLng.toFixed(6)) });
  }

  if (points.length > 0) {
    points.push({ ...points[0] });
  }

  return [points];
}

export default function TerritoryMapClient() {
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [overlays, setOverlays] = useState<TerritoryOverlay[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeOverlay, setActiveOverlay] = useState<TerritoryOverlay | null>(null);
  const [hoveredOverlayId, setHoveredOverlayId] = useState<string | null>(null);

  // Filters
  const [selectedFranchiseeId, setSelectedFranchiseeId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('territoryJson');
  const [franchiseeSearchOpen, setFranchiseeSearchOpen] = useState(false);

  const selectedFranchiseeLabel = useMemo(() => {
    if (selectedFranchiseeId === 'all') return `All Franchisees (${franchisees.length})`;
    const found = franchisees.find(f => f.internalId === selectedFranchiseeId);
    return found ? (found.name || found.internalId) : 'Select Franchisee...';
  }, [selectedFranchiseeId, franchisees]);

  // Polygon boundary geometries cache
  const [boundariesMap, setBoundariesMap] = useState<Record<string, google.maps.LatLngLiteral[][]>>({});

  // Address search states
  const [placeAutocomplete, setPlaceAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [showAddressInfoWindow, setShowAddressInfoWindow] = useState<boolean>(true);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { toast } = useToast();
  const { isLoaded, loadError } = useGoogleMapsScript();

  // Load all franchisees from Firestore
  useEffect(() => {
    async function loadData() {
      try {
        const data = await getAllFranchisees();
        data.sort((a, b) => {
          const nameA = (a.name || a.internalId).toLowerCase();
          const nameB = (b.name || b.internalId).toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setFranchisees(data);
      } catch (error) {
        console.error('Failed to load franchisees:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load franchisee data' });
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, [toast]);

  // Extract overlays based on selected category & franchisees
  useEffect(() => {
    if (!isLoaded || loadingData || franchisees.length === 0) return;

    const categoriesToExtract: { key: keyof Franchisee; label: string }[] = [
      { key: 'territoryJson', label: 'Main Territory' },
      { key: 'starTrackSuburbsJson', label: 'StarTrack' },
      { key: 'tgeSuburbsJSON', label: 'TGE' },
      { key: 'ironMountainSuburbsJson', label: 'Iron Mountain' },
      { key: 'ausPostSuburbsJson', label: 'AusPost' },
    ];

    const newOverlays: TerritoryOverlay[] = [];

    for (const franchisee of franchisees) {
      for (const cat of categoriesToExtract) {
        if (selectedCategory !== 'all' && selectedCategory !== cat.key) {
          continue;
        }

        const suburbList = (franchisee[cat.key] as SuburbMapping[] | undefined) || [];
        
        for (let idx = 0; idx < suburbList.length; idx++) {
          const t = suburbList[idx];
          if (!t || !t.suburbs) continue;

          // Lat/lng fallback using state/postcode coordinates if missing or in central desert
          const isCentralDesert = t.lat !== undefined && t.lat < -24 && t.lat > -28 && t.lng !== undefined && t.lng > 130 && t.lng < 136;
          const center = (t.lat !== undefined && t.lng !== undefined && !isCentralDesert)
            ? { lat: t.lat, lng: t.lng }
            : getApproxStateCoordinates(t.state, t.post_code);

          newOverlays.push({
            id: `${franchisee.internalId}-${String(cat.key)}-${t.suburbs}-${t.post_code || idx}-${idx}`,
            franchisee,
            suburb: t.suburbs,
            postcode: String(t.post_code || ''),
            state: t.state || '',
            categoryKey: String(cat.key),
            categoryLabel: cat.label,
            center,
          });
        }
      }
    }

    setOverlays(newOverlays);
  }, [isLoaded, loadingData, franchisees, selectedCategory]);

  // Address details for currently selected place
  const selectedAddressInfo = useMemo(() => {
    if (!selectedPlace) return null;

    const { suburb, state, postcode } = getAddressComponents(selectedPlace);
    const formattedAddress = selectedPlace.formatted_address || selectedPlace.name || placeSearchQuery;

    return {
      formattedAddress,
      suburb,
      state,
      postcode,
      location: selectedPlace.geometry?.location || null,
    };
  }, [selectedPlace, placeSearchQuery]);

  // Franchisee(s) servicing the selected address
  const servicingFranchisees = useMemo(() => {
    if (!selectedPlace) return [];

    const { suburb, postcode } = getAddressComponents(selectedPlace);
    if (!suburb && !postcode) return [];

    const subLower = suburb.toLowerCase();
    const postLower = postcode.toLowerCase();

    const matched = new Map<string, { franchisee: Franchisee; matchedSuburbs: string[] }>();

    franchisees.forEach(f => {
      const categoriesToCheck: (keyof Franchisee)[] = selectedCategory === 'all'
        ? ['territoryJson', 'starTrackSuburbsJson', 'tgeSuburbsJSON', 'ironMountainSuburbsJson', 'ausPostSuburbsJson']
        : [selectedCategory as keyof Franchisee];

      const matchingSuburbs: string[] = [];

      for (const catKey of categoriesToCheck) {
        const territories = (f[catKey] as SuburbMapping[] | undefined) || [];
        territories.forEach(t => {
          const tSub = (t.suburbs || '').trim().toLowerCase();
          const tPost = String(t.post_code || '').trim().toLowerCase();

          const isSubMatch = subLower && tSub && tSub === subLower;
          const isPostMatch = postLower && tPost && tPost === postLower;

          if (isSubMatch || isPostMatch) {
            matchingSuburbs.push(`${t.suburbs}${t.post_code ? ` (${t.post_code})` : ''}`);
          }
        });
      }

      if (matchingSuburbs.length > 0) {
        matched.set(f.internalId, { franchisee: f, matchedSuburbs: matchingSuburbs });
      }
    });

    return Array.from(matched.values());
  }, [selectedPlace, franchisees, selectedCategory]);

  // Filtered overlays based on selected franchisee and place search
  const filteredOverlays = useMemo(() => {
    return overlays.filter(overlay => {
      if (selectedFranchiseeId !== 'all' && overlay.franchisee.internalId !== selectedFranchiseeId) {
        return false;
      }
      
      if (selectedPlace && selectedPlace.address_components) {
        const { suburb: placeSuburb, state: placeState, postcode: placePostcode } = getAddressComponents(selectedPlace);
        
        if (placeSuburb && overlay.suburb.toLowerCase() !== placeSuburb.toLowerCase()) return false;
        if (placeState && overlay.state.toLowerCase() !== placeState.toLowerCase()) return false;
        if (placePostcode && overlay.postcode.toLowerCase() !== placePostcode.toLowerCase()) return false;
      }
      
      return true;
    });
  }, [overlays, selectedFranchiseeId, selectedPlace]);

  // Fetch or calculate boundary polygon paths for visible overlays
  useEffect(() => {
    if (filteredOverlays.length === 0) return;

    const missingItems = filteredOverlays.filter(o => !boundariesMap[o.id]);
    if (missingItems.length === 0) return;

    const newBoundaries: Record<string, google.maps.LatLngLiteral[][]> = {};

    // Generate fallback smooth polygon immediately for responsive rendering
    missingItems.forEach(item => {
      newBoundaries[item.id] = generatePolygonFallback(item.center.lat, item.center.lng);
    });

    setBoundariesMap(prev => ({ ...prev, ...newBoundaries }));

    // Asynchronously fetch exact GeoJSON boundaries for top items from /api/territory/boundary
    const fetchRealBoundaries = async () => {
      const itemsToFetch = missingItems.slice(0, 30);
      for (const item of itemsToFetch) {
        try {
          const url = `/api/territory/boundary?suburb=${encodeURIComponent(item.suburb)}&state=${encodeURIComponent(item.state)}&postcode=${encodeURIComponent(item.postcode)}&lat=${item.center.lat}&lng=${item.center.lng}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.paths && data.paths.length > 0) {
              setBoundariesMap(prev => ({ ...prev, [item.id]: data.paths }));
              if (data.center && data.center.lat && data.center.lng) {
                item.center = data.center;
              }
            }
          }
        } catch {
          // Keep existing smooth polygon fallback
        }
      }
    };

    fetchRealBoundaries();
  }, [filteredOverlays, boundariesMap]);

  const onPlaceChanged = () => {
    if (placeAutocomplete) {
      const place = placeAutocomplete.getPlace();
      setSelectedPlace(place);
      setShowAddressInfoWindow(true);
      if (place.name) {
        setPlaceSearchQuery(place.formatted_address || place.name);
      }
      if (place.geometry?.location && map) {
        map.panTo(place.geometry.location);
        map.setZoom(13);
      }
    }
  };

  const handleClearLocation = () => {
    setSelectedPlace(null);
    setPlaceSearchQuery('');
    setShowAddressInfoWindow(false);
  };

  // Trigger CSV Download for franchisee suburb mappings
  const handleExportCSV = () => {
    const { count, filename } = exportSuburbMappingsToCSV(franchisees, selectedCategory, selectedFranchiseeId);
    toast({
      title: 'CSV Export Downloaded',
      description: `Exported ${count} suburb mapping records to ${filename}`,
    });
  };

  // Auto-zoom to franchisee suburbs when a franchisee is selected
  useEffect(() => {
    if (!map || !filteredOverlays.length || selectedFranchiseeId === 'all') return;

    const bounds = new google.maps.LatLngBounds();
    let hasValidBounds = false;
    
    filteredOverlays.forEach(overlay => {
      if (overlay.center && !isNaN(overlay.center.lat) && !isNaN(overlay.center.lng)) {
        bounds.extend(overlay.center);
        hasValidBounds = true;
      }
    });

    if (hasValidBounds) {
      map.fitBounds(bounds, { left: 420, right: 50, top: 50, bottom: 50 });
    }
  }, [map, selectedFranchiseeId, filteredOverlays]);

  if (loadError) return <div className="p-4 text-red-500">Error loading Google Maps</div>;
  if (!isLoaded || loadingData) return <div className="h-full flex items-center justify-center"><Loader /></div>;

  return (
    <div className="relative w-full h-full">
      {/* Sidebar Control Panel */}
      <div className="absolute top-4 left-4 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-xl shadow-lg w-80 sm:w-96 space-y-4 border border-border max-h-[calc(100vh-6rem)] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">Territory Controls</h3>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {filteredOverlays.length} Suburbs
          </Badge>
        </div>

        {/* Suburb Mapping Category Filter */}
        <div>
          <label className="text-sm font-medium mb-1 block">Mapping Category</label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full bg-background border-input">
              <SelectValue placeholder="Mapping Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="territoryJson">Main Territory Suburbs</SelectItem>
              <SelectItem value="starTrackSuburbsJson">StarTrack Suburbs</SelectItem>
              <SelectItem value="tgeSuburbsJSON">TGE Suburbs</SelectItem>
              <SelectItem value="ironMountainSuburbsJson">Iron Mountain Suburbs</SelectItem>
              <SelectItem value="ausPostSuburbsJson">AusPost Suburbs</SelectItem>
              <SelectItem value="all">All Suburb Categories</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Searchable Franchisee Filter */}
        <div>
          <label className="text-sm font-medium mb-1 block">Franchisee</label>
          <Popover open={franchiseeSearchOpen} onOpenChange={setFranchiseeSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={franchiseeSearchOpen}
                className="w-full justify-between bg-background border-input font-normal text-left truncate"
              >
                <span className="truncate">{selectedFranchiseeLabel}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] sm:w-[350px] p-0 bg-background border border-border rounded-lg shadow-lg z-[110]" align="start">
              <Command className="w-full">
                <CommandInput placeholder="Search franchisee name or ID..." className="focus:ring-0 focus:border-0" />
                <CommandList className="max-h-[260px] overflow-y-auto">
                  <CommandEmpty>No franchisee found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all_franchisees_all"
                      onSelect={() => {
                        setSelectedFranchiseeId('all');
                        setFranchiseeSearchOpen(false);
                      }}
                      className="cursor-pointer flex items-center justify-between py-2 px-3 hover:bg-accent"
                    >
                      <span className="font-semibold">All Franchisees ({franchisees.length})</span>
                      {selectedFranchiseeId === 'all' && <Check className="h-4 w-4 text-primary" />}
                    </CommandItem>

                    {franchisees.map((f) => {
                      const isSelected = selectedFranchiseeId === f.internalId;
                      const displayName = f.name || f.internalId;
                      const searchValue = `${displayName} ${f.internalId} ${f.mainContact || ''} ${f.email || ''}`;

                      return (
                        <CommandItem
                          key={f.internalId}
                          value={searchValue}
                          onSelect={() => {
                            setSelectedFranchiseeId(f.internalId);
                            setFranchiseeSearchOpen(false);
                          }}
                          className="cursor-pointer flex items-center justify-between py-2 px-3 hover:bg-accent"
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="font-medium truncate">{displayName}</span>
                            <span className="text-[11px] text-muted-foreground font-mono truncate">
                              ID: {f.internalId} {f.mainContact ? `• ${f.mainContact}` : ''}
                            </span>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* CSV Export Button */}
        <div>
          <Button
            onClick={handleExportCSV}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Suburb Mappings (CSV)</span>
          </Button>
        </div>

        {/* Address Search */}
        <div>
          <label className="text-sm font-medium mb-1 block">Check Address / Location</label>
          <Autocomplete
            onLoad={setPlaceAutocomplete}
            onPlaceChanged={onPlaceChanged}
            options={{ componentRestrictions: { country: 'au' } }}
          >
            <div className="relative">
              <Input 
                placeholder="Search suburb, address, postcode..." 
                value={placeSearchQuery}
                onChange={(e) => {
                  setPlaceSearchQuery(e.target.value);
                  if (!e.target.value) {
                    setSelectedPlace(null);
                  }
                }}
                className="pr-8"
              />
              {placeSearchQuery && (
                <button
                  onClick={handleClearLocation}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </Autocomplete>
        </div>

        {/* Servicing Franchisee Result Box */}
        {selectedAddressInfo && (
          <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-3 text-xs">
            <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate" title={selectedAddressInfo.formattedAddress}>
                    {selectedAddressInfo.formattedAddress}
                  </span>
                </div>
                {(selectedAddressInfo.suburb || selectedAddressInfo.postcode) && (
                  <p className="text-muted-foreground text-xs pl-5 font-medium">
                    {[selectedAddressInfo.suburb, selectedAddressInfo.state, selectedAddressInfo.postcode].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Coverage Status & Matched Franchisees */}
            {servicingFranchisees.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 text-xs py-0.5 px-2 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Serviced ({servicingFranchisees.length})</span>
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">Territory Match</span>
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {servicingFranchisees.map(({ franchisee }) => (
                    <div
                      key={franchisee.internalId}
                      className="p-3 rounded-lg bg-background border border-border shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-sm text-foreground truncate">
                          {franchisee.name || franchisee.internalId}
                        </h4>
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          {franchisee.internalId}
                        </Badge>
                      </div>

                      {franchisee.mainContact && (
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground">{franchisee.mainContact}</span>
                        </p>
                      )}

                      {franchisee.email && (
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs truncate">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <a href={`mailto:${franchisee.email}`} className="hover:underline text-primary truncate">
                            {franchisee.email}
                          </a>
                        </p>
                      )}

                      {franchisee.mobile && (
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <a href={`tel:${franchisee.mobile}`} className="hover:underline">
                            {franchisee.mobile}
                          </a>
                        </p>
                      )}

                      <div className="pt-1 flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-xs w-full bg-primary/10 hover:bg-primary/20 text-primary border-0 font-medium"
                          onClick={() => setSelectedFranchiseeId(franchisee.internalId)}
                        >
                          Show Franchisee Territory
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-900 dark:text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Unserviced Territory</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  No franchisee currently services {[selectedAddressInfo.suburb, selectedAddressInfo.state, selectedAddressInfo.postcode].filter(Boolean).join(', ') || 'this location'}.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Google Map with Suburb Boundary Polygons */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={4}
        onLoad={setMap}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          styles: [
            {
              featureType: 'poi.business',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'transit',
              elementType: 'labels.icon',
              stylers: [{ visibility: 'off' }],
            }
          ]
        }}
      >
        {/* Render exact suburb boundary polygons */}
        {filteredOverlays.map((overlay) => {
          const color = getFranchiseeColor(overlay.franchisee.internalId);
          const isHovered = hoveredOverlayId === overlay.id;
          const isActive = activeOverlay?.id === overlay.id;

          const paths = boundariesMap[overlay.id] || generatePolygonFallback(overlay.center.lat, overlay.center.lng);

          return (
            <PolygonF
              key={overlay.id}
              paths={paths}
              options={{
                fillColor: color,
                fillOpacity: isHovered || isActive ? 0.65 : 0.4,
                strokeColor: color,
                strokeOpacity: 0.9,
                strokeWeight: isHovered || isActive ? 3 : 1.5,
                clickable: true,
                zIndex: isHovered || isActive ? 100 : 1,
              }}
              onMouseOver={() => setHoveredOverlayId(overlay.id)}
              onMouseOut={() => setHoveredOverlayId(null)}
              onClick={() => setActiveOverlay(overlay)}
            />
          );
        })}

        {/* Searched Address Pin & InfoWindow */}
        {selectedAddressInfo?.location && (
          <MarkerF
            position={selectedAddressInfo.location}
            onClick={() => setShowAddressInfoWindow(true)}
          />
        )}

        {selectedAddressInfo?.location && showAddressInfoWindow && (
          <InfoWindowF
            position={selectedAddressInfo.location}
            onCloseClick={() => setShowAddressInfoWindow(false)}
          >
            <div className="p-1 min-w-[220px] max-w-[280px] text-sm space-y-1.5">
              <h3 className="font-bold text-sm border-b pb-1">
                {selectedAddressInfo.formattedAddress}
              </h3>
              {servicingFranchisees.length > 0 ? (
                <div className="space-y-1 mt-1">
                  <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 inline text-emerald-600" /> Serviced Territory
                  </p>
                  {servicingFranchisees.map(({ franchisee }) => (
                    <div key={franchisee.internalId} className="pt-1 border-t border-slate-100 text-xs">
                      <p className="font-bold text-slate-800">{franchisee.name || franchisee.internalId}</p>
                      {franchisee.mainContact && <p className="text-slate-600">Contact: {franchisee.mainContact}</p>}
                      {franchisee.email && <p className="text-slate-600">{franchisee.email}</p>}
                      {franchisee.mobile && <p className="text-slate-600">{franchisee.mobile}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-1 text-xs text-amber-800">
                  <p className="font-semibold text-amber-700">Unserviced Territory</p>
                  <p className="text-slate-500 mt-0.5">No franchisee assigned to this location.</p>
                </div>
              )}
            </div>
          </InfoWindowF>
        )}

        {/* Clicked Suburb InfoWindow */}
        {activeOverlay && (
          <InfoWindowF
            position={activeOverlay.center}
            onCloseClick={() => setActiveOverlay(null)}
          >
            <div className="p-1 min-w-[220px] max-w-[270px] text-sm space-y-1.5">
              <div className="border-b pb-1">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider mb-1">
                  {activeOverlay.categoryLabel}
                </Badge>
                <h3 className="font-bold text-base text-slate-900">
                  {activeOverlay.suburb}{activeOverlay.state ? `, ${activeOverlay.state}` : ''} {activeOverlay.postcode}
                </h3>
              </div>
              
              <div className="space-y-1 text-xs text-slate-700">
                <p>
                  <span className="font-semibold text-slate-900">Franchisee:</span>{' '}
                  {activeOverlay.franchisee.name || activeOverlay.franchisee.internalId}
                </p>
                {activeOverlay.franchisee.mainContact && (
                  <p>
                    <span className="font-semibold text-slate-900">Contact:</span>{' '}
                    {activeOverlay.franchisee.mainContact}
                  </p>
                )}
                {activeOverlay.franchisee.email && (
                  <p className="truncate">
                    <span className="font-semibold text-slate-900">Email:</span>{' '}
                    <a href={`mailto:${activeOverlay.franchisee.email}`} className="text-primary hover:underline">
                      {activeOverlay.franchisee.email}
                    </a>
                  </p>
                )}
                {activeOverlay.franchisee.mobile && (
                  <p>
                    <span className="font-semibold text-slate-900">Mobile:</span>{' '}
                    {activeOverlay.franchisee.mobile}
                  </p>
                )}
                {activeOverlay.franchisee.activeProjects && activeOverlay.franchisee.activeProjects.length > 0 && (
                  <p>
                    <span className="font-semibold text-slate-900">Active Projects:</span>{' '}
                    {activeOverlay.franchisee.activeProjects.join(', ')}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t mt-1">
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full text-xs h-7 bg-primary/10 hover:bg-primary/20 text-primary border-0 font-medium"
                  onClick={() => setSelectedFranchiseeId(activeOverlay.franchisee.internalId)}
                >
                  Filter Map to {activeOverlay.franchisee.name || activeOverlay.franchisee.internalId}
                </Button>
              </div>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}
