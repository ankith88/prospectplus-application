'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Franchisee } from '@/lib/types';
import { getAllFranchisees } from '@/services/firebase';
import { GoogleMap, useJsApiLoader, CircleF, InfoWindowF, Autocomplete } from '@react-google-maps/api';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: -25.2744,
  lng: 133.7751,
};

const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places', 'drawing', 'geometry', 'visualization'];

// Cache to prevent duplicate Geocoding lookups for the same postcode/suburb
const geocodeCache = new Map<string, google.maps.LatLngLiteral>();

interface TerritoryOverlay {
  id: string;
  franchisee: Franchisee;
  suburb: string;
  postcode: string;
  state: string;
  center: google.maps.LatLngLiteral;
}

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
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { toast } = useToast();
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getAllFranchisees();
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

  const filteredOverlays = useMemo(() => {
    return overlays.filter(overlay => {
      if (selectedFranchiseeId !== 'all' && overlay.franchisee.internalId !== selectedFranchiseeId) {
        return false;
      }
      
      if (selectedPlace && selectedPlace.address_components) {
        const components = selectedPlace.address_components;
        let placeSuburb = '';
        let placeState = '';
        let placePostcode = '';
        
        for (const comp of components) {
          if (comp.types.includes('locality')) {
            placeSuburb = comp.long_name.toLowerCase();
          }
          if (comp.types.includes('administrative_area_level_1')) {
            placeState = comp.short_name.toLowerCase();
          }
          if (comp.types.includes('postal_code')) {
            placePostcode = comp.long_name.toLowerCase();
          }
        }
        
        if (placeSuburb && overlay.suburb.toLowerCase() !== placeSuburb) return false;
        if (placeState && overlay.state.toLowerCase() !== placeState) return false;
        if (placePostcode && overlay.postcode.toLowerCase() !== placePostcode) return false;
      }
      
      return true;
    });
  }, [overlays, selectedFranchiseeId, selectedPlace]);

  const onPlaceChanged = () => {
    if (placeAutocomplete) {
      const place = placeAutocomplete.getPlace();
      setSelectedPlace(place);
      if (place.name) {
        setPlaceSearchQuery(place.formatted_address || place.name);
      }
      if (place.geometry?.location && map) {
        map.panTo(place.geometry.location);
        map.setZoom(12);
      }
    }
  };

  if (loadError) return <div className="p-4 text-red-500">Error loading maps</div>;
  if (!isLoaded || loadingData) return <div className="h-full flex items-center justify-center"><Loader /></div>;

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 left-4 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-md shadow-md w-80 space-y-4 border">
        <div>
          <label className="text-sm font-medium mb-1 block">Franchisee</label>
          <Select value={selectedFranchiseeId} onValueChange={setSelectedFranchiseeId}>
            <SelectTrigger>
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
          <label className="text-sm font-medium mb-1 block">Location</label>
          <Autocomplete
            onLoad={setPlaceAutocomplete}
            onPlaceChanged={onPlaceChanged}
            options={{ componentRestrictions: { country: 'au' } }}
          >
            <Input 
              placeholder="Search suburb, state, postcode..." 
              value={placeSearchQuery}
              onChange={(e) => {
                setPlaceSearchQuery(e.target.value);
                if (!e.target.value) {
                  setSelectedPlace(null);
                }
              }}
            />
          </Autocomplete>
        </div>
      </div>

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
        {filteredOverlays.map((overlay) => {
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
