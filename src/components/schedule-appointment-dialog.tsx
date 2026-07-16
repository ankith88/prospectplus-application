
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AddContactForm } from './add-contact-form';
import type { Lead, Contact } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Calendar, UserPlus, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { salesReps } from '@/lib/constants';

interface ScheduleAppointmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  accountManagers?: string[];
  onAssignAccountManager?: (amName: string, contactId: string) => Promise<string | null>;
  onAppointmentScheduled?: () => void;
  onCreateContact?: () => void;
}

export function ScheduleAppointmentDialog({
  isOpen,
  onOpenChange,
  lead,
  accountManagers,
  onAssignAccountManager,
  onAppointmentScheduled,
  onCreateContact
}: ScheduleAppointmentDialogProps) {
  const { toast } = useToast();
  const [selectedAm, setSelectedAm] = useState<string | null>(lead.accountManagerAssigned || null);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<'contact' | 'lead'>('contact');
  const [isAssigning, setIsAssigning] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const amList = accountManagers || ['Lee Russell', 'Kerina Helliwell', 'Luke Forbes', 'Ankith Ravindran'];

  // Sync selected AM with lead assignment on open
  useEffect(() => {
    if (isOpen) {
      setSelectedAm(lead.accountManagerAssigned || null);
    }
  }, [isOpen, lead.accountManagerAssigned]);

  const handleAmSelection = async () => {
    if (!selectedAm) return;
    if (linkType === 'contact' && !selectedContact) return;
    setIsAssigning(true);
    try {
      let urlId: string | null = null;
      const { firestore } = await import('@/lib/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      const newBookingUrlId = crypto.randomUUID();

      if (linkType === 'contact') {
        if (onAssignAccountManager) {
          urlId = await onAssignAccountManager(selectedAm, selectedContact!);
        } else {
          const updates: any = {
            accountManagerAssigned: selectedAm,
            bucket: 'account_manager',
            bookingUrlId: newBookingUrlId,
            bookingContactId: selectedContact
          };
          if (lead.bucket === 'outbound') {
            updates.wasOutbound = true;
          }
          await updateDoc(doc(firestore, 'leads', lead.id), updates);
          urlId = newBookingUrlId;
        }
      } else {
        const updates: any = {
          accountManagerAssigned: selectedAm,
          bucket: 'account_manager',
          generalBookingUrlId: newBookingUrlId
        };
        if (lead.bucket === 'outbound') {
          updates.wasOutbound = true;
        }
        await updateDoc(doc(firestore, 'leads', lead.id), updates);
        urlId = newBookingUrlId;
      }

      if (urlId) {
        setGeneratedUrl(`${window.location.origin}/book/${urlId}`);
        onAppointmentScheduled?.();
      }
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate booking link.' });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      toast({ title: 'Link Copied', description: 'Booking link copied to clipboard.' });
    }
  };

  // Reset state when modal is closed/opened
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTimeout(() => {
        setGeneratedUrl(null);
        setSelectedAm(lead.accountManagerAssigned || null);
        setSelectedContact(null);
      }, 300);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{generatedUrl ? 'Booking Link Ready' : 'Schedule Appointment'}</DialogTitle>
          <DialogDescription>
            {generatedUrl 
              ? 'Share this link with your contact so they can pick a time.' 
              : 'Assign an Account Manager to schedule an appointment with.'}
          </DialogDescription>
        </DialogHeader>

        {!generatedUrl ? (
          <>
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="flex rounded-md bg-slate-100 p-1 mb-4">
                <button
                  type="button"
                  onClick={() => setLinkType('contact')}
                  className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-colors ${linkType === 'contact' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Contact-Specific Link
                </button>
                <button
                  type="button"
                  onClick={() => setLinkType('lead')}
                  className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-colors ${linkType === 'lead' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Lead-Level Link
                </button>
              </div>

              <div className="space-y-6">
                {linkType === 'contact' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-slate-900">1. Select Contact</h3>
                      <Button variant="ghost" size="sm" onClick={onCreateContact} className="h-8 text-blue-600 hover:text-blue-700">
                        <UserPlus className="h-4 w-4 mr-2" />
                        New Contact
                      </Button>
                    </div>
                    
                    {(!lead.contacts || lead.contacts.length === 0) ? (
                      <div className="text-center p-4 border border-dashed rounded-lg bg-slate-50">
                        <p className="text-sm text-slate-500 mb-2">No contacts found for this lead.</p>
                        <Button variant="outline" size="sm" onClick={onCreateContact}>Add Contact First</Button>
                      </div>
                    ) : (
                      <RadioGroup
                        value={selectedContact || ''}
                        onValueChange={setSelectedContact}
                        className="space-y-2 p-1"
                      >
                        {lead.contacts.map((contact) => (
                          <Label
                            key={contact.id}
                            htmlFor={`contact-${contact.id}`}
                            className="flex items-start gap-3 rounded-md border p-3 hover:bg-accent hover:text-accent-foreground has-[:checked]:bg-accent has-[:checked]:text-accent-foreground cursor-pointer"
                          >
                            <RadioGroupItem value={contact.id} id={`contact-${contact.id}`} className="mt-1" />
                            <div>
                              <p className="font-semibold text-sm">{contact.name}</p>
                              <p className="text-xs text-slate-500">{contact.email || 'No email'} • {contact.phone || 'No phone'}</p>
                            </div>
                          </Label>
                        ))}
                      </RadioGroup>
                    )}
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-slate-900 mb-3">
                    {linkType === 'contact' ? '2. Select Account Manager' : 'Select Account Manager'}
                  </h3>
                  <RadioGroup
                    value={selectedAm || ''}
                    onValueChange={setSelectedAm}
                    className="space-y-2 p-1"
                  >
                    {amList.map((am) => (
                      <Label
                        key={am}
                        htmlFor={`am-${am}`}
                        className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent hover:text-accent-foreground has-[:checked]:bg-accent has-[:checked]:text-accent-foreground cursor-pointer"
                      >
                        <RadioGroupItem value={am} id={`am-${am}`} />
                        <div>
                          <p className="font-semibold text-sm">{am}</p>
                        </div>
                      </Label>
                    ))}
                    {amList.length === 0 && (
                      <p className="text-sm text-slate-500">No Account Managers found.</p>
                    )}
                  </RadioGroup>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isAssigning}>Cancel</Button>
              <Button onClick={handleAmSelection} disabled={!selectedAm || (linkType === 'contact' && !selectedContact) || isAssigning}>
                {isAssigning ? 'Generating Link...' : 'Generate Link'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-6 py-6 w-full max-w-full overflow-hidden">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            
            <div className="w-full space-y-2 overflow-hidden">
              <Label className="text-xs text-slate-500 uppercase tracking-wider">Booking Link</Label>
              <div className="flex items-center gap-2 p-3 bg-slate-50 border rounded-md w-full overflow-hidden">
                <p className="text-sm font-mono text-slate-700 truncate flex-1 select-all min-w-0 block w-full">{generatedUrl}</p>
              </div>
            </div>

            <div className="flex flex-col w-full gap-3 shrink-0">
              <Button onClick={handleCopyLink} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button variant="outline" onClick={() => window.open(generatedUrl, '_blank')} className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Booking Page
              </Button>
              <Button variant="ghost" onClick={() => handleOpenChange(false)} className="w-full mt-2 text-slate-500">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

