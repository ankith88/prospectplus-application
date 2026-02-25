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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { updateLeadDetails } from "@/services/firebase"
import { sendLeadUpdateToNetSuite } from "@/services/netsuite"
import type { Lead, Address } from "@/lib/types"
import { industryCategories } from "@/lib/constants"
import { ScrollArea } from "./ui/scroll-area"

const formSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  customerServiceEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  industryCategory: z.string().optional(),
})

interface EditLeadFormProps {
  lead: Lead
  onLeadUpdated: (lead: Partial<Lead>, oldLead: Lead) => void
}

export function EditLeadForm({ lead, onLeadUpdated }: EditLeadFormProps) {
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: lead.companyName,
      customerServiceEmail: lead.customerServiceEmail ?? '',
      customerPhone: lead.customerPhone ?? '',
      websiteUrl: lead.websiteUrl ?? '',
      industryCategory: lead.industryCategory ?? '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await updateLeadDetails(lead.id, lead, values);
      onLeadUpdated(values, lead);

      // Call NetSuite
      const nsResult = await sendLeadUpdateToNetSuite({
        leadId: lead.id,
        companyName: values.companyName,
        email: values.customerServiceEmail,
        phone: values.customerPhone,
        website: values.websiteUrl,
        industry: values.industryCategory,
      });

      if (nsResult.success) {
        toast({
          title: "Profile Updated",
          description: "Details successfully saved and synced with NetSuite.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "NetSuite Sync Failed",
          description: nsResult.message,
        });
      }

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
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
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="0400 000 000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="websiteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
        </div>
      </form>
    </Form>
  )
}
