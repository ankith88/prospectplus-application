

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
import { useToast } from '@/hooks/use-toast';
import { Loader } from './ui/loader';
import type { Lead } from '@/lib/types';
import { updateContactInLead, initiateLocalMileTrial, updateLeadStatus } from '@/services/firebase';
import { useRouter } from 'next/navigation';

interface LocalMileAccessDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
}

export function LocalMileAccessDialog({
  isOpen,
  onOpenChange,
  lead,
}: LocalMileAccessDialogProps) {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) {
      setSelectedContacts([]);
    }
  }, [isOpen]);

  const handleSelectContact = (contactId: string, checked: boolean) => {
    setSelectedContacts((prev) =>
      checked ? [...prev, contactId] : prev.filter((id) => id !== contactId)
    );
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

    setIsSubmitting(true);
    try {
      await Promise.all(
        selectedContacts.map((contactId) =>
          updateContactInLead(lead.id, contactId, { accessToLocalMile: 'yes' })
        )
      );

      toast({
        title: 'Access Granted',
        description: `${selectedContacts.length} contact(s) have been granted access. Initiating trial...`,
      });
      
      const responseBody = await initiateLocalMileTrial({ leadId: lead.id });

      if (responseBody.success === true) {
          await updateLeadStatus(lead.id, 'LocalMile Pending');
          toast({ title: 'Success!', description: 'LocalMile free trial initiated and lead status updated.' });
          setTimeout(() => {
            onOpenChange(false);
            router.push('/field-sales');
          }, 100);
      } else if (responseBody.success === false && responseBody.message === "Lead Already Synced to LocalMile") {
          toast({ variant: "default", title: 'Already Synced', description: 'This lead has already been synced for a LocalMile trial.' });
      } else {
          throw new Error(responseBody.message || 'An unknown error occurred in NetSuite.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not initiate LocalMile free trial.' });
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
            Select which contacts from {lead.companyName} should receive access to the LocalMile free trial.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh] p-1">
          <div className="space-y-4 py-4">
            {lead.contacts?.map((contact) => (
              <div key={contact.id} className="flex items-center space-x-3 rounded-md border p-3">
                <Checkbox
                  id={`contact-${contact.id}`}
                  onCheckedChange={(checked) => handleSelectContact(contact.id, !!checked)}
                  checked={selectedContacts.includes(contact.id)}
                />
                <Label htmlFor={`contact-${contact.id}`} className="flex flex-col">
                  <span className="font-semibold">{contact.name}</span>
                  <span className="text-sm text-muted-foreground">{contact.email}</span>
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || selectedContacts.length === 0}>
            {isSubmitting ? <Loader /> : 'Confirm and Initiate Trial'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    