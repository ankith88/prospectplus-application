
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
import { CheckCircle, Mic, MicOff } from 'lucide-react';
import { addVisitNote } from '@/services/firebase';

const formSchema = z.object({
  content: z.string().min(10, 'Please provide more detail in your note.'),
});

interface VisitNoteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VisitNoteDialog({ isOpen, onOpenChange }: VisitNoteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const { toast } = useToast();
  const { userProfile } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset();
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
      // ... (error handling as before)
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
        } catch (e) {
          console.error("Could not start recognition:", e);
          toast({ variant: 'destructive', title: 'Recognition Error', description: 'Could not start voice recognition.' });
        }
      } else {
        toast({ variant: 'destructive', title: 'Not Supported', description: 'Speech recognition is not supported in this browser.' });
      }
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userProfile) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);
    try {
      await addVisitNote({
        content: values.content,
        capturedBy: userProfile.displayName || 'Unknown User',
        capturedByUid: userProfile.uid,
      });
      toast({ title: 'Success', description: 'Your visit note has been submitted for processing.' });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit visit note:', error);
      toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not save your visit note.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Capture a Visit Note</DialogTitle>
          <DialogDescription>
            Record the details of your visit. This will be sent to the Lead Gen team to create a lead.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground p-2 bg-secondary rounded-md">
          <b>Prompt:</b> Please include the Company Name, Address, Contact Person and their details, the visit outcome, and any action items.
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Textarea
                        placeholder="Start typing or use the mic to dictate your notes..."
                        {...field}
                        rows={10}
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader /> : 'Submit Note'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
