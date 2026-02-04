
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  FormDescription,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { Mic, MicOff, ChevronLeft, Camera, Search, CircleDot } from 'lucide-react';
import { addVisitNote } from '@/services/firebase';
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
import type { Address, CheckinQuestion } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { analyzeBusinessCard } from '@/ai/flows/analyze-business-card';
import { salesReps } from '@/lib/constants';

const noteSchema = z.object({
  content: z.string().min(10, 'Please provide more detail in your note.'),
});

const discoverySchema = z.object({
  discoverySignals: z.array(z.string()).optional(),
  decisionMakerStatus: z.enum(['Speaking to decision maker', 'Decision maker identified', 'Decision maker unknown']).optional(),
  inconvenience: z.enum(['Very inconvenient', 'Somewhat inconvenient', 'Not a big issue']).optional(),
  occurrence: z.enum(['Daily', 'Weekly', 'Ad-hoc']).optional(),
  recurring: z.enum(['Yes - predictable', 'Sometimes', 'One-off']).optional(),
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
    address.state = get('administrative_area_level_1', true);
    address.zip = get('postal_code');
    return address as Address;
};


export default function CaptureVisitPage() {
    const [step, setStep] = useState<'search' | 'discovery' | 'capture' | 'outcome' | 'camera'>('search');
    const [noteContent, setNoteContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesService = useRef<google.maps.places.PlacesService | null>(null);

    const [appointmentRep, setAppointmentRep] = useState('');
    const [quoteRep, setQuoteRep] = useState('');
    const [signUpRep, setSignUpRep] = useState('');
    
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [frontImage, setFrontImage] = useState<string | null>(null);
    const [backImage, setBackImage] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
  
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const router = useRouter();

    const captureForm = useForm<z.infer<typeof noteSchema>>({
        resolver: zodResolver(noteSchema),
        defaultValues: { content: '' },
    });

    const discoveryForm = useForm<z.infer<typeof discoverySchema>>({
        resolver: zodResolver(discoverySchema),
        defaultValues: {
            discoverySignals: [],
        },
    });
    
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
    }, [captureForm, discoveryForm, isListening]);
    
    useEffect(() => {
        if (window.google && !autocompleteService.current) {
            autocompleteService.current = new window.google.maps.places.AutocompleteService();
            placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
        }
    }, []);

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

    const handleCaptureSubmit = (values: z.infer<typeof noteSchema>) => {
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
            setStep('capture');
        }
        return dataUrl;
    };


    const handleAnalyze = (front: string | null, back: string | null) => {
        setStep('search');
        setIsAnalyzing(true);
        analyzeBusinessCard({ frontImageDataUri: front || undefined, backImageDataUri: back || undefined })
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
        const image = handleCaptureImage();
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
        
        const discoveryFormValues = discoveryForm.getValues();
        const checkinQuestionsToSave: CheckinQuestion[] = [];
        
        if (discoveryFormValues.discoverySignals?.length) {
            checkinQuestionsToSave.push({ question: 'Discovery Signals', answer: discoveryFormValues.discoverySignals });
        }
        if (discoveryFormValues.decisionMakerStatus) {
            checkinQuestionsToSave.push({ question: 'Decision Maker Status', answer: discoveryFormValues.decisionMakerStatus });
        }
        if (discoveryFormValues.inconvenience) {
            checkinQuestionsToSave.push({ question: 'Inconvenience', answer: discoveryFormValues.inconvenience });
        }
        if (discoveryFormValues.occurrence) {
            checkinQuestionsToSave.push({ question: 'Occurrence', answer: discoveryFormValues.occurrence });
        }
        if (discoveryFormValues.recurring) {
            checkinQuestionsToSave.push({ question: 'Recurring', answer: discoveryFormValues.recurring });
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
            websiteUrl: selectedPlace?.website,
            outcome: {
              type: outcomeType,
              details: detailsObject,
            },
            checkinQuestions: checkinQuestionsToSave,
          });
          toast({ title: 'Success', description: 'Your visit note has been submitted.' });
          
          resetState();
        } catch (error) {
          console.error('Failed to submit visit note:', error);
          toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not save your visit note.' });
        } finally {
          setIsSubmitting(false);
        }
      };

    const getStepTitle = () => {
        switch(step) {
            case 'search': return 'Step 1: Find Business';
            case 'discovery': return 'Step 2: Field Discovery';
            case 'capture': return 'Step 3: Capture Visit Note';
            case 'camera': return 'Scan Business Card';
            case 'outcome': return 'Step 4: Select Visit Outcome';
            default: return 'Capture Visit';
        }
    }
    const getStepDescription = () => {
        switch(step) {
            case 'search': return 'Search for the business you visited.';
            case 'discovery': return 'Capture observable behaviour and decision context.';
            case 'capture': return 'Record the details of your visit for the Lead Gen team.';
            case 'camera': return 'Take a photo of the front and back of the business card.';
            case 'outcome': return 'Choose the final outcome of your visit.';
            default: return 'Log your field sales visits and interactions.';
        }
    }
    
    const handleNextStep = () => {
        switch(step) {
            case 'search': setStep('discovery'); break;
            case 'discovery': setStep('capture'); break;
            case 'capture': setStep('outcome'); break;
            default: break;
        }
    }
    const handlePreviousStep = () => {
        switch(step) {
            case 'discovery': setStep('search'); break;
            case 'capture': setStep('discovery'); break;
            case 'outcome': setStep('capture'); break;
            default: setStep('search'); break;
        }
    }

    return (
        <>
        <FormProvider {...discoveryForm}>
            <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
                 <header>
                    <h1 className="text-3xl font-bold tracking-tight">Capture Visit</h1>
                    <p className="text-muted-foreground">Log your field sales visits and interactions.</p>
                </header>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            {(step !== 'search' && step !== 'camera') && (
                                <Button variant="ghost" size="icon" onClick={handlePreviousStep} className="shrink-0">
                                    <ChevronLeft />
                                </Button>
                            )}
                            <div className="flex-grow">
                                <CardTitle>{getStepTitle()}</CardTitle>
                                <CardDescription>{getStepDescription()}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {isAnalyzing && (
                            <div className="flex flex-col items-center justify-center gap-2 p-8">
                                <Loader />
                                <p className="text-sm text-muted-foreground">Analyzing Business Card...</p>
                            </div>
                        )}

                        {step === 'search' ? (
                            <div className="py-4 space-y-4">
                                <div className="space-y-2 relative">
                                    <div className="flex gap-2">
                                        <Input 
                                            id="visit-note-search" 
                                            placeholder="Start typing..."
                                            value={searchQuery}
                                            onChange={handleInputChange}
                                        />
                                        <Button type="button" variant="outline" size="icon" onClick={() => setStep('camera')}><Camera className="h-4 w-4" /></Button>
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
                                <div className="flex justify-end pt-4">
                                    <Button onClick={handleNextStep} disabled={!selectedPlace}>Next</Button>
                                </div>
                            </div>
                        ) : step === 'discovery' ? (
                            <FieldDiscoveryStep onNext={handleNextStep} onBack={handlePreviousStep} />
                        ) : step === 'capture' ? (
                            <FormProvider {...captureForm}>
                                <form onSubmit={captureForm.handleSubmit(handleCaptureSubmit)} className="space-y-4">
                                    {selectedPlace && (
                                        <div className="p-3 border rounded-md bg-secondary/50 text-sm">
                                            <p className="font-semibold">{selectedPlace.name}</p>
                                            <p className="text-muted-foreground">{selectedPlace.formatted_address}</p>
                                        </div>
                                    )}
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
                                    <div className="flex justify-between">
                                        <Button type="button" variant="outline" onClick={handlePreviousStep}>Back</Button>
                                        <Button type="submit">Next</Button>
                                    </div>
                                </form>
                            </FormProvider>
                        ) : step === 'camera' ? (
                            <div className="space-y-4">
                                <div className="relative">
                                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                                    {frontImage && (
                                        <Image src={frontImage} alt="Front of business card" width={100} height={60} className="absolute top-2 left-2 w-1/4 h-auto rounded-md border-2 border-white shadow-lg"/>
                                    )}
                                </div>
                                {hasCameraPermission === false && (
                                    <Alert variant="destructive">
                                        <AlertTitle>Camera Access Required</AlertTitle>
                                        <AlertDescription>Please allow camera access in your browser settings.</AlertDescription>
                                    </Alert>
                                )}
                                {!frontImage ? (
                                    <div className="flex gap-2">
                                        <Button onClick={handleCaptureFront} className="w-full" disabled={!hasCameraPermission}>Capture Front</Button>
                                        <Button variant="outline" onClick={() => setStep('search')}>Cancel</Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <Button onClick={handleCaptureBackAndAnalyze} className="w-full" disabled={!hasCameraPermission}>Capture Back & Analyze</Button>
                                            <Button variant="outline" onClick={() => setFrontImage(null)}>Retake</Button>
                                        </div>
                                        <Button variant="secondary" className="w-full" onClick={handleSkipAndAnalyze}>Skip & Analyze Front Only</Button>
                                    </div>
                                )}
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
                                            <p className="text-sm text-muted-foreground">This lead qualifies for an LPO Referral.</p>
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
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

const discoverySignals = [
  { id: 'pays_aus_post', label: 'Pays Australia Post', description: 'They currently pay for Australia Post' },
  { id: 'staff_handle_post', label: 'Staff Handle Post', description: 'Staff leave the office to lodge' },
  { id: 'drop_off_hassle', label: 'Drop-off is a Hassle', description: 'Drop-offs are inconvenient' },
  { id: 'uses_couriers_lt_5kg', label: 'Uses Other Couriers (<5kg)', description: 'TGE, StarTrack, TNT' },
  { id: 'uses_couriers_100_plus', label: 'Uses Other Couriers (100+/wk)', description: 'High-volume standard freight' },
  { id: 'banking_runs', label: 'Banking Runs', description: 'Staff leave office for banking' },
  { id: 'needs_same_day', label: 'Needs Same-Day Delivery', description: 'Uses or wants same-day' },
  { id: 'inter_office', label: 'Inter-Office Deliveries', description: 'Movement between offices' },
];

const FieldDiscoveryStep = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
    const { control, handleSubmit } = useFormContext<z.infer<typeof discoverySchema>>();

    return (
        <form onSubmit={handleSubmit(onNext)} className="space-y-8">
            <FormField
                control={control}
                name="discoverySignals"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-lg font-semibold">Discovery Signals</FormLabel>
                        <FormDescription>Capture observable behaviour and decision context.</FormDescription>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {discoverySignals.map((signal) => {
                                const isSelected = field.value?.includes(signal.label);
                                return (
                                    <Button
                                        key={signal.id}
                                        type="button"
                                        variant={isSelected ? 'default' : 'outline'}
                                        className="h-auto flex flex-col items-start p-3 text-left"
                                        onClick={() => {
                                            const newValue = isSelected
                                                ? field.value?.filter((v) => v !== signal.label)
                                                : [...(field.value || []), signal.label];
                                            field.onChange(newValue);
                                        }}
                                    >
                                        <span className="font-semibold">{signal.label}</span>
                                        <span className="text-xs font-normal opacity-70">{signal.description}</span>
                                    </Button>
                                );
                            })}
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="space-y-6 pt-4 border-t">
                <h3 className="text-lg font-semibold">Qualification Context (Fast Picks)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <FormField
                        control={control}
                        name="decisionMakerStatus"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>Decision Maker Status</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl><RadioGroupItem value="Speaking to decision maker" /></FormControl>
                                            <FormLabel className="font-normal">Speaking to decision maker</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl><RadioGroupItem value="Decision maker identified" /></FormControl>
                                            <FormLabel className="font-normal">Decision maker identified</FormLabel>
                                        </FormItem>
                                         <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl><RadioGroupItem value="Decision maker unknown" /></FormControl>
                                            <FormLabel className="font-normal">Decision maker unknown</FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="inconvenience"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>How inconvenient is this today?</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Very inconvenient" /></FormControl><FormLabel className="font-normal">Very inconvenient</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Somewhat inconvenient" /></FormControl><FormLabel className="font-normal">Somewhat inconvenient</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Not a big issue" /></FormControl><FormLabel className="font-normal">Not a big issue</FormLabel></FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={control}
                        name="occurrence"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>How often does this occur?</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Daily" /></FormControl><FormLabel className="font-normal">Daily</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Weekly" /></FormControl><FormLabel className="font-normal">Weekly</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Ad-hoc" /></FormControl><FormLabel className="font-normal">Ad-hoc</FormLabel></FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                      <FormField
                        control={control}
                        name="recurring"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>Is this recurring?</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Yes - predictable" /></FormControl><FormLabel className="font-normal">Yes - predictable</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Sometimes" /></FormControl><FormLabel className="font-normal">Sometimes</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="One-off" /></FormControl><FormLabel className="font-normal">One-off</FormLabel></FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>
            <div className="flex justify-between pt-8">
                <Button type="button" variant="outline" onClick={onBack}>Back</Button>
                <Button type="submit">Next</Button>
            </div>
        </form>
    );
};
