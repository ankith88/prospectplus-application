
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import { FullScreenLoader, Loader } from '@/components/ui/loader';
import { updateLeadServices, updateLeadStatus, updateContactSendEmail, addContactToLead, getLeadFromFirebase } from '@/services/firebase';
import { initiateServicesTrial } from '@/services/netsuite-services-proxy';
import { initiateMPProductsTrial } from '@/services/netsuite-mpproducts-proxy';
import { initiateLocalMileTrial } from '@/services/netsuite-localmile-proxy';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, UserPlus, ArrowLeft } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, differenceInDays, isWeekend, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import type { Lead, Contact } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AddContactForm } from '@/components/add-contact-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

const services = [
  { id: 'lodgement', label: 'Outgoing Mail Lodgement' },
  { id: 'banking', label: 'Express Banking' },
] as const;

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

const formSchema = z.object({
  selectedServices: z.array(z.string()).optional(),
  frequencies: z.record(z.union([z.array(z.string()), z.literal('Adhoc')])),
  trialDateRange: z.custom<DateRange>().optional(),
  startDate: z.date().optional(),
  selectedContactId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function SelectServicesContent() {
  const [lead, setLead] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const mode = searchParams.get('mode') as 'signup' | 'service-trial' | 'shipmate-trial' | 'localmile-trial' | null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedServices: [],
      frequencies: {},
    },
  });

  useEffect(() => {
    const leadId = params.leadId as string;
    if (leadId) {
      getLeadFromFirebase(leadId, true).then(leadData => {
        if (leadData) {
          setLead(leadData);
          setContacts(leadData.contacts || []);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Lead not found.' });
          router.push('/field-sales');
        }
      });
    }
  }, [params.leadId, router, toast]);

  useEffect(() => {
    form.reset({
      selectedServices: [],
      frequencies: {},
    });
    setIsAddingContact(false);
  }, [form]);

  const selectedServices = form.watch('selectedServices');

  const handleDateSelect = (range: DateRange | undefined, onChange: (...event: any[]) => void) => {
    if (range?.from && range?.to && differenceInDays(range.to, range.from) > 4) {
      toast({ variant: 'destructive', title: 'Invalid Date Range', description: 'Free trial period cannot exceed 5 business days.' });
      return;
    }
    onChange(range);
  };

  const handleContactAdded = async (newContactData: Omit<Contact, 'id'>) => {
    if (!lead) return;
    const newContactId = await addContactToLead(lead.id, newContactData);
    const tempContact: Contact = { ...newContactData, id: newContactId };
    setContacts((prev) => [...prev, tempContact]);
    form.setValue('selectedContactId', tempContact.id);
    setIsAddingContact(false);
  };

  const handleSubmit = async (values: FormValues) => {
    if (!lead || !mode) return;
    
    // Validations based on mode
    if ((mode === 'service-trial' || mode === 'signup') && (!values.selectedServices || values.selectedServices.length === 0)) {
      form.setError('selectedServices', { type: 'manual', message: 'Please select at least one service.' });
      return;
    }
    if ((mode === 'service-trial' || mode === 'localmile-trial' || mode === 'shipmate-trial') && !values.selectedContactId) {
        form.setError('selectedContactId', { type: 'manual', message: 'Please select a contact.' });
        return;
    }
    if (mode === 'service-trial' && !values.trialDateRange?.from) {
      form.setError('trialDateRange', { type: 'manual', message: 'Please select a trial period.' });
      return;
    }
    if (mode === 'signup' && !values.startDate) {
      form.setError('startDate', { type: 'manual', message: 'Please select a start date.' });
      return;
    }
    
    setIsSubmitting(true);

    try {
      let nsResponse: { success: boolean; message: string };
      let newStatus: Lead['status'];
      let successDescription: string;

      if (values.selectedContactId) {
        await updateContactSendEmail(lead.id, values.selectedContactId);
      }

      if (mode === 'service-trial') {
        const serviceSelections = values.selectedServices!.map(serviceName => ({
            name: serviceName as any,
            frequency: values.frequencies[serviceName],
        }));
        const trialDates = eachDayOfInterval({
          start: values.trialDateRange!.from!,
          end: values.trialDateRange!.to || values.trialDateRange!.from!,
        }).filter(d => !isWeekend(d)).map(date => format(date, 'dd/MM/yyyy'));
        
        nsResponse = await initiateServicesTrial({ leadId: lead.id, services: serviceSelections, trialPeriod: trialDates });
        newStatus = 'Free Trial';
        successDescription = 'The services free trial has been configured.';
      } else if (mode === 'shipmate-trial') {
        nsResponse = await initiateMPProductsTrial({ leadId: lead.id });
        newStatus = 'Trialing ShipMate';
        successDescription = 'The ShipMate free trial has been initiated.';
      } else if (mode === 'localmile-trial') {
        nsResponse = await initiateLocalMileTrial({ leadId: lead.id });
        newStatus = 'LocalMile Pending';
        successDescription = 'The LocalMile free trial has been initiated.';
      } else if (mode === 'signup') {
        // For signup, we might have a different NetSuite call in the future.
        // For now, we'll just update status and services.
        nsResponse = { success: true, message: 'Signup processed locally.' }; // Placeholder
        newStatus = 'Won';
        successDescription = 'The new services have been signed up.';
      } else {
        throw new Error('Invalid mode');
      }

      if (!nsResponse.success) {
        throw new Error(nsResponse.message || 'An unknown error occurred with the integration.');
      }
      
      if (values.selectedServices && values.selectedServices.length > 0) {
        const serviceSelections = values.selectedServices.map(serviceName => ({
          name: serviceName as any,
          frequency: values.frequencies[serviceName],
          trialStartDate: mode === 'service-trial' ? values.trialDateRange?.from?.toISOString() : undefined,
          trialEndDate: mode === 'service-trial' ? values.trialDateRange?.to?.toISOString() : undefined,
          startDate: mode === 'signup' ? values.startDate?.toISOString() : undefined,
        }));
        await updateLeadServices(lead.id, serviceSelections);
      }
      
      await updateLeadStatus(lead.id, newStatus);

      toast({ title: 'Success!', description: successDescription });
      router.push('/field-sales');

    } catch (error: any) {
      console.error('Failed to submit:', error);
      toast({ variant: 'destructive', title: 'Submission Error', description: error.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getTitle = () => {
    switch(mode) {
        case 'signup': return 'Signup for Services';
        case 'service-trial': return 'Free Trial for Services';
        case 'shipmate-trial': return 'Free Trial for ShipMate';
        case 'localmile-trial': return 'Free Trial for LocalMile';
        default: return 'Select Services';
    }
  }

  if (!lead) {
    return <FullScreenLoader message="Loading Lead Details..." />;
  }
  
  if (!mode) {
      router.back();
      return <FullScreenLoader />;
  }

  return (
    <div className="flex flex-col bg-background max-w-2xl mx-auto w-full min-h-svh p-4 sm:p-6">
        <header className="flex-shrink-0 flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
            <div className="flex flex-col items-center">
                <h1 className="text-lg font-bold text-center">{getTitle()}</h1>
                <p className="text-sm text-muted-foreground">{lead.companyName}</p>
            </div>
            <div className="w-10"></div>
        </header>
        <main className="flex-grow mt-6">
            <Card>
                <CardContent className="p-6">
                    {isAddingContact ? (
                        <div className="py-4">
                            <h3 className="font-semibold mb-4">Add New Contact</h3>
                            <AddContactForm leadId={lead.id} onContactAdded={handleContactAdded} />
                             <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => setIsAddingContact(false)}>
                                Cancel
                            </Button>
                        </div>
                    ) : (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                                <div className="space-y-6">
                                  {(mode === 'service-trial' || mode === 'localmile-trial' || mode === 'shipmate-trial') && (
                                    <FormField
                                      control={form.control}
                                      name="selectedContactId"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Send Commencement Form To*</FormLabel>
                                          <ScrollArea className="h-40 w-full rounded-md border">
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="p-4">
                                              {contacts.map((contact) => (
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
                                          <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setIsAddingContact(true)}>
                                            <UserPlus className="mr-2 h-4 w-4" /> Add New Contact
                                          </Button>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  )}

                                  {(mode === 'signup' || mode === 'service-trial') && (
                                    <>
                                        <FormField
                                          control={form.control}
                                          name="selectedServices"
                                          render={() => (
                                            <FormItem>
                                              <FormLabel>Services*</FormLabel>
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
                                                            onCheckedChange={(checked) => field.onChange(
                                                              checked
                                                                ? [...(field.value || []), service.label]
                                                                : field.value?.filter((value) => value !== service.label)
                                                            )}
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

                                        {selectedServices && selectedServices.length > 0 && <hr />}

                                        {selectedServices?.map((serviceName) => (
                                          <div key={serviceName} className="space-y-4 rounded-md border p-4">
                                            <h3 className="font-medium">{serviceName} - Frequency</h3>
                                            <FormField
                                              control={form.control}
                                              name={`frequencies.${serviceName}`}
                                              render={({ field }) => (
                                                <FormItem>
                                                  <RadioGroup onValueChange={(value) => field.onChange(value === 'Adhoc' ? 'Adhoc' : [])} defaultValue={'Daily'} className="mb-2">
                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Daily" /></FormControl><FormLabel className="font-normal">Daily (Mon-Fri)</FormLabel></FormItem>
                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Adhoc" /></FormControl><FormLabel className="font-normal">Adhoc (On Demand)</FormLabel></FormItem>
                                                  </RadioGroup>
                                                  {field.value !== 'Adhoc' && (
                                                    <div className="flex flex-wrap gap-4 pt-2">
                                                      {days.map((day) => (
                                                        <FormField key={day} control={form.control} name={`frequencies.${serviceName}`} render={({ field: dayField }) => (
                                                          <FormItem className="flex items-center space-x-2">
                                                            <FormControl>
                                                              <Checkbox
                                                                checked={Array.isArray(dayField.value) && dayField.value.includes(day)}
                                                                onCheckedChange={(checked) => dayField.onChange(
                                                                  checked ? [...(Array.isArray(dayField.value) ? dayField.value : []), day] : (dayField.value as string[])?.filter((d) => d !== day)
                                                                )}
                                                              />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">{day}</FormLabel>
                                                          </FormItem>
                                                        )}/>
                                                      ))}
                                                    </div>
                                                  )}
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                          </div>
                                        ))}
                                    </>
                                  )}

                                  {mode === 'service-trial' && (
                                    <FormField
                                      control={form.control}
                                      name="trialDateRange"
                                      render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                          <FormLabel>Free Trial Period (max 5 business days)*</FormLabel>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <FormControl>
                                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal sm:w-[300px]", !field.value?.from && "text-muted-foreground")}>
                                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                                  {field.value?.from ? field.value.to ? `${format(field.value.from, "LLL dd, y")} - ${format(field.value.to, "LLL dd, y")}` : format(field.value.from, "LLL dd, y") : <span>Pick a date range</span>}
                                                </Button>
                                              </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                              <Calendar initialFocus mode="range" defaultMonth={field.value?.from} selected={field.value} onSelect={(range) => handleDateSelect(range, field.onChange)} numberOfMonths={2} disabled={(date) => isWeekend(date) || date < new Date()} />
                                            </PopoverContent>
                                          </Popover>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  )}
                                  
                                  {mode === 'signup' && (
                                    <FormField
                                      control={form.control}
                                      name="startDate"
                                      render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                          <FormLabel>Service Start Date*</FormLabel>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <FormControl>
                                                <Button variant={"outline"} className={cn("w-full sm:w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                              </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date() || isWeekend(date)} initialFocus />
                                            </PopoverContent>
                                          </Popover>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  )}
                                </div>
                                <div className="flex justify-end pt-4 border-t">
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? <Loader /> : 'Submit'}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}
                </CardContent>
            </Card>
        </main>
    </div>
  );
}

export default function SelectServicesPage() {
    return (
        <Suspense fallback={<FullScreenLoader />}>
            <SelectServicesContent />
        </Suspense>
    )
}

    