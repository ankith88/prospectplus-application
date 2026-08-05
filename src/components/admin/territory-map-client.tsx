'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Franchisee } from '@/lib/types';
import { getAllFranchisees } from '@/services/firebase';
import { GoogleMap, InfoWindowF, Autocomplete, CircleF, MarkerF } from '@react-google-maps/api';
import { useGoogleMapsScript } from '@/hooks/use-google-maps';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, User, Mail, Phone, CheckCircle2, AlertTriangle, X, Building2 } from 'lucide-react';

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

// Generate a random pastel color for each franchisee for clear visual distinction
const getFranchiseeColor = (internalId: string) => {
  let hash = 0;
  for (let i = 0; i < internalId.length; i++) {
    hash = internalId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 70%, 50%)`;
};

export default function TerritoryMapClient() {
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [overlays, setOverlays] = useState<TerritoryOverlay[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeOverlay, setActiveOverlay] = useState<TerritoryOverlay | null>(null);
  const [hoveredOverlayId, setHoveredOverlayId] = useState<string | null>(null);

  const [selectedFranchiseeId, setSelectedFranchiseeId] = useState<string>('all');
  const [placeAutocomplete, setPlaceAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [showAddressInfoWindow, setShowAddressInfoWindow] = useState<boolean>(true);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [featureLayer, setFeatureLayer] = useState<google.maps.FeatureLayer | null>(null);

  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  const hasDataDrivenStyling = !!mapId;

  const { toast } = useToast();
  
  const { isLoaded, loadError } = useGoogleMapsScript();

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

  useEffect(() => {
    if (!isLoaded || loadingData || franchisees.length === 0) return;

    const resolveTerritories = () => {
      const newOverlays: TerritoryOverlay[] = [];

      for (const franchisee of franchisees) {
        const territories = franchisee.territoryJson || [];
        
        for (let idx = 0; idx < territories.length; idx++) {
          const t = territories[idx];
          if (!t.suburbs || !t.post_code || !t.lat || !t.lng) continue;
          
          newOverlays.push({
            id: `${franchisee.internalId}-${t.suburbs}-${t.post_code}-${idx}`,
            franchisee,
            suburb: t.suburbs,
            postcode: t.post_code,
            state: t.state || '',
            center: { lat: t.lat, lng: t.lng },
          });
        }
      }

      setOverlays(newOverlays);
    };

    resolveTerritories();
  }, [isLoaded, loadingData, franchisees]);

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
      const territories = f.territoryJson || [];
      const matchingSuburbs: string[] = [];

      territories.forEach(t => {
        const tSub = (t.suburbs || '').trim().toLowerCase();
        const tPost = String(t.post_code || '').trim().toLowerCase();

        const isSubMatch = subLower && tSub && tSub === subLower;
        const isPostMatch = postLower && tPost && tPost === postLower;

        if (isSubMatch || isPostMatch) {
          matchingSuburbs.push(`${t.suburbs}${t.post_code ? ` (${t.post_code})` : ''}`);
        }
      });

      if (matchingSuburbs.length > 0) {
        matched.set(f.internalId, { franchisee: f, matchedSuburbs: matchingSuburbs });
      }
    });

    return Array.from(matched.values());
  }, [selectedPlace, franchisees]);

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
      // Adding padding to account for the UI panel on the left
      map.fitBounds(bounds, { left: 400, right: 50, top: 50, bottom: 50 });
    }
  }, [map, selectedFranchiseeId, filteredOverlays]);

  // Handle Data-Driven Styling for boundaries
  useEffect(() => {
    if (!map || !hasDataDrivenStyling) return;

    let layer: google.maps.FeatureLayer;
    try {
      layer = map.getFeatureLayer(google.maps.FeatureType.LOCALITY);
      setFeatureLayer(layer);
    } catch (e) {
      console.warn('FeatureLayer for LOCALITY is not available. Ensure your Map ID supports it.');
      return;
    }

    const suburbMap = new Map<string, TerritoryOverlay>();
    filteredOverlays.forEach(overlay => {
      suburbMap.set(overlay.suburb.toLowerCase(), overlay);
    });

    layer.style = (options: google.maps.FeatureStyleFunctionOptions) => {
      const feature = options.feature as any;
      const displayName = feature.displayName?.toLowerCase();
      
      if (displayName && suburbMap.has(displayName)) {
        const overlay = suburbMap.get(displayName)!;
        const color = getFranchiseeColor(overlay.franchisee.internalId);
        const isHovered = hoveredOverlayId === overlay.id;
        const isActive = activeOverlay?.id === overlay.id;

        return {
          fillColor: color,
          fillOpacity: isHovered || isActive ? 0.6 : 0.35,
          strokeColor: color,
          strokeOpacity: 1,
          strokeWeight: isHovered || isActive ? 3 : 1,
        };
      }
      
      return null;
    };

  }, [map, filteredOverlays, hoveredOverlayId, activeOverlay]);

  // Handle clicks and hovers on the feature layer
  useEffect(() => {
    if (!featureLayer || !hasDataDrivenStyling) return;

    const clickListener = featureLayer.addListener('click', (e: any) => {
      const displayName = e.feature?.displayName?.toLowerCase();
      if (!displayName) return;
      
      const overlay = filteredOverlays.find(o => o.suburb.toLowerCase() === displayName);
      if (overlay && e.latLng) {
        setActiveOverlay({
          ...overlay,
          center: { lat: e.latLng.lat(), lng: e.latLng.lng() }
        });
      } else {
        setActiveOverlay(null);
      }
    });

    const mouseMoveListener = featureLayer.addListener('mousemove', (e: any) => {
      const displayName = e.feature?.displayName?.toLowerCase();
      if (!displayName) return;
      
      const overlay = filteredOverlays.find(o => o.suburb.toLowerCase() === displayName);
      if (overlay) {
        setHoveredOverlayId(overlay.id);
      }
    });

    const mouseOutListener = featureLayer.addListener('mouseout', () => {
      setHoveredOverlayId(null);
    });

    return () => {
      google.maps.event.removeListener(clickListener);
      google.maps.event.removeListener(mouseMoveListener);
      google.maps.event.removeListener(mouseOutListener);
    };
  }, [featureLayer, filteredOverlays]);

  if (loadError) return <div className="p-4 text-red-500">Error loading maps</div>;
  if (!isLoaded || loadingData) return <div className="h-full flex items-center justify-center"><Loader /></div>;

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 left-4 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-xl shadow-lg w-80 sm:w-96 space-y-4 border border-border max-h-[calc(100vh-6rem)] overflow-y-auto">
        <div>
          <label className="text-sm font-medium mb-1 block">Franchisee</label>
          <Select value={selectedFranchiseeId} onValueChange={setSelectedFranchiseeId}>
            <SelectTrigger className="w-full bg-background border-input">
              <SelectValue placeholder="All Franchisees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Franchisees</SelectItem>
              {franchisees.map(f => (
                <SelectItem key={f.internalId} value={f.internalId}>{f.name || f.internalId}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
                  {servicingFranchisees.map(({ franchisee, matchedSuburbs }) => (
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

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={4}
        onLoad={setMap}
        options={{
          ...(hasDataDrivenStyling ? { mapId } : {}),
          mapTypeControl: false,
          streetViewControl: false,
          styles: [
            {
              featureType: "poi.business",
              stylers: [{ visibility: "off" }],
            },
            {
              featureType: "transit",
              elementType: "labels.icon",
              stylers: [{ visibility: "off" }],
            }
          ]
        }}
      >
        {/* Fallback to CircleF if Data-Driven Styling is not configured */}
        {!hasDataDrivenStyling && filteredOverlays.map((overlay) => {
          const color = getFranchiseeColor(overlay.franchisee.internalId);
          const isHovered = hoveredOverlayId === overlay.id;
          const isActive = activeOverlay?.id === overlay.id;

          return (
            <CircleF
              key={overlay.id}
              center={overlay.center}
              radius={2500} // 2.5km radius approximation for suburb size
              options={{
                fillColor: color,
                fillOpacity: isHovered || isActive ? 0.6 : 0.35,
                strokeColor: color,
                strokeOpacity: 1,
                strokeWeight: isHovered || isActive ? 3 : 1,
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

        {activeOverlay && (
          <InfoWindowF
            position={activeOverlay.center}
            onCloseClick={() => setActiveOverlay(null)}
          >
            <div className="p-1 min-w-[200px] max-w-[250px] text-sm">
              <h3 className="font-bold text-base mb-1 border-b pb-1">
                {activeOverlay.suburb}, {activeOverlay.state} {activeOverlay.postcode}
              </h3>
              <div className="space-y-1 mt-2">
                <p><span className="font-semibold text-muted-foreground">Serviced By:</span> {activeOverlay.franchisee.name || activeOverlay.franchisee.internalId}</p>
                <p><span className="font-semibold text-muted-foreground">Main Contact:</span> {activeOverlay.franchisee.mainContact || 'N/A'}</p>
                {activeOverlay.franchisee.activeProjects && activeOverlay.franchisee.activeProjects.length > 0 && (
                  <p><span className="font-semibold text-muted-foreground">Active Projects:</span> {activeOverlay.franchisee.activeProjects.join(', ')}</p>
                )}
              </div>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}

