
'use client'

import React, { useRef, useEffect, useState } from 'react';
import { Input } from './ui/input';
import type { Address } from '@/lib/types';
import { Button } from './ui/button';

interface AddressAutocompleteProps {
    onAddressSelect: (address: Address) => void;
    defaultValue?: Address | null;
}

export function AddressAutocomplete({ onAddressSelect, defaultValue }: AddressAutocompleteProps) {
    const autocompleteInputRef = useRef<HTMLInputElement>(null);
    const [search, setSearch] = useState('');
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(defaultValue || null);

    useEffect(() => {
        if (defaultValue) {
             setSearch([defaultValue.street, defaultValue.city, defaultValue.state, defaultValue.zip, defaultValue.country].filter(Boolean).join(', '));
             setSelectedAddress(defaultValue);
        }
    }, [defaultValue]);

    useEffect(() => {
        if (!window.google || !autocompleteInputRef.current) return;

        const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
            types: ['address'],
            componentRestrictions: { country: 'au' }, // Restrict to Australia
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.address_components) return;

            const street_number = place.address_components.find(c => c.types.includes('street_number'))?.long_name || '';
            const route = place.address_components.find(c => c.types.includes('route'))?.long_name || '';
            
            const newAddress: Address = {
                street: `${street_number} ${route}`.trim(),
                city: place.address_components.find(c => c.types.includes('locality'))?.long_name || '',
                state: place.address_components.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '',
                zip: place.address_components.find(c => c.types.includes('postal_code'))?.long_name || '',
                country: place.address_components.find(c => c.types.includes('country'))?.long_name || '',
            };
            
            setSearch(place.formatted_address || '');
            setSelectedAddress(newAddress);
        });
    }, []);

    const handleSave = () => {
        if (selectedAddress) {
            onAddressSelect(selectedAddress);
        }
    }

    return (
        <div className="space-y-4">
            <Input
                ref={autocompleteInputRef}
                placeholder="Start typing an address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={!selectedAddress}>
                    Save Address
                </Button>
            </div>
        </div>
    );
}

    