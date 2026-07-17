'use client'

import { useEffect, useRef, useState, useCallback } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { sendAddressUpdateToNetSuite } from "@/services/netsuite"
import type { Lead, Address } from "@/lib/types"
import { useJsApiLoader } from '@react-google-maps/api'
import { firestore } from "@/lib/firebase"
import { updateLeadDetails } from "@/services/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"

const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places', 'drawing', 'geometry', 'visualization'];
const boxTypes = ["PO Box", "P.O. Box", "GPO Box", "G.P.O Box"];

const formSchema = z.object({
  boxType: z.string().min(1, "Box type is required"),
  boxNumber: z.string().min(1, "Box number is required"),
  partnerLocationId: z.string().optional(),
  address: z.object({
    street: z.string().min(1, "Post Office location is required"),
    city: z.string().min(1, "Suburb is required"),
    state: z.string().min(1, "State is required"),
    zip: z.string().min(1, "Postcode is required"),
    country: z.string().default("Australia"),
    lat: z.number().nullish(),
    lng: z.number().nullish(),
  })
})

interface EditPostalAddressDialogProps {
  lead: Lead
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onLeadUpdated: (updatedLead: Partial<Lead>, oldLead: Lead) => void
}

const parseAddressComponents = (components: google.maps.GeocoderAddressComponent[]): Address => {
  const address: Partial<Address> = { country: 'Australia' };
  const get = (type: string, useShortName = false) => {
      const comp = components.find(c => c.types.includes(type));
      return useShortName ? comp?.short_name : comp?.long_name;
  };

  const streetNumber = get('street_number');
  const route = get('route');
  
  address.street = `${streetNumber || ''} ${route || ''}`.trim();
  address.address1 = get('subpremise');
  address.city = get('locality') || get('postal_town');
  address.state = get('administrative_area_level_1', true);
  address.zip = get('postal_code');

  return address as Address;
};

// Parser function to split the existing postalAddress
const parseExistingPostal = (postalAddress: any) => {
  if (!postalAddress) {
    return { boxType: "PO Box", boxNumber: "", street: "", partnerLocationId: "" };
  }
  
  const addr1 = postalAddress.address1 || "";
  const street = postalAddress.street || "";
  const partnerLocationId = postalAddress.partnerLocationId || "";
  
  // Try parsing address1 first (new format)
  const match1 = addr1.match(/^(PO Box|P\.O\. Box|GPO Box|G\.P\.O Box)\s+([A-Za-z0-9\-]+)$/i);
  if (match1) {
    const foundPrefix = match1[1];
    const boxType = boxTypes.find(p => p.toLowerCase() === foundPrefix.toLowerCase()) || "PO Box";
    return {
      boxType,
      boxNumber: match1[2],
      street,
      partnerLocationId
    };
  }
  
  // Fallback: parse street (old format)
  const match2 = street.match(/^(PO Box|P\.O\. Box|GPO Box|G\.P\.O Box)\s+([A-Za-z0-9\-]+)(?:,\s*(.*))?$/i);
  if (match2) {
    const foundPrefix = match2[1];
    const boxType = boxTypes.find(p => p.toLowerCase() === foundPrefix.toLowerCase()) || "PO Box";
    return {
      boxType,
      boxNumber: match2[2],
      street: match2[3] || "",
      partnerLocationId
    };
  }
  
  // Complete fallback
  return {
    boxType: "PO Box",
    boxNumber: "",
    street: street || addr1 || "",
    partnerLocationId
  };
};

