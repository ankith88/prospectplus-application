
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
  DialogTrigger,
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
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import type { Lead } from '@/lib/types'
import { logCallActivity, updateLeadStatus } from '@/services/firebase'

const formSchema = z.object({
  notes: z.string().min(1, 'Call notes are required.'),
  outcome: z.enum(['interested', 'not-interested']),
  notInterestedReason: z.string().optional(),
});

interface LogCallDialogProps {
  lead: Lead
  onCallLogged: (updatedLead: Lead) => void
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function LogCallDialog({ lead, onCallLogged, isOpen, onOpenChange }: LogCallDialogProps) {
  const { toast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: '',
      outcome: 'interested',
      notInterestedReason: '',
    },
  })

  const outcome = form.watch('outcome')

  // Mock Calendly links for sales reps
  const MOCKED_CALENDLY_LINKS: { [key: string]: string } = {
    'Leonie Feata': 'https://calendly.com/leonie-feata-mailplus/mailplus-intro-call-leonie',
    'Luke Forbes': 'https://calendly.com/luke-forbes-mailplus/mailplus-intro-call-luke',
    'Lee Russell': 'https://calendly.com/lee-russell-mailplus/mailplus-intro-call-lee',
    'Default': 'https://calendly.com/mailplus-default/meeting',
  };

  const handleSetAppointment = async () => {
    try {
        await updateLeadStatus(lead.id, 'Qualified');
        const updatedLead = { ...lead, status: 'Qualified' as const };
        
        onCallLogged(updatedLead);
        
        toast({
            title: 'Status Updated',
            description: 'Lead status changed to Qualified.',
        });

        const salesRep = lead.salesRepAssigned || 'Default';
        const calendlyLink = MOCKED_CALENDLY_LINKS[salesRep] || MOCKED_CALENDLY_LINKS['Default'];
        
        const primaryContact = lead.contacts?.[0];
        const contactName = primaryContact?.name || lead.companyName;
        const contactEmail = primaryContact?.email || lead.customerServiceEmail;

        let prefilledUrl = calendlyLink;
        if (contactName && contactEmail) {
           prefilledUrl = `${calendlyLink}?name=${encodeURIComponent(contactName)}&email=${encodeURIComponent(contactEmail)}`;
        }

        window.open(prefilledUrl, '_blank');
        
        onOpenChange(false); // Close main dialog
     } catch (error) {
        console.error('Failed to update lead status:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to update lead status. Please try again.',
        });
     }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      let updatedLead = { ...lead };

      await logCallActivity(lead.id, {
        notes: values.notes,
        outcome: values.outcome,
        reason: values.notInterestedReason,
      });

      let newStatus: Lead['status'] = lead.status;
      if (values.outcome === 'interested') {
        // Status is handled by the new buttons, so we don't set it to Qualified here.
      } else {
        newStatus = 'Unqualified';
        await updateLeadStatus(lead.id, newStatus);
      }
      
      const newActivity = {
        id: `activity-${Date.now()}`,
        type: 'Call' as const,
        date: new Date().toISOString(),
        notes: `Outcome: ${values.outcome}. Notes: ${values.notes}`,
      };

      updatedLead.status = newStatus;
      updatedLead.activity = [newActivity, ...(updatedLead.activity || [])];

      onCallLogged(updatedLead);

      toast({
        title: 'Success',
        description: 'Call has been logged successfully.',
      })
      
      if (values.outcome === 'not-interested') {
        onOpenChange(false)
        form.reset()
      }
    } catch (error) {
      console.error('Failed to log call:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to log call. Please try again.',
      })
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Log Call Outcome</DialogTitle>
            <DialogDescription>
              Record the details of your call with {lead.companyName}.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Call Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter notes from the call..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Outcome</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="interested" />
                          </FormControl>
                          <FormLabel className="font-normal">Interested</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="not-interested" />
                          </FormControl>
                          <FormLabel className="font-normal">Not Interested</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {outcome === 'not-interested' && (
                <FormField
                  control={form.control}
                  name="notInterestedReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="already-has-provider">Already has a provider</SelectItem>
                          <SelectItem value="not-a-good-fit">Not a good fit for service</SelectItem>
                          <SelectItem value="no-response">No response / Voicemail</SelectItem>
                          <SelectItem value="bad-timing">Bad timing</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter>
                  <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  {outcome === 'interested' ? (
                     <Button type="button" onClick={handleSetAppointment} disabled={form.formState.isSubmitting}>
                        Set Appointment
                     </Button>
                  ) : (
                     <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Logging...' : 'Log Call'}
                     </Button>
                  )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
