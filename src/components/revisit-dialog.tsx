
'use client';

import { useState } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './ui/loader';
import type { Lead } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { firestore } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';

const formSchema = z.object({
  revisitDate: z.date({ required_error: 'A date is required.' }),
  revisitTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:mm.'),
});

type FormValues = z.infer<typeof formSchema>;

interface RevisitDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onRevisitScheduled: () => void;
}

export function RevisitDialog({ isOpen, onOpenChange, lead, onRevisitScheduled }: RevisitDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      revisitTime: '09:00',
    },
  });

  const handleSubmit = async (values: FormValues) => {
    if (!userProfile?.displayName) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not identify current user.' });
        return;
    }
    setIsSubmitting(true);
    try {
      const { revisitDate, revisitTime } = values;
      const [hours, minutes] = revisitTime.split(':').map(Number);
      
      const combinedDateTime = new Date(revisitDate);
      combinedDateTime.setHours(hours, minutes);

      const appointmentData = {
        duedate: revisitDate.toISOString().split('T')[0], // YYYY-MM-DD
        starttime: combinedDateTime.toISOString(), // Full ISO string
        assignedTo: userProfile.displayName,
        appointmentDate: new Date().toLocaleDateString('en-au'), // dd/mm/yyyy
        revisit: true,
      };

      await addDoc(collection(firestore, 'leads', lead.id, 'appointments'), appointmentData);

      toast({
        title: 'Revisit Scheduled',
        description: `A revisit has been scheduled for ${lead.companyName}.`,
      });
      onRevisitScheduled();
    } catch (error) {
      console.error('Failed to schedule revisit:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to schedule revisit. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Revisit</DialogTitle>
          <DialogDescription>Select a date and time to revisit {lead.companyName}.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="revisitDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn('w-[240px] pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                          >
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date('1900-01-01')} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="revisitTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader /> : 'Schedule'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
