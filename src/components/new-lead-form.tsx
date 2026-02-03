

'use client';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { AddressAutocomplete } from './address-autocomplete';
import type { Address } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createNewLead, checkForDuplicateLead } from '@/services/firebase';
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool';
import { Loader } from './ui/loader';
import { Building, Mail, Phone, Globe, Tag, User, Briefcase, MapPin, Sparkles, Search, Info, StickyNote, Mic, MicOff } from 'lucide-react';
import { industryCategories } from '@/lib/constants';
import { useAuth } from '@/hooks/use-auth';
import { Textarea } from './ui/textarea';

const abnRegex = /^\d{11}$/;

const formSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  customerPhone: z.string().optional(),
  customerServiceEmail: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  abn: z.string().regex(abnRegex, 'ABN must be 11 digits.').optional().or(z.literal('')),
  industryCategory: z.string().optional(),
  campaign: z.string().optional(),
  initialNotes: z.string().optional(),
  address: z.object({
    address1: z.string().optional(),
    street: z.string().min(1, 'Street name is required.'),
    city: z.string().min(1, 'Suburb is required.'),
    state: z.string().min(1, 'State is required.'),
    zip: z.string().min(1, 'Postcode is required.'),
    country: z.string().min(1, 'Country is required.'),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  contact: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    title: z.string().optional(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().optional(),
  }),
});