export function EditPostalAddressDialog({
  lead,
  isOpen,
  onOpenChange,
  onLeadUpdated,
}: EditPostalAddressDialogProps) {
  const { toast } = useToast()
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [partnerLocations, setPartnerLocations] = useState<any[]>([]);

  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const dummyDivRef = useRef<HTMLDivElement>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  useEffect(() => {
    if (isLoaded && window.google) {
        if (!autocompleteService.current) {
            autocompleteService.current = new window.google.maps.places.AutocompleteService();
        }
        if (!placesService.current && dummyDivRef.current) {
            placesService.current = new window.google.maps.places.PlacesService(dummyDivRef.current);
        }
    }
  }, [isLoaded, isOpen]);

  const parsed = parseExistingPostal(lead.postalAddress);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      boxType: parsed.boxType,
      boxNumber: parsed.boxNumber,
      partnerLocationId: parsed.partnerLocationId,
      address: {
        street: parsed.street,
        city: lead.postalAddress?.city ?? "",
        state: lead.postalAddress?.state ?? "",
        zip: lead.postalAddress?.zip ?? "",
        country: lead.postalAddress?.country ?? "Australia",
        lat: lead.postalAddress?.lat ?? undefined,
        lng: lead.postalAddress?.lng ?? undefined,
      }
    },
  })

  // Fetch partner locations matching the postcode and/or suburb
  const fetchMatchingPartnerLocations = useCallback(async (postcode: string, suburb: string, state: string) => {
    if (!postcode && !suburb) {
      setPartnerLocations([]);
      return;
    }
    try {
      const promises = [];
      
      if (postcode) {
        const q1 = query(
          collection(firestore, 'partner_locations'),
          where('locationType', '==', 'AusPost'),
          where('postCode', '==', postcode.trim())
        );
        promises.push(getDocs(q1));
      }
      
      if (suburb) {
        const q2 = query(
          collection(firestore, 'partner_locations'),
          where('locationType', '==', 'AusPost'),
          where('suburb', '==', suburb.trim().toUpperCase())
        );
        promises.push(getDocs(q2));
      }
      
      const snaps = await Promise.all(promises);
      const uniqueLocsMap: Record<string, any> = {};
      
      snaps.forEach(snap => {
        snap.docs.forEach(docSnap => {
          const data = docSnap.data();
          const matchesState = !state || !data.state || data.state.trim().toLowerCase() === state.trim().toLowerCase();
          if (matchesState) {
            uniqueLocsMap[docSnap.id] = { id: docSnap.id, ...data };
          }
        });
      });
      
      const locs = Object.values(uniqueLocsMap);
      setPartnerLocations(locs);
      
      // Auto-select if there is only 1 match and no existing selection
      const currentSelection = form.getValues('partnerLocationId');
      if (locs.length === 1 && (!currentSelection || !locs.some(l => l.id === currentSelection))) {
        form.setValue('partnerLocationId', locs[0].id, { shouldDirty: true });
      } else if (currentSelection && !locs.some(l => l.id === currentSelection)) {
        form.setValue('partnerLocationId', '', { shouldDirty: true });
      }
    } catch (error) {
      console.error("Failed to fetch matching partner locations:", error);
    }
  }, [form]);

  const zipValue = form.watch("address.zip");
  const cityValue = form.watch("address.city");
  const stateValue = form.watch("address.state");

  useEffect(() => {
    fetchMatchingPartnerLocations(zipValue, cityValue, stateValue);
  }, [zipValue, cityValue, stateValue, fetchMatchingPartnerLocations]);

  useEffect(() => {
    if (isOpen) {
      const parsedValues = parseExistingPostal(lead.postalAddress);
      form.reset({
        boxType: parsedValues.boxType,
        boxNumber: parsedValues.boxNumber,
        partnerLocationId: parsedValues.partnerLocationId,
        address: {
          street: parsedValues.street,
          city: lead.postalAddress?.city ?? "",
          state: lead.postalAddress?.state ?? "",
          zip: lead.postalAddress?.zip ?? "",
          country: lead.postalAddress?.country ?? "Australia",
          lat: lead.postalAddress?.lat ?? undefined,
          lng: lead.postalAddress?.lng ?? undefined,
        }
      })
    }
  }, [isOpen, lead, form])

  const handleInputChange = useCallback((value: string) => {
    if (autocompleteService.current && value.trim()) {
        autocompleteService.current.getPlacePredictions(
            { 
                input: value, 
                componentRestrictions: { country: 'au' }
            },
            (preds, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && preds) {
                    setPredictions(preds);
                } else {
                    setPredictions([]);
                }
            }
        );
    } else {
        setPredictions([]);
    }
  }, []);

  const handlePredictionSelect = useCallback((prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current) return;
    
    placesService.current.getDetails(
        {
            placeId: prediction.place_id,
            fields: ['address_components', 'geometry', 'formatted_address', 'name'],
        },
        async (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                if (place.address_components) {
                    const parsedData = parseAddressComponents(place.address_components);
                    
                    let street = parsedData.street || '';
                    if (!street && place.formatted_address) {
                        const parts = place.formatted_address.split(',');
                        if (parts.length > 0) {
                            street = parts[0].trim();
                        }
                    }
                    if (!street && place.name) {
                        street = place.name;
                    }

                    form.setValue('address.street', street, { shouldValidate: true, shouldDirty: true });
                    form.setValue('address.city', parsedData.city || '', { shouldValidate: true, shouldDirty: true });
                    form.setValue('address.state', parsedData.state || '', { shouldValidate: true, shouldDirty: true });
                    form.setValue('address.zip', parsedData.zip || '', { shouldValidate: true, shouldDirty: true });
                    form.setValue('address.country', parsedData.country || 'Australia', { shouldValidate: true, shouldDirty: true });
                }
                if (place.geometry?.location) {
                    form.setValue('address.lat', place.geometry.location.lat(), { shouldDirty: true });
                    form.setValue('address.lng', place.geometry.location.lng(), { shouldDirty: true });
                }
                
                setPredictions([]);
                setIsFocused(false);
                
                await form.trigger(['address.street', 'address.city', 'address.state', 'address.zip', 'address.country']);
            }
        }
    );
  }, [form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const updatedPostalAddress = {
        address1: `${values.boxType} ${values.boxNumber}`,
        street: values.address.street,
        city: values.address.city,
        state: values.address.state,
        zip: values.address.zip,
        country: values.address.country,
        lat: values.address.lat ?? undefined,
        lng: values.address.lng ?? undefined,
        partnerLocationId: values.partnerLocationId || undefined,
      };

      await updateLeadDetails(lead.id, lead, {
        postalAddress: updatedPostalAddress,
      });

      onLeadUpdated({ postalAddress: updatedPostalAddress }, lead)

      const mergedSiteAddress = {
          ...lead.address,
          lat: lead.latitude,
          lng: lead.longitude,
      };

      await sendAddressUpdateToNetSuite({
        leadId: lead.id,
        address: mergedSiteAddress,
        postalAddress: updatedPostalAddress,
        tag: "postal",
        partnerLocationId: values.partnerLocationId || undefined,
      })

      toast({
        title: "Postal Address Updated",
        description: "The PO Box and postal details have been saved successfully and sent to NetSuite.",
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
      <DialogContent className="max-w-md bg-card border overflow-visible">
        <DialogHeader>
          <DialogTitle>Edit Postal / PO Box Address</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div ref={dummyDivRef} className="hidden" />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="boxType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Box Type*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {boxTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="boxNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Box Number*</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 111" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address.street"
              render={({ field }) => (
                <FormItem className="relative">
                  <FormLabel>Post Office Address / Location*</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        handleInputChange(e.target.value);
                      }}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => {
                        setTimeout(() => setIsFocused(false), 200);
                      }}
                      placeholder="Start typing Post Office street address..." 
                      autoComplete="off"
                    />
                  </FormControl>
                  {isFocused && predictions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                      {predictions.map((pred) => (
                        <button
                          key={pred.place_id}
                          type="button"
                          className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handlePredictionSelect(pred);
                          }}
                        >
                          {pred.description}
                        </button>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address.city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suburb*</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Ferryden Park" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address.state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State*</FormLabel>
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
                name="address.zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postcode*</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 5010" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address.country"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {partnerLocations.length > 0 && (
              <FormField
                control={form.control}
                name="partnerLocationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matching AusPost Location*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select AusPost Hub" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {partnerLocations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name} {loc.suburb ? `(${loc.suburb})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {zipValue && partnerLocations.length === 0 && (
              <p className="text-xs text-amber-500 font-semibold">
                No matching AusPost partner locations found for postcode {zipValue}.
              </p>
            )}

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
