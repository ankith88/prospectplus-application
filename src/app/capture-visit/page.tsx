
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { Mic, MicOff, ChevronLeft, Camera, Search, CircleDot, Check, X, Upload, Mail, TrendingUp } from 'lucide-react';
import { addVisitNote, getAllUsers, updateVisitNote } from '@/services/firebase';
import { sendVisitNoteToNetSuite } from '@/services/netsuite-visit-note-proxy';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';
import type { Address, UserProfile, DiscoveryData, VisitNote, Lead } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { salesReps } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import SummaryStep from '@/components/capture-visit/summary-step';
import { calculateScoreAndRouting } from '@/lib/discovery-scoring';
import { useJsApiLoader } from '@react-google-maps/api';


const FieldDiscoveryStep = dynamic(() => import('@/components/capture-visit/field-discovery-step'), {
    loading: () => <div className="flex justify-center p-8"><Loader /></div>,
    ssr: false,
});


const noteSchema = z.object({
  content: z.string().min(10, 'Please provide more detail in your note.'),
});

const discoverySchema = z.object({
  discoverySignals: z.array(z.string()).optional(),
  inconvenience: z.enum(['Very inconvenient', 'Somewhat inconvenient', 'Not a big issue']).optional(),
  occurrence: z.enum(['Daily', 'Weekly', 'Ad-hoc']).optional(),
  taskOwner: z.enum(['Shared admin responsibility', 'Dedicated staff role', 'Ad-hoc / whoever is free']).optional(),

  // New fields for Step 1
  businessType: z.enum(['Retail', 'B2B']).optional(),
  
  personSpokenWithName: z.string().optional(),
  personSpokenWithTitle: z.string().optional(),
  personSpokenWithEmail: z.string().email().optional().or(z.literal('')),
  personSpokenWithPhone: z.string().optional(),
  personSpokenWithTags: z.array(z.string()).optional(),

  decisionMakerName: z.string().optional(),
  decisionMakerTitle: z.string().optional(),
  decisionMakerEmail: z.string().email().optional().or(z.literal('')),
  decisionMakerPhone: z.string().optional(),

  lostPropertyProcess: z.enum([
    'Staff organise returns manually',
    'Guests contact us to arrange shipping',
    'Rarely happens / informal process',
    'Already use a return platform'
  ]).optional(),
});


const parseAddressComponents = (components: google.maps.GeocoderAddressComponent[]): Address => {
    const address: Partial<Address> = { country: 'Australia' };
    const get = (type: string, useShortName = false) => {
        const comp = components.find(c => c.types.includes(type));
        return useShortName ? comp?.short_name : comp?.long_name;
    };
    const streetNumber = get('street_number');
    const route = get('route');
    
    address.street = `${streetNumber || ''} ${route || ''}`.trim();
    address.address1 = get('subpremise'); // For level, suite, etc.
    address.city = get('locality') || get('postal_town');
    address.state = get('administrative_area_level_1', true) || '';
    address.zip = get('postal_code');
    return address as Address;
};

const TOTAL_STEPS = 5;
const stepLabels = ["Find Business", "Field Discovery", "Capture Note", "Select Outcome", "Summary"];

const contactTagOptions: Option[] = [
    { value: 'Decision Maker', label: 'Decision Maker' },
    { value: 'Influencer', label: 'Influencer' },
    { value: 'Gatekeeper', label: 'Gatekeeper' },
];

