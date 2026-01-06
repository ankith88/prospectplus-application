

'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './ui/loader';
import { updateLeadServices, updateLeadStatus, updateContactSendEmail, addContactToLead } from '@/services/firebase';
import { initiateServicesTrial } from '@/services/netsuite-services-proxy';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, UserPlus } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { format, differenceInDays, isWeekend, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import type { Lead, Contact } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { AddContactForm } from './add-contact-form';

const services = [
  { id: 'lodgement', label: 'Outgoing Mail Lodgement' },
  { id: 'banking', label: 'Express Banking' },
] as const;

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

const formSchema = z.object({
  selectedServices: z.array(z.string()).min(1, 'Please select at least one service.'),
  frequencies: z.record(z.union([z.array(z.string()), z.literal('Adhoc')])),
  trialDateRange: z.custom<DateRange>().optional(),
  startDate: z.date().optional(),
  selectedContactId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ServiceSelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  mode: 'Free Trial' | 'Signup';
}

export function ServiceSelectionDialog({
  isOpen,
  onOpenChange,
  lead,
  mode,
}: ServiceSelectionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedServices: [],
      frequencies: {},
    },
  });

  useEffect(() => {
    if (lead) {
      setContacts(lead.contacts || []);
    }
  }, [lead]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form and state when dialog is closed
      form.reset({
        selectedServices: [],
        frequencies: {},
      });
      setIsSubmitting(false);
      setIsAddingContact(false);
    }
  }, [isOpen, form]);


  const selectedServices = form.watch('selectedServices');

  const handleDateSelect = (
    range: DateRange | undefined,
    onChange: (...event: any[]) => void
  ) => {
    if (range?.from && range?.to) {
      if (differenceInDays(range.to, range.from) > 4) {
        toast({
          variant: 'destructive',
          title: 'Invalid Date Range',
          description: 'Free trial period cannot exceed 5 days.',
        });
        return;
      }
    }
    onChange(range);
  };

  const handleContactAdded = async (newContactData: Omit<Contact, 'id'>) => {
    const newContactId = await addContactToLead(lead.id, newContactData);
    const tempContact: Contact = { ...newContactData, id: newContactId };
    setContacts((prev) => [...prev, tempContact]);
    form.setValue('selectedContactId', tempContact.id);
    setIsAddingContact(false);
  };


  const handleSubmit = async (values: FormValues) => {
    if (mode === 'Free Trial' && !values.trialDateRange?.from) {
      form.setError('trialDateRange', { type: 'manual', message: 'Please select a trial period.' });
      return;
    }
    if (mode === 'Free Trial' && !values.selectedContactId) {
      form.setError('selectedContactId', { type: 'manual', message: 'Please select a contact.' });
      return;
    }
    if (mode === 'Signup' && !values.startDate) {
      form.setError('startDate', { type: 'manual', message: 'Please select a start date.' });
      return;
    }

    setIsSubmitting(true);

    try {
       const { id: toastId } = toast({
        title: 'Processing...',
        description: 'Configuring services and syncing with NetSuite...',
      });

      const serviceSelections = values.selectedServices.map(serviceName => ({
        name: serviceName as any,
        frequency: values.frequencies[serviceName],
        trialStartDate: mode === 'Free Trial' ? values.trialDateRange?.from?.toISOString() : undefined,
        trialEndDate: mode === 'Free Trial' ? values.trialDateRange?.to?.toISOString() : undefined,
        startDate: mode === 'Signup' ? values.startDate?.toISOString() : undefined,
      }));

      if (mode === 'Free Trial') {
        if (values.selectedContactId) {
            await updateContactSendEmail(lead.id, values.selectedContactId);
        }

        const trialDates = eachDayOfInterval({
          start: values.trialDateRange!.from!,
          end: values.trialDateRange!.to || values.trialDateRange!.from!,
        }).map(date => format(date, 'dd/MM/yyyy'));

        const nsResponse = await initiateServicesTrial({
          leadId: lead.id,
          services: serviceSelections.map(s => ({
            service: s.name,
            frequency: s.frequency,
          })),
          trialPeriod: trialDates,
        });

        if (!nsResponse.success) {
          throw new Error(nsResponse.message || 'An unknown error occurred in NetSuite.');
        }
        
        await updateLeadStatus(lead.id, 'Free Trial');
      }

      await updateLeadServices(lead.id, serviceSelections);

      toast.update(toastId, {
        title: 'Success!',
        description: `The ${mode.toLowerCase()} has been configured for the selected services.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to save service selection:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save service selection. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!lead) {
    return (
        <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
            <div className="py-8"><Loader /></div>
        </DialogHeader>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode} for Services</DialogTitle>
        <DialogDescription>
          Configure the required services, their frequency, and other details for {lead.companyName}.
        </DialogDescription>
      </DialogHeader>
      
      {isAddingContact ? (
         <div className="py-4">
          <AddContactForm leadId={lead.id} onContactAdded={handleContactAdded} />
         </div>
      ) : (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            {mode === 'Free Trial' && (
                <FormField
                control={form.control}
                name="selectedContactId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Send Commencement Form To</FormLabel>
                    <ScrollArea className="max-h-40 w-full rounded-md border">
                        <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="p-4"
                        >
                        {(contacts || []).map((contact) => (
                            <FormItem key={contact.id} className="flex items-center space-x-3">
                            <FormControl>
                                <RadioGroupItem value={contact.id} />
                            </FormControl>
                            <FormLabel className="font-normal flex flex-col">
                                <span>{contact.name}</span>
                                <span className="text-xs text-muted-foreground">{contact.email}</span>
                            </FormLabel>
                            </FormItem>
                        ))}
                        </RadioGroup>
                    </ScrollArea>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setIsAddingContact(true)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Add New Contact
                    </Button>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}

            <FormField
                control={form.control}
                name="selectedServices"
                render={() => (
                <FormItem>
                    <FormLabel>Services</FormLabel>
                    <div className="space-y-2">
                    {services.map((service) => (
                        <FormField
                        key={service.id}
                        control={form.control}
                        name="selectedServices"
                        render={({ field }) => (
                            <FormItem className="flex items-center space-x-3">
                            <FormControl>
                                <Checkbox
                                checked={field.value?.includes(service.label)}
                                onCheckedChange={(checked) => {
                                    return checked
                                    ? field.onChange([...(field.value || []), service.label])
                                    : field.onChange(
                                        field.value?.filter((value) => value !== service.label)
                                        );
                                }}
                                />
                            </FormControl>
                            <FormLabel className="font-normal">{service.label}</FormLabel>
                            </FormItem>
                        )}
                        />
                    ))}
                    </div>
                    <FormMessage />
                </FormItem>
                )}
            />

            {selectedServices.length > 0 && <hr />}

            {selectedServices.map((serviceName) => (
                <div key={serviceName} className="space-y-4 rounded-md border p-4">
                <h3 className="font-medium">{serviceName} - Frequency</h3>
                <FormField
                    control={form.control}
                    name={`frequencies.${serviceName}`}
                    render={({ field }) => (
                    <FormItem>
                        <RadioGroup
                        onValueChange={(value) => field.onChange(value === 'Adhoc' ? 'Adhoc' : [])}
                        defaultValue={field.value === 'Adhoc' ? 'Adhoc' : 'Daily'}
                        className="mb-2"
                        >
                        <FormItem className="flex items-center space-x-2">
                            <FormControl>
                            <RadioGroupItem value="Daily" />
                            </FormControl>
                            <FormLabel className="font-normal">Daily (Mon-Fri)</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                            <FormControl>
                            <RadioGroupItem value="Adhoc" />
                            </FormControl>
                            <FormLabel className="font-normal">Adhoc (On Demand)</FormLabel>
                        </FormItem>
                        </RadioGroup>
                        
                        {field.value !== 'Adhoc' && (
                        <div className="flex flex-wrap gap-4">
                            {days.map((day) => (
                            <FormField
                                key={day}
                                control={form.control}
                                name={`frequencies.${serviceName}`}
                                render={({ field: dayField }) => (
                                <FormItem className="flex items-center space-x-2">
                                    <FormControl>
                                    <Checkbox
                                        checked={Array.isArray(dayField.value) && dayField.value.includes(day)}
                                        onCheckedChange={(checked) => {
                                        const currentDays = Array.isArray(dayField.value) ? dayField.value : [];
                                        const newDays = checked
                                            ? [...currentDays, day]
                                            : currentDays.filter((d) => d !== day);
                                        dayField.onChange(newDays);
                                        }}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal">{day}</FormLabel>
                                </FormItem>
                                )}
                            />
                            ))}
                        </div>
                        )}
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
            ))}
            
            {mode === 'Free Trial' && (
                <FormField
                control={form.control}
                name="trialDateRange"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Free Trial Period (max 5 days, no weekends)</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[300px] justify-start text-left font-normal",
                                        !field.value?.from && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value?.from ? (
                                        field.value.to ? (
                                            <>
                                                {format(field.value.from, "LLL dd, y")} -{" "}
                                                {format(field.value.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(field.value.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={field.value?.from}
                                selected={field.value}
                                onSelect={(range) => handleDateSelect(range, field.onChange)}
                                numberOfMonths={2}
                                disabled={(date) => isWeekend(date) || date < new Date()}
                            />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
            
            {mode === 'Signup' && (
                <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Service Start Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-[240px] pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? (
                                format(field.value, "PPP")
                            ) : (
                                <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                            date < new Date() || isWeekend(date)
                            }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}

            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader /> : 'Submit'}
                </Button>
            </DialogFooter>
            </form>
        </Form>
      )}
    </>
  );
}

    
