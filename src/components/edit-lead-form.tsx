
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
import { updateLeadDetails } from "@/services/firebase"
import type { Lead } from "@/lib/types"

const formSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  customerServiceEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().min(1, "Phone number is required"),
})

interface EditLeadFormProps {
  lead: Lead
  onLeadUpdated: (lead: Partial<Lead>) => void
}

export function EditLeadForm({ lead, onLeadUpdated }: EditLeadFormProps) {
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: lead.companyName,
      customerServiceEmail: lead.customerServiceEmail ?? '',
      customerPhone: lead.customerPhone ?? '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await updateLeadDetails(lead.id, values);
      toast({
        title: "Success",
        description: "Lead details updated successfully.",
      })
      onLeadUpdated(values);
    } catch (error) {
      console.error("Failed to update lead details:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update lead details. Please try again.",
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Inc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        <FormField
          control={form.control}
          name="customerServiceEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="contact@acme.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="customerPhone"
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
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
        </div>
      </form>
    </Form>
  )
}
