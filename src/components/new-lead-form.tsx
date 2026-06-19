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
import type { Address, CheckinQuestion, DiscoveryData, VisitNote, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { industryCategories, salesReps } from '@/lib/constants';
import { extractContactsFromDiscoveryData } from '@/lib/contact-utils';
import { addContactToLead, createNewLead, checkForDuplicateLead, updateVisitNote, logActivity, getAllUsers, getAllFranchisees } from '@/services/firebase';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool';
import { Loader } from './ui/loader';
import { Building, Mail, Phone, Globe, Tag, User, Briefcase, MapPin, Sparkles, Search, Info, StickyNote, Mic, MicOff, Camera } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Textarea } from './ui/textarea';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { useJsApiLoader } from '@react-google-maps/api';
import { canAssignToAm } from '@/lib/leave-utils';

const abnRegex = /^\d{11}$/;

const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places', 'drawing', 'geometry', 'visualization'];

const isValidRealEmail = (val: string | undefined | null) => {
    if (!val) return true;
    const email = val.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    const parts = email.split('@');
    const forbidden = ['n/a', 'na', 'none', 'nil', 'null', 'test', 'noemail', 'no-email', 'abc', '123', 'xyz', 'garbage'];
    
    // Check local part for exact forbidden match
    const isUserPartInvalid = forbidden.includes(parts[0]);
    
    // Check domain part labels for exact forbidden matches
    const domainLabels = parts[1].split('.');
    const isDomainPartInvalid = forbidden.some(p => domainLabels.includes(p));
    
    return !isUserPartInvalid && !isDomainPartInvalid;
};

const formSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  customerPhone: z.string().min(1, 'Company phone is required.'),
  customerServiceEmail: z.string()
    .min(1, "Company email is required.")
    .email({ message: "Invalid email address." })
    .refine(isValidRealEmail, { message: "Placeholder emails (like N/A) are not allowed." }),
  abn: z.string().regex(abnRegex, 'ABN must be 11 digits.').optional().or(z.literal('')),
  industryCategory: z.string().optional(),
  salesRepAssigned: z.string().optional(),
  dialerAssigned: z.string().optional(),
  fieldRepAssigned: z.string().optional(),
  accountManagerAssigned: z.string().optional(),
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
    email: z.string()
        .email('Invalid email address')
        .refine(isValidRealEmail, { message: "Placeholder emails (like N/A) are not allowed." })
        .optional().or(z.literal('')),
    phone: z.string().optional(),
  }),
  franchisee: z.string().optional(),
  leadSource: z.string().optional(),
  bucket: z.enum(['outbound', 'field_sales', 'inbound', 'account_manager', 'customer_success']).optional(),
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
  const [discoveryData, setDiscoveryData] = useState<Partial<DiscoveryData> | null>(null);
  const [isLoadingFromNote, setIsLoadingFromNote] = useState(false);
  const [noteCapturedBy, setNoteCapturedBy] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [visitNote, setVisitNote] = useState<VisitNote | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [franchisees, setFranchisees] = useState<import('@/lib/types').Franchisee[]>([]);
  const [matchedFranchisees, setMatchedFranchisees] = useState<import('@/lib/types').Franchisee[]>([]);
  const [selectedFranchiseeId, setSelectedFranchiseeId] = useState<string>('');
  const [isFranchiseeConfirmed, setIsFranchiseeConfirmed] = useState(false);

  useEffect(() => {
    async function fetchUsersAndFranchisees() {
      try {
        const [users, frs] = await Promise.all([getAllUsers(), getAllFranchisees()]);
        setAllUsers(users);
        setFranchisees(frs);
      } catch (err) {
        console.error('Failed to load users or franchisees:', err);
      }
    }
    fetchUsersAndFranchisees();
  }, []);

  const companySearchRef = useRef<HTMLInputElement | null>(null);
  const companyAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

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
      salesRepAssigned: '',
      dialerAssigned: '',
      fieldRepAssigned: '',
      accountManagerAssigned: '',
      leadSource: '',
      bucket: 'outbound',
    },
  });

  const campaign = form.watch('campaign');
  const leadSource = form.watch('leadSource');

  useEffect(() => {
    if (userProfile?.activeRole === 'Field Sales' || userProfile?.activeRole === 'Field Sales Admin') {
      form.setValue('campaign', 'Door-to-Door');
    } else if (userProfile?.activeRole === 'Account Managers') {
      form.setValue('campaign', 'Account Manager Generated');
      if (userProfile?.displayName) {
        form.setValue('accountManagerAssigned', userProfile.displayName);
      }
      form.setValue('bucket', 'account_manager');
    }
  }, [userProfile, form]);

  useEffect(() => {
    if (leadSource === '492239') {
      form.setValue('campaign', 'Account Manager Generated');
      if (userProfile?.activeRole === 'Account Managers' && userProfile?.displayName) {
        form.setValue('accountManagerAssigned', userProfile.displayName);
      }
    }
  }, [leadSource, userProfile, form]);

  const activeDialers = useMemo(() => allUsers.filter(u => (u.assignedRoles?.includes('user') || u.assignedRoles?.includes('Lead Gen')) && !u.disabled), [allUsers]);
  const activeFieldReps = useMemo(() => allUsers.filter(u => u.assignedRoles?.includes('Field Sales') && !u.disabled), [allUsers]);
  const activeAccountManagers = useMemo(() => allUsers.filter(u => u.assignedRoles?.includes('Account Managers') && !u.disabled && canAssignToAm(u)), [allUsers]);

  const addressState = form.watch('address');

  useEffect(() => {
      setIsFranchiseeConfirmed(false);
      const city = addressState?.city?.trim().toUpperCase();
      const state = addressState?.state?.trim().toUpperCase();
      const zip = addressState?.zip?.trim();

      if (city && state && zip) {
          const matches: import('@/lib/types').Franchisee[] = [];
          for (const f of franchisees) {
              const match = f.territoryJson?.find(t => 
                  t.suburbs?.toUpperCase() === city && 
                  t.state?.toUpperCase() === state && 
                  String(t.post_code) === String(zip)
              );
              if (match) {
                  matches.push(f);
              }
          }
          if (matches.length > 0) {
              setMatchedFranchisees(matches);
              setSelectedFranchiseeId(matches[0].internalId);
              form.setValue('franchisee', matches[0].internalId);
          } else {
              setMatchedFranchisees([{ name: 'MailPlus Pty Ltd', internalId: 'MailPlus Pty Ltd' } as import('@/lib/types').Franchisee]);
              setSelectedFranchiseeId('MailPlus Pty Ltd');
              form.setValue('franchisee', 'MailPlus Pty Ltd');
          }
      } else {
          setMatchedFranchisees([]);
          setSelectedFranchiseeId('');
          form.setValue('franchisee', '');
      }
  }, [addressState?.city, addressState?.state, addressState?.zip, franchisees, form]);

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
            return (useShortName ? component?.short_name : component?.long_name) || '';
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

  useEffect(() => {
    if (isLoaded && companySearchRef.current && !companyAutocompleteRef.current) {
      companyAutocompleteRef.current = new window.google.maps.places.Autocomplete(companySearchRef.current, {
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: 'au' },
      });
      companyAutocompleteRef.current.addListener('place_changed', () => {
        const place = companyAutocompleteRef.current?.getPlace();
        if (place?.address_components) {
          fillFormWithPlace(place);
        }
      });
    }
  }, [isLoaded, fillFormWithPlace]);

  useEffect(() => {
    const visitNoteId = searchParams.get('fromVisitNote');

    const fetchAndPopulateVisitNote = async (noteId: string) => {
      setIsLoadingFromNote(true);
      try {
        const noteRef = doc(firestore, 'visitnotes', noteId);
        const noteSnap = await getDoc(noteRef);

        if (noteSnap.exists()) {
          const note = { id: noteSnap.id, ...noteSnap.data() } as VisitNote;
          setVisitNote(note);
          setNoteCapturedBy(note.capturedBy);

          if (note.imageUrls) {
            setImageUrls(note.imageUrls);
          }
          
          const companyName = note.companyName || '';
          
          let repName = '';
          if (note.outcome?.details?.salesRep) {
            repName = note.outcome.details.salesRep.includes(':') 
                ? note.outcome.details.salesRep.split(':')[1].trim()
                : note.outcome.details.salesRep;
          }
          
          const discovery = note.discoveryData;
          let contactName = '';
          let contactTitle = 'Primary Contact';
          let contactEmail = '';
          let contactPhone = '';

          if (discovery?.decisionMakerName) {
              contactName = discovery.decisionMakerName;
              contactTitle = discovery.decisionMakerTitle || 'Decision Maker';
              contactEmail = discovery.decisionMakerEmail || '';
              contactPhone = discovery.decisionMakerPhone || '';
          } 
          else if (discovery?.personSpokenWithName) {
              contactName = discovery.personSpokenWithName;
              contactTitle = discovery.personSpokenWithTitle || 'Contact';
              contactEmail = discovery.personSpokenWithEmail || '';
              contactPhone = discovery.personSpokenWithPhone || '';
          }

          const nameParts = (contactName).split(' ');
          const email = contactEmail;
          const phone = contactPhone;

          const newDefaultValues = {
            companyName,
            websiteUrl: note.websiteUrl || '',
            customerPhone: phone,
            customerServiceEmail: email,
            campaign: 'Door-to-Door',
            initialNotes: note.content || '',
            address: {
              address1: note.address?.address1 || '',
              street: note.address?.street || '',
              city: note.address?.city || '',
              state: note.address?.state || '',
              zip: note.address?.zip || '',
              country: 'Australia',
              lat: note.address?.lat,
              lng: note.address?.lng,
            },
            contact: {
              firstName: nameParts[0] || 'Info',
              lastName: nameParts.slice(1).join(' ') || companyName,
              title: contactTitle,
              email: email,
              phone: phone,
            },
            salesRepAssigned: repName,
          };

          form.reset(newDefaultValues as any);
          if(note.discoveryData) {
              setDiscoveryData(note.discoveryData);
          }

        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not find the visit note to pre-fill the form.',
          });
        }
      } catch (error) {
        console.error('Failed to fetch visit note:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'An error occurred while fetching visit note details.',
        });
      } finally {
        setIsLoadingFromNote(false);
      }
    };

    if (visitNoteId) {
      fetchAndPopulateVisitNote(visitNoteId);
    }
  }, [searchParams, form, toast]);


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


  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
        form.setValue('initialNotes', (form.getValues('initialNotes') + ' ' + finalTranscript).trim());
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
    } else if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        toast({ variant: 'destructive', title: 'Recognition Error', description: 'Could not start voice recognition.' });
      }
    }
  };

  const handleLinkToExistingLead = async () => {
    const visitNoteId = searchParams.get('fromVisitNote');
    if (!duplicateLeadId || !visitNoteId) return;

    setIsLinking(true);
    try {
        await updateVisitNote(visitNoteId, { status: 'Converted', leadId: duplicateLeadId });
        
        // Reassignment logic for "Prospect - No Access/No Contact"
        const leadRef = doc(firestore, 'leads', duplicateLeadId);
        if (visitNote?.outcome?.type === 'Prospect - No Access/No Contact') {
           const userRef = doc(firestore, 'users', visitNote.capturedByUid);
           const userSnap = await getDoc(userRef);
           const capturer = userSnap.data();
           
           const updateData: any = {
             fieldSales: false,
             customerStatus: 'New'
           };
           
           if (capturer?.linkedBDR) {
              updateData.dialerAssigned = capturer.linkedBDR;
              await updateDoc(leadRef, updateData);
              await logActivity(duplicateLeadId, {
                type: 'Update',
                notes: `Moved to Outbound and assigned to ${capturer.linkedBDR} (Linked BDR for ${visitNote.capturedBy}).`,
                author: userProfile?.displayName || 'System'
              });
           } else {
              updateData.dialerAssigned = '';
              await updateDoc(leadRef, updateData);
              await logActivity(duplicateLeadId, {
                type: 'Update',
                notes: `Moved to Outbound (Unassigned). Outcome: ${visitNote.outcome.type}`,
                author: userProfile?.displayName || 'System'
              });
           }
        } else {
           await updateDoc(leadRef, { fieldSales: true });
        }

        toast({
            title: 'Note Linked Successfully',
            description: 'The visit note has been linked to the existing lead.',
        });
        router.push(`/leads/${duplicateLeadId}`);
    } catch (error) {
        console.error('Failed to link visit note:', error);
        toast({
            variant: 'destructive',
            title: 'Linking Failed',
            description: 'Could not link the visit note. Please try again.',
        });
    } finally {
        setIsLinking(false);
        setDuplicateLeadId(null);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    let finalValues = { ...values };

    const visitNoteId = searchParams.get('fromVisitNote');

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

    let dialerForLead = userProfile?.displayName;
    if (noteCapturedBy) {
        dialerForLead = noteCapturedBy;
    }

    if (userProfile?.activeRole === 'user' || userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Lead Gen' || userProfile?.activeRole === 'Lead Gen Admin') {
        if (!values.campaign) {
            form.setError('campaign', { type: 'manual', message: 'Campaign is required.' });
            setIsSubmitting(false);
            return;
        }
    } else if (userProfile?.activeRole === 'Field Sales' || userProfile?.activeRole === 'Field Sales Admin') {
        finalValues.campaign = 'Door-to-Door';
    } else if (userProfile?.activeRole === 'Account Managers') {
        finalValues.campaign = 'Account Manager Generated';
    }

    const finalDialer = finalValues.campaign === 'Outbound' ? (values.dialerAssigned || dialerForLead) : dialerForLead;
    
    let finalSalesRep = undefined;
    if (finalValues.campaign === 'Outbound' || finalValues.campaign === 'Door-to-Door') {
        finalSalesRep = Math.random() < 0.5 ? "Lee Russell" : "Kerina Helliwell";
    } else if (finalValues.campaign === 'MultiSite' || finalValues.campaign === 'Multisite' || finalValues.campaign === 'Account Manager Generated') {
        finalSalesRep = values.accountManagerAssigned;
    }
    
    const finalAccountManager = (finalValues.campaign === 'MultiSite' || finalValues.campaign === 'Multisite' || finalValues.campaign === 'Account Manager Generated') ? values.accountManagerAssigned : undefined;

    const selectedFranchiseeObj = matchedFranchisees.find(f => f.internalId === values.franchisee);

    try {
      const result = await createNewLead({ 
        ...finalValues, 
        dialerAssigned: finalDialer, 
        salesRepAssigned: finalSalesRep,
        fieldRepAssigned: values.fieldRepAssigned,
        accountManagerAssigned: finalAccountManager,
        discoveryData: discoveryData || undefined, 
        visitNoteID: visitNoteId || undefined,
        franchiseeInternalId: selectedFranchiseeObj?.internalId || (values.franchisee === 'MailPlus Pty Ltd' ? '435' : undefined),
        franchiseeName: selectedFranchiseeObj?.name || (values.franchisee === 'MailPlus Pty Ltd' ? 'MailPlus Pty Ltd' : undefined),
        leadSource: values.leadSource
      });

      if (result.success && result.leadId) {
        const leadRef = doc(firestore, 'leads', result.leadId);
        
        // Save assignment updates in Firestore
        const assignmentUpdates: any = {};
        if (finalValues.franchisee) {
            const fName = selectedFranchiseeObj?.name || (finalValues.franchisee === 'MailPlus Pty Ltd' ? 'MailPlus Pty Ltd' : finalValues.franchisee);
            const fId = selectedFranchiseeObj?.internalId || (finalValues.franchisee === 'MailPlus Pty Ltd' ? 'MailPlus Pty Ltd' : finalValues.franchisee);
            assignmentUpdates.franchisee = fName;
            assignmentUpdates.franchisee_id = fId;
        }
        if (finalValues.leadSource) {
            assignmentUpdates.leadSource = finalValues.leadSource;
        }
        if (finalValues.bucket) {
            assignmentUpdates.bucket = finalValues.bucket;
        }
        if (finalValues.campaign === 'Outbound') {
            assignmentUpdates.dialerAssigned = finalDialer || '';
            assignmentUpdates.salesRepAssigned = finalSalesRep || '';
            assignmentUpdates.campaign = 'Outbound';
        } else if (finalValues.campaign === 'Door-to-Door') {
            assignmentUpdates.salesRepAssigned = finalSalesRep || '';
            assignmentUpdates.fieldRepAssigned = values.fieldRepAssigned || '';
            assignmentUpdates.campaign = 'Door-to-Door';
        } else if (finalValues.campaign === 'MultiSite' || finalValues.campaign === 'Multisite') {
            assignmentUpdates.salesRepAssigned = finalSalesRep || '';
            assignmentUpdates.accountManagerAssigned = finalAccountManager || '';
            assignmentUpdates.campaign = 'MultiSite';
        } else if (finalValues.campaign === 'Account Manager Generated') {
            assignmentUpdates.salesRepAssigned = finalSalesRep || '';
            assignmentUpdates.accountManagerAssigned = finalAccountManager || '';
            assignmentUpdates.campaign = 'Account Manager Generated';
        }

        if (Object.keys(assignmentUpdates).length > 0) {
            await updateDoc(leadRef, assignmentUpdates);
        }
        if (visitNoteId) {
            await updateVisitNote(visitNoteId, { status: 'Converted', leadId: result.leadId });
            
            const leadRef = doc(firestore, 'leads', result.leadId);
            
            // Reassignment logic for "Prospect - No Access/No Contact"
            if (visitNote?.outcome?.type === 'Prospect - No Access/No Contact') {
               const userRef = doc(firestore, 'users', visitNote.capturedByUid);
               const userSnap = await getDoc(userRef);
               const capturer = userSnap.data();
               
               const updateData: any = {
                 fieldSales: false,
                 customerStatus: 'New'
               };
               
               if (capturer?.linkedBDR) {
                  updateData.dialerAssigned = capturer.linkedBDR;
                  await updateDoc(leadRef, updateData);
                  await logActivity(result.leadId, {
                    type: 'Update',
                    notes: `Moved to Outbound and assigned to ${capturer.linkedBDR} (Linked BDR for ${visitNote.capturedBy}).`,
                    author: userProfile?.displayName || 'System'
                  });
               } else {
                  updateData.dialerAssigned = '';
                  await updateDoc(leadRef, updateData);
                  await logActivity(result.leadId, {
                    type: 'Update',
                    notes: `Moved to Outbound (Unassigned). Outcome: ${visitNote.outcome.type}`,
                    author: userProfile?.displayName || 'System'
                  });
               }
            } else {
               // Standard logic for regular visits
               await updateDoc(leadRef, { fieldSales: true });
            }
        }
        
        if (discoveryData && Object.keys(discoveryData).length > 0) {
          const leadRef = doc(firestore, 'leads', result.leadId);
          await updateDoc(leadRef, { discoveryData });
        }

        // NEW: Extract and add contacts from discoveryData
        if (discoveryData) {
          const extractedContacts = extractContactsFromDiscoveryData(discoveryData as DiscoveryData);
          if (extractedContacts.length > 0) {
            console.log(`[NewLeadForm] Found ${extractedContacts.length} contacts to add to lead ${result.leadId}`);
            
            let addedCount = 0;
            for (const contact of extractedContacts) {
              try {
                await addContactToLead(result.leadId, contact);
                addedCount++;
              } catch (err) {
                console.error(`Failed to add extracted contact ${contact.name}:`, err);
              }
            }
            
            if (addedCount > 0) {
              toast({
                title: 'Contacts Added',
                description: `Added ${addedCount} new contact(s) from the visit note.`,
              });
            }
          }
        }

        toast({
          title: 'Lead Created',
          description: `${values.companyName} has been created.`,
        });
        router.push(`/leads/${result.leadId}`);
      } else {
        toast({
            variant: 'destructive',
            title: 'Creation Failed',
            description: result.message || 'Failed to create lead.',
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

  if (isLoadingFromNote) {
    return <div className="flex h-full items-center justify-center"><Loader /></div>;
  }


  return (
    <>
    <AlertDialog open={!!duplicateLeadId} onOpenChange={() => setDuplicateLeadId(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Duplicate Found</AlertDialogTitle>
                <AlertDialogDescription>
                    This business appears to already exist in your system. You can view the existing lead or, if you started from a visit note, you can link the note to this lead.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDuplicateLeadId(null)}>Cancel</AlertDialogCancel>
                {searchParams.get('fromVisitNote') && (
                    <AlertDialogAction onClick={handleLinkToExistingLead} disabled={isLinking}>
                        {isLinking ? <Loader /> : 'Link Note to this Lead'}
                    </AlertDialogAction>
                )}
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
            <div className="space-y-4" id="step-company-search">
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
                        ref={(node) => {
                          field.ref(node);
                          companySearchRef.current = node;
                        }}
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
              <div className="space-y-4" id="step-address-autocomplete">
                <h3 className="text-lg font-medium flex items-center gap-2"><MapPin className="w-5 h-5" />Address*</h3>
                <AddressAutocomplete />
              </div>
            </div>

            {matchedFranchisees.length > 0 && !isFranchiseeConfirmed && (
                <>
                <hr/>
                <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                    <h3 className="text-lg font-medium flex items-center gap-2"><Building className="w-5 h-5" />Franchisee Match</h3>
                    {matchedFranchisees.length === 1 ? (
                         <p className="text-sm text-muted-foreground">This lead will be assigned to the following Franchisee: <strong>{matchedFranchisees[0].name}</strong>.</p>
                    ) : (
                         <div className="space-y-2">
                             <p className="text-sm text-muted-foreground">Multiple franchisees cover this area. Please select one:</p>
                             <Select value={selectedFranchiseeId} onValueChange={(val) => {
                                 setSelectedFranchiseeId(val);
                                 form.setValue('franchisee', val);
                             }}>
                                 <SelectTrigger className="w-full max-w-sm bg-background">
                                     <SelectValue placeholder="Select Franchisee" />
                                 </SelectTrigger>
                                 <SelectContent>
                                     {matchedFranchisees.map(f => (
                                         <SelectItem key={f.internalId} value={f.internalId}>{f.name}</SelectItem>
                                     ))}
                                 </SelectContent>
                             </Select>
                         </div>
                    )}
                    <Button type="button" onClick={() => setIsFranchiseeConfirmed(true)}>Confirm Franchisee & Continue</Button>
                </div>
                </>
            )}

            {isFranchiseeConfirmed && (
              <>
            <hr/>

            {imageUrls.length > 0 && (
              <>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2"><Camera className="w-5 h-5" />Captured Images from Visit</h3>
                  <div className="flex flex-wrap gap-4">
                    {imageUrls.map((url, index) => (
                      <div 
                        key={index}
                        className="relative w-[200px] h-[120px] rounded-md overflow-hidden border bg-background group cursor-pointer"
                        onClick={() => window.open(url, '_blank')}
                      >
                        <Image src={url} alt={`Visit image ${index + 1}`} fill className="object-cover transition-transform group-hover:scale-105"/>
                      </div>
                    ))}
                  </div>
                </div>
                <hr/>
              </>
            )}

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
                    <FormItem><FormLabel>Company Phone*</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="customerServiceEmail" render={({ field }) => (
                    <FormItem><FormLabel>Company Email*</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
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
                <FormField
                  control={form.control}
                  name="leadSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Source</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a lead source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="491777">LocalMile.Plus</SelectItem>
                          <SelectItem value="487126">WooCommerce</SelectItem>
                          <SelectItem value="437098">ProspectPlus Lead Generation</SelectItem>
                          <SelectItem value="246306">Shopify</SelectItem>
                          <SelectItem value="207048">NeoPost</SelectItem>
                          <SelectItem value="97943">Head Office Generated</SelectItem>
                          <SelectItem value="17">Inbound - Call</SelectItem>
                          <SelectItem value="11">Referral</SelectItem>
                          <SelectItem value="-4">Franchisee Generated</SelectItem>
                          <SelectItem value="492239">Account Manager Generated</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {campaign === 'Outbound' && (
                  <FormField
                    control={form.control}
                    name="dialerAssigned"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dialer Assigned</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a dialer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeDialers.map((rep) => (
                              <SelectItem key={rep.uid} value={rep.displayName || ''}>
                                {rep.displayName || ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 )}

                 {campaign === 'Door-to-Door' && (
                  <FormField
                    control={form.control}
                    name="fieldRepAssigned"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field Rep Assigned</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a field rep" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeFieldReps.map((rep) => (
                              <SelectItem key={rep.uid} value={rep.displayName || ''}>
                                {rep.displayName || ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 )}

                 {(campaign === 'MultiSite' || campaign === 'Multisite' || campaign === 'Account Manager Generated') && (
                  <FormField
                    control={form.control}
                    name="accountManagerAssigned"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Manager Assigned</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an account manager" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeAccountManagers.map((rep) => (
                              <SelectItem key={rep.uid} value={rep.displayName || ''}>
                                {rep.displayName || ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 )}

                 {(userProfile?.activeRole === 'user' || userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Lead Gen' || userProfile?.activeRole === 'Lead Gen Admin') && (
                    <FormField
                    control={form.control}
                    name="campaign"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Campaign*</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a campaign" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="Outbound">Outbound</SelectItem>
                            <SelectItem value="Door-to-Door">Door-to-Door</SelectItem>
                            <SelectItem value="MultiSite">MultiSite</SelectItem>
                            <SelectItem value="Account Manager Generated">Account Manager Generated</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                 )}
                 <FormField
                   control={form.control}
                   name="bucket"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Bucket*</FormLabel>
                       <Select onValueChange={field.onChange} value={field.value}>
                         <FormControl>
                           <SelectTrigger>
                             <SelectValue placeholder="Select a bucket" />
                           </SelectTrigger>
                         </FormControl>
                         <SelectContent>
                           <SelectItem value="outbound">Outbound</SelectItem>
                           <SelectItem value="field_sales">Field Sales</SelectItem>
                           <SelectItem value="inbound">Inbound</SelectItem>
                           <SelectItem value="account_manager">Account Manager</SelectItem>
                           <SelectItem value="customer_success">Customer Success</SelectItem>
                         </SelectContent>
                       </Select>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
              </div>
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
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" placeholder="john.d@example.com" /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="contact.phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} type="tel" placeholder="0412 345 678" /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
            </div>

            {discoveryData && Object.keys(discoveryData).length > 0 && (
              <>
                <hr />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2"><Info className="w-5 h-5" />Field Discovery Answers</h3>
                  <Card>
                    <CardContent className="p-4 space-y-3 text-sm">
                      <ul className="list-disc pl-5 space-y-2">
                        {Object.entries(discoveryData).map(([key, value]) => {
                          if (!value || (Array.isArray(value) && value.length === 0)) return null;
                          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
                          const formattedValue = Array.isArray(value) ? value.join(', ') : String(value);
                          return (
                            <li key={key}>
                              <span className="font-semibold">{formattedKey}:</span>{' '}
                              <span className="text-muted-foreground">{formattedValue}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            <hr />

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
              </>
            )}
          </CardContent>
        </Card>

        {isFranchiseeConfirmed && (
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader /> : 'Create Lead'}
          </Button>
        </div>
        )}
      </form>
    </Form>
    </>
  );
}