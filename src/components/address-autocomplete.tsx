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

    useEffect(() => {
        if (isLoaded && autocompleteInputRef.current && !autocompleteRef.current) {
            autocompleteRef.current = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
                types: ['address'],
                componentRestrictions: { country: 'au' },
            });

            autocompleteRef.current.addListener('place_changed', async () => {
                const place = autocompleteRef.current?.getPlace();
                if (!place?.address_components) return;

                const street_number = place.address_components.find(c => c.types.includes('street_number'))?.long_name || '';
                const route = place.address_components.find(c => c.types.includes('route'))?.long_name || '';
                
                setValue('address.street', `${street_number} ${route}`.trim());
                setValue('address.city', place.address_components.find(c => c.types.includes('locality'))?.long_name || '');
                setValue('address.state', place.address_components.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '');
                setValue('address.zip', place.address_components.find(c => c.types.includes('postal_code'))?.long_name || '');
                setValue('address.country', place.address_components.find(c => c.types.includes('country'))?.short_name || 'AU');

                if (place.geometry?.location) {
                  setValue('address.lat', place.geometry.location.lat());
                  setValue('address.lng', place.geometry.location.lng());
                }

                await trigger(['address.street', 'address.city', 'address.state', 'address.zip', 'address.country']);
            });
        }
    }, [isLoaded, setValue, trigger]);

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