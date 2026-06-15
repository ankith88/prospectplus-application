"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TicketFormSchema, TicketFormValues } from "@/lib/ticket-schema";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, UploadCloud, File, X, CheckCircle, Package, Building, MapPin, User, ScanLine, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";

const ISSUE_CATEGORIES = [
  {
    group: "Address/Routing Queries",
    items: [
      'Incorrect Address: Incomplete',
      'Incorrect Address: No Address',
      'Incorrect Address: P.O. Box',
      'Address: Unserviced Remote Area',
      'Address: Receiver No Longer at Address',
      'Missorted',
    ]
  },
  {
    group: "Delivery Intercepts",
    items: [
      'Address: Not Safe to Leave - Re-delivery Organised',
      'Alternate Delivery Point / Post Office',
      'Alternative Delivery Point',
      'Delivered to Incorrect Address',
      'Dispute of Delivery',
    ]
  },
  {
    group: "Verification Checks",
    items: [
      'Check Address (Incorrect Address)',
      'Check Address (Other)',
      'Check Address (PO/Parcel Locker)',
      'Check Address (Receiver Unknown)',
    ]
  },
  {
    group: "Delay & Damage Logs",
    items: [
      'Delayed Item',
      'Delayed +1 Day',
      'Delayed +2 Days',
      'Delayed >2 Days',
      'Damaged Item',
      'Lost Item',
      'Other'
    ]
  }
];

