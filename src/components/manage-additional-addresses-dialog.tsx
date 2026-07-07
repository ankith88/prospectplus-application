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
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { addAdditionalAddress, updateAdditionalAddress } from "@/services/firebase"
import type { TaggedAddress } from "@/lib/types"
import { AddressAutocomplete } from "./address-autocomplete"
import { useEffect, useState } from "react"

const standardTags = ["Billing", "Shipping", "Warehouse", "Office", "Mailing"];

const formSchema = z.object({
  tag: z.string().min(1, "Tag is required"),
  customTag: z.string().optional(),
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

interface ManageAdditionalAddressesDialogProps {
  leadId: string
  isCompany: boolean
  addressToEdit?: TaggedAddress | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onAddressSaved: () => void
}

export function ManageAdditionalAddressesDialog({
  leadId,
  isCompany,
  addressToEdit,
  isOpen,
  onOpenChange,
  onAddressSaved,
}: ManageAdditionalAddressesDialogProps) {
  const { toast } = useToast()
  const [showCustomTag, setShowCustomTag] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tag: "",
      customTag: "",
      address: {
        address1: "",
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "Australia",
        lat: undefined,
        lng: undefined,
      }
    },
  })

  useEffect(() => {
    if (isOpen) {
      if (addressToEdit) {
        const isStandard = standardTags.includes(addressToEdit.tag);
        form.reset({
          tag: isStandard ? addressToEdit.tag : "Custom",
          customTag: isStandard ? "" : addressToEdit.tag,
          address: {
            address1: addressToEdit.address1 ?? "",
            street: addressToEdit.street ?? "",
            city: addressToEdit.city ?? "",
            state: addressToEdit.state ?? "",
            zip: addressToEdit.zip ?? "",
            country: addressToEdit.country ?? "Australia",
            lat: addressToEdit.lat ?? undefined,
            lng: addressToEdit.lng ?? undefined,
          }
        })
        setShowCustomTag(!isStandard)
      } else {
        form.reset({
          tag: "",
          customTag: "",
          address: {
            address1: "",
            street: "",
            city: "",
            state: "",
            zip: "",
            country: "Australia",
            lat: undefined,
            lng: undefined,
          }
        })
        setShowCustomTag(false)
      }
    }
  }, [isOpen, addressToEdit, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const finalTag = values.tag === "Custom" ? (values.customTag || "Other").trim() : values.tag;
      if (!finalTag) {
        form.setError("customTag", { type: "manual", message: "Custom tag is required" });
        return;
      }

      const addressData: Omit<TaggedAddress, 'id'> = {
        tag: finalTag,
        address1: values.address.address1 || undefined,
        street: values.address.street,
        city: values.address.city,
        state: values.address.state,
        zip: values.address.zip,
        country: values.address.country,
        lat: values.address.lat ?? undefined,
        lng: values.address.lng ?? undefined,
      }

      if (addressToEdit?.id) {
        await updateAdditionalAddress(leadId, addressToEdit.id, addressData, isCompany)
        toast({
          title: "Address Updated",
          description: "The address details have been updated successfully.",
        })
      } else {
        await addAdditionalAddress(leadId, addressData, isCompany)
        toast({
          title: "Address Added",
          description: "New address has been added successfully.",
        })
      }

      onAddressSaved()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save address:", error)
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
          <DialogTitle>{addressToEdit ? "Edit Address" : "Add Additional Address"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Tag*</FormLabel>
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val)
                      setShowCustomTag(val === "Custom")
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tag description" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {standardTags.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                      <SelectItem value="Custom">Custom...</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showCustomTag && (
              <FormField
                control={form.control}
                name="customTag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Tag Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Back Warehouse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