const formatAddressDisplay = (address?: Address) => {
    if (!address) return '';
    return [address.address1, address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');
};

const ResponsiveProgress = ({ currentStep, totalSteps, labels, onStepClick }: { currentStep: number; totalSteps: number; labels: string[]; onStepClick: (step: number) => void; }) => {
    return (
        <div className="flex items-center w-full" aria-label={"Step " + currentStep + " of " + totalSteps}>
            {labels.map((label, index) => {
                const step = index + 1;
                const isCompleted = currentStep > step;
                const isCurrent = currentStep === step;

                return (
                    <React.Fragment key={step}>
                        <button
                            type="button"
                            onClick={() => onStepClick(step)}
                            className="flex flex-col items-center text-center cursor-pointer disabled:cursor-not-allowed group"
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 group-hover:ring-2 group-hover:ring-primary/50",
                                isCompleted ? "bg-primary text-primary-foreground" : isCurrent ? "border-2 border-primary bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                                {isCompleted ? <Check className="w-5 h-5" /> : step}
                            </div>
                            <p className={cn("text-xs mt-1 hidden md:block", isCurrent ? "font-bold text-primary" : "text-muted-foreground")}>
                                {label}
                            </p>
                        </button>
                        {step < labels.length && (
                            <div className={cn("flex-1 h-0.5 transition-all duration-300", currentStep > step ? "bg-primary" : "bg-muted")} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};


export default function CaptureVisitPage() {
    const [step, setStep] = useState<'search' | 'discovery' | 'capture' | 'outcome' | 'summary' | 'camera'>('search');
    const [noteContent, setNoteContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [outcomeData, setOutcomeData] = useState<{ type: string; details: Record<string, any> } | null>(null);
    
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const [fieldSalesUsers, setFieldSalesUsers] = useState<UserProfile[]>([]);
    const [selectedFieldSalesRep, setSelectedFieldSalesRep] = useState<string>('');

    const [editingNote, setEditingNote] = useState<VisitNote | null>(null);
    const [isLoadingNote, setIsLoadingNote] = useState(false);
    const [previousStep, setPreviousStep] = useState<'search' | 'capture'>('search');
  
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const noteIdToEdit = searchParams.get('noteId');

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        libraries: ['places', 'drawing', 'geometry', 'visualization'],
    });

    const captureForm = useForm<z.infer<typeof noteSchema>>({
        resolver: zodResolver(noteSchema),
        defaultValues: { content: '' },
    });

    const discoveryForm = useForm<z.infer<typeof discoverySchema>>({
        resolver: zodResolver(discoverySchema),
        defaultValues: {
            discoverySignals: [],
            personSpokenWithName: '',
            personSpokenWithTitle: '',
            personSpokenWithEmail: '',
            personSpokenWithPhone: '',
            personSpokenWithTags: [],
            decisionMakerName: '',
            decisionMakerTitle: '',
            decisionMakerEmail: '',
            decisionMakerPhone: '',
        },
    });
    
    const { control, watch } = discoveryForm;
    const personSpokenWithTags = watch("personSpokenWithTags") || [];
    const showDecisionMakerFields = personSpokenWithTags.length > 0 && !personSpokenWithTags.includes('Decision Maker');

    const isAdminOrLeadGen = userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen' || userProfile?.role === 'Lead Gen Admin';

    const currentStepNumber = {
        search: 1,
        camera: 1,
        discovery: 2,
        capture: 3,
        outcome: 4,
        summary: 5,
    }[step] || 1;

    const autocompleteRef = useRef<google.maps.places.Autocomplete>();
    const searchInputCallbackRef = useCallback((node: HTMLInputElement) => {
        if (node && !autocompleteRef.current && isLoaded) {
            autocompleteRef.current = new window.google.maps.places.Autocomplete(node, {
                types: ['establishment'],
                componentRestrictions: { country: 'au' },
                fields: ['name', 'formatted_address', 'address_components', 'geometry', 'place_id', 'website'],
            });
            autocompleteRef.current.addListener('place_changed', () => {
                const place = autocompleteRef.current?.getPlace();
                if (place?.address_components) {
                    setSelectedPlace(place);
                    setSearchQuery(place.name || '');
                }
            });
        }
    }, [isLoaded]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentStepNumber]);

    useEffect(() => {
        if (noteIdToEdit) {
            setIsLoadingNote(true);
            const fetchNote = async () => {
                try {
                    const noteRef = doc(firestore, 'visitnotes', noteIdToEdit);
                    const noteSnap = await getDoc(noteRef);
                    if (noteSnap.exists()) {
                        const noteData = { id: noteSnap.id, ...noteSnap.data() } as VisitNote;
                        setEditingNote(noteData);

                        if (noteData.companyName) {
                            setSearchQuery(noteData.companyName);
                            setSelectedPlace({
                                name: noteData.companyName,
                                formatted_address: formatAddressDisplay(noteData.address),
                                website: noteData.websiteUrl,
                                address_components: [],
                                geometry: noteData.address?.lat ? { location: new google.maps.LatLng(noteData.address.lat, noteData.address.lng!) } : undefined,
                                place_id: noteData.googlePlaceId
                            });
                        }
                        if (noteData.discoveryData) {
                            discoveryForm.reset(noteData.discoveryData);
                        }
                        if (noteData.content) {
                            captureForm.setValue('content', noteData.content);
                            setNoteContent(noteData.content);
                        }
                        if (noteData.imageUrls) setImages(noteData.imageUrls);
                        
                    } else {
                        toast({ variant: 'destructive', title: 'Error', description: 'Visit note not found.' });
                        router.push('/visit-notes');
                    }
                } catch (e) {
                    console.error(e);
                    toast({ variant: 'destructive', title: 'Error', description: 'Failed to load visit note.' });
                } finally {
                    setIsLoadingNote(false);
                }
            }
            fetchNote();
        }
    }, [noteIdToEdit, router, toast, discoveryForm, captureForm]);

    useEffect(() => {
        if (isAdminOrLeadGen) {
            getAllUsers().then(users => {
                const fsUsers = users.filter(u => u.role === 'Field Sales' && !u.disabled);
                setFieldSalesUsers(fsUsers);
            });
        }
    }, [isAdminOrLeadGen]);

    const resetState = useCallback(() => {
        captureForm.reset();
        discoveryForm.reset();
        setStep('search');
        setNoteContent('');
        setIsSubmitting(false);
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
        setOutcomeData(null);
        setImages([]);
        setHasCameraPermission(null);
        setSelectedPlace(null);
        setSearchQuery('');
        setEditingNote(null);
        setIsLoadingNote(false);
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }
    }, [captureForm, discoveryForm, isListening]);

    useEffect(() => {
        if (step !== 'camera') {
          if (videoRef.current && videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
          }
          return;
        }
    
        const getCameraPermission = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setHasCameraPermission(true);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            setStep(previousStep); // Go back to the previous step on error
            toast({
              variant: 'destructive',
              title: 'Camera Access Denied',
              description: 'Please enable camera permissions in your browser settings to use this feature.',
            });
          }
        };
        getCameraPermission();
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
        };
      }, [step, toast, previousStep]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        recognitionRef.current = new SpeechRecognition();
        const recognition = recognitionRef.current;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-AU';

        recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) {
            captureForm.setValue('content', (captureForm.getValues('content') + ' ' + finalTranscript).trim());
        }
        };
        recognition.onerror = (event: any) => {
        toast({ variant: 'destructive', title: 'Speech Recognition Error', description: event.error });
        setIsListening(false);
        };
        recognition.onend = () => setIsListening(false);
        return () => recognitionRef.current?.stop();
    }, [captureForm, toast]);

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
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        if (selectedPlace && value !== selectedPlace.name) {
            setSelectedPlace(null);
        }
    };
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                 toast({
                    title: 'Uploading images...',
                    description: `Processing ${files.length} image(s).`,
                });
            }
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                        setImages(prev => [...prev, reader.result as string]);
                    }
                };
                reader.onerror = () => {
                    toast({
                        variant: 'destructive',
                        title: 'Upload Failed',
                        description: `Could not read file: ${file.name}`,
                    });
                }
                reader.readAsDataURL(file);
            });
        }
    };

    const handleCaptureImage = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const context = canvas.getContext('2d');
        context?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImages(prev => [...prev, dataUrl]);
        setStep(previousStep);
    };

    const handleDeleteImage = (indexToDelete: number) => {
        setImages(prev => prev.filter((_, index) => index !== indexToDelete));
    };

    const handleFinalSubmit = async () => {
        if (!outcomeData) {
            toast({ variant: 'destructive', title: 'Error', description: 'No outcome selected.' });
            return;
        }
        const { type: outcomeType, details: detailsObject } = outcomeData;

        let captureUser = userProfile;
        if (isAdminOrLeadGen) {
            if (selectedFieldSalesRep) {
                const selectedUser = fieldSalesUsers.find(u => u.uid === selectedFieldSalesRep);
                if (selectedUser) {
                    captureUser = selectedUser;
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Selected Field Sales Rep not found.' });
                    setIsSubmitting(false);
                    return;
                }
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Please select a Field Sales Rep to assign this visit note to.' });
                setIsSubmitting(false);
                return;
            }
        }

        if (!captureUser) {
          toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
          return;
        }

        setIsSubmitting(true);
        let detailsString = Object.entries(detailsObject)
            .map(([key, value]) => {
                if (value) {
                    const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    return `${formattedKey}: ${Array.isArray(value) ? value.join(', ') : value}`;
                }
                return null;
            })
            .filter(Boolean)
            .join('\n');
            
        const rawNote = captureForm.getValues('content');
        const fullNote = `${rawNote}\n\n---\nOutcome: ${outcomeType}\n${detailsString}`;
    
        let addressData: Address | undefined;
        if (selectedPlace?.address_components) {
            addressData = parseAddressComponents(selectedPlace.address_components);
            if (selectedPlace.geometry?.location) {
                addressData.lat = selectedPlace.geometry.location.lat();
                addressData.lng = selectedPlace.geometry.location.lng();
            }
        }
        
        const discoveryFormValues = discoveryForm.getValues();
        const scoredDiscoveryData = calculateScoreAndRouting(discoveryFormValues);
    
        if (editingNote) {
            try {
                await updateVisitNote(editingNote.id, {
                    content: rawNote,
                    companyName: selectedPlace?.name,
                    address: addressData,
                    websiteUrl: selectedPlace?.website,
                    googlePlaceId: selectedPlace?.place_id,
                    outcome: { type: outcomeType, details: detailsObject },
                    discoveryData: scoredDiscoveryData,
                    imageUrls: images,
                });
                toast({ title: 'Success', description: 'Your visit note has been updated.' });
                router.push('/visit-notes');
            } catch (error) {
                console.error('Failed to update visit note:', error);
                toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update your visit note.' });
            } finally {
                setIsSubmitting(false);
            }
            return;
        }


        try {
            await addVisitNote({
                content: rawNote,
                capturedBy: captureUser.displayName || 'Unknown User',
                capturedByUid: captureUser.uid,
                franchisee: captureUser.franchisee || undefined,
                imageUrls: images,
                googlePlaceId: selectedPlace?.place_id,
                companyName: selectedPlace?.name,
                address: addressData,
                websiteUrl: selectedPlace?.website,
                outcome: {
                    type: outcomeType,
                    details: detailsObject,
                },
                discoveryData: scoredDiscoveryData,
            });

            const discoveryAnswers = Object.entries(scoredDiscoveryData)
                .map(([key, value]) => {
                    if (!value || (Array.isArray(value) && value.length === 0)) return null;
                    const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
                    const formattedValue = Array.isArray(value) ? value.join(', ') : String(value);
                    return `${formattedKey}: ${formattedValue}`;
                })
                .filter(Boolean)
                .join('\n');

            const nsPayload = {
                capturedBy: captureUser.displayName || 'Unknown User',
                outcome: outcomeType,
                companyName: selectedPlace?.name || 'Unknown Company',
                discoveryAnswers,
            };

            const nsResult = await sendVisitNoteToNetSuite(nsPayload);

            if (nsResult.success) {
                toast({ title: 'Success', description: 'Visit note submitted and synced with NetSuite. A notification will be sent to the Teams channel.' });
            } else {
                toast({
                    title: 'Partial Success',
                    description: `Visit note saved, but failed to sync with NetSuite. A Teams notification will still be sent. Error: ${nsResult.message}`,
                    variant: 'destructive',
                });
            }
            
            resetState();
        } catch (error) {
          console.error('Failed to submit visit note:', error);
          toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not save your visit note.' });
        } finally {
          setIsSubmitting(false);
        }
      };

    const handleNextStep = () => {
        window.scrollTo(0, 0);
        if (step === 'capture') {
            setNoteContent(captureForm.getValues('content'));
        }
        switch(step) {
            case 'search': setStep('discovery'); break;
            case 'discovery': setStep('capture'); break;
            case 'capture': setStep('outcome'); break;
            case 'outcome': setStep('summary'); break;
            default: break;
        }
    }
    const handlePreviousStep = () => {
        window.scrollTo(0, 0);
        switch(step) {
            case 'discovery': setStep('search'); break;
            case 'capture': setStep('discovery'); break;
            case 'outcome': setStep('capture'); break;
            case 'summary': setStep('outcome'); break;
            default: setStep('search'); break;
        }
    }

    const handleStepClick = (stepNumber: number) => {
        window.scrollTo(0, 0);
        if (step === 'capture' && stepNumber !== 3) {
            setNoteContent(captureForm.getValues('content'));
        }
        if (stepNumber === 1) setStep('search');
        else if (stepNumber === 2) setStep('discovery');
        else if (stepNumber === 3) setStep('capture');
        else if (stepNumber === 4) setStep('outcome');
        else if (stepNumber === 5) setStep('summary');
    };

    const isFieldSalesRepWithLinkedRep = userProfile?.role === 'Field Sales' && userProfile.linkedSalesRep;
    
    if (isLoadingNote || !isLoaded) {
        return <div className="flex h-full items-center justify-center"><Loader /></div>;
    }

    return (
        <>
        <FormProvider {...discoveryForm}>
            <div className="flex flex-col gap-6 hide-scrollbar max-w-2xl mx-auto w-full">
                 <header>
                    <h1 className="text-3xl font-bold tracking-tight">Capture Visit</h1>
                    <p className="text-muted-foreground">Log your field sales visits and interactions.</p>
                </header>
                
                <div className="my-4">
                    <ResponsiveProgress currentStep={currentStepNumber} totalSteps={TOTAL_STEPS} labels={stepLabels} onStepClick={handleStepClick} />
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            {(step !== 'search' && step !== 'camera') && (
                                <Button variant="ghost" size="icon" onClick={handlePreviousStep} className="shrink-0">
                                    <ChevronLeft />
                                </Button>
                            )}
                            <div className="flex-grow">
                                <CardTitle>{stepLabels[currentStepNumber - 1]}</CardTitle>
                                <CardDescription>
                                    {step === 'search' ? 'Search for the business you visited, or capture a business card.' :
                                    step === 'discovery' ? 'Capture observable behaviour and decision context.' :
                                    step === 'capture' ? 'Record the details of your visit. Why is this a good lead? What are their pain points?' :
                                    step === 'camera' ? 'Take photos related to your visit.' :
                                    step === 'outcome' ? 'Choose the final outcome of your visit.' : 
                                    'Review the discovery analysis and submit.'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {step === 'search' ? (
                            <div className="py-4 space-y-4">
                                {isAdminOrLeadGen && (
                                    <div className="space-y-2">
                                        <Label>Assign to Field Sales Rep*</Label>
                                        <Select onValueChange={setSelectedFieldSalesRep} value={selectedFieldSalesRep}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a user..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {fieldSalesUsers.map(user => (
                                                    <SelectItem key={user.uid} value={user.uid}>
                                                        {user.displayName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="space-y-2 relative">
                                    <div className="flex gap-2">
                                        <Input
                                            id="visit-note-search"
                                            ref={searchInputCallbackRef}
                                            placeholder="Start typing..."
                                            value={searchQuery}
                                            onChange={handleInputChange}
                                        />
                                        <Button type="button" variant="outline" size="icon" onClick={() => { setPreviousStep('search'); setStep('camera'); }}><Camera className="h-4 w-4" /></Button>
                                        <Label htmlFor="image-upload" className={cn(buttonVariants({ variant: "outline", size: "icon" }), "cursor-pointer")}>
                                            <Upload className="h-4 w-4" />
                                            <span className="sr-only">Upload images</span>
                                        </Label>
                                        <Input id="image-upload" type="file" className="sr-only" accept="image/*" multiple onChange={handleImageUpload} />
                                    </div>
                                </div>
                                { (selectedPlace || images.length > 0) && (
                                    <div className="space-y-6 pt-4">
                                        {selectedPlace && (
                                            <div className="p-3 border rounded-md bg-secondary/50 text-sm">
                                                <p className="font-semibold">{selectedPlace.name}</p>
                                                <p className="text-muted-foreground">{selectedPlace.formatted_address}</p>
                                            </div>
                                        )}
                                        
                                        {images.length > 0 && (
                                            <div className="space-y-2">
                                                <Label>Captured Images</Label>
                                                <div className="flex gap-2 flex-wrap">
                                                    {images.map((img, index) => (
                                                        <div key={index} className="relative cursor-pointer group" onClick={() => window.open(img, '_blank')}>
                                                            <Image src={img} alt={`Captured image ${index + 1}`} width={100} height={60} className="rounded-md border object-cover transition-opacity group-hover:opacity-80" />
                                                            <Button 
                                                              variant="destructive" 
                                                              size="icon" 
                                                              className="absolute -top-1 -right-1 h-5 w-5" 
                                                              onClick={(e) => { e.stopPropagation(); handleDeleteImage(index); }}
                                                            >
                                                              <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <FormField
                                            control={control}
                                            name="businessType"
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Business Type</FormLabel>
                                                <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Retail" /></FormControl><FormLabel className="font-normal">Retail</FormLabel></FormItem>
                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="B2B" /></FormControl><FormLabel className="font-normal">B2B</FormLabel></FormItem>
                                                </RadioGroup>
                                                </FormControl>
                                            </FormItem>
                                            )}
                                        />
                                        
                                        <Card>
                                            <CardHeader><CardTitle>Person Spoken With</CardTitle></CardHeader>
                                            <CardContent className="space-y-4">
                                                <FormField control={control} name="personSpokenWithName" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={control} name="personSpokenWithTitle" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Manager" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={control} name="personSpokenWithEmail" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="jane@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={control} name="personSpokenWithPhone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" placeholder="0400 123 456" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={control} name="personSpokenWithTags" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Role</FormLabel>
                                                        <MultiSelectCombobox options={contactTagOptions} selected={field.value || []} onSelectedChange={field.onChange} placeholder="Select roles..." />
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </CardContent>
                                        </Card>

                                        {showDecisionMakerFields && (
                                            <Card>
                                                <CardHeader><CardTitle>Decision Maker Details</CardTitle><CardDescription>Since you didn't speak to the decision maker, add their details if you have them.</CardDescription></CardHeader>
                                                <CardContent className="space-y-4">
                                                    <FormField control={control} name="decisionMakerName" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="John Smith" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                    <FormField control={control} name="decisionMakerTitle" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Owner" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                    <FormField control={control} name="decisionMakerEmail" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                    <FormField control={control} name="decisionMakerPhone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" placeholder="0411 987 654" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>
                                )}
                                <div className="flex justify-end pt-4">
                                    <Button onClick={handleNextStep} disabled={!selectedPlace && images.length === 0}>Next</Button>
                                </div>
                            </div>
                        ) : step === 'discovery' ? (
                            <FieldDiscoveryStep onNext={handleNextStep} onBack={handlePreviousStep} />
                        ) : step === 'capture' ? (
                            <FormProvider {...captureForm}>
                                <div className="space-y-4">
                                    {selectedPlace && (
                                        <div className="p-3 border rounded-md bg-secondary/50 text-sm">
                                            <p className="font-semibold">{selectedPlace.name}</p>
                                            <p className="text-muted-foreground">{selectedPlace.formatted_address}</p>
                                        </div>
                                    )}
                                     {images.length > 0 && (
                                        <div className="space-y-2">
                                            <Label>Captured Images</Label>
                                            <div className="flex gap-2 flex-wrap items-center">
                                                {images.map((img, index) => (
                                                    <div key={index} className="relative cursor-pointer group" onClick={() => window.open(img, '_blank')}>
                                                        <Image src={img} alt={`Captured image ${index + 1}`} width={100} height={60} className="rounded-md border object-cover transition-opacity group-hover:opacity-80" />
                                                        <Button 
                                                          variant="destructive" 
                                                          size="icon" 
                                                          className="absolute -top-1 -right-1 h-5 w-5" 
                                                          onClick={(e) => { e.stopPropagation(); handleDeleteImage(index); }}
                                                        >
                                                          <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <FormField
                                    control={captureForm.control}
                                    name="content"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormControl>
                                            <div className="relative">
                                                <Textarea placeholder="Why is this a good lead? What are their pain points? e.g. 'Good lead, they send 20 parcels/week and are unhappy with their current courier. Interested in a free trial.'" {...field} rows={10} />
                                                <div className="absolute bottom-2 right-2 flex gap-1">
                                                    <Label htmlFor="image-upload-capture" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "cursor-pointer")}>
                                                        <Upload />
                                                        <span className="sr-only">Upload images</span>
                                                    </Label>
                                                    <Input id="image-upload-capture" type="file" className="sr-only" accept="image/*" multiple onChange={handleImageUpload} />
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => { setPreviousStep('capture'); setStep('camera'); }}><Camera /></Button>
                                                    <Button type="button" variant="ghost" size="icon" onClick={handleToggleListening}>
                                                        {isListening ? <MicOff className="text-destructive animate-pulse" /> : <Mic />}
                                                        <span className="sr-only">{isListening ? 'Stop' : 'Start'} listening</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                    <div className="flex justify-between">
                                        <Button type="button" variant="outline" onClick={handlePreviousStep}>Back</Button>
                                        <Button type="button" onClick={handleNextStep}>Next</Button>
                                    </div>
                                </div>
                            </FormProvider>
                        ) : step === 'camera' ? (
                            <div className="space-y-4">
                                <div className="relative">
                                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                                </div>
                                {hasCameraPermission === false && (
                                    <Alert variant="destructive">
                                        <AlertTitle>Camera Access Required</AlertTitle>
                                        <AlertDescription>Please allow camera access in your browser settings.</AlertDescription>
                                    </Alert>
                                )}
                                <div className="flex gap-2">
                                    <Button onClick={handleCaptureImage} className="w-full" disabled={!hasCameraPermission}>
                                        <Camera className="mr-2 h-4 w-4" /> Capture Image
                                    </Button>
                                    <Button variant="outline" onClick={() => setStep(previousStep)}>Cancel</Button>
                                </div>
                            </div>
                        ) : step === 'summary' ? (
                            <SummaryStep
                                discoveryData={discoveryForm.getValues()}
                                onSubmit={handleFinalSubmit}
                                onBack={handlePreviousStep}
                                isSubmitting={isSubmitting}
                             />
                        ) : (
                            <div className="space-y-4">
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger>Appointment Qualified</AccordionTrigger>
                                        <AccordionContent className="space-y-4 pt-2">
                                            {isFieldSalesRepWithLinkedRep ? (
                                                <p className="text-sm p-2 text-center bg-secondary rounded-md">Will be assigned to linked rep: <strong>{userProfile.linkedSalesRep}</strong></p>
                                            ) : (
                                                <RadioGroup onValueChange={(rep) => setOutcomeData({ type: 'Appointment Qualified', details: { salesRep: rep } })}>
                                                    {salesReps.map(rep => (
                                                        <div key={rep.name} className="flex items-center space-x-2">
                                                            <RadioGroupItem value={rep.name} id={`rep-${rep.name}`} />
                                                            <Label htmlFor={`rep-${rep.name}`}>{rep.name}</Label>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            )}
                                            <Button 
                                                className="w-full bg-green-600 hover:bg-green-700" 
                                                disabled={!isFieldSalesRepWithLinkedRep && outcomeData?.type !== 'Appointment Qualified'}
                                                onClick={() => {
                                                    if (isFieldSalesRepWithLinkedRep && userProfile.linkedSalesRep) {
                                                        setOutcomeData({ type: 'Appointment Qualified', details: { salesRep: userProfile.linkedSalesRep } });
                                                    }
                                                    handleNextStep();
                                                }}>
                                                Next
                                            </Button>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-quote-trial">
                                        <AccordionTrigger>Send Quote / Free Trial</AccordionTrigger>
                                        <AccordionContent className="space-y-4 pt-2">
                                             {isFieldSalesRepWithLinkedRep ? (
                                                    <p className="text-sm p-2 text-center bg-secondary rounded-md">Will be assigned to linked rep: <strong>{userProfile.linkedSalesRep}</strong></p>
                                                ) : (
                                                <RadioGroup onValueChange={(rep) => setOutcomeData({ type: 'Send Quote / Free Trial', details: { salesRep: rep } })}>
                                                    {salesReps.map(rep => (
                                                        <div key={`qt-${rep.name}`} className="flex items-center space-x-2">
                                                            <RadioGroupItem value={rep.name} id={`qt-${rep.name}`} />
                                                            <Label htmlFor={`qt-${rep.name}`}>{rep.name}</Label>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            )}
                                            <Button 
                                                className="w-full"
                                                disabled={!isFieldSalesRepWithLinkedRep && outcomeData?.type !== 'Send Quote / Free Trial'}
                                                onClick={() => {
                                                    if (isFieldSalesRepWithLinkedRep && userProfile.linkedSalesRep) {
                                                        setOutcomeData({ type: 'Send Quote / Free Trial', details: { salesRep: userProfile.linkedSalesRep } });
                                                    }
                                                    handleNextStep();
                                                }}>
                                                Next
                                            </Button>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-5">
                                        <AccordionTrigger>Sign Up</AccordionTrigger>
                                        <AccordionContent className="space-y-4 pt-2">
                                             {isFieldSalesRepWithLinkedRep ? (
                                                    <p className="text-sm p-2 text-center bg-secondary rounded-md">Will be assigned to linked rep: <strong>{userProfile.linkedSalesRep}</strong></p>
                                                ) : (
                                                <RadioGroup onValueChange={(rep) => setOutcomeData({ type: 'Sign Up', details: { salesRep: rep } })}>
                                                    {salesReps.map(rep => (
                                                        <div key={`su-${rep.name}`} className="flex items-center space-x-2">
                                                            <RadioGroupItem value={rep.name} id={`su-${rep.name}`} />
                                                            <Label htmlFor={`su-${rep.name}`}>{rep.name}</Label>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            )}
                                            <Button 
                                                className="w-full"
                                                disabled={!isFieldSalesRepWithLinkedRep && outcomeData?.type !== 'Sign Up'}
                                                onClick={() => {
                                                    if (isFieldSalesRepWithLinkedRep && userProfile.linkedSalesRep) {
                                                        setOutcomeData({ type: 'Sign Up', details: { salesRep: userProfile.linkedSalesRep } });
                                                    }
                                                    handleNextStep();
                                                }}>
                                                Next
                                            </Button>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setOutcomeData({ type: 'Email Interested', details: {} }); handleNextStep(); }}>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Email Interested
                                    </Button>
                                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setOutcomeData({ type: 'Upsell', details: {} }); handleNextStep(); }}>
                                        <TrendingUp className="mr-2 h-4 w-4" />
                                        Upsell
                                    </Button>
                                    <Button className="w-full bg-slate-500 hover:bg-slate-600 text-white" onClick={() => { setOutcomeData({ type: 'Email Brush Off', details: {} }); handleNextStep(); }}>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Email Brush Off
                                    </Button>
                                    <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={() => { setOutcomeData({ type: 'Needs Follow-up', details: {} }); handleNextStep(); }}>
                                        Needs Follow-up
                                    </Button>
                                     <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white" onClick={() => { setOutcomeData({ type: 'No Access/Contact', details: {} }); handleNextStep(); }}>
                                        No Access/Contact
                                    </Button>
                                    <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white" onClick={() => { setOutcomeData({ type: 'Not Interested', details: {} }); handleNextStep(); }}>
                                        Not Interested
                                    </Button>
                                </div>
                                <div className="flex justify-start pt-4">
                                    <Button type="button" variant="outline" onClick={handlePreviousStep}>Back</Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </FormProvider>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        </>
    );
}
