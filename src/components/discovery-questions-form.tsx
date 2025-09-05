
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
  DialogTrigger,
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

const shippingProviders = [
  { id: 'austPost', label: 'Aust Post' },
  { id: 'couriersPlease', label: 'Couriers Please' },
  { id: 'aramex', label: 'Aramex' },
  { id: 'sendle', label: 'Sendle' },
  { id: 'starTrack', label: 'StarTrack' },
  { id: 'tge', label: 'TGE' },
  { id: 'allied', label: 'Allied' },
  { id: 'tnt', label: 'TNT' },
  { id: 'dhl', label: 'DHL' },
] as const;

const labelPlatforms = [
    { id: 'shopify', label: 'Shopify' },
    { id: 'wooCommerce', label: 'Woo Commerce' },
    { id: 'starshipit', label: 'StarShipit' },
    { id: 'shipStation', label: 'ShipStation' },
    { id: 'shippit', label: 'Shippit' },
    { id: 'bigCommerce', label: 'Big Commerce' },
    { id: 'wizz', label: 'Wizz' },
] as const;


const FormSchema = z.object({
  hasAPRelationship: z.enum(['Yes', 'No']).optional(),
  apCollectionType: z.enum(['Take themselves', 'Collection service']).optional(),
  paidAPCollection: z.enum(['Yes', 'No']).optional(),
  shippingProviders: z.array(z.string()).optional(),
  otherShippingProvider: z.string().optional(),
  expressItemsPerWeek: z.enum(['1 to 5', '6 to 10', '11 to 20', '21 to 30', '30 to 40', '40+']).optional(),
  standardItemsPerWeek: z.enum(['1 to 5', '6 to 10', '11 to 20', '21 to 30', '30 to 40', '40+']).optional(),
  useSameDayCouriers: z.enum(['Yes', 'No']).optional(),
  typicalWeight: z.enum(['<500g', '1-3kg', '3-5kg', '5-10kg', '10-20kg', '20kg+']).optional(),
  labelPlatform: z.array(z.string()).optional(),
  otherLabelPlatform: z.string().optional(),
  painPoints: z.string().optional(),
});


interface DiscoveryQuestionsDialogProps {
  lead: Lead;
  children: React.ReactNode;
  onSave: (data: DiscoveryData) => void;
}

export function DiscoveryQuestionsDialog({ lead, children, onSave }: DiscoveryQuestionsDialogProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: lead.discoveryData || {},
  });

  const watchAPRelationship = form.watch('hasAPRelationship');
  const watchAPCollectionType = form.watch('apCollectionType');

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    onSave(data);
    toast({
      title: "Saved!",
      description: "Discovery questions have been saved for this lead.",
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>Discovery Questions</DialogTitle>
          <DialogDescription>
            Capture key information about {lead.companyName}'s shipping needs.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 h-full flex flex-col">
           <ScrollArea className="flex-grow">
            <div className="space-y-8 pr-4">
                <FormField
                control={form.control}
                name="hasAPRelationship"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel>Do you have a relationship with AP?</FormLabel>
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

                {watchAPRelationship === 'Yes' && (
                <FormField
                    control={form.control}
                    name="apCollectionType"
                    render={({ field }) => (
                    <FormItem className="space-y-3 ml-6">
                        <FormLabel>Do you take Aust Post items to the Post Office yourself or do you have a collection service?</FormLabel>
                        <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Take themselves" /></FormControl><FormLabel className="font-normal">Take themselves</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Collection service" /></FormControl><FormLabel className="font-normal">Collection service</FormLabel></FormItem>
                        </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                )}

                {watchAPRelationship === 'Yes' && watchAPCollectionType === 'Collection service' && (
                <FormField
                    control={form.control}
                    name="paidAPCollection"
                    render={({ field }) => (
                    <FormItem className="space-y-3 ml-12">
                        <FormLabel>Do you pay for this service?</FormLabel>
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
                    name="shippingProviders"
                    render={() => (
                        <FormItem>
                            <div className="mb-4">
                                <FormLabel className="text-base">Who do you use for shipping?</FormLabel>
                            </div>
                             <div className="grid grid-cols-3 gap-2">
                                {shippingProviders.map((item) => (
                                <FormField
                                    key={item.id}
                                    control={form.control}
                                    name="shippingProviders"
                                    render={({ field }) => {
                                    return (
                                        <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                            checked={field.value?.includes(item.label)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                ? field.onChange([...(field.value || []), item.label])
                                                : field.onChange(
                                                    field.value?.filter(
                                                        (value) => value !== item.label
                                                    )
                                                    )
                                            }}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">{item.label}</FormLabel>
                                        </FormItem>
                                    )
                                    }}
                                />
                                ))}
                             </div>
                             <FormField
                                control={form.control}
                                name="otherShippingProvider"
                                render={({ field }) => (
                                    <FormItem className="mt-2">
                                        <FormLabel className="sr-only">Other Shipping Provider</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Other provider..." />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                                />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                 <FormField
                    control={form.control}
                    name="expressItemsPerWeek"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>How many Express items do you send a week?</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2">
                                {(['1 to 5', '6 to 10', '11 to 20', '21 to 30', '30 to 40', '40+'] as const).map(val => (
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
                    name="standardItemsPerWeek"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>How many Standard items do you send a week?</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2">
                                {(['1 to 5', '6 to 10', '11 to 20', '21 to 30', '30 to 40', '40+'] as const).map(val => (
                                    <FormItem key={`standard-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>
                                ))}
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                control={form.control}
                name="useSameDayCouriers"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel>Do you use same day couriers?</FormLabel>
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

                <FormField
                    control={form.control}
                    name="typicalWeight"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>What is the typical weight of your packages?</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2">
                                {(['<500g', '1-3kg', '3-5kg', '5-10kg', '10-20kg', '20kg+'] as const).map(val => (
                                    <FormItem key={`weight-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>
                                ))}
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                
                <FormField
                    control={form.control}
                    name="labelPlatform"
                    render={() => (
                        <FormItem>
                            <div className="mb-4">
                                <FormLabel className="text-base">What platform do you use to generate your label?</FormLabel>
                            </div>
                             <div className="grid grid-cols-3 gap-2">
                                {labelPlatforms.map((item) => (
                                <FormField
                                    key={item.id}
                                    control={form.control}
                                    name="labelPlatform"
                                    render={({ field }) => {
                                    return (
                                        <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                            checked={field.value?.includes(item.label)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                ? field.onChange([...(field.value || []), item.label])
                                                : field.onChange(
                                                    field.value?.filter(
                                                        (value) => value !== item.label
                                                    )
                                                    )
                                            }}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">{item.label}</FormLabel>
                                        </FormItem>
                                    )
                                    }}
                                />
                                ))}
                             </div>
                             <FormField
                                control={form.control}
                                name="otherLabelPlatform"
                                render={({ field }) => (
                                    <FormItem className="mt-2">
                                        <FormLabel className="sr-only">Other Label Platform</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Other platform..." />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                                />
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
              <DialogClose asChild>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : 'Save'}
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
