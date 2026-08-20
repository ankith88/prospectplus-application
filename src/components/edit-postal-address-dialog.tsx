'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
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
import { useGoogleMapsScript } from '@/hooks/use-google-maps'
import { firestore } from "@/lib/firebase"
import { updateLeadDetails } from "@/services/firebase"
import { collection, getDocs } from "firebase/firestore"
import { Search, Building2, Loader2, MapPin } from "lucide-react"

const boxTypes = ["PO Box", "GPO Box"];

export function normalizeState(stateStr?: string): string {
  if (!stateStr) return '';
  const s = stateStr.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (s === 'nsw' || s === 'newsouthwales') return 'NSW';
  if (s === 'vic' || s === 'victoria') return 'VIC';
  if (s === 'qld' || s === 'queensland') return 'QLD';
  if (s === 'sa' || s === 'southaustralia') return 'SA';
  if (s === 'wa' || s === 'westernaustralia') return 'WA';
  if (s === 'tas' || s === 'tasmania') return 'TAS';
  if (s === 'act' || s === 'australiancapitalterritory') return 'ACT';
  if (s === 'nt' || s === 'northernterritory') return 'NT';
  return stateStr.trim().toUpperCase();
}

function calculateDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
    const boxType = foundPrefix.toUpperCase().includes("GPO") ? "GPO Box" : "PO Box";
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
    const boxType = foundPrefix.toUpperCase().includes("GPO") ? "GPO Box" : "PO Box";
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
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [suburbSearch, setSuburbSearch] = useState('');

  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  
  const { isLoaded } = useGoogleMapsScript();

  const dummyDivRef = useCallback((node: HTMLDivElement | null) => {
    if (node && isLoaded && window.google && !placesService.current) {
      placesService.current = new window.google.maps.places.PlacesService(node);
    }
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded && window.google && !autocompleteService.current) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

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

  // Determine customer's state
  const formState = form.watch("address.state");
  const customerState = useMemo(() => {
    const rawState = formState || lead.address?.state || lead.state || '';
    return normalizeState(rawState);
  }, [formState, lead]);

  // Extract site coordinates for distance sorting if available
  const leadLat = lead?.latitude != null ? Number(lead.latitude) : ((lead as any)?.lat != null ? Number((lead as any).lat) : (lead?.address?.lat != null ? Number(lead.address.lat) : null));
  const leadLng = lead?.longitude != null ? Number(lead.longitude) : ((lead as any)?.lng != null ? Number((lead as any).lng) : (lead?.address?.lng != null ? Number(lead.address.lng) : null));

  // Load Australia Post partner locations in the customer's state
  useEffect(() => {
    if (!isOpen) return;

    async function loadStatePartnerLocations() {
      setLoadingLocations(true);
      try {
        const locationsSnap = await getDocs(collection(firestore, 'partner_locations'));
        const locs: any[] = [];

        locationsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          const locType = (data.locationType || data.type || '').toString().trim().toLowerCase();
          const isAusPost = locType === 'auspost' || locType === 'australia post' || locType === 'lpo' || locType === 'post office' || locType === 'postshop' || !locType;

          if (isAusPost) {
            const locState = normalizeState(data.state || data.address?.state);
            if (!customerState || locState === customerState) {
              const locLat = parseFloat(data.lat || data.latitude);
              const locLng = parseFloat(data.lng || data.longitude);
              const hasCoords = leadLat !== null && leadLng !== null && !isNaN(leadLat) && !isNaN(leadLng) && !isNaN(locLat) && !isNaN(locLng);
              const distanceKm = hasCoords ? calculateDistanceInKm(leadLat, leadLng, locLat, locLng) : null;

              locs.push({
                id: docSnap.id,
                ...data,
                distanceKm
              });
            }
          }
        });

        // Sort by distance if available, otherwise by suburb and name
        locs.sort((a, b) => {
          if (a.distanceKm !== null && b.distanceKm !== null) {
            return a.distanceKm - b.distanceKm;
          }
          if (a.distanceKm !== null) return -1;
          if (b.distanceKm !== null) return 1;
          const subA = (a.suburb || a.city || '').toLowerCase();
          const subB = (b.suburb || b.city || '').toLowerCase();
          if (subA !== subB) return subA.localeCompare(subB);
          return (a.name || '').localeCompare(b.name || '');
        });

        setPartnerLocations(locs);
      } catch (error) {
        console.error("Failed to load state partner locations:", error);
      } finally {
        setLoadingLocations(false);
      }
    }

    loadStatePartnerLocations();
  }, [isOpen, customerState, leadLat, leadLng]);

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
      setSuburbSearch('');
    }
  }, [isOpen, lead, form])

  // Filter partner locations dynamically based on suburb search or form suburb value
  const cityValue = form.watch("address.city");
  
  const filteredLocations = useMemo(() => {
    const searchTerm = (suburbSearch || cityValue || '').trim().toLowerCase();
    if (!searchTerm) return partnerLocations;

    return partnerLocations.filter((loc) => {
      const suburb = (loc.suburb || loc.city || '').toLowerCase();
      const postcode = (loc.postCode || loc.postcode || loc.zip || '').toLowerCase();
      const name = (loc.name || loc.locationName || '').toLowerCase();
      const street = (loc.address1 || loc.street || '').toLowerCase();

      return (
        suburb.includes(searchTerm) ||
        postcode.includes(searchTerm) ||
        name.includes(searchTerm) ||
        street.includes(searchTerm)
      );
    });
  }, [partnerLocations, suburbSearch, cityValue]);

  // Handler for selecting a partner location (prefills address details)
  const handleSelectPartnerLocation = useCallback((loc: any) => {
    if (!loc) {
      form.setValue('partnerLocationId', '', { shouldDirty: true });
      return;
    }

    const streetAddr = loc.address1 || loc.street || loc.address || loc.name || '';
    const suburb = loc.suburb || loc.city || '';
    const state = loc.state || customerState || '';
    const zip = loc.postCode || loc.postcode || loc.zip || '';
    const lat = parseFloat(loc.lat || loc.latitude);
    const lng = parseFloat(loc.lng || loc.longitude);

    form.setValue('partnerLocationId', loc.id || loc.internalId || '', { shouldDirty: true, shouldValidate: true });
    form.setValue('address.street', streetAddr, { shouldDirty: true, shouldValidate: true });
    form.setValue('address.city', suburb, { shouldDirty: true, shouldValidate: true });
    form.setValue('address.state', state, { shouldDirty: true, shouldValidate: true });
    form.setValue('address.zip', zip, { shouldDirty: true, shouldValidate: true });

    if (!isNaN(lat)) form.setValue('address.lat', lat, { shouldDirty: true });
    if (!isNaN(lng)) form.setValue('address.lng', lng, { shouldDirty: true });

    form.trigger(['address.street', 'address.city', 'address.state', 'address.zip']);

    toast({
      title: "AusPost Location Selected",
      description: `Prefilled address details for ${loc.name || suburb}.`,
    });
  }, [form, customerState, toast]);

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
      const selectedPartnerLoc = partnerLocations.find(l => l.id === values.partnerLocationId || l.internalId === values.partnerLocationId);
      const partnerLocName = selectedPartnerLoc ? (selectedPartnerLoc.name || selectedPartnerLoc.locationName || '') : '';

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
        partnerLocationName: partnerLocName || undefined,
      };

      const updateData: Record<string, any> = {
        postalAddress: updatedPostalAddress,
      };
      if (values.partnerLocationId) {
        updateData.partnerLocationId = values.partnerLocationId;
        if (selectedPartnerLoc) {
          updateData.partnerLocation = selectedPartnerLoc;
        }
      }
      if (partnerLocName) {
        updateData.partnerLocationName = partnerLocName;
      }

      await updateLeadDetails(lead.id, lead, updateData);

      onLeadUpdated(updateData, lead);

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
                      <Input placeholder="e.g. 1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* AusPost Partner Location Selector & Suburb Search */}
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <FormLabel className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Building2 className="h-4 w-4 text-primary" />
                  Select Partner AusPost Location
                </FormLabel>
                {customerState && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                    State: {customerState}
                  </span>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by suburb or location name..."
                  value={suburbSearch}
                  onChange={(e) => setSuburbSearch(e.target.value)}
                  className="pl-9 pr-14 bg-background h-9 text-xs"
                />
                {suburbSearch && (
                  <button
                    type="button"
                    onClick={() => setSuburbSearch('')}
                    className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>

              {loadingLocations ? (
                <div className="flex items-center justify-center py-3 text-xs text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Loading Australia Post locations...
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="partnerLocationId"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          const match = partnerLocations.find(l => l.id === val || l.internalId === val);
                          if (match) {
                            handleSelectPartnerLocation(match);
                          }
                        }}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background text-xs">
                            <SelectValue placeholder={filteredLocations.length > 0 ? "Select AusPost location in state..." : "No matching AusPost locations found"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60">
                          {filteredLocations.length === 0 ? (
                            <div className="p-3 text-xs text-center text-muted-foreground">
                              No Australia Post locations found{suburbSearch ? ` matching "${suburbSearch}"` : ''}{customerState ? ` in ${customerState}` : ''}.
                            </div>
                          ) : (
                            filteredLocations.map((loc) => {
                              const locId = loc.id || loc.internalId;
                              const name = loc.name || loc.locationName || 'AusPost Location';
                              const suburb = loc.suburb || loc.city || '';
                              const postcode = loc.postCode || loc.postcode || loc.zip || '';
                              const addr = loc.address1 || loc.street || '';
                              const dist = loc.distanceKm !== null && loc.distanceKm !== undefined ? ` (${loc.distanceKm.toFixed(1)} km)` : '';

                              return (
                                <SelectItem key={locId} value={locId}>
                                  <div className="flex flex-col text-left py-0.5">
                                    <span className="font-medium text-xs">
                                      {name} {suburb ? `(${suburb})` : ''} {dist}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                      {[addr, suburb, loc.state, postcode].filter(Boolean).join(', ')}
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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

