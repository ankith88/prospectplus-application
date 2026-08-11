'use client'

import { useEffect, useState } from "react"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { updateLeadDetails, logActivity } from "@/services/firebase"
import { sendAddressUpdateToNetSuite, sendCompanyCustomerUpdateToNetSuite } from "@/services/netsuite"
import type { Lead, UserProfile, Address } from "@/lib/types"
import { AddressAutocomplete } from "./address-autocomplete"
import { firestore } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import { AlertTriangle, CheckCircle2, Mail, Loader2 } from "lucide-react"

const formSchema = z.object({
  address: z.object({
    address1: z.string().nullish(),
    street: z.string().min(1, "Street is required"),
    city: z.string().nullish(),
    state: z.string().nullish(),
    zip: z.string().nullish(),
    country: z.string().default("Australia"),
    lat: z.number().nullish(),
    lng: z.number().nullish(),
  })
})

function getInitialAddress(lead: Lead) {
  let addrObj: any = lead.address;
  if (typeof addrObj !== 'object' || addrObj === null) {
    addrObj = {};
  }
  const clean = (val: any) => (val === "undefined" || !val ? "" : String(val));

  return {
    address1: clean(addrObj.address1 || (lead as any).unit || (lead as any).level || (lead as any).suite),
    street: clean(addrObj.street || (typeof lead.address === 'string' ? lead.address : '') || (lead as any).street),
    city: clean(addrObj.city || (lead as any).suburb || (lead as any).city),
    state: clean(addrObj.state || (lead as any).state),
    zip: clean(addrObj.zip || (lead as any).postcode || (lead as any).zip),
    country: clean(addrObj.country) || "Australia",
    lat: lead.latitude ?? addrObj.lat ?? undefined,
    lng: lead.longitude ?? addrObj.lng ?? undefined,
  };
}

interface EditAddressDialogProps {
  lead: Lead
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onLeadUpdated: (updatedLead: Partial<Lead>, oldLead: Lead) => void
  userProfile?: UserProfile | null
}

