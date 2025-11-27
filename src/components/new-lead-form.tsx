
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AddressAutocomplete } from './address-autocomplete';
import type { Address } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createNewLead } from '@/services/firebase';
import { Loader } from './ui/loader';
import { Building, Mail, Phone, Globe, Tag, User, Briefcase, MapPin } from 'lucide-react';
import { industryCategories } from '@/lib/constants';

const phoneRegex = new RegExp(
  /^(\+61|0061|0)?\s?4[0-9]{2}\s?[0-9]{3}\s?[0-9]{3}$|^(\+61|0061|0)?\s?[2378]\s?[0-9]{4}\s?[0-9]{4}$/
);

const formSchema = z.object({
  // Company
  companyName: z.string().min(2, 'Company name is required'),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  industryCategory: z.string().optional(),

  // Address
  address: z.object({
    address1: z.string().optional(),
    street: z.string().min(1, 'Street name is required.'),
    city: z.string().min(1, 'Suburb is required.'),
    state: z.string().min(1, 'State is required.'),
    zip: z.string().min(1, 'Postcode is required.'),
    country: z.string().min(1, 'Country is required.'),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),

  // Contact
  contact: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    title: z.string().min(1, 'Title is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().regex(phoneRegex, 'Invalid Australian phone number'),
  }),
});

export function NewLeadForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: '',
      websiteUrl: '',
      industryCategory: '',
      address: {
        address1: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'Australia',
      },
      contact: {
        firstName: '',
        lastName: '',
        title: '',
        email: '',
        phone: '',
      },
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const result = await createNewLead(values);

      if (result.success) {
        toast({
            title: 'Lead Created',
            description: `${values.companyName} has been successfully created.`,
        });
        router.push(`/leads/${result.leadId}`);
      } else {
        toast({
            variant: 'destructive',
            title: 'NetSuite Error',
            description: result.message || 'Failed to create lead in NetSuite.',
        });
      }
    } catch (error: any) {
      console.error('Failed to create lead:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5" /> Company Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem><FormLabel>Company Name*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="websiteUrl" render={({ field }) => (
                <FormItem><FormLabel>Website</FormLabel><FormControl><Input {...field} placeholder="https://example.com" /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField
              control={form.control}
              name="industryCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an industry" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {industryCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" /> Address*</CardTitle>
          </CardHeader>
          <CardContent>
            <AddressAutocomplete />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Primary Contact*</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <FormField control={form.control} name="contact.firstName" render={({ field }) => (
                <FormItem><FormLabel>First Name*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="contact.lastName" render={({ field }) => (
                <FormItem><FormLabel>Last Name*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="contact.title" render={({ field }) => (
                <FormItem><FormLabel>Title*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="contact.email" render={({ field }) => (
                <FormItem><FormLabel>Email*</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="contact.phone" render={({ field }) => (
                <FormItem><FormLabel>Phone*</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader /> : 'Create Lead'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
