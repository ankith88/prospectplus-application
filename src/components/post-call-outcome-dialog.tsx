
'use client'

import { useState, useEffect } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Lead, Activity, LeadStatus } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from './ui/loader'
import { CheckCircle } from 'lucide-react'
import { logCallActivity } from '@/services/firebase'

const formSchema = z.object({
  outcome: z.string().min(1, 'An outcome is required.'),
  notes: z.string().optional(),
});

interface PostCallOutcomeDialogProps {
  lead: Lead
  callActivity?: Activity | null
  isOpen: boolean
  onClose: () => void
  onOutcomeLogged: (newStatus?: LeadStatus) => void
  onSessionNext?: () => void;
  isSessionActive?: boolean;
  processMode?: boolean;
}

type SubmissionStatus = 'idle' | 'saving_outcome' | 'complete' | 'error';

const leadGenAdminOutcomes = [
    "Appointment Booked", 
    "Send Quote/Free Trial", 
    "Sign Up",
    "Email Interested",
    "Move to Outbound",
    "Not Interested",
    "No Access/Contact"
];

const callOutcomes = [
    'Busy',
    'Call Back/Follow-up',
    'Gatekeeper',
    'Disconnected',
    'Appointment Booked',
    'Email Interested',
    'No Answer',
    'Not Interested',
    'Voicemail',
    'Wrong Number',
    'Not a Fit',
    'DNC - Stop List',
    'Reschedule',
    'LOST - No Contact',
];

export function PostCallOutcomeDialog({ lead, callActivity, isOpen, onClose, onOutcomeLogged, onSessionNext, isSessionActive, processMode = false }: PostCallOutcomeDialogProps) {
  const [submissionState, setSubmissionState] = useState<SubmissionStatus>('idle');
  const [firebaseDuration, setFirebaseDuration] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const outcomes = processMode ? leadGenAdminOutcomes : callOutcomes;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      outcome: '',
      notes: '',
    },
  })
  const outcome = form.watch('outcome');

  const resetAndClose = () => {
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setSubmissionState('idle');
      setFirebaseDuration(null);
    } else {
        form.reset({
            outcome: '',
            notes: callActivity?.notes || '',
        });
    }
  }, [isOpen, callActivity, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'Could not identify the current user.',
        });
        return;
    }
    
    setFirebaseDuration(null);
    setSubmissionState('saving_outcome');

    try {
        const firebaseStartTime = performance.now();
        const newStatus = await logCallActivity(
            lead.id,
            {
                outcome: values.outcome,
                notes: values.notes || '',
                author: user.displayName || 'Unknown',
                salesRecordInternalId: lead.salesRecordInternalId,
            }
        );
        
        const firebaseEndTime = performance.now();
        setFirebaseDuration((firebaseEndTime - firebaseStartTime) / 1000);
        setSubmissionState('complete');
        onOutcomeLogged(newStatus); 

    } catch (error: any) {
        setSubmissionState('error');
        console.error("Failed to save call outcome:", error);
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: 'Could not save the call outcome. Please try again.',
        });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          resetAndClose();
        }
    }}>
      <DialogContent 
        className="sm:max-w-[425px]"
        onInteractOutside={(e) => {
            if (submissionState !== 'idle' && submissionState !== 'error' && submissionState !== 'complete') {
                e.preventDefault();
            }
        }}
      >
        <DialogHeader>
          <DialogTitle>Log Call Outcome</DialogTitle>
          <DialogDescription>
            Select the outcome of your call with {lead.companyName}.
          </DialogDescription>
        </DialogHeader>
        
        {submissionState === 'idle' || submissionState === 'error' ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outcome</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a call outcome" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {outcomes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add any notes from the call..." {...field} />
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
                  <Button type="submit" disabled={form.formState.isSubmitting || !outcome}>
                      {form.formState.isSubmitting ? 'Saving...' : 'Save Outcome'}
                  </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
            <div className="py-8">
                <ul className="space-y-4">
                    <li className="flex items-center justify-between gap-3">
                       <div className="flex items-center gap-3">
                         {submissionState === 'saving_outcome' ? <Loader /> : <CheckCircle className="h-5 w-5 text-green-500" />}
                        <span className={submissionState !== 'saving_outcome' ? 'text-muted-foreground' : ''}>
                            Updating lead status...
                        </span>
                       </div>
                        {firebaseDuration !== null && <span className="text-xs text-muted-foreground">{firebaseDuration.toFixed(2)}s</span>}
                    </li>
                </ul>
                {submissionState === 'complete' && (
                     <DialogFooter className="mt-8 flex w-full items-center justify-end">
                        {isSessionActive && onSessionNext ? (
                            <Button onClick={onSessionNext}>Next in Session</Button>
                        ) : (
                            <Button variant="secondary" onClick={resetAndClose}>Done</Button>
                        )}
                     </DialogFooter>
                )}
            </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
