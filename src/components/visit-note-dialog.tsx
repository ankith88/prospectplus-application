'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Mic, MicOff, ChevronLeft } from 'lucide-react';
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


export function VisitNoteDialog({ isOpen, onOpenChange }: VisitNoteDialogProps) {
  const [step, setStep] = useState<'capture' | 'outcome'>('capture');
  const [noteContent, setNoteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // State for outcome details
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

  const { toast } = useToast();
  const { userProfile } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { content: '' },
  });

  const resetState = () => {
    form.reset();
    setStep('capture');
    setNoteContent('');
    setIsSubmitting(false);
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    // Reset outcome states
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
  };

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

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

  const handleCaptureSubmit = (values: z.infer<typeof formSchema>) => {
    setNoteContent(values.content);
    setStep('outcome');
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

    try {
      await addVisitNote({
        content: fullNote,
        capturedBy: userProfile.displayName || 'Unknown User',
        capturedByUid: userProfile.uid,
      });
      toast({ title: 'Success', description: 'Your visit note has been submitted.' });

      if (outcomeType === 'Schedule Appointment' && detailsObject.salesRep) {
        const rep = salesReps.find(r => r.name === detailsObject.salesRep);
        if (rep) window.open(rep.url, '_blank');
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit visit note:', error);
      toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not save your visit note.' });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-4">
             {step === 'outcome' && (
                <Button variant="ghost" size="icon" onClick={() => setStep('capture')} className="shrink-0">
                    <ChevronLeft />
                </Button>
            )}
            <div className="flex-grow">
                <DialogTitle>
                    {step === 'capture' ? 'Capture a Visit Note' : 'Select Visit Outcome'}
                </DialogTitle>
                <DialogDescription>
                    {step === 'capture'
                    ? 'Record the details of your visit for the Lead Gen team.'
                    : 'Choose the final outcome of your visit.'}
                </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 'capture' ? (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCaptureSubmit)} className="space-y-4">
                <p className="text-sm text-muted-foreground p-2 bg-secondary rounded-md">
                    <b>Prompt:</b> Include Company Name, Address, Contact Person, Outcome, and Action Items.
                </p>
                <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                    <FormItem>
                    <FormControl>
                        <div className="relative">
                        <Textarea placeholder="Start typing or use the mic..." {...field} rows={10} />
                        <Button type="button" variant="ghost" size="icon" className="absolute bottom-2 right-2" onClick={handleToggleListening}>
                            {isListening ? <MicOff className="text-destructive animate-pulse" /> : <Mic />}
                            <span className="sr-only">{isListening ? 'Stop' : 'Start'} listening</span>
                        </Button>
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
                           {isSubmitting ? <Loader /> : 'Submit & Open Calendly'}
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
  );
}
