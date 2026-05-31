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
import type { Lead, Activity, LeadStatus, Playbook } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from './ui/loader'
import { CheckCircle, Info, BookOpen } from 'lucide-react'
import { logCallActivity } from '@/services/firebase'
import { sendFieldSalesOutcomeToNetSuite } from '@/services/netsuite-field-sales-proxy'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { firestore as db } from '@/lib/firebase'

const formSchema = z.object({
  outcome: z.string().min(1, 'An outcome is required.'),
  notes: z.string().optional(),
  // Add dynamic playbook fields if necessary here in future
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

const outcomeGroups = {
  "Positive / Progressing": [
    'Appointment Booked',
    'Email Interested',
    'Qualified - Call Back/Send Info',
    'Upsell'
  ],
  "Follow-up / Ongoing": [
    'Busy',
    'Call Back/Follow-up',
    'Gatekeeper',
    'No Answer',
    'Prospect - No Access/No Contact',
    'Reschedule',
    'Voicemail'
  ],
  "Lost / Disqualified": [
    'Disconnected',
    'DNC - Stop List',
    'Empty / Closed',
    'LOST - No Contact',
    'Not a Fit',
    'Not Interested',
    'Unqualified Opportunity',
    'Wrong Number'
  ]
};

export function PostCallOutcomeDialog({ lead, callActivity, isOpen, onClose, onOutcomeLogged, onSessionNext, isSessionActive, processMode = false }: PostCallOutcomeDialogProps) {
  const [submissionState, setSubmissionState] = useState<SubmissionStatus>('idle');
  const [firebaseDuration, setFirebaseDuration] = useState<number | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      outcome: '',
      notes: '',
    },
  });
  
  const outcome = form.watch('outcome');

  const resetAndClose = () => {
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setSubmissionState('idle');
      setFirebaseDuration(null);
      setSyncMessage(null);
    } else {
        form.reset({
            outcome: '',
            notes: callActivity?.notes || '',
        });
        
        // Fetch playbook for the current stage
        const fetchPlaybook = async () => {
          if (!lead.status) return;
          try {
             const pbRef = collection(db, 'playbooks');
             const q = query(pbRef, where('stage', '==', lead.status));
             const snapshot = await getDocs(q);
             if (!snapshot.empty) {
               setPlaybook({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Playbook);
             } else {
               setPlaybook(null);
             }
          } catch (e) {
            console.error('Error fetching playbook', e);
          }
        };
        fetchPlaybook();
    }
  }, [isOpen, callActivity, form, lead.status]);


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
        
        // 1. Sync outcome with NetSuite unconditionally
        const nsResult = await sendFieldSalesOutcomeToNetSuite({
            leadId: lead.id,
            outcome: values.outcome,
            linkedSalesRep: lead.salesRepAssigned || 'Unassigned',
            processedBy: user.displayName || lead.dialerAssigned || 'Unknown'
        });
        
        if (nsResult.success) {
            setSyncMessage("Successfully synced with NetSuite.");
        } else {
            setSyncMessage(`Note: Data saved locally but NetSuite sync failed: ${nsResult.message}`);
        }

        // 2. Log to Firebase
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
        if (!open) resetAndClose();
    }}>
      <DialogContent 
        className="sm:max-w-lg"
        onInteractOutside={(e) => {
            if (submissionState !== 'idle' && submissionState !== 'error' && submissionState !== 'complete') {
                e.preventDefault();
            }
        }}
      >
        <DialogHeader>
          <DialogTitle>Stage Guidance & Outcome</DialogTitle>
          <DialogDescription>
            {lead.companyName} is currently in <strong>{lead.status}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        {submissionState === 'idle' || submissionState === 'error' ? (
          <div className="space-y-4">
             {playbook && (
               <div className="bg-primary/10 border border-primary/20 rounded-md p-4 text-sm mb-4">
                 <h4 className="font-semibold text-primary flex items-center gap-2 mb-2">
                   <BookOpen className="h-4 w-4" /> Playbook: {lead.status}
                 </h4>
                 <p className="text-muted-foreground mb-3">{playbook.script}</p>
                 
                 {playbook.mandatoryFields?.length > 0 && (
                   <div className="mb-2">
                     <span className="font-semibold">Must Cover: </span>
                     {playbook.mandatoryFields.join(', ')}
                   </div>
                 )}
                 {playbook.resources?.length > 0 && (
                   <div className="flex gap-2 text-xs">
                     <span className="font-semibold">Resources: </span>
                     {playbook.resources.map((r, i) => (
                       <a key={i} href={r.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                         {r.title}
                       </a>
                     ))}
                   </div>
                 )}
               </div>
             )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outcome</FormLabel>
                      <FormControl>
                        <div className="flex flex-col gap-4">
                          {Object.entries(outcomeGroups).map(([groupName, items]) => {
                            let headerColor = "text-muted-foreground";
                            if (groupName.includes("Positive")) headerColor = "text-emerald-600 dark:text-emerald-400";
                            else if (groupName.includes("Follow-up")) headerColor = "text-blue-600 dark:text-blue-400";
                            else if (groupName.includes("Lost")) headerColor = "text-red-600 dark:text-red-400";
                            
                            return (
                              <div key={groupName} className="space-y-2">
                                <h5 className={`text-xs font-semibold uppercase tracking-wider ${headerColor}`}>{groupName}</h5>
                                <div className="flex flex-wrap gap-2">
                                {items.map(o => (
                                  <button
                                    key={o}
                                    type="button"
                                    onClick={() => field.onChange(o)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                                      field.value === o 
                                        ? 'bg-primary border-primary text-primary-foreground shadow-sm' 
                                        : 'bg-background hover:bg-muted border-input text-foreground'
                                    }`}
                                  >
                                    {o}
                                  </button>
                                ))}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </FormControl>
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
                        <Textarea placeholder="Add any notes from the interaction..." {...field} />
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
                        {form.formState.isSubmitting ? 'Processing...' : 'Save Outcome'}
                    </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        ) : (
            <div className="py-8">
                <ul className="space-y-4">
                    <li className="flex items-center justify-between gap-3">
                       <div className="flex items-center gap-3">
                         {submissionState === 'saving_outcome' ? <Loader /> : <CheckCircle className="h-5 w-5 text-green-500" />}
                        <div className="flex flex-col">
                            <span className={submissionState !== 'saving_outcome' ? 'text-muted-foreground font-medium' : 'font-medium'}>
                                Updating record...
                            </span>
                            {syncMessage && <span className="text-[10px] text-muted-foreground">{syncMessage}</span>}
                        </div>
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

