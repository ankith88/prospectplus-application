
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AddContactForm } from './add-contact-form';
import type { Lead, Contact } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Calendar, UserPlus } from 'lucide-react';
import { salesReps } from './lead-profile';

interface ScheduleAppointmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
}

export function ScheduleAppointmentDialog({
  isOpen,
  onOpenChange,
  lead,
}: ScheduleAppointmentDialogProps) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>(lead.contacts || []);
  const { user } = useAuth();

  const handleContactAdded = (newContact: Omit<Contact, 'id'>) => {
    const tempContact: Contact = { ...newContact, id: `temp-${Date.now()}` };
    setContacts((prev) => [...prev, tempContact]);
    setSelectedContactId(tempContact.id);
    setIsAddingContact(false);
  };
  
  const handleRepSelection = (repUrl: string) => {
    if (!selectedContactId || !user?.displayName) return;
    
    const contact = contacts.find(c => c.id === selectedContactId);
    if(!contact) return;

    const nameParts = contact.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const calendlyUrl = new URL(repUrl);
    const params = calendlyUrl.searchParams;

    params.set('name', `${firstName} ${lastName}`);
    params.set('email', contact.email);
    params.set('a1', lead.id);
    if(lead.entityId) params.set('a2', lead.entityId);
    params.set('a3', user.displayName);

    window.open(calendlyUrl.toString(), '_blank');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
          <DialogDescription>
            {isAddingContact
              ? 'Add a new contact to schedule an appointment with.'
              : 'Select a contact to schedule an appointment with.'}
          </DialogDescription>
        </DialogHeader>

        {isAddingContact ? (
          <AddContactForm leadId={lead.id} onContactAdded={handleContactAdded} />
        ) : (
          <>
            <ScrollArea className="max-h-64">
              <RadioGroup
                value={selectedContactId || ''}
                onValueChange={setSelectedContactId}
                className="space-y-2 p-1"
              >
                {contacts.map((contact) => (
                  <Label
                    key={contact.id}
                    htmlFor={contact.id}
                    className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent hover:text-accent-foreground has-[:checked]:bg-accent has-[:checked]:text-accent-foreground"
                  >
                    <RadioGroupItem value={contact.id} id={contact.id} />
                    <div>
                      <p className="font-semibold">{contact.name}</p>
                      <p className="text-sm opacity-80">{contact.title}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </ScrollArea>

            <Button
              variant="outline"
              onClick={() => setIsAddingContact(true)}
              className="w-full"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add New Contact
            </Button>

            {selectedContactId && (
              <div className="space-y-2 pt-4 border-t">
                <h4 className="font-medium">Select a Sales Rep</h4>
                <div className="grid grid-cols-1 gap-2">
                  {salesReps.map((rep) => (
                    <Button
                      key={rep.name}
                      variant="secondary"
                      onClick={() => handleRepSelection(rep.url)}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {rep.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {!isAddingContact && (
            <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

