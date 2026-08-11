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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, MapLead, Address, Contact } from '@/lib/types';
import { createChildSiteLead, getAllFranchisees } from '@/services/firebase';
import { Building, User, Mail, Phone, FileText, Briefcase, Store, Check, Sparkles, Send, MapPin, Search } from 'lucide-react';
import { GoogleAddressInput } from '@/components/google-address-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DiscoveredLocation } from '@/components/discover-multisites-dialog';

interface EnterMultiSiteLeadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  parentCompany: MapLead | Lead | null;
  initialPlace?: google.maps.places.PlaceResult | null;
  initialLocation?: DiscoveredLocation | null;
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
  initialLocation,
  onSuccess,
}: EnterMultiSiteLeadDialogProps) {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  
  // Separate Address Field States
  const [streetAddress, setStreetAddress] = useState('');
  const [levelSuite, setLevelSuite] = useState('');
  const [suburbCity, setSuburbCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [postcode, setPostcode] = useState('');

  const [contactName, setContactName] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedContactIndex, setSelectedContactIndex] = useState<number | null>(null);

  // Franchisee assignment state
  const [allFrsList, setAllFrsList] = useState<import('@/lib/types').Franchisee[]>([]);
  const [selectedFranchiseeId, setSelectedFranchiseeId] = useState<string>('435');
  const [selectedFranchiseeName, setSelectedFranchiseeName] = useState<string>('MailPlus Pty Ltd');
  const [franchiseeMatchReason, setFranchiseeMatchReason] = useState<string>('');
  const [showOverrideFranchisee, setShowOverrideFranchisee] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    async function loadFrs() {
      try {
        const frs = await getAllFranchisees();
        setAllFrsList(frs);
      } catch (err) {
        console.warn('Failed to load franchisees:', err);
      }
    }
    loadFrs();
  }, [isOpen]);

  // Recalculate servicing franchisee based on suburbCity, stateCode & postcode
  useEffect(() => {
    if (!isOpen) return;

    const cityUpper = suburbCity.trim().toUpperCase();
    const stateUpper = stateCode.trim().toUpperCase();
    const zipStr = postcode.trim();

    if (!cityUpper || !zipStr) {
      if (!initialLocation?.servicingFranchisee) {
        setSelectedFranchiseeId('435');
        setSelectedFranchiseeName('MailPlus Pty Ltd');
        setFranchiseeMatchReason('Please enter suburb and postcode to detect servicing franchisee.');
      }
      return;
    }

    const matches = allFrsList.filter(f =>
      f.territoryJson?.some(t =>
        (t.suburbs?.toUpperCase() === cityUpper || (t.suburbs || '').toUpperCase().includes(cityUpper)) &&
        (!stateUpper || !t.state || t.state.toUpperCase() === stateUpper) &&
        String(t.post_code).trim() === zipStr
      ) ||
      f.ausPostSuburbsJson?.some(t =>
        (t.suburbs?.toUpperCase() === cityUpper || (t.suburbs || '').toUpperCase().includes(cityUpper)) &&
        (!stateUpper || !t.state || t.state.toUpperCase() === stateUpper) &&
        String(t.post_code).trim() === zipStr
      )
    );

    if (matches.length >= 1) {
      const matchedName = matches[0].name || (matches[0] as any).franchiseeName || 'MailPlus Pty Ltd';
      const matchedId = matches[0].internalId || matches[0].id || '435';
      setSelectedFranchiseeId(matchedId);
      setSelectedFranchiseeName(matchedName);
      setFranchiseeMatchReason(`Matched territory for ${matchedName}.`);
    } else {
      setSelectedFranchiseeId('435');
      setSelectedFranchiseeName('MailPlus Pty Ltd');
      setFranchiseeMatchReason(`No territory matched for ${cityUpper} ${zipStr}. Defaulted to MailPlus Pty Ltd (Out of Territory).`);
    }
  }, [suburbCity, stateCode, postcode, allFrsList, isOpen, initialLocation]);

  useEffect(() => {
    if (parentCompany && isOpen) {
      setSelectedContactIndex(null);
      if (initialLocation) {
        setSiteName(initialLocation.name || `${parentCompany.companyName} - ${initialLocation.suburb || ''}`);
        setCompanyEmail(initialLocation.email || parentCompany.customerServiceEmail || '');
        setCompanyPhone(initialLocation.phone || parentCompany.customerPhone || '');
        
        // Pre-fill separate address fields
        const rawStreet = initialLocation.street || initialLocation.formattedAddress || '';
        if (rawStreet.toLowerCase().includes('level') || rawStreet.toLowerCase().includes('suite')) {
          const parts = rawStreet.split(',');
          setLevelSuite(parts[0]?.trim() || '');
          setStreetAddress(parts.slice(1).join(',').trim() || parts[0]?.trim() || '');
        } else {
          setLevelSuite('');
          setStreetAddress(rawStreet);
        }

        setSuburbCity(initialLocation.suburb || '');
        setStateCode(initialLocation.state || '');
        setPostcode(initialLocation.postcode || '');
        setNotes(`Created via Website Branch Discovery (${initialLocation.source || 'AI/Web'})`);

        if (initialLocation.servicingFranchisee) {
          setSelectedFranchiseeId(initialLocation.servicingFranchisee.internalId || '435');
          setSelectedFranchiseeName(initialLocation.servicingFranchisee.name || 'MailPlus Pty Ltd');
          setFranchiseeMatchReason(`Territory franchisee resolved: ${initialLocation.servicingFranchisee.name}`);
        }

        if (initialLocation.name || initialLocation.email || initialLocation.phone) {
          setContactName(initialLocation.name || '');
          setContactTitle('Local Site Contact');
          setContactEmail(initialLocation.email || '');
          setContactPhone(initialLocation.phone || '');
          setSelectedContactIndex(0);
        } else {
          setContactName('');
          setContactTitle('');
          setContactEmail('');
          setContactPhone('');
        }
      } else if (initialPlace) {
        setSiteName(initialPlace.name || `${parentCompany.companyName} - `);
        setCompanyEmail(parentCompany.customerServiceEmail || '');
        setCompanyPhone(initialPlace.formatted_phone_number || parentCompany.customerPhone || '');
        const parsed = parsePlaceAddress(initialPlace);
        setStreetAddress(parsed.street || parsed.address1 || '');
        setSuburbCity(parsed.city || '');
        setStateCode(parsed.state || '');
        setPostcode(parsed.zip || '');
      } else {
        setSiteName(`${parentCompany.companyName} - `);
        setCompanyEmail(parentCompany.customerServiceEmail || '');
        setCompanyPhone(parentCompany.customerPhone || '');
        setStreetAddress('');
        setLevelSuite('');
        setSuburbCity('');
        setStateCode('');
        setPostcode('');
        setContactName('');
        setContactTitle('');
        setContactEmail('');
        setContactPhone('');
        setNotes('');
      }
    }
  }, [parentCompany, initialPlace, initialLocation, isOpen]);

  if (!parentCompany) return null;

  // Selectable contacts list
  const availableContacts: Array<{ name: string; title: string; email: string; phone: string; source: string }> = [];

  if (initialLocation && (initialLocation.email || initialLocation.phone || initialLocation.name)) {
    availableContacts.push({
      name: initialLocation.name,
      title: 'Discovered Branch Contact',
      email: initialLocation.email || '',
      phone: initialLocation.phone || '',
      source: 'Discovered Branch',
    });
  }

  const parentContacts = (parentCompany as any)?.contacts || [];
  parentContacts.forEach((c: Contact) => {
    if (c.name || c.email || c.phone) {
      availableContacts.push({
        name: c.name || 'Parent Contact',
        title: c.title || 'Parent Account Contact',
        email: c.email || '',
        phone: c.phone || '',
        source: 'Parent Account',
      });
    }
  });

  const handleSelectContactOption = (contactObj: { name: string; title: string; email: string; phone: string }, index: number) => {
    setSelectedContactIndex(index);
    setContactName(contactObj.name);
    setContactTitle(contactObj.title);
    setContactEmail(contactObj.email);
    setContactPhone(contactObj.phone);
  };

  const handleGoogleAddressSelect = (addr: Address) => {
    if (addr.street) setStreetAddress(addr.street);
    if (addr.city) setSuburbCity(addr.city);
    if (addr.state) setStateCode(addr.state);
    if (addr.zip) setPostcode(addr.zip);
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
    if (!streetAddress.trim() || !suburbCity.trim() || !stateCode.trim() || !postcode.trim()) {
      toast({ variant: 'destructive', title: 'Complete Address Required', description: 'Please fill in Street Address, Suburb, State, and Postcode.' });
      return;
    }

    setSubmitting(true);
    try {
      const finalAddress: Address = {
        address1: levelSuite.trim() ? `${levelSuite.trim()}, ${streetAddress.trim()}` : streetAddress.trim(),
        street: streetAddress.trim(),
        city: suburbCity.trim(),
        state: stateCode.trim(),
        zip: postcode.trim(),
        country: 'Australia',
      };

      const localManager = {
        id: crypto.randomUUID(),
        name: contactName.trim() || siteName.trim(),
        email: contactEmail.trim() || companyEmail.trim() || '',
        phone: contactPhone.trim() || companyPhone.trim() || '',
        title: contactTitle.trim() || 'Local Site Contact',
      };

      const customFranchisee = {
        name: selectedFranchiseeName,
        internalId: selectedFranchiseeId,
      };

      const copiedContacts = (parentCompany as any)?.contacts || [];

      // Call NetSuite child lead creation service
      const childLeadId = await createChildSiteLead(
        parentCompany.id,
        siteName.trim(),
        finalAddress,
        localManager,
        copiedContacts,
        notes.trim(),
        userProfile?.displayName || userProfile?.email || 'User',
        companyEmail.trim(),
        companyPhone.trim(),
        customFranchisee
      );

      toast({
        title: 'Child Lead Synced to NetSuite!',
        description: `Created child lead "${siteName.trim()}" (NetSuite ID: ${childLeadId}) & assigned to ${selectedFranchiseeName}.`,
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Multi-site lead creation error:', error);
      toast({
        variant: 'destructive',
        title: 'NetSuite Child Lead Sync Failed',
        description: error?.message || 'An unexpected error occurred while creating the lead.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[95vw] md:w-full max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Building className="h-5 w-5 text-primary" />
            Add Multi-Site Location &amp; Sync NetSuite Lead
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Generate a child lead for this location, assign it to the local franchisee, and sync with NetSuite API.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 text-sm">
          {/* Parent Customer Banner */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <Building className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-amber-950">
                Parent Customer: {parentCompany.companyName} ({parentCompany.id})
              </p>
              <p className="text-amber-800 mt-0.5">
                This multi-site location will automatically be linked under <strong>{parentCompany.companyName}</strong> as its parent account.
              </p>
            </div>
          </div>

          {/* Child Site / Company Name */}
          <div className="space-y-1.5">
            <Label htmlFor="site-name" className="text-xs font-bold text-slate-800">
              Child Site / Company Name Created *
            </Label>
            <Input
              id="site-name"
              placeholder="e.g. Clayton Utz - Sydney"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="h-9 text-xs bg-white font-medium"
            />
            {siteName && (
              <p className="text-[11px] text-muted-foreground">
                Company Name Created: <strong className="text-slate-900 font-semibold">{siteName}</strong>
              </p>
            )}
          </div>

          {/* Company Contact Info */}
          <div className="border-t pt-3 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-primary" /> Company Contact Info (Optional)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="company-email" className="flex items-center gap-1 text-xs">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> Company Email
                </Label>
                <Input
                  id="company-email"
                  placeholder="sydney@company.com"
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="company-phone" className="flex items-center gap-1 text-xs">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> Company Phone
                </Label>
                <Input
                  id="company-phone"
                  placeholder="02 9353 4000"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* Site Address Section with Separate Input Fields */}
          <div className="border-t pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Site Address Details *
              </Label>
            </div>

            {/* Google Address Autocomplete Bar */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Search Address Autocomplete (Optional):</Label>
              <GoogleAddressInput
                placeholder="Start typing site address..."
                onAddressSelect={handleGoogleAddressSelect}
                showSelectedBadge={false}
              />
            </div>

            {/* Separate Address Fields */}
            <div className="space-y-2.5 pt-1">
              <div className="space-y-1">
                <Label htmlFor="street-address" className="text-xs font-semibold text-slate-700">
                  Street Address *
                </Label>
                <Input
                  id="street-address"
                  placeholder="e.g. 71 Eagle Street"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="level-suite" className="text-xs font-semibold text-slate-700">
                  Level / Suite / Building Name (Optional)
                </Label>
                <Input
                  id="level-suite"
                  placeholder="e.g. Level 28, Riparian Plaza"
                  value={levelSuite}
                  onChange={(e) => setLevelSuite(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1 sm:col-span-1">
                  <Label htmlFor="suburb-city" className="text-xs font-semibold text-slate-700">
                    Suburb / City *
                  </Label>
                  <Input
                    id="suburb-city"
                    placeholder="e.g. Brisbane"
                    value={suburbCity}
                    onChange={(e) => setSuburbCity(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <Label htmlFor="state-code" className="text-xs font-semibold text-slate-700">
                    State *
                  </Label>
                  <Input
                    id="state-code"
                    placeholder="e.g. QLD"
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="h-8 text-xs bg-white uppercase"
                  />
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <Label htmlFor="postcode" className="text-xs font-semibold text-slate-700">
                    Postcode *
                  </Label>
                  <Input
                    id="postcode"
                    placeholder="e.g. 4000"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Servicing Franchisee Section */}
            <div className="p-3 border rounded-xl bg-emerald-50/80 border-emerald-200 space-y-2 mt-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                  <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Assigned Franchisee: <strong className="text-emerald-900 font-bold">{selectedFranchiseeName}</strong>
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5 bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100 font-semibold"
                  onClick={() => setShowOverrideFranchisee(!showOverrideFranchisee)}
                >
                  {showOverrideFranchisee ? "Use Automatic Allocation" : "Change / Override Franchisee"}
                </Button>
              </div>

              {franchiseeMatchReason && !showOverrideFranchisee && (
                <p className="text-[11px] text-emerald-800 font-medium">
                  {franchiseeMatchReason}
                </p>
              )}

              {showOverrideFranchisee && (
                <div className="pt-2 border-t border-emerald-200 space-y-1.5">
                  <Label className="text-xs font-semibold text-emerald-950">
                    Select Franchisee Override
                  </Label>
                  <Select
                    value={selectedFranchiseeId}
                    onValueChange={(val) => {
                      setSelectedFranchiseeId(val);
                      const found = allFrsList.find(f => (f.internalId || f.id) === val);
                      setSelectedFranchiseeName(found?.name || 'MailPlus Pty Ltd');
                    }}
                  >
                    <SelectTrigger className="w-full h-8 text-xs bg-white border-emerald-300">
                      <SelectValue placeholder="Select Franchisee" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {[...allFrsList]
                        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                        .map(f => (
                          <SelectItem key={f.internalId || f.id} value={f.internalId || f.id || '435'}>
                            {f.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Selectable Contacts Section */}
          <div className="border-t pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" /> Local Site Contact Details
              </h4>
              {availableContacts.length > 0 && (
                <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px] font-semibold">
                  <Sparkles className="h-3 w-3 mr-1" /> {availableContacts.length} Contacts Available
                </Badge>
              )}
            </div>

            {/* Select Contact Chips */}
            {availableContacts.length > 0 && (
              <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <Label className="text-[11px] font-semibold text-slate-700">Choose Contact to Pre-fill:</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {availableContacts.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectContactOption(c, idx)}
                      className={`text-left text-xs p-2 rounded-lg border transition-all flex items-center gap-2 ${
                        selectedContactIndex === idx
                          ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-sm font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300'
                      }`}
                    >
                      <User className={`h-3.5 w-3.5 ${selectedContactIndex === idx ? 'text-purple-600' : 'text-slate-400'}`} />
                      <div>
                        <p className="font-semibold text-[11px]">{c.name}</p>
                        <p className="text-[10px] text-slate-500">{c.email || c.phone || c.source}</p>
                      </div>
                      {selectedContactIndex === idx && <Check className="h-3.5 w-3.5 text-purple-600 ml-1 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="contact-name" className="flex items-center gap-1 text-xs font-medium">
                <User className="h-3.5 w-3.5 text-slate-400" /> Contact Name
              </Label>
              <Input
                id="contact-name"
                placeholder="e.g. John Smith"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-title" className="flex items-center gap-1 text-xs font-medium">
                <Briefcase className="h-3.5 w-3.5 text-slate-400" /> Contact Job Title
              </Label>
              <Input
                id="contact-title"
                placeholder="e.g. Branch Partner / Site Manager"
                value={contactTitle}
                onChange={(e) => setContactTitle(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="contact-email" className="flex items-center gap-1 text-xs font-medium">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> Direct Email
                </Label>
                <Input
                  id="contact-email"
                  placeholder="john.smith@company.com"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact-phone" className="flex items-center gap-1 text-xs font-medium">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> Direct Phone
                </Label>
                <Input
                  id="contact-phone"
                  placeholder="0400 000 000"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t pt-3 space-y-1.5">
            <Label htmlFor="site-notes" className="flex items-center gap-1 text-xs font-bold text-slate-800">
              <FileText className="h-3.5 w-3.5 text-primary" /> Notes / Special Instructions
            </Label>
            <Textarea
              id="site-notes"
              placeholder="Add notes or specific requirements for this location..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="text-xs resize-none bg-white"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 flex flex-col sm:flex-row gap-2 border-t pt-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting}
            className="h-8 text-xs font-semibold bg-purple-700 hover:bg-purple-800 text-white shadow-sm"
          >
            {submitting ? (
              <>
                <Loader className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Syncing with NetSuite API...
              </>
            ) : (
              <>
                <Send className="mr-1.5 h-3.5 w-3.5" /> Create Child Lead &amp; Sync to NetSuite
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
