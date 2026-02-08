'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
  FormControl,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const discoverySignals = [
  { id: 'pays_aus_post', label: 'Pays for Australia Post', description: 'They currently pay for Australia Post services.' },
  { id: 'staff_handle_post', label: 'Staff handle post', description: 'Staff leave the office to lodge mail/parcels.' },
  { id: 'drop_off_hassle', label: 'Drop-off is a hassle', description: 'They find dropping off items inconvenient.' },
  { id: 'uses_auspost_platform', label: 'Uses Australia Post', description: 'They use AP products like MyPost Business.' },
  { id: 'uses_couriers_lt_5kg', label: 'Uses other couriers (<5kg)', description: 'They use other couriers for small parcels.' },
  { id: 'uses_couriers_100_plus', label: 'Uses other couriers (100+ per week)', description: 'They are a high-volume shipper with other couriers.' },
  { id: 'banking_runs', label: 'Banking runs', description: 'Staff leave the office for banking errands.' },
  { id: 'needs_same_day', label: 'Needs same-day delivery', description: 'They have a need for same-day delivery services.' },
  { id: 'inter_office', label: 'Inter-office deliveries', description: 'They move items between their own offices.' },
  { id: 'shopify_woo', label: 'Shopify / WooCommerce', description: 'They use Shopify or WooCommerce for e-commerce.' },
  { id: 'other_label_platform', label: 'Other label platforms', description: 'They use other platforms like Starshipit.' },
];

const discoverySchema = z.object({
  discoverySignals: z.array(z.string()).optional(),
  inconvenience: z.enum(['Very inconvenient', 'Somewhat inconvenient', 'Not a big issue']).optional(),
  occurrence: z.enum(['Daily', 'Weekly', 'Ad-hoc']).optional(),
  taskOwner: z.enum(['Shared admin responsibility', 'Dedicated staff role', 'Ad-hoc / whoever is free']).optional(),
});

export default function FieldDiscoveryStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
    const { control } = useFormContext<z.infer<typeof discoverySchema>>();

    return (
        <div className="space-y-8">
            <FormField
                control={control}
                name="discoverySignals"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-lg font-semibold">Discovery Signals</FormLabel>
                        <FormDescription>Capture observable behaviour and decision context.</FormDescription>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {discoverySignals.map((signal) => {
                                const isSelected = field.value?.includes(signal.label);
                                return (
                                    <Button
                                        key={signal.id}
                                        type="button"
                                        variant={isSelected ? 'default' : 'outline'}
                                        className="h-auto flex flex-col items-start p-3 text-left"
                                        onClick={() => {
                                            const newValue = isSelected
                                                ? field.value?.filter((v) => v !== signal.label)
                                                : [...(field.value || []), signal.label];
                                            field.onChange(newValue);
                                        }}
                                    >
                                        <span className="font-semibold">{signal.label}</span>
                                        <span className="text-xs font-normal opacity-70">{signal.description}</span>
                                    </Button>
                                );
                            })}
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="space-y-6 pt-4 border-t">
                <h3 className="text-lg font-semibold">Qualification Context (Fast Picks)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <FormField
                        control={control}
                        name="inconvenience"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>How inconvenient is this today?</FormLabel>
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
                        control={control}
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
                        control={control}
                        name="taskOwner"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>Who owns this task today?</FormLabel>
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
            <div className="flex justify-between pt-8">
                <Button type="button" variant="outline" onClick={onBack}>Back</Button>
                <Button type="button" onClick={onNext}>Next</Button>
            </div>
        </div>
    );
};
