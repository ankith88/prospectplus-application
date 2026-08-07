'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, MapLead, Address } from '@/lib/types';
import { createNewLead, getAllFranchisees } from '@/services/firebase';
import { MULTISITE_ACCOUNT_MANAGER_UID } from '@/lib/constants';
import { firestore } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Building, User, Mail, Phone } from 'lucide-react';
import { GoogleAddressInput } from '@/components/google-address-input';

interface EnterMultiSiteLeadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  parentCompany: MapLead | Lead | null;
  initialPlace?: google.maps.places.PlaceResult | null;
  onSuccess?: () => void;
}

const parsePlaceAddress = (place: google.maps.places.PlaceResult): Address => {
  const address: Partial<Address> = { country: 'Australia' };
  const get = (type: string, useShort = false) => {
    const comp = place.address_components?.find((c) => c.types.includes(type));
    return (useShort ? comp?.short_name : comp?.long_name) || '';
  };

  const streetNumber = get('street_number');
  const route = get('route');
  const streetPart = `${streetNumber} ${route}`.trim();
  
  address.street = streetPart || place.vicinity || '';
  address.city = get('locality') || get('postal_town') || get('sublocality') || '';
  address.state = get('administrative_area_level_1', true) || '';
  address.zip = get('postal_code') || '';
  if (place.geometry?.location) {
    address.lat = place.geometry.location.lat();
    address.lng = place.geometry.location.lng();
  }

  return address as Address;
};

export function EnterMultiSiteLeadDialog({
  isOpen,
  onOpenChange,
  parentCompany,
  initialPlace,
  onSuccess,
}: EnterMultiSiteLeadDialogProps) {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  useEffect(() => {
    if (parentCompany && isOpen) {
      if (initialPlace) {
        setSiteName(initialPlace.name || `${parentCompany.companyName} - `);
        setContactName('');
        setContactEmail(parentCompany.customerServiceEmail || '');
        setContactPhone(initialPlace.formatted_phone_number || parentCompany.customerPhone || '');
        setSelectedAddress(parsePlaceAddress(initialPlace));
      } else {
        setSiteName(`${parentCompany.companyName} - `);
        setContactName('');
        setContactEmail(parentCompany.customerServiceEmail || '');
        setContactPhone(parentCompany.customerPhone || '');
        setSelectedAddress(null);
      }
    }
  }, [parentCompany, initialPlace, isOpen]);

  if (!parentCompany) return null;

  const handleSubmit = async () => {
    if (!siteName.trim()) {
      toast({ variant: 'destructive', title: 'Site Name Required', description: 'Please enter a site or branch name.' });
      return;
    }
    if (!selectedAddress || !selectedAddress.city || !selectedAddress.state || !selectedAddress.zip) {
      toast({ variant: 'destructive', title: 'Address Required', description: 'Please select a valid site address using Google Places search.' });
      return;
    }
    if (!userProfile) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'You must be logged in to create a lead.' });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Resolve Account Manager name
      let targetAmName = MULTISITE_ACCOUNT_MANAGER_UID;
      try {
        const amSnap = await getDoc(doc(firestore, 'users', MULTISITE_ACCOUNT_MANAGER_UID));
        if (amSnap.exists() && amSnap.data()) {
          const amData = amSnap.data();
          targetAmName = amData.displayName || `${amData.firstName || ''} ${amData.lastName || ''}`.trim() || MULTISITE_ACCOUNT_MANAGER_UID;
        }
      } catch (e) {
        console.warn('Failed to fetch Account Manager details:', e);
      }

      // 2. Resolve Franchisee based on address postcode/city match if possible
      let matchedFranchiseeName = parentCompany.franchisee || 'MailPlus Pty Ltd';
      try {
        const allFrs = await getAllFranchisees();
        const cityUpper = selectedAddress.city.trim().toUpperCase();
        const stateUpper = selectedAddress.state.trim().toUpperCase();
        const zipStr = String(selectedAddress.zip).trim();

        const match = allFrs.find(f =>
          f.territoryJson?.some(t =>
            t.suburbs?.toUpperCase() === cityUpper &&
            t.state?.toUpperCase() === stateUpper &&
            String(t.post_code) === zipStr
          ) ||
          f.ausPostSuburbsJson?.some(t =>
            t.suburbs?.toUpperCase() === cityUpper &&
            t.state?.toUpperCase() === stateUpper &&
            String(t.post_code) === zipStr
          )
        );

        if (match && match.name) {
          matchedFranchiseeName = match.name;
        }
      } catch (err) {
        console.warn('Territory lookup error:', err);
      }

      const nameParts = contactName.trim().split(' ');
      const firstName = nameParts[0] || 'Info';
      const lastName = nameParts.slice(1).join(' ') || siteName.trim();

      const newLeadPayload = {
        companyName: siteName.trim(),
        parentLeadId: parentCompany.id,
        websiteUrl: parentCompany.websiteUrl || '',
        customerPhone: contactPhone || parentCompany.customerPhone || '',
        customerServiceEmail: contactEmail || parentCompany.customerServiceEmail || '',
        address: selectedAddress,
        contact: {
          firstName,
          lastName,
          title: 'Site Contact',
          email: contactEmail,
          phone: contactPhone,
        },
        dialerAssigned: userProfile.displayName || '',
        campaign: 'MultiSite',
        bucket: 'multisite',
        accountManagerAssigned: targetAmName,
        salesRepAssigned: targetAmName,
        accountManagerUid: MULTISITE_ACCOUNT_MANAGER_UID,
        assignedTo: MULTISITE_ACCOUNT_MANAGER_UID,
        franchisee: matchedFranchiseeName,
        status: 'New',
        customerStatus: 'New',
      };

      const result = await createNewLead(newLeadPayload);

      if (result && result.success) {
        toast({
          title: 'Multi-site Lead Created!',
          description: `${siteName.trim()} has been created and allocated to the Account Manager bucket (${targetAmName}).`,
        });
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast({
          variant: 'destructive',
          title: 'Lead Creation Failed',
          description: result?.message || 'Could not create multi-site lead.',
        });
      }
    } catch (error: any) {
      console.error('Multi-site lead creation error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message || 'An unexpected error occurred while creating the lead.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] md:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Enter Multi-site Lead
          </DialogTitle>
          <DialogDescription>
            Add a new site location for <span className="font-semibold text-foreground">{parentCompany.companyName}</span>. This lead will follow the multi-site process and be allocated to the Account Manager bucket.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="space-y-2">
            <Label htmlFor="site-name">Child Site / Branch Name *</Label>
            <Input
              id="site-name"
              placeholder="e.g. Genea Limited - Parramatta"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Site Address (Google Places Search) *</Label>
            <GoogleAddressInput
              placeholder="Start typing site address..."
              onAddressSelect={(addr) => setSelectedAddress(addr)}
              showSelectedBadge={true}
            />
          </div>

          <div className="border-t pt-3 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Local Contact Details (Optional)
            </h4>
            <div className="space-y-2">
              <Label htmlFor="contact-name" className="flex items-center gap-1 text-xs">
                <User className="h-3.5 w-3.5" /> Contact Name
              </Label>
              <Input
                id="contact-name"
                placeholder="e.g. Jane Smith"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="contact-email" className="flex items-center gap-1 text-xs">
                  <Mail className="h-3.5 w-3.5" /> Email
                </Label>
                <Input
                  id="contact-email"
                  placeholder="jane@company.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact-phone" className="flex items-center gap-1 text-xs">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </Label>
                <Input
                  id="contact-phone"
                  placeholder="0400 000 000"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader /> : 'Create Multi-site Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
