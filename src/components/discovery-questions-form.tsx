
'use client';

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
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import type { Lead, DiscoveryData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

const currentProviders = [
  { id: 'multiple', label: 'Multiple' },
  { id: 'auspost', label: 'AusPost' },
  { id: 'couriersplease', label: 'CouriersPlease' },
  { id: 'aramex', label: 'Aramex' },
  { id: 'startrack', label: 'StarTrack' },
  { id: 'tge', label: 'TGE' },
  { id: 'fedex', label: 'FedEx/TNT' },
  { id: 'allied', label: 'Allied' },
  { id: 'other', label: 'Other' },
] as const;

const eCommerceTechs = [
    { id: 'mypost', label: 'MyPost' },
    { id: 'shopify', label: 'Shopify' },
    { id: 'woo', label: 'Woo' },
    { id: 'sendle', label: 'Sendle' },
    { id: 'other', label: 'Other' },
    { id: 'none', label: 'None' },
] as const;

const packageTypes = [
    { id: '500g', label: '<500g' },
    { id: '1-3kg', label: '1-3kg' },
    { id: '5kg+', label: '5kg+' },
    { id: '10kg+', label: '10kg+' },
    { id: '20kg+', label: '20kg+' },
] as const;


const FormSchema = z.object({
  postOfficeRelationship: z.enum(['Yes-Driver', 'Yes-Post Office walk up', 'No']).optional(),
  logisticsSetup: z.enum(['Drop-off', 'Routine collection', 'Ad-hoc']).optional(),
  servicePayment: z.enum(['Yes', 'No']).optional(),
  shippingVolume: z.enum(['<5', '<20', '20-100', '100+']).optional(),
  expressVsStandard: z.enum(['Mostly Standard (≥80%)', 'Balanced Mix (20-79% Express)', 'Mostly Express (≥80%)']).optional(),
  packageType: z.array(z.string()).optional(),
  currentProvider: z.array(z.string()).optional(),
  otherProvider: z.string().optional(),
  eCommerceTech: z.array(z.string()).optional(),
  otherECommerceTech: z.string().optional(),
  sameDayCourier: z.enum(['Yes', 'Occasional', 'Never']).optional(),
  decisionMaker: z.enum(['Owner', 'Influencer', 'Gatekeeper']).optional(),
  painPoints: z.string().optional(),
});


interface DiscoveryQuestionsDialogProps {
  lead: Lead;
  onSave: (data: DiscoveryData) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DiscoveryQuestionsDialog({ lead, onSave, isOpen, onOpenChange }: DiscoveryQuestionsDialogProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: lead.discoveryData || {},
  });

  const watchLogisticsSetup = form.watch('logisticsSetup');

  const calculateScoreAndRouting = (data: z.infer<typeof FormSchema>): { score: number, routingTag: string, scoringReason: string } => {
      let score = 0;
      const routingTags = new Set<string>();
      const reasonParts: string[] = [];

      if (data.postOfficeRelationship === 'Yes-Post Office walk up') {
          score += 10;
          routingTags.add('Service');
          reasonParts.push('+10 for using Post Office walk-up service.');
      } else if (data.postOfficeRelationship === 'Yes-Driver') {
          routingTags.add('LPO');
          reasonParts.push('Route to LPO (has driver relationship).');
      }

      if (data.logisticsSetup === 'Drop-off') {
          score += 10;
          reasonParts.push('+10 for dropping off items.');
      }
      if (data.logisticsSetup) routingTags.add('Service');
      
      if (data.servicePayment === 'Yes') {
          score += 10;
          routingTags.add('Service');
          reasonParts.push('+10 for paying for collection service.');
      }

      if (data.shippingVolume === '<20') {
          score += 5;
          reasonParts.push('+5 for shipping <20 items/week.');
      } else if (data.shippingVolume === '20-100') {
          score += 10;
          reasonParts.push('+10 for shipping 20-100 items/week.');
      } else if (data.shippingVolume === '100+') {
          score += 15;
          reasonParts.push('+15 for shipping 100+ items/week.');
      }
      if (data.shippingVolume) routingTags.add('Product or Service');
      
      if (data.expressVsStandard === 'Mostly Standard (≥80%)') {
          score += 10;
          routingTags.add('Service');
          routingTags.add('LPO');
          reasonParts.push('+10 for mostly standard shipping.');
      } else if (data.expressVsStandard === 'Balanced Mix (20-79% Express)') {
          score += 5;
          reasonParts.push('+5 for balanced express/standard mix.');
      } else if (data.expressVsStandard === 'Mostly Express (≥80%)') {
          score += 10;
          routingTags.add('Product');
          reasonParts.push('+10 for mostly express shipping.');
      }
      if (data.expressVsStandard) routingTags.add('Service or Product (depending on mix)');
      
      if (data.packageType?.length) {
          score += 10;
          routingTags.add('Product or Service');
          reasonParts.push('+10 for specifying package types.');
      }

      if (data.currentProvider?.length) {
          score += 5;
          routingTags.add('Competitor displacement');
          reasonParts.push('+5 for using a current provider.');
      }
      if (data.painPoints) {
          score += 10;
          reasonParts.push('+10 for having known pain points.');
      }

      if (data.eCommerceTech?.includes('Shopify') || data.eCommerceTech?.includes('None')) {
          score += 10;
          reasonParts.push('+10 for using compatible e-commerce tech (Shopify or None).');
      }
      if (data.eCommerceTech?.length) routingTags.add('Product');

      if (data.sameDayCourier === 'Yes') {
          score += 5;
          routingTags.add('Product');
          reasonParts.push('+5 for using same-day couriers.');
      }
      
      if (data.decisionMaker === 'Owner') {
          score += 10;
          routingTags.add('All');
          reasonParts.push('+10 for direct contact with owner.');
      }
      
      const scoringReason = reasonParts.length > 0 ? reasonParts.join(' ') : 'Score based on initial data.';

      return { score: Math.min(score, 100), routingTag: Array.from(routingTags).join(', ') || 'N/A', scoringReason };
  }

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const { score, routingTag, scoringReason } = calculateScoreAndRouting(data);
    const discoveryData: DiscoveryData = { ...data, score, routingTag, scoringReason };
    onSave(discoveryData);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Discovery Questions</DialogTitle>
          <DialogDescription>
            Capture key information about {lead.companyName}'s shipping needs.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-grow flex flex-col overflow-hidden">
           <ScrollArea className="flex-grow">
            <div className="space-y-8 pr-4">
                <FormField
                control={form.control}
                name="postOfficeRelationship"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel>Do you have a relationship with Australia Post?</FormLabel>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes-Driver" /></FormControl><FormLabel className="font-normal">Yes - Driver</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes-Post Office walk up" /></FormControl><FormLabel className="font-normal">Yes - Post Office walk up</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                    control={form.control}
                    name="logisticsSetup"
                    render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel>How do you lodge items?</FormLabel>
                        <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Drop-off" /></FormControl><FormLabel className="font-normal">Drop-off</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Routine collection" /></FormControl><FormLabel className="font-normal">Routine collection</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Ad-hoc" /></FormControl><FormLabel className="font-normal">Ad-hoc</FormLabel></FormItem>
                        </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                {watchLogisticsSetup === 'Routine collection' && (
                <FormField
                    control={form.control}
                    name="servicePayment"
                    render={({ field }) => (
                    <FormItem className="space-y-3 ml-6">
                        <FormLabel>If using collection: Do you pay for this service?</FormLabel>
                        <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                        </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                )}
                
                 <FormField
                    control={form.control}
                    name="shippingVolume"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>How many items per week?</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2">
                                {(['<5', '<20', '20-100', '100+'] as const).map(val => (
                                    <FormItem key={`volume-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>
                                ))}
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="expressVsStandard"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>What % of your shipping is Express vs Standard?</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                                {(['Mostly Standard (≥80%)', 'Balanced Mix (20-79% Express)', 'Mostly Express (≥80%)'] as const).map(val => (
                                    <FormItem key={`express-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>
                                ))}
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="packageType"
                    render={() => (
                        <FormItem>
                            <div className="mb-4"><FormLabel className="text-base">What is typical size/weight?</FormLabel></div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {packageTypes.map((item) => (
                                <FormField key={item.id} control={form.control} name="packageType"
                                    render={({ field }) => (
                                        <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl><Checkbox checked={field.value?.includes(item.label)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                ? field.onChange([...(field.value || []), item.label])
                                                : field.onChange(field.value?.filter((value) => value !== item.label))
                                            }}/>
                                        </FormControl>
                                        <FormLabel className="font-normal">{item.label}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="currentProvider"
                    render={() => (
                        <FormItem>
                            <div className="mb-4"><FormLabel className="text-base">Who do you use for shipping?</FormLabel></div>
                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {currentProviders.map((item) => (
                                <FormField key={item.id} control={form.control} name="currentProvider"
                                    render={({ field }) => (
                                        <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl><Checkbox checked={field.value?.includes(item.label)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                ? field.onChange([...(field.value || []), item.label])
                                                : field.onChange(field.value?.filter((value) => value !== item.label))
                                            }}/>
                                        </FormControl>
                                        <FormLabel className="font-normal">{item.label}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                                ))}
                             </div>
                             <FormField control={form.control} name="otherProvider" render={({ field }) => (
                                    <FormItem className="mt-2">
                                        <FormLabel className="sr-only">Other Shipping Provider</FormLabel>
                                        <FormControl><Input {...field} placeholder="Other provider..." /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                <FormField
                    control={form.control}
                    name="eCommerceTech"
                    render={() => (
                        <FormItem>
                            <div className="mb-4"><FormLabel className="text-base">What platform do you use for labels?</FormLabel></div>
                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {eCommerceTechs.map((item) => (
                                <FormField key={item.id} control={form.control} name="eCommerceTech"
                                    render={({ field }) => (
                                        <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl><Checkbox checked={field.value?.includes(item.label)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                ? field.onChange([...(field.value || []), item.label])
                                                : field.onChange(field.value?.filter((value) => value !== item.label))
                                            }}/>
                                        </FormControl>
                                        <FormLabel className="font-normal">{item.label}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                                ))}
                             </div>
                             <FormField control={form.control} name="otherECommerceTech" render={({ field }) => (
                                <FormItem className="mt-2">
                                    <FormLabel className="sr-only">Other E-commerce Tech</FormLabel>
                                    <FormControl><Input {...field} placeholder="Other platform..." /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}/>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="sameDayCourier"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Do you use same-day couriers?</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                {(['Yes', 'Occasional', 'Never'] as const).map(val => (
                                    <FormItem key={`sameday-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>
                                ))}
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                 <FormField
                    control={form.control}
                    name="decisionMaker"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Who decides shipping?</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                {(['Owner', 'Influencer', 'Gatekeeper'] as const).map(val => (
                                    <FormItem key={`decision-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>
                                ))}
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="painPoints"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Pain Points</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Describe any pain points the lead is experiencing..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

            </div>
           </ScrollArea>
            <DialogFooter className="flex-shrink-0 pt-4">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Close
                </Button>
              </DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : 'Save & Continue'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
