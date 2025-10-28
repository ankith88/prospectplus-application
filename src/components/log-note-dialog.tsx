
'use client'

import { useState } from 'react'
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
  DialogTrigger,
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

const formSchema = z.object({
  content: z.string().min(1, 'Note content cannot be empty.'),
});

interface LogNoteDialogProps {
  lead: Lead
  children: React.ReactNode
  onNoteLogged: (content: string, callbacks: { onFirebaseSave: () => void, onNetSuiteSync: () => void }) => Promise<void>
}

type SubmissionStatus = 'idle' | 'saving_firebase' | 'syncing_netsuite' | 'complete' | 'error';


export function LogNoteDialog({ lead, children, onNoteLogged }: LogNoteDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [submissionState, setSubmissionState] = useState<SubmissionStatus>('idle');

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
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'You must be logged in to log a note.',
        });
        return;
    }

    setSubmissionState('saving_firebase');
    
    try {
        await onNoteLogged(values.content, {
            onFirebaseSave: () => {
                setSubmissionState('syncing_netsuite');
            },
            onNetSuiteSync: () => {
                // This callback is now just for show, the main await handles completion
            }
        });
        
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
        if (submissionState !== 'idle' && submissionState !== 'error') {
            if (open) return; // prevent closing while in progress
        }
        setIsOpen(open);
        if (!open) {
            resetAndClose();
        }
    }}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => {
             if (submissionState !== 'idle' && submissionState !== 'error' && submissionState !== 'complete') {
                e.preventDefault();
             }
        }}>
          <DialogHeader>
            <DialogTitle>Log a Note</DialogTitle>
            <DialogDescription>
              Add a note for {lead.companyName}. This will be saved in the activity history and synced to NetSuite.
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
                    <li className="flex items-center gap-3">
                        {submissionState === 'saving_firebase' ? <Loader /> : <CheckCircle className="h-5 w-5 text-green-500" />}
                        <span className={submissionState !== 'saving_firebase' ? 'text-muted-foreground' : ''}>
                            Saving to ProspectPlus...
                        </span>
                    </li>
                     <li className="flex items-center gap-3">
                        {submissionState === 'complete' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : submissionState === 'saving_firebase' ? (
                            <div className="h-5 w-5 border-2 border-dashed rounded-full" />
                        ): (
                            <Loader />
                        )}
                        <span className={submissionState === 'complete' ? 'text-muted-foreground' : ''}>
                           Syncing to NetSuite...
                        </span>
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
