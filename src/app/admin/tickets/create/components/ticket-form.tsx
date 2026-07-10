"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, UploadCloud, File, X, CheckCircle, Clock, Activity, Search, Building, MapPin, ExternalLink, ShieldAlert, User, Mail, Users } from "lucide-react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAllUsers } from "@/services/firebase";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export function TicketForm() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialIdentifier = searchParams.get("identifier") || "";
  
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [csUsers, setCsUsers] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [openTickets, setOpenTickets] = useState<any[]>([]);
  const [companyContacts, setCompanyContacts] = useState<any[]>([]);
  const [generatedTicketId] = useState(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15);
  });

  useEffect(() => {
    async function loadUsers() {
      try {
        const users = await getAllUsers();
        const cs = users.filter(u => {
          const hasCsInAssigned = u.assignedRoles?.some((r: string) => r.toLowerCase() === "customer service" || r.toLowerCase() === "customer success");
          const isCsDefault = u.defaultRole?.toLowerCase() === "customer service" || u.defaultRole?.toLowerCase() === "customer success";
          const isCsRole = u.role?.toLowerCase() === "customer service" || u.role?.toLowerCase() === "customer success";
          return hasCsInAssigned || isCsDefault || isCsRole;
        });
        setCsUsers(cs);
      } catch (err) {
        console.error("Failed to load customer service users:", err);
      }
    }
    loadUsers();
  }, []);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(TicketFormSchema),
    defaultValues: {
      trackingIdentifier: initialIdentifier,
      issueCategory: [],
      enquirerName: "",
      enquirerPhone: "",
      enquirerEmail: "",
      notes: "",
      attachments: [],
      // Enriched Customer details
      customerContactName: "",
      customerCompany: "",
      customerAccountNumber: "",
      customerTier: "Standard",
      customerEmail: "",
      customerPhone: "",
      // Enriched Receiver details
      receiverName: "",
      receiverAddress: "",
      receiverEmail: "",
      receiverPhone: "",
      // Enriched Tracking / Protechly details
      trackingData: null,
      realTimeStatus: null,
      enrichedScans: [],
      // Ticket details section
      enquiryType: "Dispute of Delivery",
      raisedBy: "Receiver",
      priority: "Standard",
      assignedUser: "",
      followUpDate: "",
      description: "",
      source: undefined
    },
  });

  useEffect(() => {
    if (userProfile) {
      const isCustomerService = 
        userProfile.role?.toLowerCase() === "customer service" ||
        userProfile.activeRole?.toLowerCase() === "customer service" ||
        userProfile.defaultRole?.toLowerCase() === "customer service" ||
        userProfile.assignedRoles?.some((r: string) => r.toLowerCase() === "customer service");

      if (isCustomerService) {
        form.setValue("assignedUser", userProfile.displayName || userProfile.email || userProfile.uid);
      }
    }
  }, [userProfile, form]);

  const sourceVal = form.watch("source");
  const raisedByVal = form.watch("raisedBy");
  const attachments = form.watch("attachments") || [];
  const trackingData = form.watch("trackingData");
  const enrichedScans = form.watch("enrichedScans") || [];
  const hasNewReceiverDetails = form.watch("hasNewReceiverDetails");

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

        if (data.customerDetails) {
          form.setValue("customerContactName", data.customerDetails.contactName || "");
          form.setValue("customerCompany", data.customerDetails.company || "");
          form.setValue("customerAccountNumber", data.customerDetails.accountNumber || "");
          form.setValue("customerTier", data.customerDetails.tier || "Standard");
          form.setValue("customerEmail", data.customerDetails.email || "");
          form.setValue("customerPhone", data.customerDetails.phone || "");
          setCompanyId(data.customerDetails.companyId || "");
          setCompanyContacts(data.customerDetails.contacts || []);
        }
        if (data.receiverFullDetails) {
          form.setValue("receiverName", data.receiverFullDetails.name || "");
          form.setValue("receiverAddress", data.receiverFullDetails.address || "");
          form.setValue("receiverEmail", data.receiverFullDetails.email || "");
          form.setValue("receiverPhone", data.receiverFullDetails.phone || "");
        }
        if (data.trackingData) {
          form.setValue("trackingData", data.trackingData);
        }
        if (data.realTimeStatus) {
          form.setValue("realTimeStatus", data.realTimeStatus);
        }
        if (data.enrichedScans) {
          form.setValue("enrichedScans", data.enrichedScans);
        }
        if (data.packageInfo?.connoteNumber) {
          form.setValue("connoteNumber", data.packageInfo.connoteNumber);
        }
        setOpenTickets(data.openTickets || []);
        toast.success("Package details fetched successfully.");
      } else {
        toast.error("Package not found. Please enter details manually.");
        form.setValue("customerName", "");
        form.setValue("franchisee", "");
        form.setValue("operatorDetails", "");
        form.setValue("scanDetails", "");
        form.setValue("senderDetails", { name: "", address: "" });
        form.setValue("receiverDetails", { name: "", address: "" });
        
        form.setValue("customerContactName", "");
        form.setValue("customerCompany", "");
        form.setValue("customerAccountNumber", "");
        form.setValue("customerTier", "Standard");
        form.setValue("customerEmail", "");
        form.setValue("customerPhone", "");
        form.setValue("receiverName", "");
        form.setValue("receiverAddress", "");
        form.setValue("receiverEmail", "");
        form.setValue("receiverPhone", "");
        form.setValue("trackingData", null);
        form.setValue("realTimeStatus", null);
        form.setValue("enrichedScans", []);
        form.setValue("connoteNumber", "");
        setCompanyId("");
        setOpenTickets([]);
        setCompanyContacts([]);
      }
    } catch (error) {
      toast.error("Error fetching package details.");
    } finally {
      setIsLookingUp(false);
    }
  };

  const triggerLookup = () => {
    handleLookup().catch(console.error);
  };

  useEffect(() => {
    if (initialIdentifier) {
      triggerLookup();
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
      const payload = {
        ...data,
        notes: data.description,
        companyId: companyId,
        id: generatedTicketId
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

  // Build combined scans: MP Internal vs Protechly Real-Time Status Scan
  const combinedScans = [];
  if (form.watch("realTimeStatus")) {
    const rts = form.watch("realTimeStatus");
    combinedScans.push({
      scan_type: rts.status || "Unknown Status",
      partnerLocationName: rts.last_location || "Carrier Network Hub",
      formattedTime: rts.updated_at ? new Date(rts.updated_at).toLocaleString() : 'N/A',
      operatorName: "Carrier Agent",
      isRealTimeApi: true,
      updated_at: rts.updated_at || new Date().toISOString()
    });
  }
  enrichedScans.forEach((s: any) => {
    combinedScans.push({
      ...s,
      isRealTimeApi: false
    });
  });
  // Sort descending by date/time
  combinedScans.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Warning Alert if there are other open tickets linked to this customer */}
        {openTickets.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 w-full shadow-sm">
            <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-red-800">
                Warning: This customer has {openTickets.length} other open ticket(s) currently:
              </h4>
              <div className="mt-2 space-y-1.5 text-xs text-red-700">
                {openTickets.map((t, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <span className="font-semibold">#{idx + 1}</span>
                    <span>Enquiry: <span className="font-bold">{t.enquiryType}</span></span>
                    <span>• Priority: <span className="font-bold capitalize">{t.priority}</span></span>
                    {t.createdAt && <span>• Opened: <span className="font-bold">{new Date(t.createdAt).toLocaleDateString()}</span></span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Full-width Row: Section 1 Tracking Information Lookup */}
        <Card className="border-t-4 border-t-[#095c7b] shadow-sm w-full">
          <CardContent className="pt-6">
            <h2 className="text-lg font-bold text-[#095c7b] mb-4 flex items-center gap-2">
              <Search className="h-5 w-5" />
              Tracking Information
            </h2>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="trackingIdentifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">Barcode or Order Number *</FormLabel>
                    <FormControl>
                      <div className="flex space-x-2">
                        <Input 
                          placeholder="Enter tracking identifier..." 
                          {...field} 
                          onBlur={(e) => {
                            field.onBlur();
                            triggerLookup();
                          }}
                          className="border-[#095c7b]/20 focus-visible:ring-[#eaf143]"
                        />
                        <Button type="button" onClick={triggerLookup} disabled={isLookingUp || !field.value} className="bg-[#095c7b] hover:bg-[#053647]">
                          {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lookup"}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription className="text-[11px]">
                      Enter the code to pull matching tracking history, lodging depot, customer info & scan history.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Split Pane below */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form Actions & Input Fields (LG col-span-6) */}
          <div className="lg:col-span-6 space-y-6">

            {/* Section 2: Ticket Details & Enquirer Details combined */}
            <Card className="border border-[#095c7b]/20 bg-white shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-[#095c7b] text-white h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#095c7b] flex items-center gap-2">
                      Ticket details
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="enquiryType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">Enquiry type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "Dispute of Delivery"}>
                          <FormControl>
                            <SelectTrigger className="border-[#095c7b]/20 focus:ring-[#eaf143] bg-white h-9 text-xs">
                              <SelectValue placeholder="Select Enquiry Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Delayed Item">Delayed Item</SelectItem>
                            <SelectItem value="ETA Request">ETA Request</SelectItem>
                            <SelectItem value="Dispute of Delivery">Dispute of Delivery</SelectItem>
                            <SelectItem value="POD Request">POD Request</SelectItem>
                            <SelectItem value="ATL Image Request">ATL Image Request</SelectItem>
                            <SelectItem value="Redelivery Request">Redelivery Request</SelectItem>
                            <SelectItem value="Return To Sender Request">Return To Sender Request</SelectItem>
                            <SelectItem value="Missed Sweep">Missed Sweep</SelectItem>
                            <SelectItem value="General Enquiry">General Enquiry</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">Source *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger className="border-[#095c7b]/20 focus:ring-[#eaf143] bg-white h-9 text-xs">
                              <SelectValue placeholder="Select Source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Portal (StarTrack)">Portal (StarTrack)</SelectItem>
                            <SelectItem value="Phone">Phone</SelectItem>
                            <SelectItem value="Email">Email</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="raisedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">Raised by *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "Receiver"}>
                          <FormControl>
                            <SelectTrigger className="border-[#095c7b]/20 focus:ring-[#eaf143] bg-white h-9 text-xs">
                              <SelectValue placeholder="Select Raised By" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Receiver">Receiver</SelectItem>
                            <SelectItem value="Customer">Customer</SelectItem>
                            <SelectItem value="Delivery Carriers">Delivery Carriers</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">Priority *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "Standard"}>
                          <FormControl>
                            <SelectTrigger className="border-[#095c7b]/20 focus:ring-[#eaf143] bg-white h-9 text-xs">
                              <SelectValue placeholder="Select Priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Standard">Standard</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assignedUser"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">Assigned user *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger className="border-[#095c7b]/20 focus:ring-[#eaf143] bg-white h-9 text-xs">
                              <SelectValue placeholder="Select Assigned User" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {csUsers.map((u: any) => (
                              <SelectItem key={u.uid} value={u.displayName || u.email}>
                                {u.displayName || u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="followUpDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">Follow-up date (optional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} className="border-[#095c7b]/20 focus-visible:ring-[#eaf143] h-9 text-xs" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />



                  {/* Combined Enquirer Fields inside Ticket Details Grid */}
                  <div className="md:col-span-2 pt-4 border-t border-[#095c7b]/10 space-y-4">
                    <h4 className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">Enquirer Details</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name="enquirerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] font-bold text-[#095c7b] uppercase tracking-wider">
                              Name {raisedByVal === 'Receiver' ? '*' : ''}
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} className="border-[#095c7b]/20 focus-visible:ring-[#eaf143] h-8 text-xs" />
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
                            <FormLabel className="text-[11px] font-bold text-[#095c7b] uppercase tracking-wider">
                              Phone {raisedByVal === 'Receiver' && sourceVal === 'Phone' ? '*' : ''}
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="0400 000 000" {...field} className="border-[#095c7b]/20 focus-visible:ring-[#eaf143] h-8 text-xs" />
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
                            <FormLabel className="text-[11px] font-bold text-[#095c7b] uppercase tracking-wider">
                              Email {raisedByVal === 'Receiver' && sourceVal === 'Email' ? '*' : ''}
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="john.doe@example.com" {...field} className="border-[#095c7b]/20 focus-visible:ring-[#eaf143] h-8 text-xs" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Issue Description Field */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2 pt-4 border-t border-[#095c7b]/10">
                        <FormLabel className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">Issue description *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Provide full description of enquirer's concern..."
                            className="min-h-[80px] text-xs resize-y border-[#095c7b]/20 focus-visible:ring-[#eaf143]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Attachments inside Ticket Details */}
                  <div className="md:col-span-2 space-y-3 pt-2">
                    <FormLabel className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">Attachments</FormLabel>
                    
                    <div className="border border-dashed border-[#095c7b]/30 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors flex flex-col items-center justify-center relative">
                      <input
                        type="file"
                        multiple
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileUpload}
                        disabled={uploadingFiles}
                      />
                      <div className="text-center space-y-1 pointer-events-none">
                        <div className="flex justify-center">
                          {uploadingFiles ? <Loader2 className="h-6 w-6 text-[#095c7b] animate-spin" /> : <UploadCloud className="h-6 w-6 text-[#095c7b]" />}
                        </div>
                        <div className="text-xs font-medium text-[#095c7b]">
                          {uploadingFiles ? "Uploading..." : "Click or drag files to upload"}
                        </div>
                      </div>
                    </div>

                    {attachments.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white rounded-md border border-gray-200 shadow-sm text-xs">
                            <div className="flex items-center space-x-2 overflow-hidden">
                              <File className="h-4 w-4 text-[#095c7b] flex-shrink-0" />
                              <span className="truncate max-w-[120px]">{file.name}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removeAttachment(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Action */}
            <div className="flex justify-end pt-2">
              <Button 
                type="submit" 
                size="lg"
                className="bg-[#eaf143] text-[#095c7b] hover:bg-[#d8e032] font-bold text-base px-8 shadow-sm h-11"
                disabled={isSubmitting || uploadingFiles}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Submit Ticket
                  </>
                )}
              </Button>
            </div>

          </div>

          {/* Right Column: Reference Data Pane in Tabs (LG col-span-6) */}
          <div className="lg:col-span-6">
            {trackingData ? (
              <Tabs defaultValue="tracking" className="w-full">
                <TabsList className="grid grid-cols-3 bg-[#e6f2f7] p-1 rounded-lg border border-[#095c7b]/10 mb-4 h-10">
                  <TabsTrigger value="tracking" className="text-xs font-semibold data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                    Lodgement
                  </TabsTrigger>
                  <TabsTrigger value="scans" className="text-xs font-semibold data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                    Scan History
                  </TabsTrigger>
                  <TabsTrigger value="contacts" className="text-xs font-semibold data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                    Contacts
                  </TabsTrigger>
                </TabsList>

                {/* Tab Content 1: Lodgement Details */}
                <TabsContent value="tracking" className="space-y-4 focus-visible:outline-none">
                  <Card className="border border-[#bcf0c2] bg-[#f2fcf4] shadow-sm rounded-xl">
                    <CardContent className="p-5 space-y-4">
                      <div className="border-b border-[#bcf0c2]/50 pb-2">
                        <h4 className="text-sm font-bold text-[#1a4a2b]">Tracking Status & Lodgement</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-[#2f855a] uppercase tracking-wider mb-0.5">Current status</label>
                          <Input readOnly value={trackingData.currentStatus || "N/A"} className="bg-[#e6f7eb] border-[#bcf0c2] text-[#1a4a2b] font-medium h-8 text-xs" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#2f855a] uppercase tracking-wider mb-0.5">Status fetched at</label>
                          <Input readOnly value={trackingData.statusUpdatedAt || "N/A"} className="bg-[#e6f7eb] border-[#bcf0c2] text-[#1a4a2b] font-medium h-8 text-xs" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#2f855a] uppercase tracking-wider mb-0.5">Last movement</label>
                          <Input readOnly value={trackingData.lastMovement || "N/A"} className="bg-[#e6f7eb] border-[#bcf0c2] text-[#1a4a2b] font-medium h-8 text-xs" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#2f855a] uppercase tracking-wider mb-0.5">Current depot</label>
                          <Input readOnly value={trackingData.currentDepot || "N/A"} className="bg-[#e6f7eb] border-[#bcf0c2] text-[#1a4a2b] font-medium h-8 text-xs" />
                        </div>
                        
                        {/* Occupy full rows to show complete un-truncated sender/receiver details */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-[#2f855a] uppercase tracking-wider mb-0.5">Sender</label>
                          <Input readOnly value={trackingData.sender || "N/A"} className="bg-[#e6f7eb] border-[#bcf0c2] text-[#1a4a2b] font-medium h-8 text-xs w-full" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-[#2f855a] uppercase tracking-wider mb-0.5">Receiver</label>
                          <Input readOnly value={trackingData.receiver || "N/A"} className="bg-[#e6f7eb] border-[#bcf0c2] text-[#1a4a2b] font-medium h-8 text-xs w-full" />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-[#2f855a] uppercase tracking-wider mb-0.5">Service type</label>
                          <Input readOnly value={trackingData.serviceType || "MailPlus Premium"} className="bg-[#e6f7eb] border-[#bcf0c2] text-[#1a4a2b] font-medium h-8 text-xs" />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#bcf0c2]/50 space-y-3">
                        <h4 className="text-[11px] font-bold text-[#22543d] uppercase tracking-widest">
                          Lodgement & franchisee details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-[#2f855a] uppercase tracking-wider mb-0.5">Lodgement hub</label>
                            <Input readOnly value={trackingData.lodgementHub || "N/A"} className="bg-[#e6f7eb] border-[#bcf0c2] text-[#1a4a2b] font-medium h-8 text-xs" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#2f855a] uppercase tracking-wider mb-0.5">Hub address</label>
                            <Input readOnly value={trackingData.hubAddress || "N/A"} className="bg-[#e6f7eb] border-[#bcf0c2] text-[#1a4a2b] font-medium h-8 text-xs" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#2f855a] uppercase tracking-wider mb-0.5">Lodging driver</label>
                            <Input readOnly value={trackingData.lodgingDriver || "N/A"} className="bg-[#e6f7eb] border-[#bcf0c2] text-[#1a4a2b] font-medium h-8 text-xs" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#2f855a] uppercase tracking-wider mb-0.5">Franchisee contact</label>
                            <Input readOnly value={trackingData.franchiseeContact || "N/A"} className="bg-[#e6f7eb] border-[#bcf0c2] text-[#1a4a2b] font-medium h-8 text-xs" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-[#2f855a] uppercase tracking-wider mb-0.5">Last MP Scan</label>
                            <Input readOnly value={trackingData.lastScan || "N/A"} className="bg-[#e6f7eb] border-[#bcf0c2] text-[#1a4a2b] font-medium h-8 text-xs" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab Content 2: Scan History timeline (internal MP vs Real-time api scans) */}
                <TabsContent value="scans" className="space-y-4 focus-visible:outline-none">
                  <Card className="border border-[#095c7b]/10 bg-white shadow-sm rounded-xl">
                    <CardContent className="p-5 max-h-[550px] overflow-y-auto">
                      <h4 className="text-sm font-bold text-[#095c7b] mb-4 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#095c7b]" />
                        Scan Timeline
                      </h4>
                      {combinedScans.length > 0 ? (
                        <div className="relative pl-5 border-l border-gray-150 ml-3 space-y-5">
                          {combinedScans.map((scan: any, idx: number) => (
                            <div key={idx} className="relative">
                              <span className="absolute -left-[28px] top-1 bg-white border-2 border-[#095c7b] rounded-full h-4 w-4 flex items-center justify-center">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#095c7b]" />
                              </span>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {scan.isRealTimeApi ? (
                                    <span className="font-bold text-[9px] text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                      Carrier Scan
                                    </span>
                                  ) : (
                                    <span className="font-bold text-[9px] text-green-800 bg-green-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                      MailPlus Scan
                                    </span>
                                  )}
                                  <span className="font-semibold text-xs text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {scan.scan_type}
                                  </span>
                                  <span className="text-xs font-semibold text-gray-700">
                                    {scan.partnerLocationName || "Unknown Depot"}
                                  </span>
                                </div>
                                <div className="flex items-center text-[10px] text-muted-foreground gap-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {scan.formattedTime || scan.updated_at}
                                </div>
                              </div>
                              {scan.partnerLocationAddress && (
                                <p className="text-[10px] text-muted-foreground mt-0.5 pl-1">
                                  Address: {scan.partnerLocationAddress}
                                </p>
                              )}
                              <p className="text-[10px] text-[#095c7b] mt-0.5 font-medium pl-1">
                                Scan Operator: <span className="font-bold">{scan.operatorName || "System / Auto"}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No scans found.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab Content 3: Customer & Receiver Contact details */}
                <TabsContent value="contacts" className="space-y-4 focus-visible:outline-none">
                  {/* Company Info Card (Mandatory) */}
                  <Card className="border border-[#bcf0c2] bg-[#f2fcf4] shadow-sm rounded-xl">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center space-x-2 border-b border-[#bcf0c2]/50 pb-2">
                        <Building className="h-4 w-4 text-[#095c7b]" />
                        <h4 className="text-xs font-bold text-[#095c7b] uppercase tracking-wider flex items-center justify-between w-full">
                          Company Information
                          {companyId && (
                            <a
                              href={`/companies/${companyId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-[#095c7b] hover:underline font-semibold flex items-center gap-1 normal-case font-sans"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Profile
                            </a>
                          )}
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <FormField
                          control={form.control}
                          name="customerCompany"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider">Company *</FormLabel>
                              <FormControl>
                                <Input readOnly {...field} className="bg-gray-50 border-gray-200 text-muted-foreground focus-visible:ring-0 cursor-not-allowed h-8 text-xs font-semibold" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="customerAccountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider">Account Number *</FormLabel>
                              <FormControl>
                                <Input readOnly {...field} className="bg-gray-50 border-gray-200 text-muted-foreground focus-visible:ring-0 cursor-not-allowed h-8 text-xs" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="customerTier"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider">Customer Tier</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || "Standard"}>
                                <FormControl>
                                  <SelectTrigger className="border-[#095c7b]/20 focus:ring-[#eaf143] bg-white h-8 text-xs">
                                    <SelectValue placeholder="Tier" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Standard">Standard</SelectItem>
                                  <SelectItem value="National Account">National Account</SelectItem>
                                  <SelectItem value="VIP">VIP</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Company Contacts List Selection (Conditional) */}
                  {companyContacts.length > 0 && (
                    <Card className="border border-[#095c7b]/20 bg-white shadow-sm rounded-xl">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center space-x-2 border-b border-[#095c7b]/10 pb-2">
                          <Users className="h-4 w-4 text-[#095c7b]" />
                          <h4 className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">Select Contact from Company List</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {companyContacts.map((contact) => {
                            const isSelected = form.watch("customerContactName") === contact.name &&
                              form.watch("customerEmail") === contact.email;
                            return (
                              <button
                                key={contact.id}
                                type="button"
                                onClick={() => {
                                  form.setValue("customerContactName", contact.name || "");
                                  form.setValue("customerEmail", contact.email || "");
                                  form.setValue("customerPhone", contact.phone || "");
                                }}
                                className={`text-left p-3 rounded-lg border transition-all flex flex-col justify-between h-20 ${
                                  isSelected
                                    ? "border-[#095c7b] bg-[#e6f2f7] ring-1 ring-[#095c7b]"
                                    : "border-gray-200 hover:border-[#095c7b]/50 hover:bg-slate-50 bg-white"
                                }`}
                              >
                                <div className="truncate">
                                  <p className="text-xs font-bold text-gray-800 truncate">{contact.name}</p>
                                  {contact.title && (
                                    <p className="text-[10px] text-muted-foreground truncate">{contact.title}</p>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-500 space-y-0.5 truncate w-full">
                                  {contact.email && <p className="truncate flex items-center gap-1"><Mail className="h-2.5 w-2.5 inline" /> {contact.email}</p>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Customer Contact Details (Optional) */}
                  <Card className="border border-[#bcf0c2]/70 bg-[#f2fcf4]/50 shadow-sm rounded-xl">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-[#bcf0c2]/30 pb-2">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-[#095c7b]" />
                          <h4 className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">Contact Information (Optional)</h4>
                        </div>
                        {(form.watch("customerContactName") || form.watch("customerEmail") || form.watch("customerPhone")) && (
                          <button
                            type="button"
                            onClick={() => {
                              form.setValue("customerContactName", "");
                              form.setValue("customerEmail", "");
                              form.setValue("customerPhone", "");
                            }}
                            className="text-[10px] text-red-600 hover:underline font-semibold"
                          >
                            Clear Contact Details
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <FormField
                          control={form.control}
                          name="customerContactName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider">Contact Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Optional contact name" className="border-[#095c7b]/20 focus-visible:ring-[#eaf143] bg-white h-8 text-xs" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="customerEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider">Email</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Optional email" className="border-[#095c7b]/20 focus-visible:ring-[#eaf143] bg-white h-8 text-xs" />
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
                              <FormLabel className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider">Phone</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Optional phone number" className="border-[#095c7b]/20 focus-visible:ring-[#eaf143] bg-white h-8 text-xs" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Receiver Info Card */}
                  <Card className="border border-[#bcf0c2] bg-[#f2fcf4] shadow-sm rounded-xl">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center space-x-2 border-b border-[#bcf0c2]/50 pb-2">
                        <MapPin className="h-4 w-4 text-[#095c7b]" />
                        <h4 className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">Receiver contact info</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <FormField
                          control={form.control}
                          name="receiverName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider">Receiver Name *</FormLabel>
                              <FormControl>
                                <Input {...field} className="border-[#095c7b]/20 focus-visible:ring-[#eaf143] bg-white h-8 text-xs" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="receiverAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider">Delivery Address *</FormLabel>
                              <FormControl>
                                <Input {...field} className="border-[#095c7b]/20 focus-visible:ring-[#eaf143] bg-white h-8 text-xs" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="receiverEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider">Receiver Email</FormLabel>
                              <FormControl>
                                <Input {...field} className="border-[#095c7b]/20 focus-visible:ring-[#eaf143] bg-white h-8 text-xs" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="receiverPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider">Receiver Phone</FormLabel>
                              <FormControl>
                                <Input {...field} className="border-[#095c7b]/20 focus-visible:ring-[#eaf143] bg-white h-8 text-xs" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="hasNewReceiverDetails"
                          render={({ field }) => (
                            <FormItem className="col-span-1 md:col-span-2 flex flex-row items-start space-x-3 space-y-0 rounded-md border border-[#bcf0c2]/50 bg-white p-4 shadow-sm">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    if (checked) {
                                      const currentName = form.getValues("receiverName") || "";
                                      const currentAddress = form.getValues("receiverAddress") || "";
                                      const currentPhone = form.getValues("receiverPhone") || "";
                                      const currentEmail = form.getValues("receiverEmail") || "";
                                      if (!form.getValues("newReceiverName")) form.setValue("newReceiverName", currentName);
                                      if (!form.getValues("newReceiverAddress")) form.setValue("newReceiverAddress", currentAddress);
                                      if (!form.getValues("newReceiverPhone")) form.setValue("newReceiverPhone", currentPhone);
                                      if (!form.getValues("newReceiverEmail")) form.setValue("newReceiverEmail", currentEmail);
                                    }
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-xs font-semibold text-slate-700 cursor-pointer">
                                  Flag package as having incorrect receiver details / address
                                </FormLabel>
                                <p className="text-[10px] text-slate-500">
                                  Check this to store the corrected delivery details for later reporting.
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />

                        {hasNewReceiverDetails && (
                          <div className="col-span-1 md:col-span-2 mt-2 p-4 bg-amber-50/40 rounded-xl border border-amber-100 space-y-4">
                            <div className="flex items-center space-x-2 pb-2 border-b border-amber-100">
                              <ShieldAlert className="h-4 w-4 text-amber-600" />
                              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider">Corrected Receiver Details</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <FormField
                                control={form.control}
                                name="newReceiverName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Corrected Receiver Name</FormLabel>
                                    <FormControl>
                                      <Input {...field} className="border-amber-200 focus-visible:ring-amber-300 bg-white h-8 text-xs" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="newReceiverAddress"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Corrected Delivery Address</FormLabel>
                                    <FormControl>
                                      <Input {...field} className="border-amber-200 focus-visible:ring-amber-300 bg-white h-8 text-xs" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="newReceiverEmail"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Corrected Receiver Email</FormLabel>
                                    <FormControl>
                                      <Input {...field} className="border-amber-200 focus-visible:ring-amber-300 bg-white h-8 text-xs" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="newReceiverPhone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Corrected Receiver Phone</FormLabel>
                                    <FormControl>
                                      <Input {...field} className="border-amber-200 focus-visible:ring-amber-300 bg-white h-8 text-xs" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="border border-dashed border-[#095c7b]/20 bg-gray-50/50 rounded-xl h-[450px] flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-[#095c7b]/5 text-[#095c7b] p-3 rounded-full mb-3">
                  <Activity className="h-8 w-8 stroke-[1.5]" />
                </div>
                <h4 className="text-sm font-semibold text-gray-800">Awaiting Package Lookup</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                  Enter a Barcode or Order Number on the left to pull live tracking, customer contacts, and scan timelines instantly.
                </p>
              </Card>
            )}
          </div>

        </div>
      </form>
    </Form>
  );
}
