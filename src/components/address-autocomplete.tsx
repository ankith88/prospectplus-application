'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from './ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { useJsApiLoader } from '@react-google-maps/api';
import type { Address } from '@/lib/types';

const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places', 'drawing', 'geometry', 'visualization'];

const parseAddressComponents = (components: google.maps.GeocoderAddressComponent[]): Address => {
    const address: Partial<Address> = { country: 'Australia' };
    const get = (type: string, useShortName = false) => {
        const comp = components.find(c => c.types.includes(type));
        return useShortName ? comp?.short_name : comp?.long_name;
    };

    const streetNumber = get('street_number');
    const route = get('route');
    
    address.street = `${streetNumber || ''} ${route || ''}`.trim();
    address.address1 = get('subpremise'); // For level, suite, etc.
    address.city = get('locality') || get('postal_town');
    address.state = get('administrative_area_level_1', true);
    address.zip = get('postal_code');

    return address as Address;
};

export function AddressAutocomplete() {
    const { control, setValue, trigger } = useFormContext();
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [isFocused, setIsFocused] = useState(false);

    const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesService = useRef<google.maps.places.PlacesService | null>(null);
    const dummyDivRef = useRef<HTMLDivElement>(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        libraries,
    });

    useEffect(() => {
        if (isLoaded && window.google) {
            if (!autocompleteService.current) {
                autocompleteService.current = new window.google.maps.places.AutocompleteService();
            }
            if (!placesService.current && dummyDivRef.current) {
                placesService.current = new window.google.maps.places.PlacesService(dummyDivRef.current);
            }
        }
    }, [isLoaded]);

    const handleInputChange = useCallback((value: string) => {
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
            async (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                    if (place.address_components) {
                        const parsed = parseAddressComponents(place.address_components);
                        
                        setValue('address.street', parsed.street || '', { shouldValidate: true, shouldDirty: true });
                        setValue('address.city', parsed.city || '', { shouldValidate: true, shouldDirty: true });
                        setValue('address.state', parsed.state || '', { shouldValidate: true, shouldDirty: true });
                        setValue('address.zip', parsed.zip || '', { shouldValidate: true, shouldDirty: true });
                        setValue('address.country', parsed.country || 'Australia', { shouldValidate: true, shouldDirty: true });
                        
                        if (parsed.address1) {
                            setValue('address.address1', parsed.address1, { shouldValidate: true, shouldDirty: true });
                        }
                    }
                    if (place.geometry?.location) {
                        setValue('address.lat', place.geometry.location.lat(), { shouldDirty: true });
                        setValue('address.lng', place.geometry.location.lng(), { shouldDirty: true });
                    }
                    
                    setPredictions([]);
                    setIsFocused(false);
                    
                    // Trigger validation to clear any errors
                    await trigger(['address.street', 'address.city', 'address.state', 'address.zip', 'address.country']);
                }
            }
        );
    }, [setValue, trigger]);

    return (
        <div className="space-y-4">
            {/* Dummy div required for PlacesService */}
            <div ref={dummyDivRef} className="hidden" />

            <FormField
                control={control}
                name="address.address1"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Suite/Level/Unit</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. Suite 5, Level 2" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="address.street"
                render={({ field }) => (
                    <FormItem className="relative">
                        <FormLabel>Street No. & Name*</FormLabel>
                        <FormControl>
                            <Input 
                                {...field} 
                                onChange={(e) => {
                                    field.onChange(e);
                                    handleInputChange(e.target.value);
                                }}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => {
                                    // Delay hiding predictions so button click registers first
                                    setTimeout(() => setIsFocused(false), 200);
                                }}
                                placeholder="Start typing a street address..." 
                                autoComplete="off"
                            />
                        </FormControl>
                        {isFocused && predictions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                                {predictions.map((pred) => (
                                    <button
                                        key={pred.place_id}
                                        type="button"
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                                        onClick={() => handlePredictionSelect(pred)}
                                    >
                                        {pred.description}
                                    </button>
                                ))}
                            </div>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={control} name="address.city" render={({ field }) => (
                    <FormItem><FormLabel>Suburb*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={control} name="address.state" render={({ field }) => (
                    <FormItem><FormLabel>State*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={control} name="address.zip" render={({ field }) => (
                    <FormItem><FormLabel>Postcode*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
            </div>
            <FormField control={control} name="address.country" render={({ field }) => (
                <FormItem className="hidden"><FormLabel>Country</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>
    );
}