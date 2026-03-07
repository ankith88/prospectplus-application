'use client';

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
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from './ui/scroll-area';
import type { Lead, DiscoveryData } from '@/lib/types';
import { calculateScoreAndRouting } from '@/lib/discovery-scoring';
import { useAuth } from '@/hooks/use-auth';

const discoverySignalGroups = {
    postOffice: {
        question: "Who currently runs items back & forth to the Post Office?",
        signals: [
            { id: 'pays_aus_post', label: 'Pays for Australia Post', description: 'They currently pay for Australia Post services.' },
            { id: 'staff_handle_post', label: 'Staff Handle Post', description: 'Staff leave the office to lodge mail/parcels.' },
        ],
        conditional: { id: 'drop_off_hassle', label: 'Drop-off is a hassle', description: 'They find dropping off items inconvenient.', dependsOn: ['Pays for Australia Post', 'Staff Handle Post'] }
    },
    shipping: {
        question: "Who are you Shipping with?",
        signals: [
            { id: 'uses_auspost_platform', label: 'Uses Australia Post', description: 'They use AP products like MyPost Business.' },
            { id: 'uses_couriers_lt_5kg', label: 'Uses other couriers (<5kg)', description: 'They use other couriers for small parcels.' },
            { id: 'uses_couriers_100_plus', label: 'Uses other couriers (100+ per week)', description: 'They are a high-volume shipper with other couriers.' },
        ]
    },
    website: {
        question: "What is your website built on?",
        signals: [
            { id: 'shopify_woo', label: 'Shopify / WooCommerce', description: 'They use Shopify or WooCommerce for e-commerce.' },
            { id: 'other_label_platform', label: 'Other label platforms', description: 'They use other platforms like Starshipit.' },
        ]
    },
    errands: {
        question: "Is there anything else you leave the office for?",
        signals: [
            { id: 'banking_runs', label: 'Banking Runs', description: 'Staff leave office for banking errands.' },
            { id: 'needs_same_day', label: 'Needs same-day Delivery', description: 'They have a need for same-day delivery services.' },
            { id: 'inter_office', label: 'Inter-office Deliveries', description: 'They move items between their own offices.' },
        ]
    },
    decisionMaking: {
        question: "Where are decisions made?",
        signals: [
            { id: 'ho_decisions', label: 'Decisions made at Head Office', description: 'Financial or shipping decisions are not made at this location.' },
        ]
    }
}

const lostPropertyOptions = [
    { label: 'Staff organise returns manually', description: 'Team packs items, arranges postage or courier' },
    { label: 'Guests contact us to arrange shipping', description: 'Staff manage payments, labels or booking' },
    { label: 'Rarely happens / informal process', description: 'No standard system for returns' },
    { label: 'Already use a return platform', description: 'Lost property handled through a system' },
];

const FormSchema = z.object({
  discoverySignals: z.array(z.string()).optional(),
  inconvenience: z.enum(['Very inconvenient', 'Somewhat inconvenient', 'Not a big issue']).optional(),
  occurrence: z.enum(['Daily', 'Weekly', 'Ad-hoc']).optional(),
  taskOwner: z.enum(['Shared admin responsibility', 'Dedicated staff role', 'Ad-hoc / whoever is free']).optional(),
  lostPropertyProcess: z.string().optional(),
});

