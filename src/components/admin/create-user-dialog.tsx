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
import { generateWelcomeEmailHtml } from '@/lib/welcome-email-template';
import { getAllUsers, getAllFranchisees } from '@/services/firebase';
import type { UserProfile, Franchisee } from '@/lib/types';


const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email('A valid email is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  role: z.enum(['user', 'Outbound Admin', 'admin', 'Field Sales', 'Field Sales Admin', 'Lead Gen', 'Lead Gen Admin', 'Franchisee', 'Dashback', 'Sales Manager', 'Account Managers', 'Marketing Manager', 'Customer Success', 'Customer Service', 'Operations', 'Finance', 'Finanace Manager', 'Finance Manager', 'Data Admin']),
  phoneNumber: z.string().optional(),
  mobileNumber: z.string().optional(),
  aircallPhoneNumber: z.string().optional(),
  aircallUserId: z.string().optional(),
  linkedSalesRep: z.string().optional(),
  linkedBDR: z.string().optional(),
  franchisee: z.string().optional(),
  franchiseeId: z.string().optional(),
  franchiseeRole: z.enum(['owner', 'investor']).default('owner'),
  personalEmail: z.string().optional(),
  abn: z.string().optional(),
  street: z.string().optional(),
  suburb: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  bsb: z.string().optional(),
  accountNumber: z.string().optional(),
  accountName: z.string().optional(),
  isOwnershipTransfer: z.boolean().optional().default(false),
  oldOwnerPersonalEmail: z.string().optional(),
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
  const { signUpAndCreateProfile, userProfile } = useAuth();

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
      franchiseeId: '',
      franchiseeRole: 'owner',
      personalEmail: '',
      abn: '',
      street: '',
      suburb: '',
      state: '',
      postcode: '',
      bsb: '',
      accountNumber: '',
      accountName: '',
      isOwnershipTransfer: false,
      oldOwnerPersonalEmail: '',
      sendWelcomeEmail: true,
    },
  });

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allFranchisees, setAllFranchisees] = useState<Franchisee[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setLoadingUsers(true);
        try {
          const [users, frs] = await Promise.all([getAllUsers(), getAllFranchisees()]);
          setAllUsers(users);
          setAllFranchisees(frs);
        } catch (error) {
          console.error('Failed to fetch users/franchisees:', error);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  const activeBDRs = allUsers.filter(u => u.assignedRoles?.includes('user') && !u.disabled);

  const role = form.watch('role');
  const isOwnershipTransfer = form.watch('isOwnershipTransfer');

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const isSuperAdminRequiringApproval = userProfile?.uid === 'a543AEr3TcaHyj4c1Gh0fJoQ6UB2';
      const isGrantingAdmin = values.role === 'admin';
      
      const effectiveRole = (isSuperAdminRequiringApproval && isGrantingAdmin) ? 'user' : values.role;

      let newUserId: string | undefined;

      // Handle Franchise Ownership Transfer flow if requested
      if (values.role === 'Franchisee' && values.isOwnershipTransfer && values.franchiseeId && values.oldOwnerPersonalEmail) {
        const transferRes = await fetch('/api/admin/transfer-franchisee-ownership', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            franchiseeId: values.franchiseeId,
            newOwnerEmail: values.email,
            newOwnerName: `${values.firstName} ${values.lastName}`.trim(),
            oldOwnerPersonalEmail: values.oldOwnerPersonalEmail,
          }),
        });
        const transferData = await transferRes.json();
        if (!transferRes.ok || !transferData.success) {
          throw new Error(transferData.message || 'Franchise ownership transfer failed');
        }
        newUserId = transferData.newUserId || transferData.userId;
      } else {
        const fullAddressStr = [values.street, values.suburb, values.state, values.postcode].filter(Boolean).join(', ');
        const createdId = await signUpAndCreateProfile({
          ...values,
          role: effectiveRole,
          addressDetails: {
            street: values.street || '',
            suburb: values.suburb || '',
            state: values.state || '',
            postcode: values.postcode || '',
            fullAddress: fullAddressStr,
          },
          bankDetails: {
            bsb: values.bsb || '',
            accountNumber: values.accountNumber || '',
            accountName: values.accountName || '',
          },
        });
        if (createdId) newUserId = createdId;
      }

      if (isSuperAdminRequiringApproval && isGrantingAdmin && newUserId) {
        const { createAdminApprovalRequest } = await import('@/services/admin-approval');
        await createAdminApprovalRequest({
          targetUserId: newUserId,
          targetUserEmail: values.email,
          targetUserName: `${values.firstName} ${values.lastName}`.trim(),
          requestedByUid: userProfile.uid,
          requestedByName: userProfile.displayName || userProfile.email || 'Super Admin',
        });
      }

      if (values.sendWelcomeEmail) {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://prospectplus.mailplus.com.au';
        const signInLink = `${origin}/signin`;
        const fullName = `${values.firstName || ''} ${values.lastName || ''}`.trim() || values.email;
        const emailHtml = generateWelcomeEmailHtml({
          recipientName: fullName,
          email: values.email,
          password: values.password,
          signInLink,
          isPasswordReset: false,
        });

        await fetch('/api/campaigns/send-custom-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: values.email,
            subject: 'Your Prospect+ Account is Ready',
            customFrom: 'MailPlus IT Support <mailplusit@mailplus.com.au>',
            bcc: userProfile?.email || undefined,
            html: emailHtml,
          }),
        });
      }

      if (isSuperAdminRequiringApproval && isGrantingAdmin) {
        toast({
          title: 'User Created - Admin Approval Pending',
          description: `User ${values.email} has been created. A request to grant Admin access has been sent to Original Admin for approval.`,
          duration: 10000,
        });
      } else {
        toast({
          title: 'Success',
          description: `User ${values.email} has been created${values.sendWelcomeEmail ? ' and welcome email sent' : ''}.`,
        });
      }
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
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
                <div className="space-y-4 border p-3 rounded-md bg-muted/30">
                  <FormField control={form.control} name="franchiseeId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link Franchise Entity*</FormLabel>
                        <Select 
                          onValueChange={(val) => {
                            field.onChange(val);
                            const selectedFr = allFranchisees.find(f => String(f.internalId) === val);
                            if (selectedFr) {
                              form.setValue('franchisee', selectedFr.name);
                            }
                          }} 
                          value={field.value}
                        >
                          <FormControl><SelectTrigger><SelectValue placeholder="Select existing franchise..." /></SelectTrigger></FormControl>
                          <SelectContent className="max-h-60">
                            {allFranchisees.map(fr => (
                              <SelectItem key={fr.internalId} value={String(fr.internalId)}>
                                {fr.name || 'Unnamed'} ({fr.internalId})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Select the official franchise entity to link with this user account.</FormDescription>
                        <FormMessage />
                      </FormItem>
                  )}/>

                  <FormField control={form.control} name="franchiseeRole" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Franchisee Relationship / Type*</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select designation..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="investor">Investor</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Specify whether this user is an Owner or Investor of the linked franchise.</FormDescription>
                        <FormMessage />
                      </FormItem>
                  )}/>

                  <FormField control={form.control} name="personalEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Personal Email Address</FormLabel>
                        <FormControl><Input type="email" {...field} placeholder="e.g. personal.email@gmail.com" /></FormControl>
                        <FormMessage />
                      </FormItem>
                  )}/>

                  <div className="pt-2 border-t space-y-3">
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-700">Business & Bank Details</FormLabel>
                    <FormField control={form.control} name="abn" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">ABN (Australian Business Number)</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g. 12 345 678 901" /></FormControl>
                          <FormMessage />
                        </FormItem>
                    )}/>

                    <div className="grid grid-cols-3 gap-2">
                      <FormField control={form.control} name="bsb" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">BSB</FormLabel>
                            <FormControl><Input {...field} placeholder="000-000" /></FormControl>
                            <FormMessage />
                          </FormItem>
                      )}/>
                      <FormField control={form.control} name="accountNumber" render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className="text-xs">Bank Account Number</FormLabel>
                            <FormControl><Input {...field} placeholder="12345678" /></FormControl>
                            <FormMessage />
                          </FormItem>
                      )}/>
                    </div>

                    <FormField control={form.control} name="accountName" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Bank Account Name</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g. Smith Logistics Pty Ltd" /></FormControl>
                          <FormMessage />
                        </FormItem>
                    )}/>
                  </div>

                  <div className="pt-2 border-t space-y-3">
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-700">Address Details</FormLabel>
                    <FormField control={form.control} name="street" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Street Address</FormLabel>
                          <FormControl><Input {...field} placeholder="123 High Street" /></FormControl>
                          <FormMessage />
                        </FormItem>
                    )}/>
                    <div className="grid grid-cols-3 gap-2">
                      <FormField control={form.control} name="suburb" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Suburb</FormLabel>
                            <FormControl><Input {...field} placeholder="Sydney" /></FormControl>
                            <FormMessage />
                          </FormItem>
                      )}/>
                      <FormField control={form.control} name="state" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">State</FormLabel>
                            <FormControl><Input {...field} placeholder="NSW" /></FormControl>
                            <FormMessage />
                          </FormItem>
                      )}/>
                      <FormField control={form.control} name="postcode" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Postcode</FormLabel>
                            <FormControl><Input {...field} placeholder="2000" /></FormControl>
                            <FormMessage />
                          </FormItem>
                      )}/>
                    </div>
                  </div>

                  <div className="pt-2 border-t space-y-3">
                    <FormField control={form.control} name="isOwnershipTransfer" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                              Is Franchise Ownership Transfer / Sale?
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Check this if replacing an existing franchisee owner so their historic account is preserved under their personal email.
                            </FormDescription>
                          </div>
                        </FormItem>
                    )}/>

                    {isOwnershipTransfer && (
                      <FormField control={form.control} name="oldOwnerPersonalEmail" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Old Owner Personal Email*</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="e.g. tanvi.hegde@mailplus.com.au" />
                            </FormControl>
                            <FormDescription className="text-xs">
                              The outgoing franchisee will sign in using this personal email to retain access to their past leads & activity.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                      )}/>
                    )}
                  </div>
                </div>
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
             {role !== 'Franchisee' && (
               <>
                 <FormField control={form.control} name="aircallPhoneNumber" render={({ field }) => (
                     <FormItem><FormLabel>AirCall Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                 )}/>
                 <FormField control={form.control} name="aircallUserId" render={({ field }) => (
                    <FormItem><FormLabel>AirCall User ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                 )}/>
               </>
             )}
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
