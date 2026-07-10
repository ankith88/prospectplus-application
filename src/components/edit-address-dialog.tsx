'use client'

import { useEffect } from "react"
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
import { Form } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { updateLeadDetails } from "@/services/firebase"
import { sendAddressUpdateToNetSuite } from "@/services/netsuite"
import type { Lead } from "@/lib/types"
import { AddressAutocomplete } from "./address-autocomplete"

const formSchema = z.object({
  address: z.object({
    address1: z.string().nullish(),
    street: z.string().min(1, "Street is required"),
    city: z.string().min(1, "Suburb is required"),
    state: z.string().min(1, "State is required"),
    zip: z.string().min(1, "Postcode is required"),
    country: z.string().default("Australia"),
    lat: z.number().nullish(),
    lng: z.number().nullish(),
  })
})

interface EditAddressDialogProps {
  lead: Lead
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onLeadUpdated: (updatedLead: Partial<Lead>, oldLead: Lead) => void
}

export function EditAddressDialog({
  lead,
  isOpen,
  onOpenChange,
  onLeadUpdated,
}: EditAddressDialogProps) {
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: {
        address1: lead.address?.address1 ?? "",
        street: lead.address?.street ?? "",
        city: lead.address?.city ?? "",
        state: lead.address?.state ?? "",
        zip: lead.address?.zip ?? "",
        country: lead.address?.country ?? "Australia",
        lat: lead.latitude ?? lead.address?.lat ?? undefined,
        lng: lead.longitude ?? lead.address?.lng ?? undefined,
      }
    },
  })

  useEffect(() => {
    if (isOpen) {
      form.reset({
        address: {
          address1: lead.address?.address1 ?? "",
          street: lead.address?.street ?? "",
          city: lead.address?.city ?? "",
          state: lead.address?.state ?? "",
          zip: lead.address?.zip ?? "",
          country: lead.address?.country ?? "Australia",
          lat: lead.latitude ?? lead.address?.lat ?? undefined,
          lng: lead.longitude ?? lead.address?.lng ?? undefined,
        }
      })
    }
  }, [isOpen, lead, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const addressUpdate = {
        ...values.address,
        lat: values.address.lat ?? lead.latitude ?? undefined,
        lng: values.address.lng ?? lead.longitude ?? undefined,
      };
      
      const payload: Partial<Lead> = {
          address: addressUpdate,
      };
      
      if (values.address.lat !== undefined && values.address.lng !== undefined) {
          payload.latitude = values.address.lat;
          payload.longitude = values.address.lng;
      }

      await updateLeadDetails(lead.id, lead, payload)
      onLeadUpdated(payload, lead)
      
      const mergedSiteAddress = {
          ...lead.address,
          ...addressUpdate,
      };

      await sendAddressUpdateToNetSuite({
        leadId: lead.id,
        address: mergedSiteAddress,
        postalAddress: lead.postalAddress,
      })

      toast({
        title: "Address Updated",
        description: "The address details have been saved successfully.",
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update address:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save address. Please try again.",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border overflow-visible">
        <DialogHeader>
          <DialogTitle>Edit Site Address</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <AddressAutocomplete />
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
