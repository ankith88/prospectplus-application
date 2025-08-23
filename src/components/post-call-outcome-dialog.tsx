
'use client'

import { useState } from 'react'
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
import { addContactToLead } from '@/services/firebase'

const formSchema = z.object({
  outcome: z.string().min(1, 'An outcome is required.'),
  notes: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional().refine(email => !email || z.string().email().safeParse(email).success, {
    message: "Invalid email address",
  }),
  contactPhone: z.string().optional(),
  contactTitle: z.string().optional(),
}).refine(data => {
    if (data.outcome === 'Interested') {
        return data.contactName && data.contactEmail && data.contactPhone && data.contactTitle
    }
    return true;
}, {
    message: "Contact details are required when the lead is Interested.",
    path: ["contactName"],
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

  const outcome = form.watch('outcome');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    let newContact: Partial<Contact> | undefined;
    if (values.outcome === 'Interested' && values.contactName && values.contactEmail && values.contactPhone && values.contactTitle) {
        newContact = {
            name: values.contactName,
            email: values.contactEmail,
            phone: values.contactPhone,
            title: values.contactTitle,
        };
        const existingContact = lead.contacts?.find(c => c.email === newContact.email);
        if (!existingContact) {
            await addContactToLead(lead.id, newContact as Omit<Contact, 'id'>);
        }
    }
    onSubmitProp(values.outcome, values.notes || '', newContact);
    form.reset();
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <p className="text-sm text-muted-foreground">The lead is interested. Capture their details.</p>
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
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : 'Save Outcome'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

