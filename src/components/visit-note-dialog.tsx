
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from './ui/loader';
import { Mic, MicOff, ChevronLeft, Camera, Search } from 'lucide-react';
import { addVisitNote } from '@/services/firebase';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import Image from 'next/image';
import type { Address, CheckinQuestion } from '@/lib/types';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { useRouter } from 'next/navigation';
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
import { ScrollArea } from './ui/scroll-area';
import { analyzeVisitNote, VisitNoteAnalysis } from '@/ai/flows/analyze-visit-note';
import { createNewLead, checkForDuplicateLead } from '@/services/firebase';


const formSchema = z.object({
  content: z.string().min(10, 'Please provide more detail in your note.'),
});

const checkinSchema = z.object({
  auspostRelationship: z.enum(['Yes', 'No']).optional(),
  auspostUsage: z.string().optional(),
  auspostPaidService: z.enum(['Yes', 'No']).optional(),
  auspostLodge: z.array(z.string()).optional(),
  otherCouriers: z.enum(['Yes', 'No']).optional(),
  otherCouriersList: z.array(z.string()).optional(),
  localDeliveries: z.enum(['Yes', 'No']).optional(),
  peopleLeaveOffice: z.enum(['Yes', 'No']).optional(),
  reasonsToLeave: z.array(z.string()).optional(),
});

interface VisitNoteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const salesReps = [
    { name: 'Lee Russell', url: 'https://calendly.com/lee-russell-mailplus/mailplus-intro-call-lee' },
    { name: 'Luke Forbes', url: 'https://calendly.com/luke-forbes-mailplus/mailplus-intro-call-luke' },
    { name: 'Kerina Helliwell', url: 'https://calendly.com/kerina-helliwell-mailplus/mailplus-intro-call-kerina' },
];

const couriers = ["TGE (upto 5kg)", "StarTrack (upto 5kg)", "TNT (upto 5kg)", "Couriers Please/Aramex (100+ items/week)"];
const reasonsToLeave = ["Banking", "Local Same Day"];

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
    address.state = get('administrative_area_level_1', true);
    address.zip = get('postal_code');
    return address as Address;
};


