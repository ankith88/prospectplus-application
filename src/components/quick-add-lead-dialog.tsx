
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './ui/loader';
import type { Address } from '@/lib/types';
import { createNewLead, checkForDuplicateLead } from '@/services/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface QuickAddLeadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
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
    address.city = get('locality') || get('postal_town');
    address.state = get('administrative_area_level_1', true);
    address.zip = get('postal_code');

    return address as Address;
};


export function QuickAddLeadDialog({ isOpen, onOpenChange }: QuickAddLeadDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateLeadId, setDuplicateLeadId] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const router = useRouter();

  const setupAutocomplete = useCallback(() => {
    if (!window.google || !autocompleteInputRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
        types: ['establishment'],
        componentRestrictions: { country: 'au' },
    });

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.address_components) {
            setSelectedPlace(place);
        }
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
        // We need a slight delay to ensure the input is rendered before setting up autocomplete
        setTimeout(setupAutocomplete, 100);
    } else {
        setSelectedPlace(null);
        if (autocompleteInputRef.current) {
            autocompleteInputRef.current.value = '';
        }
    }
  }, [isOpen, setupAutocomplete]);

  const handleSubmit = async () => {
    if (!selectedPlace) {
        toast({ variant: 'destructive', title: 'No Business Selected', description: 'Please select a business from the search results.' });
        return;
    }
    if (!userProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }

    setIsSubmitting(true);
    
    const place = selectedPlace;
    const companyName = place.name || '';
    const websiteUrl = place.website || '';
    const customerPhone = place.formatted_phone_number || '';
    const address = place.address_components ? parseAddressComponents(place.address_components) : {} as Address;
    if (place.geometry?.location) {
        address.lat = place.geometry.location.lat();
        address.lng = place.geometry.location.lng();
    }
     const websiteDomain = (websiteUrl || '').replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    const customerServiceEmail = websiteDomain ? `info@${websiteDomain}` : '';

    // Step 1: Check for duplicates
    const duplicateId = await checkForDuplicateLead(companyName, websiteUrl, customerServiceEmail, address);
    if (duplicateId) {
        setDuplicateLeadId(duplicateId);
        setIsSubmitting(false);
        return;
    }

    // Step 2: Create the lead
    try {
        const result = await createNewLead({
            companyName,
            websiteUrl,
            customerPhone,
            customerServiceEmail,
            address,
            contact: {
                firstName: 'Info',
                lastName: companyName,
                title: 'Primary Contact',
                email: customerServiceEmail,
                phone: customerPhone
            },
            dialerAssigned: userProfile.displayName,
            campaign: userProfile.role?.includes('Field Sales') ? 'Door-to-Door' : 'Outbound'
        } as any);

        if (result.success) {
            toast({
                title: 'Lead Sent to NetSuite',
                description: `${companyName} has been successfully sent for creation.`,
            });
            onOpenChange(false);
        } else {
            throw new Error(result.message || 'Failed to create lead in NetSuite.');
        }
    } catch (error: any) {
        console.error('Failed to quick-add lead:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'An unexpected error occurred during lead creation.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Quick Add Lead</DialogTitle>
          <DialogDescription>
            Search for a business to quickly create a new lead.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label htmlFor="quick-add-search">Business Name or Address</Label>
                 <Input
                    id="quick-add-search"
                    ref={autocompleteInputRef}
                    placeholder="Start typing to search Google Maps..."
                />
            </div>
            {selectedPlace && (
                <div className="p-3 border rounded-md bg-secondary/50 text-sm">
                    <p className="font-semibold">{selectedPlace.name}</p>
                    <p className="text-muted-foreground">{selectedPlace.formatted_address}</p>
                </div>
            )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedPlace || isSubmitting}>
            {isSubmitting ? <Loader /> : 'Create Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
     <AlertDialog open={!!duplicateLeadId} onOpenChange={() => setDuplicateLeadId(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Duplicate Found</AlertDialogTitle>
                <AlertDialogDescription>
                    This business appears to already exist in your system.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDuplicateLeadId(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    if (duplicateLeadId) {
                         router.push(`/leads/${duplicateLeadId}`);
                         onOpenChange(false);
                         setDuplicateLeadId(null);
                    }
                }}>
                    View Existing Lead
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
