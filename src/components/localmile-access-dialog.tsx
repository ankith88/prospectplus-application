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
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [serviceType, setServiceType] = useState<'Adhoc' | 'Recurring'>('Adhoc');
  const [rate, setRate] = useState<string>('15');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setSelectedContacts([]);
      setServiceType('Adhoc');
      setRate('15');
    }
  }, [isOpen]);

  useEffect(() => {
    if (serviceType === 'Adhoc') {
      setRate('15');
    } else if (serviceType === 'Recurring') {
      setRate('10');
    }
  }, [serviceType]);

  const handleSelectContact = (contactId: string, checked: boolean) => {
    setSelectedContacts((prev) =>
      checked ? [...prev, contactId] : prev.filter((id) => id !== contactId)
    );
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty string or numbers
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
        setRate(val);
    }
  };

  const handleSubmit = async () => {
    if (selectedContacts.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Contacts Selected',
        description: 'Please select at least one contact to grant access.',
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
        selectedContacts.map((contactId) => {
          const c = lead.contacts?.find(c => c.id === contactId);
          if (c) {
             selectedContactsInfo.push({
               id: c.id,
               firstName: c.name.split(' ')[0] || '',
               lastName: c.name.split(' ').slice(1).join(' ') || '',
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
      
    } catch (error: any) {
      // The onConfirm function is expected to handle its own error toasts
    } finally {
      setIsSubmitting(false);
      onOpenChange(false);
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
        <ScrollArea className="max-h-[50vh] p-1">
          <div className="space-y-6 py-4">
            


            <div className="space-y-3">
              <Label className="text-sm font-semibold">Select Contacts</Label>
              {lead.contacts && lead.contacts.length > 0 ? lead.contacts.map((contact) => (
                <div key={contact.id} className="flex items-center space-x-3 rounded-md border p-3">
                  <Checkbox
                    id={`contact-${contact.id}`}
                    onCheckedChange={(checked) => handleSelectContact(contact.id, !!checked)}
                    checked={selectedContacts.includes(contact.id)}
                  />
                  <Label htmlFor={`contact-${contact.id}`} className="flex flex-col cursor-pointer">
                    <span className="font-semibold">{contact.name}</span>
                    <span className="text-sm text-muted-foreground">{contact.email}</span>
                  </Label>
                </div>
              )) : (
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
