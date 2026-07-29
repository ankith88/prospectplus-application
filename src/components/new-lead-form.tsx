'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
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
import { getLeadCampaigns, LeadCampaign } from '@/services/lead-campaigns';
import { addContactToLead, createNewLead, checkForDuplicateLead, updateVisitNote, logActivity, getAllUsers, getAllFranchisees } from '@/services/firebase';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool';
import { analyzeBusinessCard } from '@/ai/flows/analyze-business-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader } from './ui/loader';
import { Building, Mail, Phone, Globe, Tag, User, Briefcase, MapPin, Sparkles, Search, Info, StickyNote, Mic, MicOff, Camera, CheckCircle, AlertTriangle } from 'lucide-react';
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
  droppedOffBrochures: z.boolean().optional(),
  hadConversationWithContact: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.hadConversationWithContact) {
    if (!data.contact?.email || data.contact.email.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Contact email is required when you spoke to a contact.',
        path: ['contact', 'email'],
      });
    }
    if (!data.contact?.phone || data.contact.phone.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Contact phone number is required when you spoke to a contact.',
        path: ['contact', 'phone'],
      });
    }
  }
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
  const [franchiseeMatchReasons, setFranchiseeMatchReasons] = useState<Record<string, { inTerritory: boolean; inAusPost: boolean }>>({});
  const [showAllFranchisees, setShowAllFranchisees] = useState(false);
  const [franchiseeNotice, setFranchiseeNotice] = useState<{
    status: 'serviceable' | 'out_of_territory';
    message: string;
    userFranchiseeName?: string;
  } | null>(null);

  const [availableCampaigns, setAvailableCampaigns] = useState<LeadCampaign[]>([]);

  const [showCardScanner, setShowCardScanner] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [frontCardImage, setFrontCardImage] = useState<string | null>(null);
  const [isCardAnalyzing, setIsCardAnalyzing] = useState(false);

  const cardVideoRef = useRef<HTMLVideoElement | null>(null);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!showCardScanner) {
      if (cardVideoRef.current && cardVideoRef.current.srcObject) {
        (cardVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      return;
    }

    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        if (cardVideoRef.current) {
          cardVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
      }
    };

    getCameraPermission();

    return () => {
      if (cardVideoRef.current && cardVideoRef.current.srcObject) {
        (cardVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [showCardScanner, toast]);

  const handleCaptureCardPhoto = () => {
    if (!cardVideoRef.current || !cardCanvasRef.current) return null;
    const canvas = cardCanvasRef.current;
    canvas.width = cardVideoRef.current.videoWidth;
    canvas.height = cardVideoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    context?.drawImage(cardVideoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg');
  };

  const handleRunCardAnalysis = (frontImg: string | null, backImg: string | null) => {
    setShowCardScanner(false);
    setIsCardAnalyzing(true);
    toast({
      title: 'Analyzing Business Card...',
      description: 'AI is extracting business and contact details.',
    });

    analyzeBusinessCard({ frontImageDataUri: frontImg || undefined, backImageDataUri: backImg || undefined })
      .then(result => {
        if (result.companyName) {
          form.setValue('companyName', result.companyName);
          if (result.phoneNumber) form.setValue('customerPhone', result.phoneNumber);
          if (result.email) form.setValue('customerServiceEmail', result.email);
          if (result.website) form.setValue('websiteUrl', result.website);
          if (result.personName) {
            const parts = result.personName.split(' ');
            form.setValue('contact.firstName', parts[0] || 'Info');
            form.setValue('contact.lastName', parts.slice(1).join(' ') || result.companyName);
          }
          if (result.email) form.setValue('contact.email', result.email);
          if (result.phoneNumber) form.setValue('contact.phone', result.phoneNumber);
          if (result.jobTitle) form.setValue('contact.title', result.jobTitle);

          if (result.address) {
            form.setValue('address.street', result.address);
          }

          toast({
            title: 'Business Card Scanned',
            description: `Populated information for ${result.companyName}.`,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Analysis Incomplete',
            description: 'Could not extract business details from the card.',
          });
        }
      })
      .catch(err => {
        console.error('Card analysis error:', err);
        toast({
          variant: 'destructive',
          title: 'Analysis Error',
          description: 'Failed to analyze business card.',
        });
      })
      .finally(() => {
        setIsCardAnalyzing(false);
        setFrontCardImage(null);
      });
  };

  const sortedAllFranchisees = useMemo(() => {
    return [...franchisees].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [franchisees]);


  useEffect(() => {
    async function fetchUsersAndFranchisees() {
      try {
        const [users, frs, camps] = await Promise.all([getAllUsers(), getAllFranchisees(), getLeadCampaigns()]);
        setAllUsers(users);
        setFranchisees(frs);
        setAvailableCampaigns(camps.filter(c => c.isActive));
      } catch (err) {
        console.error('Failed to load users, franchisees, or campaigns:', err);
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
  const droppedOffBrochures = form.watch('droppedOffBrochures');
  const hadConversationWithContact = form.watch('hadConversationWithContact');
  const addressState = form.watch('address');
  const isFranchiseeRole = userProfile?.activeRole === 'Franchisee' || userProfile?.activeRole?.toLowerCase() === 'franchisee';

  const isAddressSelected = Boolean(
    (addressState?.street && (addressState?.city || addressState?.zip)) || 
    searchParams?.get('fromVisitNote')
  );

  const canShowRemainingSections = isAddressSelected && (
    !isFranchiseeRole || 
    franchiseeNotice?.status === 'serviceable' || 
    isFranchiseeConfirmed
  );

  useEffect(() => {
    if (userProfile?.activeRole === 'Field Sales' || userProfile?.activeRole === 'Field Sales Admin') {
      form.setValue('campaign', 'Door-to-Door');
    } else if (userProfile?.activeRole === 'Account Managers') {
      form.setValue('campaign', 'Account Manager Generated');
      if (userProfile?.displayName) {
        form.setValue('accountManagerAssigned', userProfile.displayName);
      }
      form.setValue('bucket', 'account_manager');
    } else if (userProfile?.activeRole === 'Outbound Admin') {
      form.setValue('campaign', 'Outbound');
      form.setValue('bucket', 'outbound');
    }
  }, [userProfile, form]);

  useEffect(() => {
    if (isFranchiseeRole) {
      form.setValue('campaign', 'Franchisee Generated');
      form.setValue('leadSource', '-4');
      if (droppedOffBrochures || hadConversationWithContact) {
        form.setValue('bucket', 'account_manager');
      } else {
        form.setValue('bucket', '' as any);
      }
    }
  }, [isFranchiseeRole, droppedOffBrochures, hadConversationWithContact, form]);

  useEffect(() => {
    if (leadSource === '492239') {
      form.setValue('campaign', 'Account Manager Generated');
      if (userProfile?.activeRole === 'Account Managers' && userProfile?.displayName) {
        form.setValue('accountManagerAssigned', userProfile.displayName);
      }
    }
  }, [leadSource, userProfile, form]);

  const activeDialers = useMemo(() => allUsers.filter(u => (u.assignedRoles?.includes('user') || u.assignedRoles?.includes('Lead Gen') || u.assignedRoles?.includes('Dialer') || u.assignedRoles?.includes('dialers') || u.role === 'user' || u.role === 'Dialer' || u.role === 'dialers') && !u.disabled), [allUsers]);
  const activeFieldReps = useMemo(() => allUsers.filter(u => u.assignedRoles?.includes('Field Sales') && !u.disabled), [allUsers]);
  const activeAccountManagers = useMemo(() => allUsers.filter(u => u.assignedRoles?.includes('Account Managers') && !u.disabled && canAssignToAm(u)), [allUsers]);

  useEffect(() => {
      setIsFranchiseeConfirmed(false);
      const city = addressState?.city?.trim().toUpperCase();
      const state = addressState?.state?.trim().toUpperCase();
      const zip = addressState?.zip?.trim();

      const isFranchiseeRole = userProfile?.activeRole === 'Franchisee' || 
                               userProfile?.activeRole?.toLowerCase() === 'franchisee' || 
                               userProfile?.role === 'Franchisee' || 
                               userProfile?.assignedRoles?.includes('Franchisee');

      if (city && state && zip) {
          const matches: import('@/lib/types').Franchisee[] = [];
          const reasons: Record<string, { inTerritory: boolean; inAusPost: boolean }> = {};

          for (const f of franchisees) {
              const inTerritory = !!f.territoryJson?.some(t => 
                  t.suburbs?.toUpperCase() === city && 
                  t.state?.toUpperCase() === state && 
                  String(t.post_code) === String(zip)
              );
              const inAusPost = !!f.ausPostSuburbsJson?.some(t => 
                  t.suburbs?.toUpperCase() === city && 
                  t.state?.toUpperCase() === state && 
                  String(t.post_code) === String(zip)
              );

              if (inTerritory || inAusPost) {
                  matches.push(f);
                  reasons[f.internalId] = { inTerritory, inAusPost };
              }
          }

          setFranchiseeMatchReasons(reasons);

          if (isFranchiseeRole) {
              const myFranchisee = franchisees.find(f => 
                  f.internalId === userProfile?.franchisee || 
                  f.name?.toLowerCase() === userProfile?.franchisee?.toLowerCase() ||
                  (f as any).id === userProfile?.franchisee
              ) || { name: userProfile?.franchisee || 'Franchisee', internalId: userProfile?.franchisee || '' } as import('@/lib/types').Franchisee;

              const canService = myFranchisee ? matches.some(m => m.internalId === myFranchisee.internalId || m.name?.toLowerCase() === myFranchisee.name?.toLowerCase()) : false;

              setMatchedFranchisees([myFranchisee]);
              setSelectedFranchiseeId(myFranchisee.internalId);
              form.setValue('franchisee', myFranchisee.internalId);

              if (canService) {
                  setFranchiseeNotice({
                      status: 'serviceable',
                      message: `This address is within your territory (${myFranchisee.name}). The lead has been defaulted to your franchise.`,
                      userFranchiseeName: myFranchisee.name
                  });
              } else {
                  setFranchiseeNotice({
                      status: 'out_of_territory',
                      message: `The address entered (${city}, ${zip}) is outside your registered territory. Since you are entering this lead, it will be assigned to your franchise (${myFranchisee.name}). Please confirm below that you can service this lead.`,
                      userFranchiseeName: myFranchisee.name
                  });
              }
          } else {
              setFranchiseeNotice(null);
              if (matches.length > 0) {
                  setMatchedFranchisees(matches);
                  setSelectedFranchiseeId(matches[0].internalId);
                  form.setValue('franchisee', matches[0].internalId);
              } else {
                  const mailPlusObj = franchisees.find(f => f.internalId === '435' || f.name === 'MailPlus Pty Ltd') || { name: 'MailPlus Pty Ltd', internalId: '435' } as import('@/lib/types').Franchisee;
                  setMatchedFranchisees([mailPlusObj]);
                  setSelectedFranchiseeId(mailPlusObj.internalId || '435');
                  form.setValue('franchisee', mailPlusObj.internalId || '435');
              }
          }
      } else {
          setMatchedFranchisees([]);
          setSelectedFranchiseeId('');
          form.setValue('franchisee', '');
          setFranchiseeMatchReasons({});
          setFranchiseeNotice(null);
      }
  }, [addressState?.city, addressState?.state, addressState?.zip, franchisees, userProfile, form]);

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
    const visitNoteId = searchParams?.get('fromVisitNote');

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
    const visitNoteId = searchParams?.get('fromVisitNote');
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

  async function onSubmit(values: z.infer<typeof formSchema>, isAddAnother: boolean = false) {
    const isAnother = typeof isAddAnother === 'boolean' ? isAddAnother : false;
    setIsSubmitting(true);
    let finalValues = { ...values };

    const visitNoteId = searchParams?.get('fromVisitNote');

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

    if (userProfile?.activeRole === 'user' || userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Lead Gen' || userProfile?.activeRole === 'Lead Gen Admin' || userProfile?.activeRole === 'Outbound Admin') {
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

    const isFranchiseeRole = userProfile?.activeRole === 'Franchisee' || userProfile?.activeRole?.toLowerCase() === 'franchisee';
    const droppedOffBrochures = values.droppedOffBrochures || false;
    const hadConversationWithContact = values.hadConversationWithContact || false;
    const isPriority = droppedOffBrochures || hadConversationWithContact;

    if (isFranchiseeRole) {
        if (!finalValues.campaign) {
            finalValues.campaign = 'Franchisee Generated';
        }
        if (!finalValues.leadSource) {
            finalValues.leadSource = '-4';
        }
        if (isPriority) {
            finalValues.bucket = 'account_manager';
            (finalValues as any).isPriority = true;
            (finalValues as any).franchiseeReviewPending = false;
        } else {
            finalValues.bucket = '' as any;
            (finalValues as any).isPriority = false;
            (finalValues as any).franchiseeReviewPending = true;
        }
    }

    if (userProfile?.activeRole === 'Outbound Admin') {
        if (!finalValues.bucket) {
            finalValues.bucket = 'outbound';
        }
        if (!finalValues.campaign) {
            finalValues.campaign = 'Outbound';
        }
    }

    // Check if dialerForLead is actually an active dialer
    const isUserActiveDialer = activeDialers.some(d => d.displayName === dialerForLead || d.email === dialerForLead);
    const validDefaultDialer = isUserActiveDialer ? dialerForLead : '';

    let finalDialer = finalValues.campaign === 'Outbound' ? (values.dialerAssigned || validDefaultDialer) : validDefaultDialer;
    if (isFranchiseeRole && !isPriority) {
        finalDialer = 'Aleyna Harnett';
    }
    
    let finalSalesRep = undefined;
    if (finalValues.campaign === 'Outbound' || finalValues.campaign === 'Door-to-Door') {
        finalSalesRep = Math.random() < 0.5 ? "Lee Russell" : "Kerina Helliwell";
    } else if (finalValues.campaign === 'MultiSite' || finalValues.campaign === 'Multisite' || finalValues.campaign === 'Account Manager Generated') {
        finalSalesRep = values.accountManagerAssigned;
    }
    
    const finalAccountManager = (finalValues.campaign === 'MultiSite' || finalValues.campaign === 'Multisite' || finalValues.campaign === 'Account Manager Generated') ? values.accountManagerAssigned : undefined;

    const selectedFranchiseeObj = matchedFranchisees.find(f => f.internalId === values.franchisee) || franchisees.find(f => f.internalId === values.franchisee);

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
        leadSource: values.leadSource,
        droppedOffBrochures,
        hadConversationWithContact,
        isPriority,
        isZeeCreated: isFranchiseeRole,
        franchiseeReviewPending: isFranchiseeRole && !isPriority
      });

      if (result.success && result.leadId) {
        const leadRef = doc(firestore, 'leads', result.leadId);
        
        // Save assignment updates in Firestore
        const assignmentUpdates: any = {
            droppedOffBrochures,
            hadConversationWithContact,
            isPriority,
        };

        if (isFranchiseeRole) {
            assignmentUpdates.customerSource = 'Franchisee Generated';
            assignmentUpdates.leadSource = 'Franchisee Generated';
            if (isPriority) {
                assignmentUpdates.bucket = 'account_manager';
                assignmentUpdates.isPriority = true;
                assignmentUpdates.franchiseeReviewPending = false;
            } else {
                assignmentUpdates.bucket = '';
                assignmentUpdates.isPriority = false;
                assignmentUpdates.dialerAssigned = 'Aleyna Harnett';
                assignmentUpdates.franchiseeReviewPending = true;
            }
        } else {
            if (finalValues.leadSource) {
                assignmentUpdates.leadSource = finalValues.leadSource === '-4' ? 'Franchisee Generated' : finalValues.leadSource;
            }
            if (finalValues.bucket) {
                assignmentUpdates.bucket = finalValues.bucket;
            }
        }
        if (finalValues.campaign === 'Outbound') {
            if (!isFranchiseeRole || isPriority) {
                assignmentUpdates.dialerAssigned = finalDialer || '';
            }
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

        // Send Email Notifications
        if (isFranchiseeRole) {
            const addressStr = [values.address.street, values.address.city, values.address.state, values.address.zip].filter(Boolean).join(', ');
            const fName = selectedFranchiseeObj?.name || userProfile?.displayName || userProfile?.franchisee || 'Franchisee';

            if (isPriority) {
                fetch('/api/notifications/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'franchisee_priority_lead_notification',
                        payload: {
                            leadId: result.leadId,
                            companyName: values.companyName,
                            franchiseeName: fName,
                            amEmail: values.accountManagerAssigned,
                            droppedOffBrochures,
                            hadConversationWithContact,
                            addressString: addressStr
                        }
                    })
                }).catch(e => console.error('Priority email notification error:', e));
            }

            if (franchiseeNotice?.status === 'out_of_territory') {
                fetch('/api/notifications/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'franchisee_outside_territory_lead',
                        payload: {
                            leadId: result.leadId,
                            companyName: values.companyName,
                            franchiseeName: fName,
                            addressString: addressStr,
                            city: values.address.city,
                            state: values.address.state,
                            zip: values.address.zip
                        }
                    })
                }).catch(e => console.error('Outside territory email notification error:', e));
            }
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
                    notes: `Moved to Outbound (Unassigned). Outcome: ${visitNote?.outcome?.type || 'N/A'}`,
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
          description: `${values.companyName} has been created successfully.`,
        });
        if (isAnother) {
          form.reset({
            companyName: '',
            websiteUrl: '',
            customerPhone: '',
            customerServiceEmail: '',
            abn: '',
            industryCategory: '',
            campaign: isFranchiseeRole ? 'Franchisee Generated' : '',
            initialNotes: '',
            address: { street: '', city: '', state: '', zip: '', country: 'Australia' },
            contact: { firstName: 'Info', lastName: '', title: 'Primary Contact', email: '', phone: '' },
            salesRepAssigned: '',
            dialerAssigned: '',
            fieldRepAssigned: '',
            accountManagerAssigned: '',
            leadSource: isFranchiseeRole ? '-4' : '',
            bucket: isFranchiseeRole ? ('' as any) : 'outbound',
            droppedOffBrochures: false,
            hadConversationWithContact: false,
          });
          setIsFranchiseeConfirmed(false);
          setFranchiseeNotice(null);
          setMatchedFranchisees([]);
          setSelectedFranchiseeId('');
          setImageUrls([]);
          if (companySearchRef.current) {
            companySearchRef.current.value = '';
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          router.push(`/leads/${result.leadId}`);
        }
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
      {duplicateLeadId && (
        <AlertDialog open={true} onOpenChange={() => setDuplicateLeadId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Duplicate Found</AlertDialogTitle>
              <AlertDialogDescription>
                This business appears to already exist in your system. You can view the existing lead or, if you started from a visit note, you can link the note to this lead.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDuplicateLeadId(null)}>Cancel</AlertDialogCancel>
              {searchParams?.get('fromVisitNote') && (
                <AlertDialogAction onClick={handleLinkToExistingLead} disabled={isLinking}>
                  {isLinking ? <Loader /> : 'Link Note to this Lead'}
                </AlertDialogAction>
              )}
              <AlertDialogAction onClick={() => {
                if (duplicateLeadId) router.push(`/leads/${duplicateLeadId}`);
              }}>
                View Existing Lead
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => onSubmit(data, false))} className="space-y-6">
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-8">
            <div className="space-y-4" id="step-company-search">
               <h3 className="text-lg font-medium flex items-center gap-2"><Search className="w-5 h-5" />Find a Business</h3>
               <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search by Company Name or Address<span className="text-red-500 font-bold ml-1">*</span></FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          {...field}
                          ref={(node) => {
                            field.ref(node);
                            companySearchRef.current = node;
                          }}
                          placeholder="Start typing to search Google Maps..."
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Scan Business Card or Brochure"
                          onClick={() => setShowCardScanner(true)}
                          className="flex-shrink-0"
                        >
                          <Camera className="h-4 w-4 text-primary" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <hr/>

            <div className="space-y-4">
              <div className="space-y-4" id="step-address-autocomplete">
                <h3 className="text-lg font-medium flex items-center gap-2"><MapPin className="w-5 h-5" />Address<span className="text-red-500 font-bold ml-1">*</span></h3>
                <AddressAutocomplete />
              </div>

              {isFranchiseeRole && franchiseeNotice && (
                <div className={`p-4 border rounded-md flex items-start gap-3 mt-4 ${
                  franchiseeNotice.status === 'serviceable' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  {franchiseeNotice.status === 'serviceable' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold text-sm">
                      {franchiseeNotice.status === 'serviceable' 
                        ? 'Territory Serviceable' 
                        : 'Address Outside Your Territory'}
                    </h4>
                    <p className="text-sm">{franchiseeNotice.message}</p>
                    {franchiseeNotice.status === 'out_of_territory' && !isFranchiseeConfirmed && (
                      <div className="pt-2">
                        <Button type="button" onClick={() => setIsFranchiseeConfirmed(true)}>
                          Confirm I Can Service This Lead & Continue
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!isFranchiseeRole && matchedFranchisees.length > 0 && !isFranchiseeConfirmed && (
                <>
                <hr/>
                <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="text-lg font-medium flex items-center gap-2"><Building className="w-5 h-5" />Franchisee Match</h3>
                        <div className="flex items-center gap-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                    setShowAllFranchisees(!showAllFranchisees);
                                    if (!showAllFranchisees && sortedAllFranchisees.length > 0) {
                                        setSelectedFranchiseeId(sortedAllFranchisees[0].internalId);
                                        form.setValue('franchisee', sortedAllFranchisees[0].internalId);
                                    } else if (showAllFranchisees && matchedFranchisees.length > 0) {
                                        setSelectedFranchiseeId(matchedFranchisees[0].internalId);
                                        form.setValue('franchisee', matchedFranchisees[0].internalId);
                                    }
                                }}
                            >
                                {showAllFranchisees ? "Use System Allocation" : "Override Allocation"}
                            </Button>
                            <a 
                                href="https://www.google.com/maps/d/u/0/viewer?mid=1e_RgzePD6wt0nZk914tH_7EuUn5nDzc&ll=-27.839471796496163%2C136.78205268750003&z=5" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                                View Franchisee Map
                            </a>
                        </div>
                    </div>

                    {showAllFranchisees ? (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">Select a franchisee from the alphabetical list:</p>
                            <Select value={selectedFranchiseeId} onValueChange={(val) => {
                                setSelectedFranchiseeId(val);
                                form.setValue('franchisee', val);
                            }}>
                                <SelectTrigger className="w-full max-w-sm bg-background">
                                    <SelectValue placeholder="Select Franchisee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sortedAllFranchisees.map(f => (
                                        <SelectItem key={f.internalId} value={f.internalId}>{f.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : matchedFranchisees.length === 1 ? (
                         <div className="space-y-1">
                             <p className="text-sm text-muted-foreground">
                                 This lead will be assigned to the following Franchisee: <strong>{matchedFranchisees[0].name}</strong>.
                             </p>
                             {franchiseeMatchReasons[matchedFranchisees[0].internalId] && (
                                 <p className="text-xs text-muted-foreground bg-background p-2 rounded border inline-block mt-1">
                                     Matched via:{' '}
                                     {[
                                         franchiseeMatchReasons[matchedFranchisees[0].internalId].inTerritory && 'Territory Fields',
                                         franchiseeMatchReasons[matchedFranchisees[0].internalId].inAusPost && 'AusPost Suburbs (ausPostSuburbsJson)'
                                     ].filter(Boolean).join(' & ')}
                                 </p>
                             )}
                         </div>
                    ) : (
                         <div className="space-y-3">
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
                             {selectedFranchiseeId && franchiseeMatchReasons[selectedFranchiseeId] && (
                                 <p className="text-xs text-muted-foreground bg-background p-2 rounded border block mt-1 w-fit">
                                     Selected franchisee matched via:{' '}
                                     {[
                                         franchiseeMatchReasons[selectedFranchiseeId].inTerritory && 'Territory Fields',
                                         franchiseeMatchReasons[selectedFranchiseeId].inAusPost && 'AusPost Suburbs (ausPostSuburbsJson)'
                                     ].filter(Boolean).join(' & ')}
                                 </p>
                             )}
                         </div>
                    )}
                    <Button type="button" onClick={() => setIsFranchiseeConfirmed(true)}>Confirm Franchisee & Continue</Button>
                </div>
                </>
            )}

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

            {canShowRemainingSections && (
              <>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2"><Building className="w-5 h-5" />Company Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="companyName" render={({ field }) => (
                    <FormItem><FormLabel>Company Name<span className="text-red-500 font-bold ml-1">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="websiteUrl" render={({ field }) => (
                    <FormItem><FormLabel>Website</FormLabel><FormControl><Input {...field} placeholder="https://example.com" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="customerPhone" render={({ field }) => (
                    <FormItem><FormLabel>Company Phone<span className="text-red-500 font-bold ml-1">*</span></FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="customerServiceEmail" render={({ field }) => (
                    <FormItem><FormLabel>Company Email<span className="text-red-500 font-bold ml-1">*</span></FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
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
              </div>

              {(leadSource === '-4' || campaign === 'Franchisee Generated' || isFranchiseeRole) && (
                <div className="mt-4 mb-6 p-4 border rounded-lg bg-slate-50/80 space-y-4">
                  <h4 className="font-semibold text-sm text-primary flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Franchisee Site Visit Details
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    If either box is checked, this lead will be marked as a <strong>Priority Lead</strong> and routed directly to the Account Manager pipeline.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <FormField
                      control={form.control}
                      name="droppedOffBrochures"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 bg-background">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value || false}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </FormControl>
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium cursor-pointer">
                              Dropped Off Brochures
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">Left marketing material at location</p>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hadConversationWithContact"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 bg-background">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value || false}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </FormControl>
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium cursor-pointer">
                              Had Conversation with Contact
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">Spoke directly with staff/manager</p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-2">
                    {droppedOffBrochures || hadConversationWithContact ? (
                      <div className="p-3 border border-emerald-300 bg-emerald-50 text-emerald-900 rounded-md text-xs font-semibold flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse flex-shrink-0" />
                        <span>⚡ <strong>Priority Lead Mode</strong>: Auto-assigned to Account Manager Bucket (routes directly to Account Management).</span>
                      </div>
                    ) : (
                      <div className="p-3 border border-blue-300 bg-blue-50 text-blue-900 rounded-md text-xs font-semibold flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 flex-shrink-0" />
                        <span>📋 <strong>Standard Verification Mode</strong>: Defaulted to Unassigned Bucket. Assigned to Aleyna Harnett for review on the Verification Page.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="leadSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Source</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isFranchiseeRole}>
                        <FormControl>
                          <SelectTrigger className={isFranchiseeRole ? "bg-slate-100 font-medium cursor-not-allowed opacity-90" : ""}>
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
                        <FormLabel>Campaign<span className="text-red-500 font-bold ml-1">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a campaign" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableCampaigns.length > 0 ? (
                                availableCampaigns.map((c) => (
                                  <SelectItem key={c.id} value={c.name}>
                                    {c.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <>
                                  <SelectItem value="Outbound">Outbound</SelectItem>
                                  <SelectItem value="Door-to-Door">Door-to-Door</SelectItem>
                                  <SelectItem value="MultiSite">MultiSite</SelectItem>
                                  <SelectItem value="Account Manager Generated">Account Manager Generated</SelectItem>
                                </>
                              )}
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
                       <FormLabel>Bucket<span className="text-red-500 font-bold ml-1">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={isFranchiseeRole}>
                          <FormControl>
                            <SelectTrigger className={isFranchiseeRole ? "bg-slate-100 font-medium cursor-not-allowed opacity-90" : ""}>
                              <SelectValue placeholder="Unassigned" />
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
                        {isFranchiseeRole && (
                          <p className="text-xs text-muted-foreground mt-1 font-medium">
                            {field.value === 'account_manager' 
                              ? "Auto-set to Account Manager Bucket (Priority Lead based on site visit details)." 
                              : "Defaulted to Unassigned. Will be sent for verification."}
                          </p>
                        )}
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
                        <FormItem><FormLabel>Email {hadConversationWithContact && <span className="text-red-500 font-bold ml-1">*</span>}</FormLabel><FormControl><Input {...field} type="email" placeholder="john.d@example.com" /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="contact.phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone {hadConversationWithContact && <span className="text-red-500 font-bold ml-1">*</span>}</FormLabel><FormControl><Input {...field} type="tel" placeholder="0412 345 678" /></FormControl><FormMessage /></FormItem>
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

        {canShowRemainingSections && (
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || isCardAnalyzing}
              onClick={form.handleSubmit((data) => onSubmit(data, true))}
            >
              {isSubmitting ? <Loader /> : 'Create & Add Another'}
            </Button>
            <Button type="submit" disabled={isSubmitting || isCardAnalyzing}>
              {isSubmitting ? <Loader /> : 'Create Lead'}
            </Button>
          </div>
        )}
      </form>
    </Form>

    <Dialog open={showCardScanner} onOpenChange={(open) => {
      setShowCardScanner(open);
      if (!open) setFrontCardImage(null);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" /> Scan Business Card / Brochure
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <canvas ref={cardCanvasRef} className="hidden" />
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
            <video ref={cardVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {frontCardImage && (
              <img src={frontCardImage} alt="Front of card" className="absolute top-2 left-2 w-1/4 rounded border-2 border-white shadow" />
            )}
          </div>
          {!frontCardImage ? (
            <div className="flex gap-2">
              <Button type="button" className="w-full" disabled={!hasCameraPermission} onClick={() => {
                const img = handleCaptureCardPhoto();
                if (img) setFrontCardImage(img);
              }}>
                Capture Front
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCardScanner(false)}>Cancel</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button type="button" className="w-full" onClick={() => {
                  const backImg = handleCaptureCardPhoto();
                  handleRunCardAnalysis(frontCardImage, backImg);
                }}>
                  Capture Back & Analyze
                </Button>
                <Button type="button" variant="outline" onClick={() => setFrontCardImage(null)}>Retake Front</Button>
              </div>
              <Button type="button" variant="secondary" className="w-full" onClick={() => handleRunCardAnalysis(frontCardImage, null)}>
                Skip Back & Analyze Front Only
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}