
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
import { sendDeploymentToNetSuite } from '@/services/netsuite-deployment-proxy';
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
      startTime: formatLocalTime(new Date()),
    },
  });

  const handleSkip = () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
    localStorage.setItem('deployment_skipped_date', today);
    onOpenChange(false);
    toast({ title: 'Deployment Skipped', description: 'Reminder: You can log your area later from the Field Visits menu.' });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userProfile) return;
    setIsSubmitting(true);
    try {
      // Consistent local date for Australia/Sydney
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
      const deploymentData = {
        userId: userProfile.uid,
        userName: userProfile.displayName || 'Unknown',
        date: today,
        area: values.area,
        startTime: values.startTime,
      };

      // 1. Log to Firebase for local history and admin reporting
      await logDailyArea(deploymentData);

      // 2. Sync with NetSuite API
      const syncResult = await sendDeploymentToNetSuite({
          ...deploymentData,
          displayName: userProfile.displayName || 'Unknown',
          email: userProfile.email || '',
      });

      localStorage.removeItem('deployment_skipped_date'); // Clear skip flag on success

      if (syncResult.success) {
          toast({ title: 'Deployment Logged', description: 'Deployment synced with NetSuite. Have a successful day!' });
      } else {
          toast({ 
            variant: 'destructive', 
            title: 'Partial Success', 
            description: `Log saved locally, but NetSuite sync failed: ${syncResult.message}` 
          });
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Deployment log error:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to log deployment.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Daily Deployment Log
          </DialogTitle>
          <DialogDescription>
            Field Sales: Please specify where you are working today. You can skip this if you are just planning.
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
            <DialogFooter className="pt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button type="button" variant="ghost" onClick={handleSkip} disabled={isSubmitting}>
                Just Planning (Skip)
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader /> : 'Confirm Deployment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function formatLocalTime(date: Date) {
    return date.toLocaleTimeString('en-AU', { 
        timeZone: 'Australia/Sydney', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
    });
}
