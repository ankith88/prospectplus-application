
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
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
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './ui/loader';
import { updateLeadServices } from '@/services/firebase';

const services = [
  { id: 'pickup', label: 'Pickup & Delivery from PO' },
  { id: 'lodgement', label: 'Outgoing Mail Lodgement' },
  { id: 'banking', label: 'Express Banking' },
] as const;

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

const formSchema = z.object({
  selectedServices: z.array(z.string()).min(1, 'Please select at least one service.'),
  frequencies: z.record(z.union([z.array(z.string()), z.literal('Adhoc')])),
  trialDays: z.number().min(1).max(5).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ServiceSelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  mode: 'Free Trial' | 'Signup';
}

export function ServiceSelectionDialog({
  isOpen,
  onOpenChange,
  leadId,
  mode,
}: ServiceSelectionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedServices: [],
      frequencies: {},
    },
  });

  const selectedServices = form.watch('selectedServices');

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
        const serviceSelections = values.selectedServices.map(serviceName => ({
            name: serviceName as any, // Cast to the specific literal type
            frequency: values.frequencies[serviceName],
            trialDays: mode === 'Free Trial' ? values.trialDays : undefined,
        }));
        
      await updateLeadServices(leadId, serviceSelections);

      toast({
        title: 'Success!',
        description: `The ${mode.toLowerCase()} has been configured for the selected services.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save service selection:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save service selection. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode} for Services</DialogTitle>
          <DialogDescription>
            Configure the required services, their frequency, and trial duration if applicable.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="selectedServices"
              render={() => (
                <FormItem>
                  <FormLabel>Services</FormLabel>
                  <div className="space-y-2">
                    {services.map((service) => (
                      <FormField
                        key={service.id}
                        control={form.control}
                        name="selectedServices"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(service.label)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, service.label])
                                    : field.onChange(
                                        field.value?.filter((value) => value !== service.label)
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{service.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedServices.length > 0 && <hr />}

            {selectedServices.map((serviceName) => (
              <div key={serviceName} className="space-y-4 rounded-md border p-4">
                <h3 className="font-medium">{serviceName} - Frequency</h3>
                <FormField
                  control={form.control}
                  name={`frequencies.${serviceName}`}
                  render={({ field }) => (
                    <FormItem>
                      <RadioGroup
                        onValueChange={(value) => field.onChange(value === 'Adhoc' ? 'Adhoc' : [])}
                        className="mb-2"
                      >
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="Daily" />
                          </FormControl>
                          <FormLabel className="font-normal">Daily (Mon-Fri)</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="Adhoc" />
                          </FormControl>
                          <FormLabel className="font-normal">Adhoc (On Demand)</FormLabel>
                        </FormItem>
                      </RadioGroup>
                      
                      {field.value !== 'Adhoc' && (
                        <div className="flex flex-wrap gap-4">
                          {days.map((day) => (
                            <FormField
                              key={day}
                              control={form.control}
                              name={`frequencies.${serviceName}`}
                              render={({ field: dayField }) => (
                                <FormItem className="flex items-center space-x-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={Array.isArray(dayField.value) && dayField.value.includes(day)}
                                      onCheckedChange={(checked) => {
                                        const currentDays = Array.isArray(dayField.value) ? dayField.value : [];
                                        const newDays = checked
                                          ? [...currentDays, day]
                                          : currentDays.filter((d) => d !== day);
                                        dayField.onChange(newDays);
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{day}</FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
            
            {mode === 'Free Trial' && (
              <FormField
                control={form.control}
                name="trialDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Free Trial Duration</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} >
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select number of days..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {[1, 2, 3, 4, 5].map(day => (
                                <SelectItem key={day} value={String(day)}>{day} day(s)</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader /> : 'Submit'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
