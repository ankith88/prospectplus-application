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
import { Textarea } from '@/components/ui/textarea';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, MapLead, Address } from '@/lib/types';
import { createNewLead, getAllFranchisees, logNoteActivity } from '@/services/firebase';
import { MULTISITE_ACCOUNT_MANAGER_UID } from '@/lib/constants';
import { firestore } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Building, User, Mail, Phone, FileText, Briefcase } from 'lucide-react';
import { GoogleAddressInput } from '@/components/google-address-input';

interface EnterMultiSiteLeadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  parentCompany: MapLead | Lead | null;
  initialPlace?: google.maps.places.PlaceResult | null;
  onSuccess?: () => void;
}

const parsePlaceAddress = (place: any): Address => {
  const address: Partial<Address> = { country: 'Australia' };
  
  if (place.address_components) {
    const get = (type: string, useShort = false) => {
      const comp = place.address_components?.find((c: any) => c.types.includes(type));
      return (useShort ? comp?.short_name : comp?.long_name) || '';
    };

    const streetNumber = get('street_number');
    const route = get('route');
    const streetPart = `${streetNumber} ${route}`.trim();
    
    address.street = streetPart || place.vicinity || place.formatted_address || '';
    address.city = get('locality') || get('postal_town') || get('sublocality') || '';
    address.state = get('administrative_area_level_1', true) || '';
    address.zip = get('postal_code') || '';
    if (place.geometry?.location) {
      if (typeof place.geometry.location.lat === 'function') {
        address.lat = place.geometry.location.lat();
        address.lng = place.geometry.location.lng();
      } else {
        address.lat = Number(place.geometry.location.lat);
        address.lng = Number(place.geometry.location.lng);
      }
    }
  } else {
    address.street = place.street || place.address || place.formattedAddress || place.vicinity || '';
    address.city = place.suburb || place.city || '';
    address.state = place.state || '';
    address.zip = place.postcode || place.zip || '';
    if (place.lat != null && place.lng != null) {
      address.lat = Number(place.lat);
      address.lng = Number(place.lng);
    }
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
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [levelSuite, setLevelSuite] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  useEffect(() => {
    if (parentCompany && isOpen) {
      setNotes('');
      setContactName('');
      setContactTitle('');
      setContactEmail('');
      setContactPhone('');
      setLevelSuite('');
      if (initialPlace) {
        setSiteName(initialPlace.name || `${parentCompany.companyName} - `);
        setCompanyEmail(parentCompany.customerServiceEmail || '');
        setCompanyPhone(initialPlace.formatted_phone_number || parentCompany.customerPhone || '');
        const parsed = parsePlaceAddress(initialPlace);
        setSelectedAddress(parsed);
        if (parsed.address1 && parsed.address1 !== parsed.street) {
          setLevelSuite(parsed.address1);
        }
      } else {
        setSiteName(`${parentCompany.companyName} - `);
        setCompanyEmail(parentCompany.customerServiceEmail || '');
        setCompanyPhone(parentCompany.customerPhone || '');
        setSelectedAddress(null);
      }
    }
  }, [parentCompany, initialPlace, isOpen]);

  if (!parentCompany) return null;

  const handleAddressSelect = (addr: Address) => {
    setSelectedAddress(addr);
    if (addr.address1 && addr.address1 !== addr.street) {
      setLevelSuite(addr.address1);
    }
    if (addr.city && (!siteName || siteName === `${parentCompany.companyName} - `)) {
      setSiteName(`${parentCompany.companyName} - ${addr.city}`);
    }
  };

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
      const firstName = contactName.trim() ? nameParts[0] : '';
      const lastName = contactName.trim() ? nameParts.slice(1).join(' ') : '';

      const resolvedPhone = companyPhone.trim() || contactPhone.trim() || parentCompany.customerPhone || '';
      const resolvedEmail = companyEmail.trim() || contactEmail.trim() || parentCompany.customerServiceEmail || '';

      const finalAddress: Address = {
        ...selectedAddress,
        ...(levelSuite.trim() ? { address1: levelSuite.trim() } : {}),
      };

      const newLeadPayload = {
        companyName: siteName.trim(),
        parentLeadId: parentCompany.id,
        websiteUrl: parentCompany.websiteUrl || '',
        customerPhone: resolvedPhone,
        customerServiceEmail: resolvedEmail,
        address: finalAddress,
        contact: {
          firstName,
          lastName,
          title: contactTitle.trim() || 'Local Site Contact',
          email: contactEmail.trim() || companyEmail.trim(),
          phone: contactPhone.trim() || companyPhone.trim(),
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

      if (result && result.success && result.leadId) {
        const createdLeadId = String(result.leadId);
        
        // Log note if user added initial notes
        if (notes.trim()) {
          try {
            await logNoteActivity(createdLeadId, {
              content: notes.trim(),
              author: userProfile.displayName || userProfile.email || 'User',
              date: new Date().toISOString(),
            });
          } catch (noteErr) {
            console.warn('Failed to log initial notes on multi-site lead:', noteErr);
          }
        }

        toast({
          title: 'Multi-site Lead Created!',
          description: `${siteName.trim()} has been created as a child location of ${parentCompany.companyName} and allocated to Account Manager (${targetAmName}).`,
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
      <DialogContent className="max-w-lg w-[95vw] md:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Enter Multi-site Lead
          </DialogTitle>
          <DialogDescription>
            Add a new site location for <span className="font-semibold text-foreground">{parentCompany.companyName}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Parent Customer Connection Notice */}
        <div className="p-3 bg-blue-50/80 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900 rounded-lg text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
          <Building className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-blue-950 dark:text-blue-100">
              Parent Customer: {parentCompany.companyName}
            </p>
            <p className="text-blue-700 dark:text-blue-300 mt-0.5">
              Creating this multi-site location will automatically link <strong>{parentCompany.companyName}</strong> as its parent customer.
            </p>
          </div>
        </div>

        <div className="space-y-4 py-2 text-sm">
          <div className="space-y-2">
            <Label htmlFor="site-name" className="text-xs font-semibold">
              Child Site / Company Name Created *
            </Label>
            <Input
              id="site-name"
              placeholder="e.g. Genea Limited - Parramatta"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
            />
            {siteName && (
              <p className="text-[11px] text-muted-foreground">
                Company Name Created: <strong className="text-foreground">{siteName}</strong>
              </p>
            )}
          </div>

          <div className="border-t pt-3 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-primary" /> Company Contact Info (Optional)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="company-email" className="flex items-center gap-1 text-xs">
                  <Mail className="h-3.5 w-3.5" /> Company Email
                </Label>
                <Input
                  id="company-email"
                  placeholder="company@domain.com"
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="company-phone" className="flex items-center gap-1 text-xs">
                  <Phone className="h-3.5 w-3.5" /> Company Phone
                </Label>
                <Input
                  id="company-phone"
                  placeholder="1300 000 000"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <Label className="text-xs font-semibold">Site Address (Google Places Search) *</Label>
            <GoogleAddressInput
              placeholder="Start typing site address..."
              onAddressSelect={handleAddressSelect}
              showSelectedBadge={true}
            />
            <div className="space-y-1 pt-1">
              <Label htmlFor="level-suite" className="text-xs text-muted-foreground">
                Level / Suite / Unit (Optional)
              </Label>
              <Input
                id="level-suite"
                placeholder="e.g. Suite 4, Level 2"
                value={levelSuite}
                onChange={(e) => setLevelSuite(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t pt-3 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" /> Local Site Contact Details (Optional)
            </h4>
            <div className="space-y-2">
              <Label htmlFor="contact-name" className="flex items-center gap-1 text-xs">
                <User className="h-3.5 w-3.5" /> Contact Name (Optional)
              </Label>
              <Input
                id="contact-name"
                placeholder="e.g. Jane Smith (Optional)"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-title" className="flex items-center gap-1 text-xs">
                <Briefcase className="h-3.5 w-3.5" /> Contact Job Title
              </Label>
              <Input
                id="contact-title"
                placeholder="e.g. Site Manager / Branch Lead"
                value={contactTitle}
                onChange={(e) => setContactTitle(e.target.value)}
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
                  type="email"
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

          <div className="border-t pt-3 space-y-2">
            <Label htmlFor="site-notes" className="flex items-center gap-1 text-xs font-semibold">
              <FileText className="h-3.5 w-3.5" /> Notes / Special Instructions (Optional)
            </Label>
            <Textarea
              id="site-notes"
              placeholder="Add notes or specific requirements for this location..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="text-xs resize-none"
            />
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

