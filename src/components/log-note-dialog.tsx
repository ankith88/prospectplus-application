
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
import { useToast } from '@/hooks/use-toast'
import type { Lead, Note } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from './ui/loader'
import { CheckCircle } from 'lucide-react'
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
    form.reset();
    setSubmissionState('idle');
    setTotalDuration(null);
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
        if (submissionState === 'saving_firebase') {
             if (open) return;
        }
        setIsOpen(open);
        if (!open) {
            resetAndClose();
        }
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
                          <Textarea placeholder="Enter your note here..." {...field} rows={5}/>
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
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className={'text-muted-foreground'}>
                                Saving to ProspectPlus...
                            </span>
                        </div>
                    </li>
                     <li className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                           {submissionState === 'complete' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <div className="h-5 w-5 border-2 border-dashed rounded-full" />}
                            <span className={submissionState === 'complete' ? '' : 'text-muted-foreground'}>
                               Saved
                            </span>
                        </div>
                    </li>
                </ul>
                {submissionState === 'complete' && (
                     <DialogFooter className="mt-8">
                        <div className="flex w-full items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                {totalDuration !== null ? `Total time: ${totalDuration.toFixed(2)}s` : ''}
                            </p>
                            <Button onClick={resetAndClose}>Done</Button>
                        </div>
                     </DialogFooter>
                )}
             </div>
          )}
        </DialogContent>
      </Dialog>
  )
}
