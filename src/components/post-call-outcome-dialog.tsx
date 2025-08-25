
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
import type { Lead, Activity, Contact } from '@/lib/types'
import { addContactToLead, updateLeadStatus } from '@/services/firebase'
import { useToast } from '@/hooks/use-toast'
import { sendToNetSuite } from '@/services/netsuite'

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
            await sendToNetSuite(lead);
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
  }


  async function onSubmit(values: z.infer<typeof formSchema>) {
    onSubmitProp(values.outcome, values.notes || '');
    onClose();
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
                    <Button type="submit" disabled={form.formState.isSubmitting}>
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
