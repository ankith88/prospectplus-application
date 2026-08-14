'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './ui/loader';
import type { Lead } from '@/lib/types';
import { updateContactSendEmail, updateContactInLead } from '@/services/firebase';
import { isContactEmpty } from '@/lib/contact-utils';
import { useAuth } from '@/hooks/use-auth';
import { getPmpoServiceForLead, isDialerUser } from '@/lib/localmile-utils';
import { Lock, Info } from 'lucide-react';

interface LocalMileAccessDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onConfirm: (serviceType: string, rate: number, selectedContactsInfo: any[]) => Promise<void>;
}

export function LocalMileAccessDialog({
  isOpen,
  onOpenChange,
  lead,
  onConfirm,
}: LocalMileAccessDialogProps) {
  const { userProfile } = useAuth();
  const isDialer = isDialerUser(userProfile);

  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [serviceType, setServiceType] = useState<'Adhoc' | 'Recurring'>('Adhoc');
  const [rate, setRate] = useState<string>('15');
  const [hasPmpo, setHasPmpo] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && lead) {
      setSelectedContacts([]);
      const pmpo = getPmpoServiceForLead(lead);
      setHasPmpo(pmpo.hasPmpoService);
      setServiceType(pmpo.serviceType);
      setRate(String(pmpo.rate));
    }
  }, [isOpen, lead]);

  useEffect(() => {
    if (!hasPmpo && serviceType) {
      if (serviceType === 'Adhoc') {
        setRate('15');
      } else if (serviceType === 'Recurring') {
        setRate('10');
      }
    }
  }, [serviceType, hasPmpo]);

  const handleSelectContact = (contactId: string, checked: boolean) => {
    setSelectedContacts((prev) =>
      checked ? [...prev, contactId] : prev.filter((id) => id !== contactId)
    );
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isDialer) return;
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setRate(val);
    }
  };

  const handleSubmit = async () => {
    const validSelectedContacts = selectedContacts.filter((contactId) => {
      const c = lead.contacts?.find((ct) => ct.id === contactId);
      return Boolean(c?.name?.trim() && c?.email?.trim());
    });

    if (validSelectedContacts.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Contacts Selected',
        description: 'Please select at least one contact with a valid name and email to grant access.',
      });
      return;
    }

    if (!rate) {
      toast({
        variant: 'destructive',
        title: 'Rate Required',
        description: 'Please enter a valid rate.',
      });
      return;
    }

    const numericRate = parseFloat(rate);
    if (isNaN(numericRate)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Rate',
        description: 'Rate must be a valid number.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedContactsInfo: any[] = [];
      await Promise.all(
        validSelectedContacts.map((contactId) => {
          const c = lead.contacts?.find(c => c.id === contactId);
          if (c) {
            selectedContactsInfo.push({
              id: c.id,
              name: c.name || '',
              email: c.email || '',
              phone: c.phone || '',
            });
          }
          return Promise.all([
            updateContactSendEmail(lead.id, contactId),
            updateContactInLead(lead.id, contactId, { accessToLocalMile: 'yes' })
          ]);
        })
      );

      await onConfirm(serviceType, numericRate, selectedContactsInfo);
      onOpenChange(false);
    } catch (error: any) {
      console.error('[LocalMile Trial] Error during submission:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Initiate Trial',
        description: error.message || 'An error occurred while granting access. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Grant LocalMile Access</DialogTitle>
          <DialogDescription>
            Configure LocalMile free trial and select contacts from {lead.companyName} to receive access.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1">
          <div className="space-y-6 py-4">
            
            {/* Service & Rate Configuration */}
            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-foreground">Post-Trial Service Configuration</Label>
                {hasPmpo ? (
                  <span className="inline-flex items-center gap-1 rounded bg-[#095c7b]/10 px-2 py-0.5 text-xs font-semibold text-[#095c7b]">
                    PMPO Service Rate
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    Default Rate
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Service Type</Label>
                  <RadioGroup
                    value={serviceType}
                    onValueChange={(val) => isDialer && !hasPmpo && setServiceType(val as 'Adhoc' | 'Recurring')}
                    disabled={hasPmpo || !isDialer}
                    className="flex space-x-2"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="Adhoc" id="trial-adhoc" disabled={hasPmpo || !isDialer} />
                      <Label htmlFor="trial-adhoc" className="text-xs cursor-pointer">Adhoc</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="Recurring" id="trial-recurring" disabled={hasPmpo || !isDialer} />
                      <Label htmlFor="trial-recurring" className="text-xs cursor-pointer">Recurring</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    Post-Trial Rate ($)
                    {!isDialer && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Label>
                  <Input
                    type="text"
                    value={rate}
                    onChange={handleRateChange}
                    readOnly={!isDialer}
                    disabled={!isDialer}
                    className={`h-8 text-sm ${!isDialer ? 'bg-muted cursor-not-allowed opacity-90' : ''}`}
                    placeholder="15.00"
                  />
                </div>
              </div>

              {!isDialer ? (
                <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground pt-1 border-t">
                  <Lock className="h-3 w-3 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Rate is locked to the PMPO service rate. To edit this rate, please update the PMPO service in the Services / SCF tab.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t">
                  <Info className="h-3 w-3 shrink-0 text-[#095c7b]" />
                  <span>
                    {hasPmpo ? 'Pre-filled from lead PMPO service. Editable for Dialer role.' : 'Default trial rate. Editable for Dialer role.'}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Select Contacts</Label>
              {lead.contacts && lead.contacts.filter(c => !isContactEmpty(c)).length > 0 ? lead.contacts.filter(c => !isContactEmpty(c)).map((contact) => {
                const isValidContact = Boolean(contact.name?.trim() && contact.email?.trim());
                return (
                  <div key={contact.id} className={`flex items-center space-x-3 rounded-md border p-3 ${!isValidContact ? 'opacity-60 bg-muted/30' : ''}`}>
                    <Checkbox
                      id={`contact-${contact.id}`}
                      disabled={!isValidContact}
                      onCheckedChange={(checked) => {
                        if (!isValidContact) return;
                        handleSelectContact(contact.id, !!checked);
                      }}
                      checked={isValidContact && selectedContacts.includes(contact.id)}
                    />
                    <Label htmlFor={`contact-${contact.id}`} className={`flex flex-col ${isValidContact ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                      <span className="font-semibold flex items-center gap-1.5">
                        {contact.name || 'Unnamed Contact'}
                        {!isValidContact && (
                          <span className="text-xs text-destructive font-normal">(Name & email required)</span>
                        )}
                      </span>
                      <span className="text-sm text-muted-foreground">{contact.email || 'No email'}</span>
                    </Label>
                  </div>
                );
              }) : (
                <div className="text-sm text-muted-foreground italic">No contacts available.</div>
              )}
            </div>

          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || selectedContacts.length === 0 || !rate}>
            {isSubmitting ? <Loader /> : 'Confirm and Initiate Trial'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