interface DiscoveryQuestionsDialogProps {
  lead: Lead;
  onSave: (data: DiscoveryData) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const SignalButton = ({ signal, field }: { signal: any, field: any }) => {
    const isSelected = field.value?.includes(signal.label);
    return (
        <Button
            key={signal.id}
            type="button"
            variant={isSelected ? 'default' : 'outline'}
            className="h-auto flex flex-col items-start p-3 text-left"
            onClick={() => {
                const newValue = isSelected
                    ? field.value?.filter((v: string) => v !== signal.label)
                    : [...(field.value || []), signal.label];
                field.onChange(newValue);
            }}
        >
            <span className="font-semibold">{signal.label}</span>
            <span className="text-xs font-normal opacity-70">{signal.description}</span>
        </Button>
    );
};

export function DiscoveryQuestionsDialog({ lead, onSave, isOpen, onOpenChange }: DiscoveryQuestionsDialogProps) {
  const { userProfile } = useAuth();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: lead.discoveryData || { discoverySignals: [] },
  });

  const watchedSignals = form.watch('discoverySignals') || [];
  const showDropOffHassle = watchedSignals.some(s => discoverySignalGroups.postOffice.conditional.dependsOn.includes(s));
  const isFieldSales = userProfile?.role === 'Field Sales';

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const result = calculateScoreAndRouting(data);
    onSave(result as DiscoveryData);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Field Discovery Questions</DialogTitle>
          <DialogDescription>
            Capture observable behaviour and decision context for {lead.companyName}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-grow flex flex-col overflow-hidden">
            <ScrollArea className="flex-grow">
              <div className="space-y-8 pr-4">
                <FormField
                  control={form.control}
                  name="discoverySignals"
                  render={({ field }) => (
                    <FormItem className="space-y-6">
                      {Object.values(discoverySignalGroups).map(group => (
                        <div key={group.question} className="space-y-3">
                          <FormLabel className="text-base font-semibold">{group.question}</FormLabel>
                          <div className="flex flex-wrap gap-2 pt-2">
                            {group.signals.map(signal => (
                              <SignalButton key={signal.id} signal={signal} field={field} />
                            ))}
                            {group.conditional && group.conditional.id === 'drop_off_hassle' && showDropOffHassle && (
                              <SignalButton signal={group.conditional} field={field} />
                            )}
                          </div>
                        </div>
                      ))}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isFieldSales && (
                  <div className="space-y-6 pt-4 border-t">
                    <FormLabel className="text-base font-semibold">How do they handle guest lost property returns?</FormLabel>
                    <FormField
                      control={form.control}
                      name="lostPropertyProcess"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                              {lostPropertyOptions.map((option) => (
                                <Button
                                  key={option.label}
                                  type="button"
                                  variant={field.value === option.label ? 'default' : 'outline'}
                                  className="h-auto flex flex-col items-start p-3 text-left"
                                  onClick={() => field.onChange(option.label)}
                                >
                                  <span className="font-semibold text-sm">{option.label}</span>
                                  <span className="text-xs font-normal opacity-70">{option.description}</span>
                                </Button>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="space-y-6 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Qualification Context (Fast Picks)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <FormField
                      control={form.control}
                      name="inconvenience"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>How inconvenient is this?</FormLabel>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                              <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Very inconvenient" /></FormControl><FormLabel className="font-normal">Very inconvenient</FormLabel></FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Somewhat inconvenient" /></FormControl><FormLabel className="font-normal">Somewhat inconvenient</FormLabel></FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Not a big issue" /></FormControl><FormLabel className="font-normal">Not a big issue</FormLabel></FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="occurrence"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>How often does this occur?</FormLabel>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                              <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Daily" /></FormControl><FormLabel className="font-normal">Daily</FormLabel></FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Weekly" /></FormControl><FormLabel className="font-normal">Weekly</FormLabel></FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Ad-hoc" /></FormControl><FormLabel className="font-normal">Ad-hoc</FormLabel></FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="taskOwner"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Who owns this task?</FormLabel>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                              <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Shared admin responsibility" /></FormControl><FormLabel className="font-normal">Shared admin responsibility</FormLabel></FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Dedicated staff role" /></FormControl><FormLabel className="font-normal">Dedicated staff role</FormLabel></FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Ad-hoc / whoever is free" /></FormControl><FormLabel className="font-normal">Ad-hoc / whoever is free</FormLabel></FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="flex-shrink-0 pt-4 border-t">
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Discovery'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
