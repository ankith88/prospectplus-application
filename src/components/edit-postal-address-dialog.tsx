'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  street: z.string().min(1, "PO Box / Street is required"),
  city: z.string().min(1, "Suburb is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(1, "Postcode is required"),
  country: z.string().default("Australia"),
})

interface EditPostalAddressDialogProps {
  lead: Lead
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onLeadUpdated: (updatedLead: Partial<Lead>, oldLead: Lead) => void
}

export function EditPostalAddressDialog({
  lead,
  isOpen,
  onOpenChange,
  onLeadUpdated,
}: EditPostalAddressDialogProps) {
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      street: lead.postalAddress?.street ?? "",
      city: lead.postalAddress?.city ?? "",
      state: lead.postalAddress?.state ?? "",
      zip: lead.postalAddress?.zip ?? "",
      country: lead.postalAddress?.country ?? "Australia",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const updatedLead = { ...lead, postalAddress: values }
      await updateLeadDetails(lead.id, lead, { postalAddress: values })
      onLeadUpdated({ postalAddress: values }, lead)
      toast({
        title: "Postal Address Updated",
        description: "The PO Box and postal details have been saved successfully.",
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update postal address:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save postal address. Please try again.",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border">
        <DialogHeader>
          <DialogTitle>Edit Postal / PO Box Address</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PO Box Number / Box Address</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. PO Box 111" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suburb / City</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Ferryden Park" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. SA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postcode</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 5010" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Australia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Address"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
