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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { updateLeadServices, updateLeadDetails } from '@/services/firebase';
import type { Lead, ServiceSelection } from '@/lib/types';
import { isBankingServiceSelected, isH2hServiceSelected, getNearbyBanks, saveOrUpdateTaggedAddress } from '@/lib/bank-utils';
import { GoogleAddressInput } from './google-address-input';

interface ManageServicesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onSuccess: () => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

export function ManageServicesDialog({ isOpen, onOpenChange, lead, onSuccess }: ManageServicesDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeServices, setActiveServices] = useState<any[]>([]);
  const [configuredServices, setConfiguredServices] = useState<ServiceSelection[]>([]);
  const [partnerLocations, setPartnerLocations] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>(lead.bankLocationId || '');
  const [selectedBank, setSelectedBank] = useState<any | null>(null);
  const [h2hAddress, setH2hAddress] = useState<any | null>(null);

  // Fetch active services
  useEffect(() => {
    if (!isOpen) return;

    const fetchServices = async () => {
      setLoading(true);
      try {
        const q = query(collection(firestore, 'services'), where('isActive', '==', true));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => {
          const data = doc.data();
          const name = data.code || data.name || doc.id;
          return { id: doc.id, name, ...data };
        }).sort((a, b) => a.name.localeCompare(b.name));
        setActiveServices(list);
      } catch (err) {
        console.error('Error fetching active services:', err);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load active services list.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchServices();

    const fetchPartnerLocations = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'partner_locations'));
        const locs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPartnerLocations(locs);
        if (lead.bankLocationId) {
          const found = locs.find(l => l.id === lead.bankLocationId || (l as any).internalId === lead.bankLocationId);
          if (found) setSelectedBank(found);
        }
      } catch (err) {
        console.error('Error fetching partner locations:', err);
      }
    };
    fetchPartnerLocations();

    // Initialize configured services from lead
    const initialServices = lead.services ? JSON.parse(JSON.stringify(lead.services)) : [];
    setConfiguredServices(initialServices);
  }, [isOpen, lead, toast]);

  const handleAddService = (serviceName: string) => {
    if (configuredServices.some(s => s.name === serviceName)) {
      toast({
        variant: 'destructive',
        title: 'Duplicate Service',
        description: `${serviceName} is already configured for this lead.`,
      });
      return;
    }

    const matchingActive = activeServices.find(s => s.name === serviceName);
    const defaultRate = matchingActive?.rate || matchingActive?.defaultRate || 0;

    const newService: ServiceSelection = {
      name: serviceName as any,
      frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      rate: defaultRate,
      startDate: new Date().toISOString().split('T')[0],
    };

    setConfiguredServices([...configuredServices, newService]);
  };

  const handleRemoveService = (index: number) => {
    const updated = [...configuredServices];
    updated.splice(index, 1);
    setConfiguredServices(updated);
  };

  const handleFrequencyChange = (index: number, day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri', checked: boolean) => {
    const updated = [...configuredServices];
    const service = updated[index];
    
    let currentFreq = Array.isArray(service.frequency) ? [...service.frequency] : [];
    if (checked) {
      if (!currentFreq.includes(day)) {
        currentFreq.push(day);
      }
    } else {
      currentFreq = currentFreq.filter(d => d !== day);
    }
    
    // Sort to keep Mon-Fri order
    const dayOrder = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };
    currentFreq.sort((a, b) => dayOrder[a] - dayOrder[b]);

    service.frequency = currentFreq;
    setConfiguredServices(updated);
  };

  const handleAdhocToggle = (index: number, isAdhoc: boolean) => {
    const updated = [...configuredServices];
    const service = updated[index];
    if (isAdhoc) {
      service.frequency = 'Adhoc';
    } else {
      service.frequency = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    }
    setConfiguredServices(updated);
  };

  const handleRateChange = (index: number, val: string) => {
    const updated = [...configuredServices];
    updated[index].rate = val === '' ? 0 : parseFloat(val);
    setConfiguredServices(updated);
  };

  const handleStartDateChange = (index: number, val: string) => {
    const updated = [...configuredServices];
    updated[index].startDate = val;
    setConfiguredServices(updated);
  };

  const handleSave = async () => {
    if (isBankingServiceSelected(configuredServices) && !selectedBankId && !selectedBank && !lead.bankLocationId) {
      toast({
        variant: 'destructive',
        title: 'Bank Selection Required',
        description: 'Selecting a Bank partner location is mandatory when EB or CB service is configured.',
      });
      return;
    }

    if (isH2hServiceSelected(configuredServices) && !h2hAddress) {
      toast({
        variant: 'destructive',
        title: 'H2H Address Required',
        description: 'Selecting a service address is mandatory when an H2H service is configured.',
      });
      return;
    }

    setSaving(true);
    try {
      await updateLeadServices(lead.id, configuredServices);

      if (selectedBank) {
        await saveOrUpdateTaggedAddress(lead.id, {
          tag: 'EB/CB Bank',
          address1: selectedBank.address1 || selectedBank.name,
          street: selectedBank.address1 || selectedBank.name,
          city: selectedBank.suburb || selectedBank.city,
          suburb: selectedBank.suburb || selectedBank.city,
          state: selectedBank.state,
          zip: selectedBank.postCode || selectedBank.postcode,
          lat: selectedBank.lat || selectedBank.latitude,
          lng: selectedBank.lng || selectedBank.longitude,
        });
        await updateLeadDetails(lead.id, lead, {
          bankLocationId: selectedBank.id || selectedBank.internalId,
          bankLocationName: selectedBank.name,
        });
      }

      if (h2hAddress) {
        await saveOrUpdateTaggedAddress(lead.id, {
          tag: 'H2H Address',
          ...h2hAddress,
        });
      }

      toast({
        title: 'Success',
        description: 'Services updated successfully.',
      });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving services:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save service updates.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Find active services not yet configured
  const unconfiguredActive = activeServices.filter(as => !configuredServices.some(cs => cs.name === as.name));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#095c7b]">Directly Configure Services</DialogTitle>
          <DialogDescription>
            Directly configure services, frequencies, and rates for <strong>{lead.companyName}</strong> without starting a signup form flow.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto my-4 space-y-6 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#095c7b]" />
              <span className="text-xs text-muted-foreground mt-2">Loading active services...</span>
            </div>
          ) : (
            <>
              {/* Add Service Section */}
              {unconfiguredActive.length > 0 ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Add Service</h4>
                    <p className="text-[11px] text-slate-400">Choose a service from the active catalog to configure.</p>
                  </div>
                  <Select onValueChange={(val) => handleAddService(val)} value="">
                    <SelectTrigger className="w-[280px] bg-white text-xs border-slate-200 h-9">
                      <SelectValue placeholder="Select a service to add..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unconfiguredActive.map(svc => (
                        <SelectItem key={svc.id} value={svc.name} className="text-xs">
                          {svc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : activeServices.length > 0 ? (
                <div className="flex items-center gap-2 text-xs bg-slate-50 border p-3 rounded-lg text-slate-500">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  All active services from the catalog have been configured.
                </div>
              ) : null}


              {/* Configured Services List */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configured Services</h4>
                {configuredServices.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-400 italic bg-slate-50/50 rounded-xl border border-dashed">
                    No services configured. Click any available service above to add it.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {configuredServices.map((svc, idx) => {
                      const isAdhoc = svc.frequency === 'Adhoc';
                      return (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 hover:border-slate-300 transition-colors">
                          <div className="flex justify-between items-center pb-2 border-b">
                            <span className="font-bold text-sm text-slate-800">{svc.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveService(idx)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 rounded-full"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Frequency Selection */}
                            <div className="space-y-2 md:col-span-1">
                              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Frequency</span>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`adhoc-${idx}`}
                                    checked={isAdhoc}
                                    onCheckedChange={(checked) => handleAdhocToggle(idx, !!checked)}
                                  />
                                  <Label htmlFor={`adhoc-${idx}`} className="text-xs font-semibold text-slate-700">Adhoc / Non-Recurring</Label>
                                </div>

                                {!isAdhoc && (
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {DAYS.map(day => {
                                      const freqList = Array.isArray(svc.frequency) ? svc.frequency : [];
                                      const isChecked = freqList.includes(day);
                                      return (
                                        <div key={day} className="flex items-center gap-1.5 border border-slate-100 bg-slate-50 px-2 py-1 rounded-md">
                                          <Checkbox
                                            id={`day-${day}-${idx}`}
                                            checked={isChecked}
                                            onCheckedChange={(checked) => handleFrequencyChange(idx, day, !!checked)}
                                          />
                                          <Label htmlFor={`day-${day}-${idx}`} className="text-[11px] font-semibold text-slate-600">{day}</Label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Rate Customization */}
                            <div className="space-y-2">
                              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Rate ($)</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-400">$</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={svc.rate ?? ''}
                                  onChange={(e) => handleRateChange(idx, e.target.value)}
                                  className="h-8 text-xs max-w-[120px]"
                                />
                              </div>
                            </div>

                            {/* Start Date */}
                            <div className="space-y-2">
                              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</span>
                              <Input
                                type="date"
                                value={svc.startDate ? (svc.startDate.includes('T') ? svc.startDate.split('T')[0] : svc.startDate) : ''}
                                onChange={(e) => handleStartDateChange(idx, e.target.value)}
                                className="h-8 text-xs max-w-[160px]"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Mandatory Bank Location Selection when EB or CB is configured */}
              {isBankingServiceSelected(configuredServices) && (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                  <Label className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-[#095c7b]" />
                    Select Bank Location <span className="text-rose-500">*</span>
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Selecting a Bank partner location is mandatory for Express Banking (EB) and Cash Banking (CB) services.
                  </p>
                  <Select
                    value={selectedBankId}
                    onValueChange={(val) => {
                      setSelectedBankId(val);
                      const nearby = getNearbyBanks(lead, partnerLocations);
                      const found = nearby.find(b => b.id === val);
                      setSelectedBank(found ? found.raw : null);
                    }}
                  >
                    <SelectTrigger className="w-full bg-white text-xs border-slate-200 h-9">
                      <SelectValue placeholder="Select closest Bank location..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {getNearbyBanks(lead, partnerLocations).map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-xs">
                          {b.displayLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Mandatory H2H Address Selection when H2H service is configured */}
              {isH2hServiceSelected(configuredServices) && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                  <GoogleAddressInput
                    label="H2H Service Address"
                    placeholder="Type address for H2H service..."
                    required={true}
                    onAddressSelect={(parsed) => setH2hAddress(parsed)}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs h-9">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-9 font-semibold"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
