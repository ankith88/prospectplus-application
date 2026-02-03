
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import type { Address } from '@/lib/types';
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

const formSchema = z.object({
  content: z.string().min(10, 'Please provide more detail in your note.'),
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
const services = ["Pick up and Delivery from PO", "Outgoing Mail Lodgement", "Express Banking"];

const parseAddressComponents = (components: google.maps.GeocoderAddressComponent[]): Address => {
    const address: Partial<Address> = { country: 'Australia' };
    const get = (type: string, useShortName = false) => {
        const comp = components.find(c => c.types.includes(type));
        return useShortName ? comp?.short_name : comp?.long_name;
    };
    const streetNumber = get('street_number');
    const route = get('route');
    address.street = `${streetNumber || ''} ${route || ''}`.trim();
    address.address1 = get('subpremise');
    address.city = get('locality') || get('postal_town');
    address.state = get('administrative_area_level_1', true);
    address.zip = get('postal_code');
    return address as Address;
};


export function VisitNoteDialog({ isOpen, onOpenChange }: VisitNoteDialogProps) {
  const [step, setStep] = useState<'search' | 'capture' | 'outcome' | 'camera'>('search');
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
  const [quoteType, setQuoteType] = useState<'Products' | 'Services' | ''>('');
  const [quoteServices, setQuoteServices] = useState<string[]>([]);
  const [trialRep, setTrialRep] = useState('');
  const [trialType, setTrialType] = useState<'ShipMate' | 'Services' | ''>('');
  const [trialServices, setTrialServices] = useState<string[]>([]);
  const [signUpRep, setSignUpRep] = useState('');
  const [signUpShipMate, setSignUpShipMate] = useState(false);
  const [signUpServices, setSignUpServices] = useState<string[]>([]);
  
  // Camera state
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duplicateLeadId, setDuplicateLeadId] = useState<string | null>(null);

  const { toast } = useToast();
  const { userProfile } = useAuth();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { content: '' },
  });

  const resetState = () => {
    form.reset();
    setStep('search');
    setNoteContent('');
    setIsSubmitting(false);
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setAppointmentRep('');
    setQuoteRep('');
    setQuoteType('');
    setQuoteServices([]);
    setTrialRep('');
    setTrialType('');
    setTrialServices([]);
    setSignUpRep('');
    setSignUpShipMate(false);
    setSignUpServices([]);
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
        form.setValue('content', (form.getValues('content') + ' ' + finalTranscript).trim());
      }
    };
    recognition.onerror = (event: any) => {
      toast({ variant: 'destructive', title: 'Speech Recognition Error', description: event.error });
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    return () => recognitionRef.current?.stop();
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
        fields: ['name', 'formatted_address', 'address_components', 'geometry', 'place_id'],
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
        outcome: {
          type: outcomeType,
          details: detailsObject,
        },
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
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-4">
               {step !== 'search' && (
                  <Button variant="ghost" size="icon" onClick={() => setStep(step === 'capture' ? 'search' : 'capture')} className="shrink-0">
                      <ChevronLeft />
                  </Button>
              )}
              <div className="flex-grow">
                  <DialogTitle>
                      {step === 'search' ? 'Find Business'
                       : step === 'capture' ? 'Capture Visit Note'
                       : step === 'camera' ? 'Scan Business Card'
                       : 'Select Visit Outcome'}
                  </DialogTitle>
                  <DialogDescription>
                      {step === 'search'
                      ? 'Search for the business you visited.'
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
               <DialogFooter>
                  <Button onClick={() => setStep('capture')} disabled={!selectedPlace}>Next</Button>
              </DialogFooter>
            </div>
          ) : step === 'capture' ? (
              <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCaptureSubmit)} className="space-y-4">
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
                  control={form.control}
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
                      <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                      <Button type="submit">Next</Button>
                  </DialogFooter>
              </form>
              </Form>
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
                      <AccordionTrigger>Schedule Appointment</AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                          <RadioGroup onValueChange={setAppointmentRep} value={appointmentRep}>
                              {salesReps.map(rep => (
                                  <div key={rep.name} className="flex items-center space-x-2">
                                      <RadioGroupItem value={rep.name} id={`rep-${rep.name}`} />
                                      <Label htmlFor={`rep-${rep.name}`}>{rep.name}</Label>
                                  </div>
                              ))}
                          </RadioGroup>
                          <Button className="w-full" disabled={!appointmentRep || isSubmitting} onClick={() => handleFinalSubmit('Schedule Appointment', { salesRep: appointmentRep })}>
                             {isSubmitting ? <Loader /> : 'Submit'}
                          </Button>
                      </AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="item-2">
                      <AccordionTrigger>Move to Outbound</AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                          <p className="text-sm text-muted-foreground">This lead will be marked for the Outbound team (Lachlan or Grant).</p>
                          <Button className="w-full" disabled={isSubmitting} onClick={() => handleFinalSubmit('Move to Outbound', {})}>
                             {isSubmitting ? <Loader /> : 'Confirm & Submit'}
                          </Button>
                      </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                      <AccordionTrigger>Send Quote</AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                          <div className="space-y-2">
                              <Label>Assign to Sales Rep</Label>
                              <RadioGroup onValueChange={setQuoteRep} value={quoteRep}>{salesReps.map(rep => (<div key={`q-${rep.name}`} className="flex items-center space-x-2"><RadioGroupItem value={rep.name} id={`q-${rep.name}`} /><Label htmlFor={`q-${rep.name}`}>{rep.name}</Label></div>))}</RadioGroup>
                          </div>
                          <div className="space-y-2">
                              <Label>Quote For</Label>
                              <RadioGroup onValueChange={(v) => setQuoteType(v as any)} value={quoteType}><div className="flex items-center space-x-2"><RadioGroupItem value="Products" id="q-prod" /><Label htmlFor="q-prod">Products</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Services" id="q-serv" /><Label htmlFor="q-serv">Services</Label></div></RadioGroup>
                          </div>
                          {quoteType === 'Services' && <div className="space-y-2 pl-4">{services.map(s => (<div key={s} className="flex items-center space-x-2"><Checkbox id={`qs-${s}`} checked={quoteServices.includes(s)} onCheckedChange={checked => setQuoteServices(prev => checked ? [...prev, s] : prev.filter(ps => ps !== s))} /><Label htmlFor={`qs-${s}`}>{s}</Label></div>))}</div>}
                          <Button className="w-full" disabled={!quoteRep || !quoteType || isSubmitting} onClick={() => handleFinalSubmit('Send Quote', { salesRep: quoteRep, quoteFor: quoteType, services: quoteServices })}>
                             {isSubmitting ? <Loader /> : 'Submit'}
                          </Button>
                      </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-4">
                      <AccordionTrigger>Free Trial</AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                           <div className="space-y-2">
                              <Label>Assign to Sales Rep</Label>
                              <RadioGroup onValueChange={setTrialRep} value={trialRep}>{salesReps.map(rep => (<div key={`t-${rep.name}`} className="flex items-center space-x-2"><RadioGroupItem value={rep.name} id={`t-${rep.name}`} /><Label htmlFor={`t-${rep.name}`}>{rep.name}</Label></div>))}</RadioGroup>
                          </div>
                          <div className="space-y-2">
                              <Label>Trial For</Label>
                              <RadioGroup onValueChange={(v) => setTrialType(v as any)} value={trialType}><div className="flex items-center space-x-2"><RadioGroupItem value="ShipMate" id="t-ship" /><Label htmlFor="t-ship">ShipMate</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Services" id="t-serv" /><Label htmlFor="t-serv">Services</Label></div></RadioGroup>
                          </div>
                          {trialType === 'Services' && <div className="space-y-2 pl-4">{services.map(s => (<div key={s} className="flex items-center space-x-2"><Checkbox id={`ts-${s}`} checked={trialServices.includes(s)} onCheckedChange={checked => setTrialServices(prev => checked ? [...prev, s] : prev.filter(ps => ps !== s))} /><Label htmlFor={`ts-${s}`}>{s}</Label></div>))}</div>}
                          <Button className="w-full" disabled={!trialRep || !trialType || isSubmitting} onClick={() => handleFinalSubmit('Free Trial', { salesRep: trialRep, trialFor: trialType, services: trialServices })}>
                             {isSubmitting ? <Loader /> : 'Submit'}
                          </Button>
                      </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-5">
                      <AccordionTrigger>Sign Up</AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                          <div className="space-y-2">
                              <Label>Assign to Sales Rep</Label>
                              <RadioGroup onValueChange={setSignUpRep} value={signUpRep}>{salesReps.map(rep => (<div key={`su-${rep.name}`} className="flex items-center space-x-2"><RadioGroupItem value={rep.name} id={`su-${rep.name}`} /><Label htmlFor={`su-${rep.name}`}>{rep.name}</Label></div>))}</RadioGroup>
                          </div>
                          <div className="space-y-2">
                              <div className="flex items-center space-x-2"><Checkbox id="su-ship" checked={signUpShipMate} onCheckedChange={v => setSignUpShipMate(!!v)} /><Label htmlFor="su-ship">Needs ShipMate Access</Label></div>
                          </div>
                           <div className="space-y-2">
                               <Label>Services Required</Label>
                               <div className="space-y-2 pl-4">{services.map(s => (<div key={s} className="flex items-center space-x-2"><Checkbox id={`sus-${s}`} checked={signUpServices.includes(s)} onCheckedChange={checked => setSignUpServices(prev => checked ? [...prev, s] : prev.filter(ps => ps !== s))} /><Label htmlFor={`sus-${s}`}>{s}</Label></div>))}</div>
                          </div>
                          <Button className="w-full" disabled={!signUpRep || isSubmitting} onClick={() => handleFinalSubmit('Sign Up', { salesRep: signUpRep, needsShipmateAccess: signUpShipMate, services: signUpServices })}>
                             {isSubmitting ? <Loader /> : 'Submit'}
                          </Button>
                      </AccordionContent>
                  </AccordionItem>
              </Accordion>
              <DialogFooter>
                   <Button variant="outline" onClick={() => setStep('capture')}>Back to Note</Button>
              </DialogFooter>
          </div>
          )}
        </DialogContent>
      </Dialog>
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
