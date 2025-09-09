

'use client'

import React, { useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from './ui/input';
import type { Address } from '@/lib/types';
import { Button } from './ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';

const addressSchema = z.object({
    address1: z.string().optional(),
    street: z.string().min(1, 'Street name is required.'),
    city: z.string().min(1, 'Suburb is required.'),
    state: z.string().min(1, 'State is required.'),
    zip: z.string().min(1, 'Postcode is required.'),
    country: z.string().min(1, 'Country is required.'),
});


interface AddressAutocompleteProps {
    onAddressSelect: (address: Address) => void;
    defaultValue?: Address | null;
}

export function AddressAutocomplete({ onAddressSelect, defaultValue }: AddressAutocompleteProps) {
    const autocompleteInputRef = useRef<HTMLInputElement>(null);
    
    const form = useForm<z.infer<typeof addressSchema>>({
        resolver: zodResolver(addressSchema),
        defaultValues: {
            address1: defaultValue?.address1 || '',
            street: defaultValue?.street || '',
            city: defaultValue?.city || '',
            state: defaultValue?.state || '',
            zip: defaultValue?.zip || '',
            country: defaultValue?.country || 'Australia',
        },
    });

    useEffect(() => {
        if (!window.google || !autocompleteInputRef.current) return;

        const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
            types: ['address'],
            componentRestrictions: { country: 'au' },
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.address_components) return;

            const street_number = place.address_components.find(c => c.types.includes('street_number'))?.long_name || '';
            const route = place.address_components.find(c => c.types.includes('route'))?.long_name || '';
            
            form.setValue('street', `${street_number} ${route}`.trim());
            form.setValue('city', place.address_components.find(c => c.types.includes('locality'))?.long_name || '');
            form.setValue('state', place.address_components.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '');
            form.setValue('zip', place.address_components.find(c => c.types.includes('postal_code'))?.long_name || '');
            form.setValue('country', place.address_components.find(c => c.types.includes('country'))?.long_name || '');
        });
    }, [form]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onAddressSelect)} className="space-y-4">
                 <FormField
                    control={form.control}
                    name="address1"
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
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Street No. & Name</FormLabel>
                            <FormControl>
                                <Input {...field} ref={autocompleteInputRef} placeholder="Start typing a street address..." />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem><FormLabel>Suburb</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="state" render={({ field }) => (
                        <FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="zip" render={({ field }) => (
                        <FormItem><FormLabel>Postcode</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                 <FormField control={form.control} name="country" render={({ field }) => (
                        <FormItem className="hidden"><FormLabel>Country</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                 )}/>

                <div className="flex justify-end">
                    <Button type="submit" disabled={!form.formState.isDirty && !form.formState.isValid}>
                        {form.formState.isSubmitting ? 'Saving...' : 'Save Address'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
