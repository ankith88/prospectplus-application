
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
import { useToast } from "@/hooks/use-toast"
import { addContactToLead } from "@/services/firebase"
import { sendContactToNetSuite } from "@/services/netsuite"
import { DialogClose } from "./ui/dialog"
import { useRef } from "react"
import type { Contact } from "@/lib/types"

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  title: z.string().min(1, "Title is required"),
})

interface AddContactFormProps {
  leadId: string
  onContactAdded: (contact: z.infer<typeof formSchema>) => void
}

export function AddContactForm({ leadId, onContactAdded }: AddContactFormProps) {
  const { toast } = useToast()
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      title: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const contactData: Omit<Contact, 'id'> = {
        name: `${values.firstName} ${values.lastName}`,
        title: values.title,
        email: values.email,
        phone: values.phone,
      }
      const contactId = await addContactToLead(leadId, contactData)
      toast({
        title: "Success",
        description: "Contact added successfully.",
      })
      onContactAdded(values)
      form.reset()
      closeButtonRef.current?.click();

      // Call NetSuite
      const nsResult = await sendContactToNetSuite({ 
        leadId, 
        contact: { ...contactData, id: contactId } 
      });

      if (nsResult.success) {
        toast({
          title: "NetSuite Updated",
          description: "Contact information sent to NetSuite.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "NetSuite Sync Failed",
          description: nsResult.message,
        });
      }

    } catch (error) {
      console.error("Failed to add contact:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add contact. Please try again.",
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
              <FormLabel>Title</FormLabel>
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
        <div className="flex justify-end gap-2">
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              {/* This is a hidden button to programmatically close the dialog */}
              <button ref={closeButtonRef} style={{ display: 'none' }} />
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Adding..." : "Add Contact"}
            </Button>
        </div>
      </form>
    </Form>
  )
}
