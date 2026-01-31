
'use client'

import { useState, useEffect, useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import type { Lead, Note } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from './ui/loader'
import { CheckCircle, Mic, MicOff } from 'lucide-react'
import { logNoteActivity } from '@/services/firebase'

const formSchema = z.object({
  content: z.string().min(1, 'Note content cannot be empty.'),
});

interface LogNoteDialogProps {
  lead: Lead
  children: React.ReactNode
  onNoteLogged: (newNote: Note) => void;
}

type SubmissionStatus = 'idle' | 'saving_firebase' | 'complete' | 'error';


export function LogNoteDialog({ lead, children, onNoteLogged }: LogNoteDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [submissionState, setSubmissionState] = useState<SubmissionStatus>('idle');
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const { toast } = useToast()
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: '',
    },
  })
  
  const resetAndClose = () => {
    setIsOpen(false);
  };
  
  useEffect(() => {
    if (!isOpen) {
        form.reset();
        setSubmissionState('idle');
        setTotalDuration(null);
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
    }
  }, [isOpen, form, isListening]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser.');
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
        const currentNotes = form.getValues('content') || '';
        form.setValue('content', (currentNotes + ' ' + finalTranscript).trim());
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
         try {
           recognitionRef.current.start();
           setIsListening(true);
         } catch(e) {
            console.error("Could not start recognition:", e);
            toast({ variant: 'destructive', title: 'Recognition Error', description: 'Could not start voice recognition. Please try again.' });
         }
       } else {
         toast({ variant: 'destructive', title: 'Not Supported', description: 'Speech recognition is not supported in this browser.' });
       }
    }
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user?.displayName) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'You must be logged in to log a note.',
        });
        return;
    }

    const startTime = performance.now();
    setTotalDuration(null);
    setSubmissionState('saving_firebase');
    
    try {
        const submissionDate = new Date().toISOString();
        const newNote = { 
            content: values.content, 
            author: user.displayName,
            date: submissionDate,
            id: 'temp-' + Date.now() + Math.random(), // Temporary unique ID for optimistic update
        };
        
        await logNoteActivity(lead.id, newNote);
        onNoteLogged(newNote);
        
        const endTime = performance.now();
        setTotalDuration((endTime - startTime) / 1000);
        setSubmissionState('complete');

    } catch (error) {
      setSubmissionState('error');
      console.error('Failed to log note:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to log note. Please try again.',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (submissionState === 'saving_firebase' && !open) {
             return;
        }
        setIsOpen(open);
    }}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => {
             if (submissionState === 'saving_firebase') {
                e.preventDefault();
             }
        }}>
          <DialogHeader>
            <DialogTitle>Log a Note</DialogTitle>
            <DialogDescription>
              Add a note for {lead.companyName}. This will be saved in the activity history.
            </DialogDescription>
          </DialogHeader>
          
          {submissionState === 'idle' || submissionState === 'error' ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note</FormLabel>
                        <FormControl>
                           <div className="relative">
                                <Textarea placeholder="Enter your note here, or use the mic to dictate." {...field} rows={5}/>
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
                  {submissionState === 'error' && (
                    <p className="text-sm text-destructive">An error occurred. Please try again.</p>
                  )}
                  <DialogFooter>
                      <Button type="button" variant="outline" onClick={resetAndClose}>Cancel</Button>
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                        Log Note
                      </Button>
                  </DialogFooter>
                </form>
              </Form>
          ) : (
             <div className="py-8">
                <ul className="space-y-4">
                    <li className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            {submissionState === 'saving_firebase' ? <Loader /> : <CheckCircle className="h-5 w-5 text-green-500" />}
                            <span className={submissionState === 'complete' ? 'text-muted-foreground' : ''}>
                                Saving to ProspectPlus...
                            </span>
                        </div>
                         {submissionState === 'complete' && totalDuration !== null && (
                            <span className="text-xs text-muted-foreground">{totalDuration.toFixed(2)}s</span>
                        )}
                    </li>
                </ul>
                {submissionState === 'complete' && (
                     <DialogFooter className="mt-8">
                        <Button onClick={resetAndClose}>Done</Button>
                     </DialogFooter>
                )}
             </div>
          )}
        </DialogContent>
      </Dialog>
  )
}
