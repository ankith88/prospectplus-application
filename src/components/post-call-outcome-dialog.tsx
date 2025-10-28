
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
  onSessionNext: () => void
  isSessionActive: boolean
}

type SubmissionStatus = 'idle' | 'saving_outcome' | 'syncing_netsuite' | 'complete' | 'error';

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

export function PostCallOutcomeDialog({ lead, callActivity, isOpen, onClose, onOutcomeLogged, onSessionNext, isSessionActive }: PostCallOutcomeDialogProps) {
  const [submissionState, setSubmissionState] = useState<SubmissionStatus>('idle');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [firebaseDuration, setFirebaseDuration] = useState<number | null>(null);
  const [netsuiteDuration, setNetsuiteDuration] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      outcome: '',
      notes: '',
    },
  })
  const outcome = form.watch('outcome');

  const resetAndClose = () => {
    form.reset();
    setSubmissionState('idle');
    setStartTime(null);
    setFirebaseDuration(null);
    setNetsuiteDuration(null);
    setTotalDuration(null);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      form.reset({
        outcome: '',
        notes: callActivity?.notes || '',
      });
      setSubmissionState('idle');
      setStartTime(null);
      setFirebaseDuration(null);
      setNetsuiteDuration(null);
      setTotalDuration(null);
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
    
    setStartTime(performance.now());
    setFirebaseDuration(null);
    setNetsuiteDuration(null);
    setTotalDuration(null);
    setSubmissionState('saving_outcome');

    try {
        // Simulate Firebase step
        setTimeout(() => {
            if (submissionState === 'saving_outcome') {
                setFirebaseDuration((performance.now() - startTime!) / 1000);
                setSubmissionState('syncing_netsuite');
            }
        }, 800); // Estimated time for Firebase

      const newStatus = await logCallActivity(
            lead.id,
            {
                outcome: values.outcome,
                notes: values.notes || '',
                author: user.displayName || 'Unknown',
                salesRecordInternalId: lead.salesRecordInternalId,
            }
        );

        // Finalize state
        const endTime = performance.now();
        setTotalDuration((endTime - startTime!) / 1000);
        if (firebaseDuration === null) {
            setFirebaseDuration((endTime - startTime!) / 1000);
        }
        setNetsuiteDuration(totalDuration! - (firebaseDuration || 0));
        setSubmissionState('complete');
        onOutcomeLogged(newStatus); // Refresh the lead profile page with the new status

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
                        {callOutcomes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
                <p className="text-sm text-destructive">An error occurred. Please try again or contact support.</p>
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
                     <li className="flex items-center justify-between gap-3">
                       <div className="flex items-center gap-3">
                        {submissionState === 'complete' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" /> 
                        ) : submissionState === 'syncing_netsuite' ? (
                            <Loader />
                        ) : (
                           <div className="h-5 w-5 border-2 border-dashed rounded-full" />
                        )}
                        <span className={submissionState === 'complete' ? 'text-muted-foreground' : ''}>
                           Syncing to NetSuite...
                        </span>
                       </div>
                        {netsuiteDuration !== null && <span className="text-xs text-muted-foreground">{netsuiteDuration.toFixed(2)}s</span>}
                    </li>
                </ul>
                {submissionState === 'complete' && (
                     <DialogFooter className="mt-8 flex w-full items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {totalDuration !== null ? `Total time: ${totalDuration.toFixed(2)}s` : ''}
                        </p>
                        <div className="flex gap-2">
                           <Button variant="secondary" onClick={resetAndClose}>Done</Button>
                            {isSessionActive && (
                                <Button onClick={() => { resetAndClose(); onSessionNext(); }}>Next in Session</Button>
                            )}
                        </div>
                     </DialogFooter>
                )}
            </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
