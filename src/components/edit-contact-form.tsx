'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { sendContactToNetSuite } from "@/services/netsuite"
import { logActivity } from "@/services/firebase"
import type { Contact } from "@/lib/types"
import { useAuth } from "@/hooks/use-auth"

const isValidRealEmail = (val: string | undefined | null) => {
    if (!val) return true;
    const email = val.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    const parts = email.split('@');
    const forbidden = ['n/a', 'na', 'none', 'nil', 'null', 'test', 'noemail', 'no-email', 'abc', '123', 'xyz', 'garbage'];
    
    // Check local part for exact forbidden match
    const isUserPartInvalid = forbidden.includes(parts[0]);
    
    // Check domain part labels for exact forbidden matches
    const domainLabels = parts[1].split('.');
    const isDomainPartInvalid = forbidden.some(p => domainLabels.includes(p));
    
    return !isUserPartInvalid && !isDomainPartInvalid;
};

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string()
    .email("Invalid email address")
    .refine(isValidRealEmail, { message: "Placeholder emails (like N/A) are not allowed." }),
  phone: z.string().min(1, "Phone number is required"),
  title: z.string().min(1, "Title is required"),
  isPrimary: z.boolean().default(false),
  isAccountsPayable: z.boolean().default(false),
  accessToLocalMile: z.boolean().default(false),
  accessToShipMate: z.boolean().default(false),
})

interface EditContactFormProps {
  leadId: string
  contact: Contact
  onContactUpdated: (contact: Contact) => void
  onClose: () => void;
  collectionName?: 'leads' | 'companies'
}

export function EditContactForm({ leadId, contact, onContactUpdated, onClose, collectionName = 'leads' }: EditContactFormProps) {
  const { toast } = useToast()
  const { user } = useAuth()

  const nameParts = (contact.name || '').trim().split(' ');
  const defaultFirstName = contact.firstName || nameParts[0] || '';
  const defaultLastName = contact.lastName || nameParts.slice(1).join(' ') || '';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: defaultFirstName,
      lastName: defaultLastName,
      email: contact.email,
      phone: contact.phone,
      title: contact.title,
      isPrimary: !!contact.isPrimary,
      isAccountsPayable: !!contact.isAccountsPayable,
      accessToLocalMile: contact.accessToLocalMile === 'yes',
      accessToShipMate: contact.accessToShipMate === 'yes',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const firstName = values.firstName.trim();
      const lastName = values.lastName.trim();
      const fullName = `${firstName} ${lastName}`.trim();
      const newAccessToLocalMile: 'yes' | 'no' = values.accessToLocalMile ? 'yes' : 'no';
      const newAccessToShipMate: 'yes' | 'no' = values.accessToShipMate ? 'yes' : 'no';

      // If LocalMile access was previously 'yes' and is now being revoked, call the deactivation endpoint
      const hadLocalMileAccess = contact.accessToLocalMile === 'yes';
      if (hadLocalMileAccess && !values.accessToLocalMile && values.email) {
        try {
          console.log(`[Edit Contact] Revoking LocalMile access for ${values.email} (lead: ${leadId})...`);
          await fetch('/api/localmile/deactivate-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: values.email,
              leadId: leadId,
              customer_id: leadId,
            }),
          });
        } catch (deactErr) {
          console.warn('[Edit Contact] Could not deactivate LocalMile user account via API:', deactErr);
        }
      }

      const updatedContactData: Contact = { 
        ...contact, 
        firstName,
        lastName,
        name: fullName,
        title: values.title,
        email: values.email,
        phone: values.phone,
        isPrimary: values.isPrimary,
        isAccountsPayable: values.isAccountsPayable,
        accessToLocalMile: newAccessToLocalMile,
        accessToShipMate: newAccessToShipMate,
      };

      const response = await sendContactToNetSuite({
        leadId,
        contact: {
          id: contact.id,
          firstName,
          lastName,
          name: fullName,
          title: values.title,
          email: values.email,
          phone: values.phone,
          isPrimary: values.isPrimary,
          isAccountsPayable: values.isAccountsPayable,
          accessToLocalMile: newAccessToLocalMile,
          accessToShipMate: newAccessToShipMate,
        }
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to update contact in NetSuite.");
      }

      const localMileNote = hadLocalMileAccess && !values.accessToLocalMile
        ? ' (LocalMile access revoked)'
        : !hadLocalMileAccess && values.accessToLocalMile
        ? ' (LocalMile access granted)'
        : '';

      await logActivity(leadId, {
          type: 'Update',
          notes: `Contact details updated for ${fullName}. Primary: ${values.isPrimary}, Accounts Payable: ${values.isAccountsPayable}, LocalMile: ${newAccessToLocalMile}${localMileNote}`,
          author: user?.displayName || 'Unknown'
      }, collectionName);

      toast({
        title: "Success",
        description: `Contact updated successfully.${localMileNote}`,
      })
      onContactUpdated(updatedContactData);
      onClose();
    } catch (error: any) {
      console.error("Failed to update contact:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update contact. Please try again.",
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title</FormLabel>
              <FormControl>
                <Input placeholder="CEO" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="john.doe@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="(123) 456-7890" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3 py-1">
          <FormField
            control={form.control}
            name="isPrimary"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-muted/20">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer font-semibold text-xs sm:text-sm">Primary Contact</FormLabel>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isAccountsPayable"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-muted/20">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer font-semibold text-xs sm:text-sm">Accounts Payable</FormLabel>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accessToLocalMile"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-emerald-50/40 border-emerald-200">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer font-semibold text-xs sm:text-sm text-emerald-950">LocalMile Access</FormLabel>
                  <p className="text-[11px] text-emerald-700">Parcel Pickup portal login</p>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accessToShipMate"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-blue-50/40 border-blue-200">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer font-semibold text-xs sm:text-sm text-blue-950">ShipMate Access</FormLabel>
                  <p className="text-[11px] text-blue-700">Courier Shipping portal login</p>
                </div>
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
        </div>
      </form>
    </Form>
  )
}