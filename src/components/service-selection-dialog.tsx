'use client';

import { useState, useEffect } from 'react';
import { RichTextEditor } from './ui/rich-text-editor';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './ui/loader';
import { updateLeadServices, updateLeadStatus, updateContactSendEmail, addContactToLead, logActivity, getServices, createScfRecord, getFranchiseeByName } from '@/services/firebase';
import { initiateServicesTrial, submitServiceQuote } from '@/services/netsuite-services-proxy';
import { useAuth } from '@/hooks/use-auth';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, UserPlus } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { format, differenceInDays, isWeekend, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import type { Lead, Contact } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { AddContactForm } from './add-contact-form';



const getSuffixedName = (baseName: string, currentSelections: string[]) => {
  let count = 0;
  for (const s of currentSelections) {
     if (s === baseName || s.startsWith(baseName + ' ')) {
        // Only count exact matches or matches that end with a space and a number
        const suffix = s.substring(baseName.length).trim();
        if (suffix === '' || !isNaN(Number(suffix))) {
            count++;
        }
     }
  }
  return count === 0 ? baseName : `${baseName} ${count + 1}`;
};

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

const formSchema = z.object({
  selectedServices: z.array(z.string()).min(1, 'Please select at least one service.'),
  frequencies: z.record(z.union([z.array(z.string()), z.literal('Adhoc')])),
  trialDateRange: z.custom<DateRange>().optional(),
  startDate: z.date().optional(),
  selectedContactId: z.string().optional(),
  rates: z.record(z.coerce.number().min(0)).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ServiceSelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  mode: 'Free Trial' | 'Signup' | 'Quote';
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
  const [availableServices, setAvailableServices] = useState<{internalId: number|string, label: string}[]>([]);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState({ to: '', cc: '', bcc: '', subject: '', html: '', scfId: '' });
  const [franchiseeEmail, setFranchiseeEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedServices: [],
      frequencies: {},
      rates: {},
    },
  });

  useEffect(() => {
    if (lead) {
      setContacts(lead.contacts || []);
      if (lead.franchisee && lead.franchisee !== 'Unassigned') {
        getFranchiseeByName(lead.franchisee).then(f => {
          if (f && f.email) setFranchiseeEmail(f.email);
        });
      }
    }
  }, [lead]);

  useEffect(() => {
    getServices().then((services) => {
      const formattedServices = services.map(s => ({
        internalId: s.id,
        label: s.code || s.name || s.id
      })).sort((a,b) => a.label.localeCompare(b.label));
      setAvailableServices(formattedServices);
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
        form.reset({
            selectedServices: [],
            frequencies: {},
            rates: {},
        });
        setIsAddingContact(false);
        setShowEmailPreview(false);
        setEmailPreviewData({ to: '', cc: '', bcc: '', subject: '', html: '', scfId: '' });
    }
  }, [isOpen, form]);

  const handleSendEmail = async () => {
    if (!lead) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/scf/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            leadId: lead.id,
            contactId: form.getValues('selectedContactId'),
            scfUrl: `${window.location.origin}/scf/${emailPreviewData.scfId}`,
            scfId: emailPreviewData.scfId,
            customHtml: emailPreviewData.html,
            customSubject: emailPreviewData.subject,
            customTo: emailPreviewData.to,
            cc: emailPreviewData.cc,
            bcc: emailPreviewData.bcc
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      await updateLeadStatus(lead.id, 'Quote Sent');
      await logActivity(lead.id, {
          type: 'Update',
          notes: `Processed sales option: Quote for services and sent email.`,
          author: user?.displayName || 'Unknown'
      });
      toast({ title: 'Success!', description: 'The quote email has been sent.' });
      onOpenChange(false);
    } catch (e: any) {
      console.error("Failed to send quote:", e);
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to send email.' });
    } finally {
      setIsSending(false);
    }
  };


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
          description: 'Free trial period cannot exceed 5 business days.',
        });
        return;
      }
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
    if (!lead) return;
    
    if (mode === 'Free Trial' && !values.trialDateRange?.from) {
      form.setError('trialDateRange', { type: 'manual', message: 'Please select a trial period.' });
      return;
    }
    if ((mode === 'Free Trial' || mode === 'Quote') && !values.selectedContactId) {
      form.setError('selectedContactId', { type: 'manual', message: 'Please select a contact.' });
      return;
    }
    if (mode === 'Signup' && !values.startDate) {
      form.setError('startDate', { type: 'manual', message: 'Please select a start date.' });
      return;
    }
    if ((mode === 'Signup' || mode === 'Quote') && values.selectedServices.some(s => !values.rates?.[s])) {
      toast({ variant: 'destructive', title: 'Missing Rate', description: 'Please provide a rate for all selected services.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const serviceSelections = values.selectedServices.map(serviceName => {
        const svc: any = {
          name: serviceName as any,
          frequency: values.frequencies[serviceName] as "Adhoc" | ("Mon" | "Tue" | "Wed" | "Thu" | "Fri")[],
          rate: values.rates?.[serviceName] || 0,
        };
        if (mode === 'Free Trial') {
          if (values.trialDateRange?.from) svc.trialStartDate = values.trialDateRange.from.toISOString();
          if (values.trialDateRange?.to) svc.trialEndDate = values.trialDateRange.to.toISOString();
        }
        if ((mode === 'Signup' || mode === 'Quote') && values.startDate) {
          svc.startDate = values.startDate.toISOString();
        }
        return svc;
      });

      if (mode === 'Free Trial') {
        if (values.selectedContactId) {
            await updateContactSendEmail(lead.id, values.selectedContactId);
        }

        const trialDates = eachDayOfInterval({
          start: values.trialDateRange!.from!,
          end: values.trialDateRange!.to || values.trialDateRange!.from!,
        }).filter(d => !isWeekend(d)).map(date => format(date, 'dd/MM/yyyy'));

        const nsResponse = await initiateServicesTrial({
          leadId: lead.id,
          services: serviceSelections.map(s => ({
            service: s.name,
            frequency: s.frequency,
            rate: 0, // Default for trial
          })),
          trialPeriod: trialDates,
        });

        if (!nsResponse.success) {
          throw new Error(nsResponse.message || 'An unknown error occurred in NetSuite.');
        }
        
        await updateLeadStatus(lead.id, 'Free Trial');
      } else if (mode === 'Quote' || mode === 'Signup') {
        const salesRepIdMap: Record<string, string> = {
          "Lee Russell": "668711",
          "Kerina Helliwell": "696160",
          "Luke F": "653718",
          "Account Manager": "409635"
        };
        const salesRepId = lead.accountManagerAssigned ? salesRepIdMap[lead.accountManagerAssigned] || "" : "";
        
        const mappedServices = serviceSelections.map(s => {
          const matchingService = availableServices.find(as => as.label === s.name);
          
          let freqStr = "0,0,0,0,0,0";
          if (s.frequency === 'Adhoc') {
             freqStr = "0,0,0,0,0,1";
          } else if (Array.isArray(s.frequency)) {
             const daysMap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
             const boolArr = daysMap.map(d => s.frequency.includes(d) ? '1' : '0');
             freqStr = [...boolArr, '0'].join(',');
          }
          
          return {
             id: matchingService ? String(matchingService.internalId) : "",
             name: s.name,
             price: String(s.rate),
             freq: freqStr
          };
        });

        const nsResponse = await submitServiceQuote({
           customerId: (lead as any).internalid || lead.entityId || "",
           contactId: values.selectedContactId || "",
           salesRecordId: lead.salesRecordInternalId || "",
           salesRepId: salesRepId,
           services: mappedServices,
           commDate: values.startDate ? format(values.startDate, 'dd/MM/yyyy') : "",
        });
        
        if (!nsResponse.success) {
           throw new Error(nsResponse.message || 'An unknown error occurred in NetSuite.');
        }

        if (mode === 'Quote') {
           const scfId = await createScfRecord(lead.id, {
               contactId: values.selectedContactId,
               services: serviceSelections,
               startDate: values.startDate ? values.startDate.toISOString() : new Date().toISOString(),
               status: 'Pending',
           });
           
           const scfUrl = `${window.location.origin}/scf/${scfId}`;
           
           try {
             const res = await fetch('/api/scf/generate-quote-preview', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     leadId: lead.id,
                     contactId: values.selectedContactId,
                     scfUrl,
                     startDate: values.startDate ? format(values.startDate, 'MMM dd, yyyy') : '',
                     services: serviceSelections,
                 })
             });
             const data = await res.json();
             if (data.success) {
                 await updateLeadServices(lead.id, serviceSelections);
                 
                 setEmailPreviewData({
                     to: data.contactEmail,
                     cc: franchiseeEmail,
                     bcc: '',
                     subject: data.subject,
                     html: data.html,
                     scfId,
                 });
                 setShowEmailPreview(true);
                 setIsSubmitting(false);
                 return; // Wait for user to click send email
             } else {
                 throw new Error(data.message);
             }
           } catch (e) {
             console.error("Failed to generate quote preview:", e);
             toast({ variant: 'destructive', title: 'Preview Error', description: 'Failed to generate email preview.' });
             setIsSubmitting(false);
             return;
           }
        } else if (mode === 'Signup') {
           await updateLeadStatus(lead.id, 'Won');
        }
      }

      await updateLeadServices(lead.id, serviceSelections);

      await logActivity(lead.id, {
          type: 'Update',
          notes: `Processed sales option: ${mode} for services (${values.selectedServices.join(', ')})`,
          author: user?.displayName || 'Unknown'
      });

      toast({
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {!lead ? (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Loading...</DialogTitle>
                <div className="py-8 flex justify-center"><Loader /></div>
            </DialogHeader>
        </DialogContent>
      ) : (
        <DialogContent className="max-w-2xl">
          <DialogHeader>
              <DialogTitle>{mode} for Services</DialogTitle>
              <DialogDescription>
              Configure the required services, their frequency, and other details for {lead.companyName}.
              </DialogDescription>
          </DialogHeader>
          
          {showEmailPreview ? (
             <div className="space-y-4">
               <div className="space-y-2">
                 <Label>To</Label>
                 <Input value={emailPreviewData.to} disabled className="bg-muted" />
               </div>
               <div className="space-y-2">
                 <Label>CC (Comma separated)</Label>
                 <Input 
                   value={emailPreviewData.cc} 
                   onChange={e => setEmailPreviewData(prev => ({...prev, cc: e.target.value}))} 
                   placeholder="e.g. manager@mailplus.com.au"
                 />
                 {franchiseeEmail && !emailPreviewData.cc.includes(franchiseeEmail) && (
                   <p className="text-xs text-muted-foreground mt-1 cursor-pointer hover:underline" onClick={() => setEmailPreviewData(prev => ({...prev, cc: prev.cc ? `${prev.cc}, ${franchiseeEmail}` : franchiseeEmail}))}>
                     Suggestion (Franchisee): {franchiseeEmail}
                   </p>
                 )}
               </div>
               <div className="space-y-2">
                 <Label>BCC (Comma separated)</Label>
                 <Input 
                   value={emailPreviewData.bcc} 
                   onChange={e => setEmailPreviewData(prev => ({...prev, bcc: e.target.value}))} 
                 />
               </div>
               <div className="space-y-2">
                 <Label>Subject</Label>
                 <Input 
                   value={emailPreviewData.subject} 
                   onChange={e => setEmailPreviewData(prev => ({...prev, subject: e.target.value}))} 
                 />
               </div>
               <div className="space-y-2">
                 <Label>Email Body</Label>
                 <RichTextEditor 
                   value={emailPreviewData.html} 
                   onChange={html => setEmailPreviewData(prev => ({...prev, html}))} 
                 />
               </div>
               <DialogFooter className="flex-shrink-0 pt-4 border-t mt-6">
                 <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
                   Cancel
                 </Button>
                 <Button onClick={handleSendEmail} disabled={isSending}>
                   {isSending ? <Loader /> : 'Send Email'}
                 </Button>
               </DialogFooter>
             </div>
          ) : isAddingContact ? (
              <div className="py-4">
              <AddContactForm leadId={lead.id} onContactAdded={handleContactAdded} />
              <Button variant="ghost" size="sm" className="w-full mt-4" onClick={() => setIsAddingContact(false)}>Cancel</Button>
              </div>
          ) : (
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    <ScrollArea className="max-h-[60vh] -mx-6 px-6">
                      <div className="space-y-6">
                        {(mode === 'Free Trial' || mode === 'Quote') && (
                            <FormField
                            control={form.control}
                            name="selectedContactId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Send Commencement Form To</FormLabel>
                                <ScrollArea className="max-h-32 w-full rounded-md border">
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
                                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setIsAddingContact(true)}>
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
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Add Services</FormLabel>
                                <FormControl>
                                    <Select 
                                        onValueChange={(val) => {
                                            const newName = getSuffixedName(val, field.value || []);
                                            field.onChange([...(field.value || []), newName]);
                                            form.setValue(`frequencies.${newName}`, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
                                        }}
                                    >
                                        <SelectTrigger className="w-[300px] bg-card">
                                            <SelectValue placeholder="Select a service to add" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableServices.map(s => (
                                                <SelectItem key={s.internalId} value={s.label}>
                                                    {s.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />

                        {selectedServices.length > 0 && (
                          <div className="rounded-md border mt-6 bg-card overflow-hidden shadow-sm">
                            <Table>
                              <TableHeader className="bg-muted/50">
                                <TableRow>
                                  <TableHead>Service</TableHead>
                                  <TableHead>Frequency</TableHead>
                                  {(mode === 'Signup' || mode === 'Quote') && <TableHead className="w-[120px]">Rate</TableHead>}
                                  <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedServices.map((serviceName) => (
                                  <TableRow key={serviceName}>
                                    <TableCell className="font-medium align-top pt-4">
                                      {serviceName}
                                    </TableCell>
                                    <TableCell className="align-top">
                                      <FormField
                                        control={form.control}
                                        name={`frequencies.${serviceName}`}
                                        render={({ field }) => (
                                          <FormItem className="space-y-2">
                                            <FormControl>
                                              <Select
                                                onValueChange={(val) => {
                                                  if (val === 'Adhoc') {
                                                    field.onChange('Adhoc');
                                                  } else if (val === 'Daily') {
                                                    field.onChange(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
                                                  } else {
                                                    field.onChange([]); // Custom, start empty
                                                  }
                                                }}
                                                value={
                                                  field.value === 'Adhoc' ? 'Adhoc' : 
                                                  (Array.isArray(field.value) && field.value.length === 5) ? 'Daily' : 'Custom'
                                                }
                                              >
                                                <SelectTrigger className="w-full min-w-[140px] h-9">
                                                  <SelectValue placeholder="Frequency" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="Daily">Daily (Mon-Fri)</SelectItem>
                                                  <SelectItem value="Adhoc">Adhoc (On Demand)</SelectItem>
                                                  <SelectItem value="Custom">Custom Days</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </FormControl>
                                            
                                            {field.value !== 'Adhoc' && (!Array.isArray(field.value) || field.value.length !== 5) && (
                                              <div className="flex gap-1 pt-1">
                                                {days.map((day) => {
                                                  const isChecked = Array.isArray(field.value) && field.value.includes(day);
                                                  return (
                                                    <Button
                                                      key={day}
                                                      type="button"
                                                      variant={isChecked ? "default" : "outline"}
                                                      size="sm"
                                                      className="h-7 w-7 p-0 text-[10px]"
                                                      onClick={() => {
                                                        const current = Array.isArray(field.value) ? field.value : [];
                                                        const next = isChecked ? current.filter(d => d !== day) : [...current, day];
                                                        field.onChange(next);
                                                      }}
                                                    >
                                                      {day.charAt(0)}
                                                    </Button>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </FormItem>
                                        )}
                                      />
                                    </TableCell>
                                    
                                    {(mode === 'Signup' || mode === 'Quote') && (
                                      <TableCell className="align-top">
                                        <FormField
                                          control={form.control}
                                          name={`rates.${serviceName}`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormControl>
                                                <div className="relative">
                                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                                  <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="0.00"
                                                    className="pl-6 h-9"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                                    value={field.value || ''}
                                                  />
                                                </div>
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                      </TableCell>
                                    )}
                                    
                                    <TableCell className="align-top text-right">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => {
                                          const newSelected = selectedServices.filter(s => s !== serviceName);
                                          form.setValue('selectedServices', newSelected);
                                          
                                          const freqs = { ...form.getValues('frequencies') };
                                          delete freqs[serviceName];
                                          form.setValue('frequencies', freqs);
                                          
                                          const rates = { ...form.getValues('rates') };
                                          if (rates[serviceName]) {
                                            delete rates[serviceName];
                                            form.setValue('rates', rates);
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                        
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
                                                    "w-[300px] justify-start text-left font-normal bg-card hover:bg-card/90",
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
                        
                        {(mode === 'Signup' || mode === 'Quote') && (
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
                                            "w-[240px] pl-3 text-left font-normal bg-card hover:bg-card/90",
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
                      </div>
                    </ScrollArea>
                  <DialogFooter className="flex-shrink-0 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                      Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? <Loader /> : (mode === 'Quote' ? 'Preview Quote Email' : 'Submit')}
                      </Button>
                  </DialogFooter>
                  </form>
              </Form>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
