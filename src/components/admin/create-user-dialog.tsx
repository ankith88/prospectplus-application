'use client';

import { useState, useEffect } from 'react';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '../ui/loader';
import { getAllUsers } from '@/services/firebase';
import type { UserProfile } from '@/lib/types';


const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email('A valid email is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  role: z.enum(['user', 'Outbound Admin', 'admin', 'Field Sales', 'Field Sales Admin', 'Lead Gen', 'Lead Gen Admin', 'Franchisee', 'Dashback', 'Sales Manager', 'Account Managers', 'Marketing Admin', 'Marketing Manager', 'Customer Success', 'Customer Service', 'Operations', 'Finance', 'Finanace Manager', 'Finance Manager', 'Data Admin']),
  phoneNumber: z.string().optional(),
  mobileNumber: z.string().optional(),
  aircallPhoneNumber: z.string().optional(),
  aircallUserId: z.string().optional(),
  linkedSalesRep: z.string().optional(),
  linkedBDR: z.string().optional(),
  franchisee: z.string().optional(),
  sendWelcomeEmail: z.boolean().default(true),
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
      mobileNumber: '',
      aircallPhoneNumber: '',
      aircallUserId: '',
      linkedSalesRep: '',
      linkedBDR: '',
      franchisee: '',
      sendWelcomeEmail: true,
    },
  });

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const users = await getAllUsers();
          setAllUsers(users);
        } catch (error) {
          console.error('Failed to fetch users:', error);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [isOpen]);

  const activeBDRs = allUsers.filter(u => u.assignedRoles?.includes('user') && !u.disabled);

  const role = form.watch('role');

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await signUpAndCreateProfile(values);

      if (values.sendWelcomeEmail) {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://prospectplus.mailplus.com.au';
        const signInLink = `${origin}/signin`;
        const emailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); color: #334155; line-height: 1.6;">
  <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px;">
    <h1 style="color: #095C7B; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.025em;">Prospect<span style="color: #F59E0B;">+</span></h1>
    <p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">Outbound Leads CRM</p>
  </div>

  <div>
    <p style="margin-top: 0; font-weight: 600; font-size: 18px; color: #1e293b;">Welcome to Prospect+, ${values.firstName}!</p>
    <p>Your administrator has created an account for you. You can now log in and start managing outbound leads and campaigns.</p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 24px 0;">
      <h3 style="color: #095C7B; font-size: 15px; font-weight: 600; margin-top: 0; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Your Login Credentials</h3>
      
      <table style="width: 100%; border-collapse: collapse; margin: 0;">
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: #64748b; width: 80px; font-weight: 500;">Email:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-family: monospace; font-weight: 600;">${values.email}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: #64748b; font-weight: 500;">Password:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-family: monospace; font-weight: 600;">${values.password}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${signInLink}" style="background-color: #095C7B; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 15px; font-weight: 600; border-radius: 6px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(9, 92, 123, 0.2), 0 2px 4px -1px rgba(9, 92, 123, 0.1);">
        Sign In to Prospect+
      </a>
    </div>

    <p style="font-size: 14px; color: #64748b; margin-bottom: 24px;">
      If the button above does not work, copy and paste this link into your browser:<br>
      <a href="${signInLink}" style="color: #095C7B; word-break: break-all;">${signInLink}</a>
    </p>

    <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 28px; font-size: 14px; color: #64748b;">
      <p style="margin: 0;">Kind regards,</p>
      <p style="margin: 4px 0 0 0; font-weight: 600; color: #1e293b;">Ankith Ravindran</p>
      <p style="margin: 2px 0 0 0;">MailPlus Outbound Leads CRM Team</p>
    </div>
  </div>
</div>
        `;

        await fetch('/api/campaigns/send-custom-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: values.email,
            subject: 'Your Prospct+ Account is Ready',
            customFrom: 'ankith.ravindran@mailplus.com.au',
            html: emailHtml,
          }),
        });
      }

      toast({
        title: 'Success',
        description: `User ${values.email} has been created${values.sendWelcomeEmail ? ' and welcome email sent' : ''}.`,
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
                        <SelectItem value="Outbound Admin">Outbound Admin</SelectItem>
                        <SelectItem value="admin">Admin (admin)</SelectItem>
                        <SelectItem value="Field Sales">Field Sales</SelectItem>
                        <SelectItem value="Field Sales Admin">Field Sales Admin</SelectItem>
                        <SelectItem value="Lead Gen">Lead Gen</SelectItem>
                        <SelectItem value="Lead Gen Admin">Lead Gen Admin</SelectItem>
                        <SelectItem value="Franchisee">Franchisee</SelectItem>
                        <SelectItem value="Dashback">Dashback</SelectItem>
                        <SelectItem value="Sales Manager">Sales Manager</SelectItem>
                        <SelectItem value="Account Managers">Account Managers</SelectItem>
                        <SelectItem value="Marketing Admin">Marketing Admin</SelectItem>
                        <SelectItem value="Marketing Manager">Marketing Manager</SelectItem>
                        <SelectItem value="Customer Success">Customer Success</SelectItem>
                        <SelectItem value="Customer Service">Customer Service</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Finanace Manager">Finanace Manager</SelectItem>
                        <SelectItem value="Finance Manager">Finance Manager</SelectItem>
                        <SelectItem value="Data Admin">Data Admin</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage /></FormItem>
            )}/>
            {role === 'Franchisee' && (
                <FormField control={form.control} name="franchisee" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Franchise Name*</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Sydney City" /></FormControl>
                      <FormDescription>Users with the Franchisee role will only see leads and signed customers associated with this specific franchise.</FormDescription>
                      <FormMessage />
                    </FormItem>
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
                        {loadingUsers ? (
                          <div className="p-2 text-center text-sm"><Loader /></div>
                        ) : activeBDRs.length > 0 ? (
                          activeBDRs.map((bdr) => (
                            <SelectItem key={bdr.uid} value={bdr.displayName || bdr.email}>
                              {bdr.displayName || bdr.email}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-center text-sm text-muted-foreground">No active BDRs found</div>
                        )}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )}/>
              </>
            )}
             <FormField control={form.control} name="mobileNumber" render={({ field }) => (
                 <FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
             )}/>
             <FormField control={form.control} name="aircallPhoneNumber" render={({ field }) => (
                 <FormItem><FormLabel>AirCall Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
             )}/>
             <FormField control={form.control} name="aircallUserId" render={({ field }) => (
                <FormItem><FormLabel>AirCall User ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="sendWelcomeEmail" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Send Welcome Email</FormLabel>
                    <FormDescription>
                      Send an account setup email to this user containing their login credentials and a sign-in link.
                    </FormDescription>
                  </div>
                </FormItem>
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
