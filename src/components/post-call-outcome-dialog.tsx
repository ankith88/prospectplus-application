
'use client'

import { useState, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Lead, Activity, Contact, LeadStatus } from '@/lib/types'
import { addContactToLead, updateLeadStatus } from '@/services/firebase'
import { useToast } from '@/hooks/use-toast'
import { sendToNetSuiteForOutcome } from '@/services/netsuite'
import { useRouter } from 'next/navigation'

const formSchema = z.object({
  outcome: z.string().min(1, 'An outcome is required.'),
  notes: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional().refine(email => !email || z.string().email().safeParse(email).success, {
    message: "Invalid email address",
  }),
  contactPhone: z.string().optional(),
  contactTitle: z.string().optional(),
});

interface PostCallOutcomeDialogProps {
  lead: Lead
  callActivity: Activity
  isOpen: boolean
  onClose: () => void
  onSubmit: (outcome: string, notes: string, contact?: Partial<Contact>) => void
}

const callOutcomes = [
    'Busy',
    'Call Back/Follow-up',
    'Gatekeeper',
    'Disconnected',
    'Interested',
    'No Answer',
    'Not Interested',
    'Voicemail',
    'Wrong Number',
    'Disqualified - Not a Fit',
    'DNC - Stop List',
];

export function PostCallOutcomeDialog({ lead, callActivity, isOpen, onClose, onSubmit: onSubmitProp }: PostCallOutcomeDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      outcome: '',
      notes: callActivity?.notes || '',
    },
  })
  const { toast } = useToast()
  const router = useRouter();
  const outcome = form.watch('outcome');

    // Mock Calendly links for sales reps
  const MOCKED_CALENDLY_LINKS: { [key: string]: string } = {
    'Leonie Feata': 'https://calendly.com/leonie-feata-mock/meeting',
    'Luke Forbes': 'https://calendly.com/luke-forbes-mock/meeting',
    'Default': 'https://calendly.com/mailplus-default/meeting',
  };
  
  useEffect(() => {
    if (isOpen) {
      form.reset({
        outcome: '',
        notes: callActivity?.notes || '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        contactTitle: '',
      });
    }
  }, [isOpen, callActivity, form]);

  const outcomeStatusMap: { [key: string]: { status: LeadStatus, reason?: string } } = {
      'Voicemail': { status: 'In Progress' },
      'No Answer': { status: 'In Progress' },
      'Busy': { status: 'In Progress' },
      'Disqualified - Not a Fit': { status: 'Lost', reason: 'Not Interested' },
      'Interested': { status: 'Qualified' },
      'Not Interested': { status: 'Lost', reason: 'Not Interested' },
      'Gatekeeper': { status: 'Connected' },
      'Call Back/Follow-up': { status: 'High Touch' },
      'Disconnected': { status: 'Lost', reason: 'Wrong Contact Details' },
      'Wrong Number': { status: 'Lost', reason: 'Wrong Contact Details' },
      'DNC - Stop List': { status: 'Lost', reason: 'Not Interested' },
  };

  const netSuiteOutcomes = ['Disconnected', 'Not Interested', 'Wrong Number', 'DNC - Stop List', 'Disqualified - Not a Fit'];

  async function handleNextStep(action: 'lpo' | 'appointment') {
    const values = form.getValues();

    if (action === 'lpo') {
      if (!values.contactName || !values.contactEmail || !values.contactPhone || !values.contactTitle) {
        toast({
          variant: 'destructive',
          title: 'Missing Information',
          description: 'Contact Name, Title, Email, and Phone are required to refer to an LPO.',
        });
        return;
      }
    }
    
    // Save contact if new
    const newContactData = {
        name: values.contactName!,
        email: values.contactEmail!,
        phone: values.contactPhone!,
        title: values.contactTitle!,
    };

    if (newContactData.name && newContactData.email) {
        const existingContact = lead.contacts?.find(c => c.email === newContactData.email);
        if (!existingContact) {
            await addContactToLead(lead.id, newContactData);
        }
    }
    
    // Log the base activity
    onSubmitProp(values.outcome, values.notes || '', newContactData);


    if (action === 'lpo') {
       try {
            await updateLeadStatus(lead.id, 'LPO Review');
            toast({
                title: 'Success',
                description: 'Lead has been referred to LPO and status updated to "LPO Review".',
            });
       } catch(e) {
            console.error('Failed to refer lead to LPO:', e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to refer lead to LPO.' });
       }
    } else if (action === 'appointment') {
        const salesRep = lead.salesRepAssigned || 'Default';
        const calendlyLink = MOCKED_CALENDLY_LINKS[salesRep] || MOCKED_CALENDLY_LINKS['Default'];
        
        let prefilledUrl = calendlyLink;
        if (values.contactName && values.contactEmail) {
           prefilledUrl = `${calendlyLink}?name=${encodeURIComponent(values.contactName!)}&email=${encodeURIComponent(values.contactEmail!)}`;
        }
        
        await updateLeadStatus(lead.id, 'Qualified');
        
        toast({
            title: 'Redirecting to Calendly...',
            description: 'Please book the appointment for the lead. Status has been updated to Qualified.',
        });

        window.open(prefilledUrl, '_blank');
    }

    onClose();
    router.refresh();
  }


  async function onSubmit(values: z.infer<typeof formSchema>) {
    onSubmitProp(values.outcome, values.notes || '');

    const outcomeMapping = outcomeStatusMap[values.outcome];
    if (outcomeMapping) {
        await updateLeadStatus(lead.id, outcomeMapping.status, outcomeMapping.reason);
        toast({
            title: "Status Updated",
            description: `Lead status changed to ${outcomeMapping.status}.`
        });
    }
    
    if (netSuiteOutcomes.includes(values.outcome)) {
        try {
            await sendToNetSuiteForOutcome({
                leadId: lead.id,
                outcome: values.outcome,
                reason: outcomeMapping.reason || '',
                dialerAssigned: lead.dialerAssigned || '',
                notes: values.notes || '',
            });
            toast({
                title: "NetSuite Updated",
                description: "The outcome has been sent to NetSuite."
            });
        } catch (error) {
            console.error("Failed to send outcome to NetSuite:", error);
            toast({
                variant: "destructive",
                title: "NetSuite Error",
                description: "Could not send outcome to NetSuite."
            });
        }
    }

    onClose();
    router.refresh();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Call Outcome</DialogTitle>
          <DialogDescription>
            Select the outcome of your recent call with {lead.companyName}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcome</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a call outcome" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {callOutcomes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any notes from the call..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {outcome === 'Interested' && (
              <div className="space-y-4 rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">The lead is interested. To refer to an LPO, all contact fields are required.</p>
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactTitle"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                            <Input placeholder="Head of Logistics" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="jane.d@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="123-456-7890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
            )}
            
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                {outcome === 'Interested' ? (
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => handleNextStep('lpo')}>Refer to LPO</Button>
                        <Button type="button" onClick={() => handleNextStep('appointment')}>Set Appointment</Button>
                    </div>
                ) : (
                    <Button type="submit" disabled={form.formState.isSubmitting || !outcome}>
                        {form.formState.isSubmitting ? 'Saving...' : 'Save Outcome'}
                    </Button>
                )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