export function NewLeadForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProspecting, setIsProspecting] = useState(false);
  const [duplicateLeadId, setDuplicateLeadId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const autocompleteInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: '',
      websiteUrl: '',
      customerPhone: '',
      customerServiceEmail: '',
      abn: '',
      industryCategory: '',
      campaign: '',
      initialNotes: '',
      address: {
        address1: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'Australia',
      },
      contact: {
        firstName: 'Info',
        lastName: '',
        title: 'Primary Contact',
        email: '',
        phone: '',
      },
    },
  });

  const handleAiProspect = useCallback(async (websiteUrl?: string) => {
    const url = websiteUrl || form.getValues('websiteUrl');
    if (!url) {
      toast({ variant: 'destructive', title: 'No Website URL', description: 'Please enter a website URL to prospect.' });
      return;
    }
    setIsProspecting(true);
    try {
      const tempLeadId = 'new-lead-prospecting';
      const result = await prospectWebsiteTool({ leadId: tempLeadId, websiteUrl: url });
      
      if (result.companyDescription) {
        console.log('AI Company Description:', result.companyDescription);
      }

      if (result.contacts && result.contacts.length > 0) {
        const primaryContact = result.contacts[0];
        const nameParts = (primaryContact.name || '').split(' ') ;
        form.setValue('contact.firstName', nameParts[0] || '');
        form.setValue('contact.lastName', nameParts.slice(1).join(' ') || '');
        form.setValue('contact.title', primaryContact.title || '');
        form.setValue('contact.email', primaryContact.email || '');
        if (primaryContact.phone && primaryContact.phone !== 'N/A') {
          form.setValue('contact.phone', primaryContact.phone);
        }
        toast({ title: 'Contact Found!', description: `Filled contact details for ${primaryContact.name}.` });
      } else {
        toast({ title: 'No Contacts Found', description: 'AI could not find specific contacts on the website.' });
      }
    } catch (error) {
      console.error('AI Prospecting failed', error);
      toast({ variant: 'destructive', title: 'AI Prospecting Failed', description: 'Could not retrieve information from the website.' });
    } finally {
      setIsProspecting(false);
    }
  }, [form, toast]);

    const fillFormWithPlace = useCallback(async (place: google.maps.places.PlaceResult) => {
        const companyName = place.name || '';
        const phoneNumber = place.formatted_phone_number || '';
        const websiteUrl = place.website || '';
        const email = `info@${(websiteUrl || '').replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]}`;

        const duplicateId = await checkForDuplicateLead(
            companyName,
            websiteUrl,
            email,
            {
                street: place.address_components?.find(c => c.types.includes('route'))?.long_name,
                city: place.address_components?.find(c => c.types.includes('locality'))?.long_name,
                state: place.address_components?.find(c => c.types.includes('administrative_area_level_1'))?.short_name,
                zip: place.address_components?.find(c => c.types.includes('postal_code'))?.long_name,
                country: 'Australia'
            } as Address
        );

        if (duplicateId) {
            setDuplicateLeadId(duplicateId);
            return;
        }

        form.setValue('companyName', companyName);
        form.setValue('websiteUrl', websiteUrl);
        if (phoneNumber) form.setValue('customerPhone', phoneNumber);

        const getAddressComponent = (type: string, useShortName = false) => {
            const component = place.address_components?.find(c => c.types.includes(type));
            return useShortName ? component?.short_name : component?.long_name || '';
        }

        const street_number = getAddressComponent('street_number');
        const route = getAddressComponent('route');

        form.setValue('address.street', `${street_number} ${route}`.trim());
        form.setValue('address.city', getAddressComponent('locality') || getAddressComponent('postal_town'));
        form.setValue('address.state', getAddressComponent('administrative_area_level_1', true));
        form.setValue('address.zip', getAddressComponent('postal_code'));
        form.setValue('address.country', getAddressComponent('country', true));
        if (place.geometry?.location) {
            form.setValue('address.lat', place.geometry.location.lat());
            form.setValue('address.lng', place.geometry.location.lng());
        }

        form.setValue('contact.lastName', place.name || '');
        const websiteDomain = (place.website || '').replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
        if (websiteDomain) {
            const email = `info@${websiteDomain}`;
            form.setValue('contact.email', email);
            form.setValue('customerServiceEmail', email);
        }
  }, [form]);

  const setupAutocomplete = useCallback(() => {
    if (!window.google || !autocompleteInputRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
        types: ['establishment'],
        componentRestrictions: { country: 'au' },
    });

    autocomplete.addListener('place_changed', async () => {
        const place = autocomplete.getPlace();
        if (!place.address_components) return;
        fillFormWithPlace(place);
    });
  }, [fillFormWithPlace]);

  useEffect(() => {
    setupAutocomplete();
  }, [setupAutocomplete]);


  useEffect(() => {
    const companyName = searchParams.get('companyName');
    const street = searchParams.get('street');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const zip = searchParams.get('zip');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const websiteUrl = searchParams.get('websiteUrl');
    const industryCategory = searchParams.get('industryCategory');
    const phone = searchParams.get('phone');

    if (companyName) form.setValue('companyName', companyName);
    if (street) form.setValue('address.street', street);
    if (city) form.setValue('address.city', city);
    if (state) form.setValue('address.state', state);
    if (zip) form.setValue('address.zip', zip);
    if (lat) form.setValue('address.lat', parseFloat(lat));
    if (lng) form.setValue('address.lng', parseFloat(lng));
    if (websiteUrl) form.setValue('websiteUrl', websiteUrl);
    if (industryCategory) form.setValue('industryCategory', industryCategory);
    if (phone) {
        form.setValue('contact.phone', phone);
        form.setValue('customerPhone', phone);
    }
  }, [searchParams, form]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-AU';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        const currentNotes = form.getValues('initialNotes') || '';
        form.setValue('initialNotes', (currentNotes + ' ' + finalTranscript).trim());
      }
    };

    recognition.onerror = (event: any) => {
        let errorMessage = `An unknown error occurred: ${event.error}`;
        switch (event.error) {
            case 'no-speech':
                errorMessage = "No speech was detected. Please try again.";
                break;
            case 'audio-capture':
                errorMessage = "Audio capture failed. Please ensure your microphone is working.";
                break;
            case 'not-allowed':
                errorMessage = "Microphone access was denied. Please enable it in your browser settings.";
                break;
            case 'network':
                errorMessage = "A network error occurred. Please check your internet connection.";
                break;
        }
        toast({ variant: 'destructive', title: 'Speech Recognition Error', description: errorMessage });
        setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [form, toast]);

  const handleToggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
       if (recognitionRef.current) {
         recognitionRef.current.start();
       } else {
         toast({ variant: 'destructive', title: 'Not Supported', description: 'Speech recognition is not supported in this browser.' });
       }
    }
    setIsListening(!isListening);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    let finalValues = { ...values };

    const duplicateId = await checkForDuplicateLead(
        values.companyName, 
        values.websiteUrl,
        values.customerServiceEmail,
        values.address
    );
    if (duplicateId) {
        setDuplicateLeadId(duplicateId);
        setIsSubmitting(false);
        return;
    }

    if (userProfile?.role === 'user' || userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen' || userProfile?.role === 'Lead Gen Admin') {
        if (!values.campaign) {
            form.setError('campaign', { type: 'manual', message: 'Campaign is required.' });
            setIsSubmitting(false);
            return;
        }
    } else if (userProfile?.role === 'Field Sales' || userProfile?.role === 'Field Sales Admin') {
        finalValues.campaign = 'Door-to-Door';
    }

    try {
      const result = await createNewLead({ ...finalValues, dialerAssigned: userProfile?.displayName });

      if (result.success && result.leadId) {
        toast({
          title: 'Lead Created in NetSuite',
          description: `${values.companyName} has been created.`,
        });
        router.push(`/leads/${result.leadId}`);
      } else {
        toast({
            variant: 'destructive',
            title: 'Creation Failed',
            description: result.message || 'Failed to create lead in NetSuite.',
        });
      }
    } catch (error: any) {
      console.error('Failed to create lead:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <>
    <AlertDialog open={!!duplicateLeadId} onOpenChange={() => setDuplicateLeadId(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Duplicate Found</AlertDialogTitle>
                <AlertDialogDescription>
                    A lead with this name or other details already exists in the system.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDuplicateLeadId(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    if(duplicateLeadId) {
                        router.push(`/leads/${duplicateLeadId}`);
                    }
                }}>
                    View Existing Lead
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-8">
            <div className="space-y-4">
               <h3 className="text-lg font-medium flex items-center gap-2"><Search className="w-5 h-5" />Find a Business</h3>
               <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search by Company Name or Address*</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        ref={autocompleteInputRef}
                        placeholder="Start typing to search Google Maps..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <hr/>

            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2"><Building className="w-5 h-5" />Company Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="companyName" render={({ field }) => (
                    <FormItem><FormLabel>Company Name*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="websiteUrl" render={({ field }) => (
                    <FormItem><FormLabel>Website</FormLabel><FormControl><Input {...field} placeholder="https://example.com" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="customerPhone" render={({ field }) => (
                    <FormItem><FormLabel>Company Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="customerServiceEmail" render={({ field }) => (
                    <FormItem><FormLabel>Company Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="abn" render={({ field }) => (
                    <FormItem><FormLabel>ABN</FormLabel><FormControl><Input {...field} placeholder="11 digits" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField
                  control={form.control}
                  name="industryCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industryCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {(userProfile?.role === 'user' || userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen' || userProfile?.role === 'Lead Gen Admin') && (
                    <FormField
                    control={form.control}
                    name="campaign"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Campaign*</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a campaign" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="Outbound">Outbound</SelectItem>
                            <SelectItem value="Door-to-Door">Door-to-Door</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                 )}
              </div>
            </div>

            <hr/>

             <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2"><MapPin className="w-5 h-5" />Address*</h3>
                <AddressAutocomplete />
             </div>

            <hr/>
            
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h3 className="text-lg font-medium flex items-center gap-2"><User className="w-5 h-5" />Primary Contact</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleAiProspect()} disabled={isProspecting}>
                        {isProspecting ? <Loader /> : <><Sparkles className="mr-2 h-4 w-4" /> AI Prospect Website</>}
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="contact.firstName" render={({ field }) => (
                        <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="contact.lastName" render={({ field }) => (
                        <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="contact.title" render={({ field }) => (
                        <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="contact.email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="contact.phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
            </div>
             <hr/>
             <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2"><StickyNote className="w-5 h-5" />Initial Notes</h3>
                 <FormField
                    control={form.control}
                    name="initialNotes"
                    render={({ field }) => (
                        <FormItem>
                        <FormControl>
                            <div className="relative">
                                <Textarea
                                    placeholder="Add any initial notes or comments about this lead... or use the mic to dictate."
                                    {...field}
                                    rows={5}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute bottom-2 right-2"
                                    onClick={handleToggleListening}
                                >
                                    {isListening ? <MicOff className="text-destructive animate-pulse" /> : <Mic />}
                                    <span className="sr-only">{isListening ? 'Stop listening' : 'Start listening'}</span>
                                </Button>
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
             </div>

          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader /> : 'Create Lead'}
          </Button>
        </div>
      </form>
    </Form>
    </>
  );
}
