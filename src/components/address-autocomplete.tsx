'use client'

import React, { useRef, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from './ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { useJsApiLoader } from '@react-google-maps/api';

const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places', 'drawing', 'geometry', 'visualization'];

export function AddressAutocomplete() {
    const autocompleteInputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const { control, setValue, trigger } = useFormContext();

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        libraries,
    });

    const initAutocomplete = React.useCallback((node: HTMLInputElement) => {
        if (!node || autocompleteRef.current) return;

        console.log("AddressAutocomplete: Initializing Google Autocomplete on node:", node);
        autocompleteRef.current = new window.google.maps.places.Autocomplete(node, {
            types: ['address'],
            componentRestrictions: { country: 'au' },
        });

        autocompleteRef.current.addListener('place_changed', async () => {
            const place = autocompleteRef.current?.getPlace();
            console.log("AddressAutocomplete: place_changed triggered. Place result:", place);
            
            if (!place?.address_components) {
                console.warn("AddressAutocomplete: No address_components found in place:", place);
                return;
            }

            const street_number = place.address_components.find(c => c.types.includes('street_number'))?.long_name || '';
            const route = place.address_components.find(c => c.types.includes('route'))?.long_name || '';
            const suburb = place.address_components.find(c => c.types.includes('locality'))?.long_name || '';
            const state = place.address_components.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '';
            const zip = place.address_components.find(c => c.types.includes('postal_code'))?.long_name || '';
            const country = place.address_components.find(c => c.types.includes('country'))?.short_name || 'AU';

            console.log("AddressAutocomplete: Parsed address parts:", { street_number, route, suburb, state, zip, country });

            setValue('address.street', `${street_number} ${route}`.trim(), { shouldValidate: true, shouldDirty: true });
            setValue('address.city', suburb, { shouldValidate: true, shouldDirty: true });
            setValue('address.state', state, { shouldValidate: true, shouldDirty: true });
            setValue('address.zip', zip, { shouldValidate: true, shouldDirty: true });
            setValue('address.country', country, { shouldValidate: true, shouldDirty: true });

            if (place.geometry?.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              console.log("AddressAutocomplete: Setting lat/lng:", { lat, lng });
              setValue('address.lat', lat, { shouldDirty: true });
              setValue('address.lng', lng, { shouldDirty: true });
            }

            console.log("AddressAutocomplete: Triggering form validation...");
            await trigger(['address.street', 'address.city', 'address.state', 'address.zip', 'address.country']);
            console.log("AddressAutocomplete: Form validation complete.");
        });
    }, [setValue, trigger]);

    useEffect(() => {
        if (isLoaded && autocompleteInputRef.current && !autocompleteRef.current) {
            initAutocomplete(autocompleteInputRef.current);
        }
    }, [isLoaded, initAutocomplete]);

    return (
        <div className="space-y-4">
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
                    <FormItem>
                        <FormLabel>Street No. & Name*</FormLabel>
                        <FormControl>
                            <Input 
                                {...field} 
                                ref={(node) => {
                                    field.ref(node);
                                    // @ts-ignore
                                    autocompleteInputRef.current = node;
                                    if (node && isLoaded) {
                                        initAutocomplete(node);
                                    }
                                }} 
                                placeholder="Start typing a street address..." 
                            />
                        </FormControl>
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