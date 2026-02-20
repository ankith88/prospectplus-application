
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '../ui/loader';


const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email('A valid email is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  role: z.enum(['user', 'admin', 'Field Sales', 'Field Sales Admin', 'Lead Gen', 'Lead Gen Admin', 'Franchisee']),
  phoneNumber: z.string().optional(),
  aircallUserId: z.string().optional(),
  linkedSalesRep: z.string().optional(),
  linkedBDR: z.string().optional(),
  franchisee: z.string().optional(),
});

interface CreateUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

export function CreateUserDialog({ isOpen, onOpenChange, onUserCreated }: CreateUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { signUpAndCreateProfile } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'user',
      phoneNumber: '',
      aircallUserId: '',
      linkedSalesRep: '',
      linkedBDR: '',
      franchisee: '',
    },
  });

  const role = form.watch('role');

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await signUpAndCreateProfile(values);
      toast({
        title: 'Success',
        description: `User ${values.email} has been created.`,
      });
      onUserCreated();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Failed to create user:', error);
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: error.message || "An unexpected error occurred. Please try again.",
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>Fill in the details to create a new user account.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
            </div>
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="user">Dialer (user)</SelectItem>
                        <SelectItem value="admin">Admin (admin)</SelectItem>
                        <SelectItem value="Field Sales">Field Sales</SelectItem>
                        <SelectItem value="Field Sales Admin">Field Sales Admin</SelectItem>
                        <SelectItem value="Lead Gen">Lead Gen</SelectItem>
                        <SelectItem value="Lead Gen Admin">Lead Gen Admin</SelectItem>
                        <SelectItem value="Franchisee">Franchisee</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage /></FormItem>
            )}/>
            {role === 'Franchisee' && (
                <FormField control={form.control} name="franchisee" render={({ field }) => (
                    <FormItem><FormLabel>Franchise Name*</FormLabel><FormControl><Input {...field} placeholder="e.g. Sydney City" /></FormControl><FormDescription>Users with the Franchisee role will only see leads and signed customers associated with this specific franchise.</FormDescription><FormMessage /></FormItem>
                )}/>
            )}
            {role === 'Field Sales' && (
              <>
                <FormField control={form.control} name="linkedSalesRep" render={({ field }) => (
                  <FormItem><FormLabel>Account Manager</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select an Account Manager" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Kerina Helliwell">Kerina Helliwell</SelectItem>
                        <SelectItem value="Lee Russell">Lee Russell</SelectItem>
                        <SelectItem value="Luke Forbes">Luke Forbes</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="linkedBDR" render={({ field }) => (
                  <FormItem><FormLabel>BDR</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a BDR" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Lachlan Ball">Lachlan Ball</SelectItem>
                        <SelectItem value="Grant Leddy">Grant Leddy</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )}/>
              </>
            )}
            <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="aircallUserId" render={({ field }) => (
                <FormItem><FormLabel>AirCall User ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader /> : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