export function VisitNoteDialog({ isOpen, onOpenChange }: VisitNoteDialogProps) {
  const [step, setStep] = useState<'search' | 'checkin' | 'capture' | 'outcome' | 'camera'>('search');
  const [noteContent, setNoteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  // Outcome details state
  const [appointmentRep, setAppointmentRep] = useState('');
  const [quoteRep, setQuoteRep] = useState('');
  const [signUpRep, setSignUpRep] = useState('');
  
  // Camera state
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duplicateLeadId, setDuplicateLeadId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { toast } = useToast();
  const { userProfile } = useAuth();
  const router = useRouter();

  const captureForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { content: '' },
  });

  const checkinForm = useForm<Partial<z.infer<typeof checkinSchema>>>({
    resolver: zodResolver(checkinSchema.partial()),
  });

  const resetState = () => {
    captureForm.reset();
    checkinForm.reset();
    setStep('search');
    setNoteContent('');
    setIsSubmitting(false);
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setAppointmentRep('');
    setQuoteRep('');
    setSignUpRep('');
    setFrontImage(null);
    setBackImage(null);
    setHasCameraPermission(null);
    setSelectedPlace(null);
    setSearchQuery('');
    setPredictions([]);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
  };
  
  useEffect(() => {
    if (isOpen && window.google && !autocompleteService.current) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
    }
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);


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
        setStep('capture');
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
  }, [step, toast]);


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
  
   const fetchPredictions = useCallback((input: string) => {
    if (autocompleteService.current && input) {
        autocompleteService.current.getPlacePredictions(
            { input, componentRestrictions: { country: 'au' } },
            (preds, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && preds) {
                    setPredictions(preds);
                } else {
                    setPredictions([]);
                }
            }
        );
    } else {
        setPredictions([]);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);
      setSelectedPlace(null);
      fetchPredictions(value);
  };
  
  const handlePredictionSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    placesService.current?.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['name', 'formatted_address', 'address_components', 'geometry', 'place_id', 'website'],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          setSelectedPlace(place);
          setSearchQuery(place.name || '');
          setPredictions([]);
        }
      }
    );
  };

  const handleCaptureSubmit = (values: z.infer<typeof formSchema>) => {
    setNoteContent(values.content);
    setStep('outcome');
  };
  
  const handleCaptureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    context?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');

    if (!frontImage) {
        setFrontImage(dataUrl);
    } else {
        setBackImage(dataUrl);
        setStep('capture'); // Go back to note after capturing back
    }
  };


  const handleAnalyze = (front: string | null, back: string | null) => {
    setStep('capture');
    setIsAnalyzing(true);
    analyzeVisitNote({ frontImageDataUri: front || undefined, backImageDataUri: back || undefined })
      .then(result => {
        if (result.companyName) {
            let fullSearchQuery = result.companyName;
            if (result.address) {
              fullSearchQuery += `, ${result.address}`;
            }
            setSearchQuery(fullSearchQuery);
            fetchPredictions(fullSearchQuery);

            toast({
              title: 'Card Analyzed',
              description: 'Business details populated. Please select from the dropdown to confirm.',
            });
        } else {
          toast({ variant: 'destructive', title: 'Analysis Failed', description: 'Could not find a company name on the card.' });
        }
      })
      .catch(err => {
        console.error("Analysis failed:", err);
        toast({ variant: 'destructive', title: 'Analysis Error', description: 'Could not analyze the business card.' });
      })
      .finally(() => {
        setIsAnalyzing(false);
      });
  };

  const handleCaptureBackAndAnalyze = () => {
    const image = handleCapture();
    if (image) {
      handleAnalyze(frontImage, image);
    }
  };

  const handleSkipAndAnalyze = () => {
    handleAnalyze(frontImage, null);
  };
  
  const handleFinalSubmit = async (outcomeType: string, detailsObject: Record<string, any>) => {
    if (!userProfile) {
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
        
    const fullNote = `${noteContent}\n\n---\nOutcome: ${outcomeType}\n${detailsString}`;

    let addressData: Address | undefined;
    if (selectedPlace?.address_components) {
        addressData = parseAddressComponents(selectedPlace.address_components);
        if (selectedPlace.geometry?.location) {
            addressData.lat = selectedPlace.geometry.location.lat();
            addressData.lng = selectedPlace.geometry.location.lng();
        }
    }
    
    const checkinFormValues = checkinForm.getValues();
    const checkinQuestionsToSave: CheckinQuestion[] = [];
    Object.entries(checkinFormValues).forEach(([key, value]) => {
        if(value === undefined || value === null) return;
        let question = "";
        switch(key) {
            case 'auspostRelationship': question = "Do you have a relationship with Australia Post?"; break;
            case 'auspostUsage': question = "What do you use them for?"; break;
            case 'auspostPaidService': question = "Do you pay for the service?"; break;
            case 'auspostLodge': question = "Do you drop it off or do they come here?"; break;
            case 'otherCouriers': question = "Do you use any other couriers?"; break;
            case 'otherCouriersList': question = "Which Courier do you use?"; break;
            case 'localDeliveries': question = "Do you have any need for local same-day deliveries?"; break;
            case 'peopleLeaveOffice': question = "Do people leave the office during the day?"; break;
            case 'reasonsToLeave': question = "What are the reasons people leave the office?"; break;
        }
        if(question) {
            checkinQuestionsToSave.push({ question, answer: value as string | string[]});
        }
    });

    try {
      await addVisitNote({
        content: fullNote,
        capturedBy: userProfile.displayName || 'Unknown User',
        capturedByUid: userProfile.uid,
        frontImageDataUri: frontImage || undefined,
        backImageDataUri: backImage || undefined,
        googlePlaceId: selectedPlace?.place_id,
        companyName: selectedPlace?.name,
        address: addressData,
        websiteUrl: selectedPlace?.website,
        outcome: {
          type: outcomeType,
          details: detailsObject,
        },
        checkinQuestions: checkinQuestionsToSave,
      });
      toast({ title: 'Success', description: 'Your visit note has been submitted.' });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit visit note:', error);
      toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not save your visit note.' });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <>
      <FormProvider {...checkinForm}>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-4">
                 {(step !== 'search') && (
                    <Button variant="ghost" size="icon" onClick={() => setStep(step === 'checkin' ? 'search' : 'checkin')} className="shrink-0">
                        <ChevronLeft />
                    </Button>
                )}
                <div className="flex-grow">
                    <DialogTitle>
                        {step === 'search' ? 'Find Business'
                         : step === 'checkin' ? 'Check-in Questions'
                         : step === 'capture' ? 'Capture Visit Note'
                         : step === 'camera' ? 'Scan Business Card'
                         : 'Select Visit Outcome'}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'search'
                        ? 'Search for the business you visited.'
                        : step === 'checkin'
                        ? 'Answer a few quick questions about the business.'
                        : step === 'capture'
                        ? 'Record the details of your visit for the Lead Gen team.'
                        : step === 'camera'
                        ? 'Take a photo of the front and back of the business card.'
                        : 'Choose the final outcome of your visit.'}
                    </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            {step === 'search' ? (
              <div className="py-4 space-y-4">
                <div className="space-y-2 relative">
                    <Label htmlFor="visit-note-search">Search Business Name or Address</Label>
                     <div className="flex gap-2">
                        <Input 
                            id="visit-note-search" 
                            placeholder="Start typing..."
                            value={searchQuery}
                            onChange={handleInputChange}
                        />
                    </div>
                    {predictions.length > 0 && (
                        <Card className="absolute z-50 w-full mt-1">
                            <CardContent className="p-1">
                                {predictions.map((prediction) => (
                                    <div
                                        key={prediction.place_id}
                                        className="p-2 hover:bg-accent rounded-md cursor-pointer text-sm"
                                        onClick={() => handlePredictionSelect(prediction)}
                                    >
                                        {prediction.description}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
                 {selectedPlace && (
                      <div className="p-3 border rounded-md bg-secondary/50 text-sm">
                          <p className="font-semibold">{selectedPlace.name}</p>
                          <p className="text-muted-foreground">{selectedPlace.formatted_address}</p>
                      </div>
                  )}
                 <DialogFooter>
                    <Button onClick={() => setStep('checkin')} disabled={!selectedPlace}>Next</Button>
                </DialogFooter>
              </div>
            ) : step === 'checkin' ? (
                <form onSubmit={checkinForm.handleSubmit(() => setStep('capture'))}>
                    <ScrollArea className="max-h-[60vh] -mx-6 px-6">
                        <div className="py-4 space-y-4">
                            <Accordion type="single" collapsible defaultValue="auspost" className="w-full">
                                <AccordionItem value="auspost">
                                    <AccordionTrigger>Australia Post</AccordionTrigger>
                                    <AccordionContent className="space-y-6 pt-4">
                                         <FormField control={checkinForm.control} name="auspostRelationship" render={({ field }) => (<FormItem><FormLabel>Relationship with AusPost?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2"><RadioGroupItem value="Yes" /><Label>Yes</Label></FormItem><FormItem className="flex items-center space-x-2"><RadioGroupItem value="No" /><Label>No</Label></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                         <FormField control={checkinForm.control} name="auspostPaidService" render={({ field }) => (<FormItem><FormLabel>Do they pay for service?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2"><RadioGroupItem value="Yes" /><Label>Yes</Label></FormItem><FormItem className="flex items-center space-x-2"><RadioGroupItem value="No" /><Label>No</Label></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                         <FormField control={checkinForm.control} name="auspostLodge" render={({ field }) => (<FormItem><FormLabel>How do they lodge?</FormLabel><div className="flex gap-4"><Checkbox id="dropoff" checked={field.value?.includes('Drop-off')} onCheckedChange={checked => field.onChange(checked ? [...(field.value || []), 'Drop-off'] : field.value?.filter(v => v !== 'Drop-off'))} /><Label htmlFor="dropoff">Drop-off</Label><Checkbox id="collect" checked={field.value?.includes('They collect')} onCheckedChange={checked => field.onChange(checked ? [...(field.value || []), 'They collect'] : field.value?.filter(v => v !== 'They collect'))} /><Label htmlFor="collect">They collect</Label></div><FormMessage /></FormItem>)}/>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="couriers">
                                    <AccordionTrigger>Other Couriers</AccordionTrigger>
                                    <AccordionContent className="space-y-6 pt-4">
                                        <FormField control={checkinForm.control} name="otherCouriers" render={({ field }) => (<FormItem><FormLabel>Use other couriers?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2"><RadioGroupItem value="Yes" /><Label>Yes</Label></FormItem><FormItem className="flex items-center space-x-2"><RadioGroupItem value="No" /><Label>No</Label></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={checkinForm.control} name="otherCouriersList" render={() => (<FormItem><FormLabel>Which ones?</FormLabel><div className="grid grid-cols-2 gap-2">{couriers.map(c => <FormField key={c} control={checkinForm.control} name="otherCouriersList" render={({ field }) => (<FormItem className="flex items-center space-x-2"><Checkbox checked={field.value?.includes(c)} onCheckedChange={checked => field.onChange(checked ? [...(field.value || []), c] : field.value?.filter(v => v !== c))} /><Label>{c}</Label></FormItem>)} />)}</div><FormMessage /></FormItem>)}/>
                                        <FormField control={checkinForm.control} name="localDeliveries" render={({ field }) => (<FormItem><FormLabel>Need local same-day?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2"><RadioGroupItem value="Yes" /><Label>Yes</Label></FormItem><FormItem className="flex items-center space-x-2"><RadioGroupItem value="No" /><Label>No</Label></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="errands">
                                    <AccordionTrigger>Office Errands</AccordionTrigger>
                                    <AccordionContent className="space-y-6 pt-4">
                                         <FormField control={checkinForm.control} name="peopleLeaveOffice" render={({ field }) => (<FormItem><FormLabel>Do people leave the office?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2"><RadioGroupItem value="Yes" /><Label>Yes</Label></FormItem><FormItem className="flex items-center space-x-2"><RadioGroupItem value="No" /><Label>No</Label></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                         <FormField control={checkinForm.control} name="reasonsToLeave" render={() => (<FormItem><FormLabel>What for?</FormLabel><div className="grid grid-cols-2 gap-2">{reasonsToLeave.map(r => <FormField key={r} control={checkinForm.control} name="reasonsToLeave" render={({ field }) => (<FormItem className="flex items-center space-x-2"><Checkbox checked={field.value?.includes(r)} onCheckedChange={checked => field.onChange(checked ? [...(field.value || []), r] : field.value?.filter(v => v !== r))} /><Label>{r}</Label></FormItem>)} />)}</div><FormMessage /></FormItem>)}/>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setStep('search')}>Back</Button>
                        <Button type="submit">Next</Button>
                    </DialogFooter>
                </form>
            ) : step === 'capture' ? (
              <FormProvider {...captureForm}>
                <form onSubmit={captureForm.handleSubmit(handleCaptureSubmit)} className="space-y-4">
                     {selectedPlace && (
                        <div className="p-3 border rounded-md bg-secondary/50 text-sm">
                            <p className="font-semibold">{selectedPlace.name}</p>
                            <p className="text-muted-foreground">{selectedPlace.formatted_address}</p>
                        </div>
                    )}
                    <p className="text-sm text-muted-foreground p-2 bg-secondary rounded-md">
                        <b>Prompt:</b> Why did the lead qualify for an appointment or why were they interested?
                    </p>
                    <FormField
                    control={captureForm.control}
                    name="content"
                    render={({ field }) => (
                        <FormItem>
                        <FormControl>
                            <div className="relative">
                                <Textarea placeholder="Start typing or use the mic to dictate..." {...field} rows={10} />
                                 <div className="absolute bottom-2 right-2 flex gap-1">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => setStep('camera')}><Camera /></Button>
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
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setStep('checkin')}>Back</Button>
                        <Button type="submit">Next</Button>
                    </DialogFooter>
                </form>
              </FormProvider>
          ) : step === 'camera' ? (
               <div className="space-y-4">
                  <div className="relative">
                      <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                      <div className="absolute top-2 left-2 flex gap-2">
                          {frontImage && <Image src={frontImage} alt="Front" width={100} height={60} className="w-24 h-auto rounded-md border-2 border-white shadow-lg"/>}
                          {backImage && <Image src={backImage} alt="Back" width={100} height={60} className="w-24 h-auto rounded-md border-2 border-white shadow-lg"/>}
                      </div>
                  </div>
                  {hasCameraPermission === false && (
                      <Alert variant="destructive">
                          <AlertTitle>Camera Access Required</AlertTitle>
                          <AlertDescription>Please allow camera access in your browser settings.</AlertDescription>
                      </Alert>
                  )}
                  <div className="flex flex-col gap-2">
                      {!frontImage ? (
                          <Button onClick={handleCaptureImage} disabled={!hasCameraPermission}>Capture Front</Button>
                      ) : !backImage ? (
                          <Button onClick={handleCaptureImage} disabled={!hasCameraPermission}>Capture Back</Button>
                      ) : null}
                      <Button variant="outline" onClick={() => setStep('capture')}>Done</Button>
                  </div>
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>
          ) : (
            <div className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>Appointment Qualified</AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                            <RadioGroup onValueChange={setAppointmentRep} value={appointmentRep}>
                                {salesReps.map(rep => (
                                    <div key={rep.name} className="flex items-center space-x-2">
                                        <RadioGroupItem value={rep.name} id={`rep-${rep.name}`} />
                                        <Label htmlFor={`rep-${rep.name}`}>{rep.name}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                            <Button className="w-full bg-green-600 hover:bg-green-700" disabled={!appointmentRep || isSubmitting} onClick={() => handleFinalSubmit('Appointment Qualified', { salesRep: appointmentRep })}>
                                {isSubmitting ? <Loader /> : 'Submit'}
                            </Button>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-lpo">
                        <AccordionTrigger>LPO Referral</AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                            <p className="text-sm text-muted-foreground">This lead qualifies for an LPO Referral based on their high shipping volume with Couriers Please/Aramex.</p>
                            <Button className="w-full bg-purple-600 hover:bg-purple-700" disabled={isSubmitting} onClick={() => handleFinalSubmit('LPO Referral', {})}>
                                {isSubmitting ? <Loader /> : 'Submit as LPO Referral'}
                            </Button>
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="item-quote-trial">
                        <AccordionTrigger>Send Quote / Free Trial</AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <Label>Assign to Sales Rep</Label>
                                <RadioGroup onValueChange={setQuoteRep} value={quoteRep}>
                                    {salesReps.map(rep => (
                                        <div key={`qt-${rep.name}`} className="flex items-center space-x-2">
                                            <RadioGroupItem value={rep.name} id={`qt-${rep.name}`} />
                                            <Label htmlFor={`qt-${rep.name}`}>{rep.name}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                            <Button className="w-full" disabled={!quoteRep || isSubmitting} onClick={() => handleFinalSubmit('Send Quote / Free Trial', { salesRep: quoteRep })}>
                                {isSubmitting ? <Loader /> : 'Submit'}
                            </Button>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-5">
                        <AccordionTrigger>Sign Up</AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                             <div className="space-y-2">
                                <Label>Assign to Sales Rep</Label>
                                <RadioGroup onValueChange={setSignUpRep} value={signUpRep}>
                                    {salesReps.map(rep => (
                                        <div key={`su-${rep.name}`} className="flex items-center space-x-2">
                                            <RadioGroupItem value={rep.name} id={`su-${rep.name}`} />
                                            <Label htmlFor={`su-${rep.name}`}>{rep.name}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                            <Button className="w-full" disabled={!signUpRep || isSubmitting} onClick={() => handleFinalSubmit('Sign Up', { salesRep: signUpRep })}>
                                {isSubmitting ? <Loader /> : 'Submit'}
                            </Button>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    <Button className="w-full bg-amber-500 hover:bg-amber-600" disabled={isSubmitting} onClick={() => handleFinalSubmit('Needs Follow-up', {})}>
                        {isSubmitting ? <Loader /> : 'Needs Follow-up'}
                    </Button>
                     <Button className="w-full bg-amber-500 hover:bg-amber-600" disabled={isSubmitting} onClick={() => handleFinalSubmit('No Access/Contact', {})}>
                        {isSubmitting ? <Loader /> : 'No Access/Contact'}
                    </Button>
                    <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white" disabled={isSubmitting} onClick={() => handleFinalSubmit('Not Interested', {})}>
                        {isSubmitting ? <Loader /> : 'Not Interested'}
                    </Button>
                </div>
            </div>
          )}
          </DialogContent>
        </Dialog>
      </FormProvider>
      <AlertDialog open={!!duplicateLeadId} onOpenChange={() => setDuplicateLeadId(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Duplicate Found</AlertDialogTitle>
                  <AlertDialogDescription>
                      This business appears to already exist in your system.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDuplicateLeadId(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                      if (duplicateLeadId) {
                           router.push(`/leads/${duplicateLeadId}`);
                           onOpenChange(false);
                           setDuplicateLeadId(null);
                      }
                  }}>
                      View Existing Lead
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
