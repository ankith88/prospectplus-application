
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
import { logNoteActivity } from '@/services/firebase'
import { useAuth } from '@/hooks/use-auth'

const formSchema = z.object({
  content: z.string().min(1, 'Note content cannot be empty.'),
});

interface LogNoteDialogProps {
  lead: Lead
  children: React.ReactNode
  onNoteLogged: (newNote: Note) => void
}

export function LogNoteDialog({ lead, children, onNoteLogged }: LogNoteDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'You must be logged in to log a note.',
        });
        return;
    }
    try {
      const { newNote, netSuiteResult } = await logNoteActivity(lead.id, {
        content: values.content,
        author: user.displayName || user.email || 'Unknown User',
      });
      
      onNoteLogged(newNote);

      toast({
        title: 'Success',
        description: 'Note has been logged successfully.',
      })

      if (netSuiteResult.success) {
        toast({
          title: "NetSuite Updated",
          description: "Note sent to NetSuite.",
        });
      } else {
         toast({
          variant: "destructive",
          title: "NetSuite Sync Failed",
          description: netSuiteResult.message,
        });
      }

      setIsOpen(false)
      form.reset()
    } catch (error) {
      console.error('Failed to log note:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to log note. Please try again.',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Log a Note</DialogTitle>
            <DialogDescription>
              Add a note for {lead.companyName}. This will be saved in the activity history.
            </DialogDescription>
          </DialogHeader>
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
              <DialogFooter>
                  <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Logging...' : 'Log Note'}
                  </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
  )
}
