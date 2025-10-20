
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
  callActivity?: Activity | null // Make optional for manual logging
  isOpen: boolean
  onClose: () => void
  onSubmit: (outcome: string, notes: string, contact?: Partial<Contact>) => void
}

const callOutcomes = [
    'Busy',
    'Call Back/Follow-up',
    'Gatekeeper',
    'Disconnected',
    'Appointment Booked',
    'Email Interested',
    'No Answer',
    'Not Interested',
    'Voicemail',
    'Wrong Number',
    'Not a Fit',
    'DNC - Stop List',
    'Reschedule',
    'LOST - No Contact',
];

export function PostCallOutcomeDialog({ lead, callActivity, isOpen, onClose, onSubmit: onSubmitProp }: PostCallOutcomeDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      outcome: '',
      notes: '',
    },
  })
  const { toast } = useToast()
  const router = useRouter();
  const outcome = form.watch('outcome');
  
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
      'Not a Fit': { status: 'Lost', reason: 'Not a Fit' },
      'Appointment Booked': { status: 'Qualified' },
      'Email Interested': { status: 'Pre Qualified' },
      'Not Interested': { status: 'Lost', reason: 'Not Interested' },
      'Gatekeeper': { status: 'Connected' },
      'Call Back/Follow-up': { status: 'High Touch' },
      'Disconnected': { status: 'Lost', reason: 'Wrong Contact Details' },
      'Wrong Number': { status: 'Lost', reason: 'Wrong Contact Details' },
      'DNC - Stop List': { status: 'Lost', reason: 'Not Interested' },
      'Reschedule': { status: 'Reschedule' },
      'LOST - No Contact': { status: 'Lost', reason: 'No Contact' },
  };

  const netSuiteOutcomes = ['Disconnected', 'Not Interested', 'Wrong Number', 'DNC - Stop List', 'Not a Fit', 'Email Interested', 'LOST - No Contact'];

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Immediately submit to Firebase and update UI
    onSubmitProp(values.outcome, values.notes || '');

    const outcomeMapping = outcomeStatusMap[values.outcome];
    if (outcomeMapping) {
        await updateLeadStatus(lead.id, outcomeMapping.status, outcomeMapping.reason);
        toast({
            title: "Status Updated",
            description: `Lead status changed to ${outcomeMapping.status}.`
        });
    }
    
    // Close the dialog now
    onClose();

    // Trigger NetSuite sync in the background (fire and forget)
    if (netSuiteOutcomes.includes(values.outcome)) {
        sendToNetSuiteForOutcome({
            leadId: lead.id,
            outcome: values.outcome,
            reason: outcomeMapping.reason || '',
            dialerAssigned: lead.dialerAssigned || '',
            notes: values.notes || '',
            salesRecordInternalId: lead.salesRecordInternalId || ''
        }).then(result => {
            if (result.success) {
                 console.log("NetSuite outcome sync successful.");
            } else {
                console.error("Background NetSuite outcome sync failed:", result.message);
            }
        }).catch(error => {
            console.error("Background NetSuite outcome sync failed:", error);
        });
    }
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
            
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting || !outcome}>
                    {form.formState.isSubmitting ? 'Saving...' : 'Save Outcome'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
