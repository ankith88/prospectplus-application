
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import type { Lead } from '@/lib/types'
import { logCallActivity, updateLeadStatus, addContactToLead } from '@/services/firebase'

const formSchema = z.object({
  notes: z.string().min(1, 'Call notes are required.'),
  outcome: z.enum(['interested', 'not-interested']),
  notInterestedReason: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional().refine(email => !email || z.string().email().safeParse(email).success, {
    message: "Invalid email address",
  }),
  contactPhone: z.string().optional(),
  contactTitle: z.string().optional(),
}).refine(data => {
    if (data.outcome === 'interested') {
        return data.contactName && data.contactEmail && data.contactPhone && data.contactTitle
    }
    return true;
}, {
    message: "Contact details are required when the lead is interested.",
    path: ["contactName"], // You can associate the error with a specific field
});

interface LogCallDialogProps {
  lead: Lead
  children: React.ReactNode
  onCallLogged: (updatedLead: Lead) => void
}

export function LogCallDialog({ lead, children, onCallLogged }: LogCallDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: '',
      outcome: 'interested',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      contactTitle: '',
    },
  })

  const outcome = form.watch('outcome')

  const handleSetAppointment = () => {
    const salesRep = lead.salesRepAssigned;
    let calendlyUrl = '';

    if (salesRep === 'Luke Forbes') {
      calendlyUrl = 'https://calendly.com/luke-forbes-mailplus/mailplus-intro-call-luke?month=2025-08';
    } else if (salesRep === 'Leonie Feata') {
      calendlyUrl = 'https://calendly.com/leonie-feata-mailplus/mailplus-intro-call-leonie?month=2025-08';
    } else {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Cannot set appointment. No recognized sales rep assigned.",
        })
        return;
    }

    const { contactName, contactEmail, contactPhone } = form.getValues();
    const urlWithParams = `${calendlyUrl}&name=${encodeURIComponent(contactName || '')}&email=${encodeURIComponent(contactEmail || '')}`;
    
    window.open(urlWithParams, '_blank');
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      let updatedLead = { ...lead };

      // 1. Log the call activity
      await logCallActivity(lead.id, {
        notes: values.notes,
        outcome: values.outcome,
        reason: values.notInterestedReason,
      });

      // 2. Update lead status
      let newStatus: Lead['status'] = lead.status;
      if (values.outcome === 'interested') {
        newStatus = 'Qualified';
      } else {
        newStatus = 'Lost';
      }
      await updateLeadStatus(lead.id, newStatus);
      
      const newActivity = {
        id: `activity-${Date.now()}`,
        type: 'Call' as const,
        date: new Date().toISOString(),
        notes: `Outcome: ${values.outcome}. Notes: ${values.notes}`,
      };

      updatedLead.status = newStatus;
      updatedLead.activity = [newActivity, ...(updatedLead.activity || [])];

      // 3. Handle contact creation for interested leads
      if (values.outcome === 'interested' && values.contactName && values.contactEmail && values.contactPhone && values.contactTitle) {
        const newContactData = {
            name: values.contactName,
            email: values.contactEmail,
            phone: values.contactPhone,
            title: values.contactTitle,
        };
        const newContactId = await addContactToLead(lead.id, newContactData);
        const newContact = { ...newContactData, id: newContactId };
        updatedLead.contacts = [...(updatedLead.contacts || []), newContact];
      }

      onCallLogged(updatedLead);

      toast({
        title: 'Success',
        description: 'Call has been logged successfully.',
      })
      
      setIsOpen(false)
      form.reset()
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
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

            {outcome === 'interested' && (
              <div className="space-y-4 rounded-md border p-4">
                  <DialogDescription>
                    The lead is interested. Capture their details and book a follow-up meeting.
                  </DialogDescription>
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
                <Button type="button" onClick={handleSetAppointment} className="w-full">
                  Set Appointment
                </Button>
              </div>
            )}
            
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Logging...' : 'Log Call'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