export function TicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialIdentifier = searchParams.get("identifier") || "";
  
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [generatedTicketId] = useState(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15);
  }); // Pre-generate an ID for uploads

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(TicketFormSchema),
    defaultValues: {
      trackingIdentifier: initialIdentifier,
      issueCategory: [],
      enquirySource: "Phone",
      enquirerName: "",
      enquirerPhone: "",
      enquirerEmail: "",
      notes: "",
      attachments: [],
    },
  });

  const enquirySource = form.watch("enquirySource");
  const attachments = form.watch("attachments") || [];

  const handleLookup = async () => {
    const identifier = form.getValues("trackingIdentifier");
    if (!identifier) return;

    setIsLookingUp(true);
    try {
      const response = await fetch(`/api/packages/lookup?id=${encodeURIComponent(identifier)}`);
      if (response.ok) {
        const data = await response.json();
        form.setValue("customerName", data.customerName);
        form.setValue("franchisee", data.franchisee);
        form.setValue("operatorDetails", data.operatorDetails);
        form.setValue("scanDetails", data.scanDetails);
        form.setValue("senderDetails", data.senderDetails);
        form.setValue("receiverDetails", data.receiverDetails);
        form.setValue("trackingHistory", data.trackingHistory);
        form.setValue("currentStatus", data.currentStatus);
        toast.success("Package details fetched successfully.");
      } else {
        toast.error("Package not found. Please enter details manually.");
        form.setValue("customerName", "");
        form.setValue("franchisee", "");
        form.setValue("operatorDetails", "");
        form.setValue("scanDetails", "");
        form.setValue("senderDetails", { name: "", address: "" });
        form.setValue("receiverDetails", { name: "", address: "" });
      }
    } catch (error) {
      toast.error("Error fetching package details.");
    } finally {
      setIsLookingUp(false);
    }
  };

  // Automatically lookup if identifier was passed in URL
  useEffect(() => {
    if (initialIdentifier) {
      handleLookup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIdentifier]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    const newAttachments = [...attachments];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `tickets/attachments/${generatedTicketId}/${file.name}`);
        
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        newAttachments.push({
          name: file.name,
          url,
        });
      }
      form.setValue("attachments", newAttachments);
      toast.success("Files uploaded successfully.");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error uploading files.");
    } finally {
      setUploadingFiles(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    form.setValue("attachments", newAttachments);
  };

  const onSubmit = async (data: TicketFormValues) => {
    setIsSubmitting(true);
    try {
      // In a real app, you would pass the generatedTicketId so the backend can use it, 
      // or the backend would create it and you'd move files.
      // Here, we'll just send everything to our POST endpoint.
      const payload = {
        ...data,
        id: generatedTicketId // Suggesting this ID to the backend if supported, otherwise attachments still link to it
      };

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const responseData = await res.json();

      if (res.ok) {
        toast.success("Ticket created successfully!");
        router.push(`/admin/tickets/${responseData.ticketId || generatedTicketId}`);
      } else {
        toast.error(responseData.error || "Failed to create ticket.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Section 1: Identifier & Auto-Ingest */}
        <Card className="border-t-4 border-t-[#095c7b] shadow-md">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold text-[#095c7b] mb-4">Tracking Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="trackingIdentifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#095c7b] font-semibold">Barcode or Order Number *</FormLabel>
                    <FormControl>
                      <div className="flex space-x-2">
                        <Input 
                          placeholder="Enter tracking identifier..." 
                          {...field} 
                          onBlur={(e) => {
                            field.onBlur();
                            handleLookup();
                          }}
                          className="border-[#095c7b]/20 focus-visible:ring-[#eaf143]"
                        />
                        <Button type="button" onClick={handleLookup} disabled={isLookingUp || !field.value} className="bg-[#095c7b] hover:bg-[#053647]">
                          {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lookup"}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      We will automatically fetch package details if found.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Auto-populated details - Improved UI */}
              <div className="bg-white rounded-lg border border-[#095c7b]/10 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="font-semibold text-[#095c7b] flex items-center gap-2">
                    <Package className="h-4 w-4 text-[#eaf143] fill-[#095c7b]" />
                    Package Details
                  </h3>
                  {form.watch("currentStatus") ? (
                    <Badge variant="outline" className="bg-[#095c7b]/5 text-[#095c7b] border-[#095c7b]/20 px-3 py-1">
                      {form.watch("currentStatus")}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded-full">Pending Lookup</span>
                  )}
                </div>

                {form.watch("currentStatus") ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Customer</div>
                      <div className="text-sm font-medium text-gray-900 flex items-start gap-2">
                        <Building className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span>{form.watch("customerName") || "N/A"}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Franchisee</div>
                      <div className="text-sm font-medium text-gray-900 flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span>{form.watch("franchisee") || "N/A"}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Operator</div>
                      <div className="text-sm font-medium text-gray-900 flex items-start gap-2">
                        <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span>{form.watch("operatorDetails") || "N/A"}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Latest Scan</div>
                      <div className="text-sm font-medium text-gray-900 flex items-start gap-2">
                        <ScanLine className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="line-clamp-2" title={form.watch("scanDetails") || ""}>{form.watch("scanDetails") || "N/A"}</span>
                      </div>
                    </div>

                    <div className="space-y-1 sm:col-span-2 pt-2 border-t border-gray-50">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Sender</div>
                          <div className="text-sm font-medium text-gray-900">{form.watch("senderDetails")?.name || "N/A"}</div>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Receiver</div>
                          <div className="text-sm font-medium text-gray-900">{form.watch("receiverDetails")?.name || "N/A"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground flex flex-col items-center justify-center">
                    <ScanLine className="h-8 w-8 text-gray-200 mb-2" />
                    <p>Enter a barcode or order number and click Lookup</p>
                    <p>to fetch package details automatically.</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Package Issue Matrix */}
        <Card className="border-t-4 border-t-[#eaf143] shadow-md">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold text-[#095c7b] mb-4">Package Issues</h2>
            <FormField
              control={form.control}
              name="issueCategory"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-[#095c7b] font-semibold">Select Issue Categories *</FormLabel>
                    <FormDescription>Select all issues that apply to this ticket.</FormDescription>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {ISSUE_CATEGORIES.map((group) => (
                      <div key={group.group} className="space-y-3 bg-white p-4 rounded-md border border-gray-100 shadow-sm">
                        <h3 className="font-semibold text-[#095c7b]/80 border-b pb-2">{group.group}</h3>
                        {group.items.map((item) => (
                          <FormField
                            key={item}
                            control={form.control}
                            name="issueCategory"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={item}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item as any)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), item])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== item
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm cursor-pointer">
                                    {item}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                  <FormMessage className="mt-2" />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section 3: Enquirer Details */}
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold text-[#095c7b] mb-4">Enquirer Details</h2>
            
            <FormField
              control={form.control}
              name="enquirySource"
              render={({ field }) => (
                <FormItem className="space-y-3 mb-6">
                  <FormLabel className="text-[#095c7b] font-semibold">Enquiry Source *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0 bg-white px-4 py-2 rounded-full border border-gray-200">
                        <FormControl>
                          <RadioGroupItem value="Phone" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">Phone</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0 bg-white px-4 py-2 rounded-full border border-gray-200">
                        <FormControl>
                          <RadioGroupItem value="Email" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">Email</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="enquirerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#095c7b] font-semibold">Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enquirerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#095c7b] font-semibold">
                      Phone Number {enquirySource === 'Phone' ? '*' : ''}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="0400 000 000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enquirerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#095c7b] font-semibold">
                      Email Address {enquirySource === 'Email' ? '*' : ''}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Monitored by anti-garbage filter (e.g. no "test@test.com")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Notes & Media */}
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold text-[#095c7b] mb-4">Notes & Attachments</h2>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="mb-6">
                  <FormLabel className="text-[#095c7b] font-semibold">Log Commentary *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter a detailed description of the issue or the phone summary..."
                      className="min-h-[150px] resize-y border-[#095c7b]/20 focus-visible:ring-[#eaf143]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Minimum 10 characters required.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel className="text-[#095c7b] font-semibold">Attachments (Images, Receipts)</FormLabel>
              
              <div className="border-2 border-dashed border-[#095c7b]/30 rounded-lg p-6 bg-white hover:bg-gray-50 transition-colors flex flex-col items-center justify-center relative">
                <input
                  type="file"
                  multiple
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                  disabled={uploadingFiles}
                />
                <div className="text-center space-y-2 pointer-events-none">
                  <div className="flex justify-center">
                    {uploadingFiles ? <Loader2 className="h-8 w-8 text-[#095c7b] animate-spin" /> : <UploadCloud className="h-8 w-8 text-[#095c7b]" />}
                  </div>
                  <div className="text-sm font-medium text-[#095c7b]">
                    {uploadingFiles ? "Uploading..." : "Click or drag files to upload"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Upload delivery images, physical scan proof, or signature receipts
                  </div>
                </div>
              </div>

              {attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 shadow-sm">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <File className="h-5 w-5 text-[#095c7b] flex-shrink-0" />
                        <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit Action */}
        <div className="flex justify-end pt-4 pb-12">
          <Button 
            type="submit" 
            size="lg"
            className="bg-[#eaf143] text-[#095c7b] hover:bg-[#d8e032] font-bold text-lg px-8 shadow-md"
            disabled={isSubmitting || uploadingFiles}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                Submit Ticket
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
