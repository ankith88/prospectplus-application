
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { logDailyArea } from '@/services/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './ui/loader';
import { MapPin, Clock } from 'lucide-react';

const formSchema = z.object({
  area: z.string().min(2, 'Please enter the area name.'),
  startTime: z.string().min(1, 'Please enter your start time.'),
});

interface DailyAreaLogDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DailyAreaLogDialog({ isOpen, onOpenChange }: DailyAreaLogDialogProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      area: '',
      startTime: format(new Date(), 'HH:mm'),
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userProfile) return;
    setIsSubmitting(true);
    try {
      const deploymentData = {
        userId: userProfile.uid,
        userName: userProfile.displayName || 'Unknown',
        date: new Date().toISOString().split('T')[0],
        area: values.area,
        startTime: values.startTime,
      };

      await logDailyArea(deploymentData);
      toast({ title: 'Deployment Logged', description: 'Have a successful day in the field!' });
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to log deployment.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Daily Deployment Log
          </DialogTitle>
          <DialogDescription>
            Field Sales mandatory: Please specify where you are working today.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Area / Suburb</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Sydney CBD, Parramatta..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Start Time</FormLabel>
                  <FormControl>
                    <div className="relative">
                        <Input type="time" {...field} />
                        <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader /> : 'Confirm Deployment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function format(date: Date, formatStr: string) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return formatStr.replace('HH', hours).replace('mm', minutes);
}