export function EditAddressDialog({
  lead,
  isOpen,
  onOpenChange,
  onLeadUpdated,
  userProfile,
}: EditAddressDialogProps) {
  const { toast } = useToast()

  const [isCheckingTerritory, setIsCheckingTerritory] = useState(false)
  const [matchedFranchisees, setMatchedFranchisees] = useState<any[]>([])
  const [territoryCheckDone, setTerritoryCheckDone] = useState(false)
  const [selectedFranchiseeId, setSelectedFranchiseeId] = useState<string>('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const isUserRole = userProfile?.activeRole === 'user' || userProfile?.role === 'user';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: getInitialAddress(lead),
    },
  })

  const checkTerritory = async (city: string, zip: string) => {
    if (!city || !zip) return;
    setIsCheckingTerritory(true);
    try {
      const snap = await getDocs(collection(firestore, 'franchisees'));
      const franchisees = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const cityLower = city.trim().toLowerCase();
      const zipLower = zip.trim().toLowerCase();

      const matches = franchisees.filter(f => {
        if (!f.territoryJson) return false;
        return f.territoryJson.some((t: any) =>
          t.suburbs?.toLowerCase().trim() === cityLower &&
          t.post_code?.toLowerCase().trim() === zipLower
        );
      });

      setMatchedFranchisees(matches);
      setTerritoryCheckDone(true);
      if (matches.length > 0) {
        const firstId = matches[0].internalId || matches[0].id;
        setSelectedFranchiseeId(String(firstId));
      }
    } catch (error) {
      console.error('Error checking territory:', error);
    } finally {
      setIsCheckingTerritory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const initial = getInitialAddress(lead);
      form.reset({
        address: initial,
      })
      setMatchedFranchisees([])
      setTerritoryCheckDone(false)
      setSelectedFranchiseeId('')
      setEmailSent(false)

      if (initial.city && initial.zip) {
        checkTerritory(initial.city, initial.zip);
      }
    }
  }, [isOpen, lead, form])

  const handleAddressSelect = (parsed: Address) => {
    if (parsed.city && parsed.zip) {
      checkTerritory(parsed.city, parsed.zip);
    }
  };

  const handleSendConfirmationEmail = async () => {
    setEmailSending(true);
    try {
      const currentAddrStr = lead.address ? `${lead.address.street || ''}, ${lead.address.city || ''} ${lead.address.state || ''} ${lead.address.zip || ''}`.trim() : 'N/A';
      const formVals = form.getValues().address;
      const newAddrStr = `${formVals.street}, ${formVals.city} ${formVals.state} ${formVals.zip}`.trim();
      const matchedNames = matchedFranchisees.map(m => m.name || m.franchiseeName || m.id).join(', ');

      const res = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lead_address_check',
          payload: {
            leadId: lead.id,
            companyName: lead.companyName,
            oldAddress: currentAddrStr,
            newAddress: newAddrStr,
            requesterName: userProfile?.displayName || userProfile?.name || 'User',
            requesterEmail: userProfile?.email || 'N/A',
            matchedFranchisees: matchedNames,
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmailSent(true);
        toast({
          title: 'Email Sent',
          description: 'Notification email sent to Aleyna & Ankith for address confirmation.',
        });
      } else {
        throw new Error(data.message || 'Failed to send email.');
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Email Error',
        description: err.message || 'Failed to send notification email.',
      });
    } finally {
      setEmailSending(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const addressUpdate = {
        ...values.address,
        address1: values.address.address1 ?? undefined,
        lat: values.address.lat ?? lead.latitude ?? undefined,
        lng: values.address.lng ?? lead.longitude ?? undefined,
      };

      const payload: Partial<Lead> = {
        address: addressUpdate,
      };

      if (values.address.lat != null && values.address.lng != null) {
        payload.latitude = values.address.lat;
        payload.longitude = values.address.lng;
      }

      let activityNote = `Site address updated to ${addressUpdate.street}, ${addressUpdate.city} ${addressUpdate.state} ${addressUpdate.zip}.`;

      if (territoryCheckDone) {
        if (matchedFranchisees.length > 1) {
          if (isUserRole) {
            payload.status = 'Address Check';
            payload.customerStatus = 'Address Check';
            activityNote += ` Multiple franchisees match. Status updated to Address Check (Waiting on Aleyna confirmation).`;
          } else {
            const chosen = matchedFranchisees.find(m => String(m.id) === selectedFranchiseeId || String(m.internalId) === selectedFranchiseeId) || matchedFranchisees[0];
            const chosenName = chosen.name || chosen.franchiseeName || chosen.id;
            const chosenId = chosen.internalId || chosen.id;
            payload.franchisee = chosenName;
            payload.franchisee_id = chosenId;
            activityNote += ` Mapped franchisee set to ${chosenName}.`;
          }
        } else if (matchedFranchisees.length === 0) {
          payload.status = 'Lost';
          payload.customerStatus = 'Lost';
          payload.statusReason = 'Out of Territory';
          payload.cancellationTheme = 'Business Changes';
          payload.cancellationThemeId = '5';
          payload.cancellationCategory = 'Relocating the business';
          payload.cancellationWhyId = '4';
          payload.cancellationReason = 'Moving locations to a non-serviceable area';
          payload.cancellationReasonId = '9';
          payload.cancellationdate = new Date().toISOString().split('T')[0];
          activityNote += ` Out of territory. Status changed to Lost (Out of Territory).`;
        } else if (matchedFranchisees.length === 1) {
          const matched = matchedFranchisees[0];
          const matchedName = matched.name || matched.franchiseeName || matched.id;
          const matchedId = matched.internalId || matched.id;
          payload.franchisee = matchedName;
          payload.franchisee_id = matchedId;
          activityNote += ` Territory 1-to-1 match. Franchisee updated to ${matchedName}.`;
        }
      }

      await updateLeadDetails(lead.id, lead, payload);
      await logActivity(lead.id, { type: 'Update', notes: activityNote, author: userProfile?.displayName || userProfile?.name || 'System' });

      onLeadUpdated(payload, lead);

      const mergedSiteAddress = {
        ...lead.address,
        ...addressUpdate,
      };

      await sendAddressUpdateToNetSuite({
        leadId: lead.id,
        address: mergedSiteAddress,
        postalAddress: lead.postalAddress,
      });

      const effectiveFranchiseeId = String(payload.franchisee_id || lead.franchisee_id || lead.franchisee || '');
      if (effectiveFranchiseeId) {
        await sendCompanyCustomerUpdateToNetSuite({
          internalId: lead.id,
          companyName: lead.companyName || '',
          email: lead.customerServiceEmail || '',
          phone: lead.customerPhone || '',
          franchiseeId: effectiveFranchiseeId,
          prospectPlusId: lead.id,
          abn: (lead as any).abn || '',
        });
      }

      if (territoryCheckDone && matchedFranchisees.length === 0) {
        toast({
          variant: "destructive",
          title: "Out of Territory",
          description: "New address is out of territory. Lead status updated to Lost.",
        });
      } else if (territoryCheckDone && matchedFranchisees.length > 1 && isUserRole) {
        toast({
          title: "Address Check Needed",
          description: "Multiple franchisees service this area. Status set to Address Check.",
        });
      } else {
        toast({
          title: "Address Updated",
          description: "The address details have been saved successfully.",
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update address:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save address. Please try again.",
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border overflow-visible">
        <DialogHeader>
          <DialogTitle>Edit Site Address</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.warn("Form validation errors:", errors);
            toast({
              variant: "destructive",
              title: "Validation Error",
              description: "Please ensure all required address fields are complete.",
            });
          })} className="space-y-4">
            <AddressAutocomplete onAddressSelect={handleAddressSelect} />

            {isCheckingTerritory && (
              <div className="flex items-center gap-2 p-3 text-sm bg-muted rounded-md text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Checking franchisee territory availability...
              </div>
            )}

            {!isCheckingTerritory && territoryCheckDone && (
              <>
                {matchedFranchisees.length > 1 && (
                  <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="font-semibold text-amber-900 dark:text-amber-200">
                      Multiple Franchisees Matched
                    </AlertTitle>
                    <AlertDescription className="text-xs space-y-2 mt-1">
                      <p>
                        Multiple franchisees can service this suburb:{" "}
                        <strong className="font-semibold">{matchedFranchisees.map(m => m.name || m.franchiseeName).join(', ')}</strong>.
                      </p>

                      {isUserRole ? (
                        <div className="pt-1 space-y-2">
                          <p className="font-medium text-amber-800 dark:text-amber-300">
                            Waiting on confirmation from Aleyna. Please send notification email below.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant={emailSent ? "outline" : "default"}
                            disabled={emailSending || emailSent}
                            onClick={handleSendConfirmationEmail}
                            className="w-full gap-1.5"
                          >
                            {emailSending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : emailSent ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Mail className="h-3.5 w-3.5" />
                            )}
                            {emailSent ? "Email Sent to Aleyna & Ankith" : "Send Email Notification to Aleyna & Ankith"}
                          </Button>
                        </div>
                      ) : (
                        <div className="pt-2 space-y-1.5">
                          <Label className="text-xs font-semibold">Select Assigned Franchisee:</Label>
                          <Select value={selectedFranchiseeId} onValueChange={setSelectedFranchiseeId}>
                            <SelectTrigger className="w-full bg-background text-xs h-8">
                              <SelectValue placeholder="Choose franchisee..." />
                            </SelectTrigger>
                            <SelectContent>
                              {matchedFranchisees.map(f => (
                                <SelectItem key={f.id || f.internalId} value={String(f.internalId || f.id)}>
                                  {f.name || f.franchiseeName} ({f.internalId || f.id})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {matchedFranchisees.length === 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="font-semibold">Out of Territory</AlertTitle>
                    <AlertDescription className="text-xs">
                      No franchisee services this suburb and postcode. Saving will automatically change the lead status to <strong>Lost (Out of Territory)</strong>.
                    </AlertDescription>
                  </Alert>
                )}

                {matchedFranchisees.length === 1 && (
                  <Alert className="border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <AlertTitle className="font-semibold">Serviced Territory Matched</AlertTitle>
                    <AlertDescription className="text-xs">
                      This address is serviced by <strong>{matchedFranchisees[0].name || matchedFranchisees[0].franchiseeName}</strong>. Lead will be assigned to this franchisee on save.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || isCheckingTerritory}>
                {form.formState.isSubmitting ? "Saving..." : "Save Address"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
