'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useJsApiLoader } from '@react-google-maps/api';
import type { Address } from '@/lib/types';
import { MapPin } from 'lucide-react';

const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places', 'drawing', 'geometry', 'visualization'];

interface GoogleAddressInputProps {
  label?: string;
  placeholder?: string;
  required?: boolean;
  initialAddress?: Partial<Address>;
  onAddressSelect: (address: Address) => void;
  className?: string;
}

const parseAddressComponents = (components: google.maps.GeocoderAddressComponent[]): Address => {
  const address: Partial<Address> = { country: 'Australia' };
  const get = (type: string, useShortName = false) => {
    const comp = components.find(c => c.types.includes(type));
    return useShortName ? comp?.short_name : comp?.long_name;
  };

  const streetNumber = get('street_number');
  const route = get('route');
  
  address.street = `${streetNumber || ''} ${route || ''}`.trim();
  address.address1 = get('subpremise') || address.street;
  address.city = get('locality') || get('postal_town') || '';
  address.state = get('administrative_area_level_1', true) || '';
  address.zip = get('postal_code') || '';

  return address as Address;
};

export function GoogleAddressInput({
  label = 'Service Address (H2H)',
  placeholder = 'Start typing address for H2H service...',
  required = true,
  initialAddress,
  onAddressSelect,
  className = ''
}: GoogleAddressInputProps) {
  const [inputValue, setInputValue] = useState<string>('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedAddressObj, setSelectedAddressObj] = useState<Partial<Address> | null>(initialAddress || null);

  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  const dummyDivRef = useCallback((node: HTMLDivElement | null) => {
    if (node && isLoaded && window.google && !placesService.current) {
      placesService.current = new window.google.maps.places.PlacesService(node);
    }
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded && window.google && !autocompleteService.current) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  useEffect(() => {
    if (initialAddress) {
      const parts = [
        initialAddress.address1 || initialAddress.street,
        initialAddress.city,
        initialAddress.state,
        initialAddress.zip
      ].filter(Boolean);
      if (parts.length > 0) {
        setInputValue(parts.join(', '));
      }
    }
  }, [initialAddress]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (autocompleteService.current && value.trim()) {
      autocompleteService.current.getPlacePredictions(
        {
          input: value,
          componentRestrictions: { country: 'au' },
          types: ['address']
        },
        (preds, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && preds) {
            setPredictions(preds);
          } else {
            setPredictions([]);
          }
        }
      );
    } else {
      setPredictions([]);
    }
  }, []);

  const handlePredictionSelect = useCallback((prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current) return;

    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['address_components', 'geometry'],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place && place.address_components) {
          const parsed = parseAddressComponents(place.address_components);
          if (place.geometry?.location) {
            parsed.lat = place.geometry.location.lat();
            parsed.lng = place.geometry.location.lng();
          }

          setInputValue(prediction.description);
          setSelectedAddressObj(parsed);
          setPredictions([]);
          setIsFocused(false);

          onAddressSelect(parsed);
        }
      }
    );
  }, [onAddressSelect]);

  return (
    <div className={`space-y-2 relative ${className}`}>
      {/* Dummy div required for PlacesService */}
      <div ref={dummyDivRef} className="hidden" />

      {label && (
        <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-[#095c7b]" />
          {label} {required && <span className="text-rose-500">*</span>}
        </Label>
      )}

      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          className="focus-visible:ring-[#095c7b] bg-white text-xs"
          autoComplete="off"
        />

        {isFocused && predictions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 overflow-y-auto rounded-md border bg-white text-slate-800 shadow-lg border-slate-200">
            {predictions.map((pred) => (
              <button
                key={pred.place_id}
                type="button"
                className="w-full px-3 py-2 text-left text-xs hover:bg-[#eef6ed] transition-colors cursor-pointer border-b border-slate-100 last:border-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePredictionSelect(pred);
                }}
              >
                {pred.description}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedAddressObj && selectedAddressObj.city && (
        <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-200 flex justify-between">
          <span>{selectedAddressObj.street || selectedAddressObj.address1}, {selectedAddressObj.city} {selectedAddressObj.state} {selectedAddressObj.zip}</span>
          <span className="text-[#095c7b] font-medium">Selected</span>
        </div>
      )}
    </div>
  );
}
