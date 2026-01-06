
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
import { DialogClose } from "./ui/dialog"
import { useRef } from "react"
import type { Contact } from "@/lib/types"

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  title: z.string().min(1, "Title is required"),
})

interface AddContactFormProps {
  leadId: string
  onContactAdded: (contact: Omit<Contact, 'id'>) => void
}

export function AddContactForm({ leadId, onContactAdded }: AddContactFormProps) {
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      title: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const contactData: Omit<Contact, 'id'> = {
        name: values.name,
        title: values.title,
        email: values.email,
        phone: values.phone || '',
      }
      const newContactId = await addContactToLead(leadId, contactData)
      toast({
        title: "Success",
        description: "Contact added successfully.",
      })
      onContactAdded({ ...contactData, id: newContactId });
      form.reset()

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Manager" {...field} />
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
              <FormLabel>Phone Number (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="0412 345 678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Adding..." : "Add Contact"}
            </Button>
        </div>
      </form>
    </Form>
  )
}
