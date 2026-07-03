"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter, useParams } from "next/navigation";
import { FullScreenLoader } from "@/components/ui/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  Mail,
  FileText,
  UserPlus,
  Building2,
  AlertTriangle,
  Calendar,
  Plus,
  Send,
  Clock,
  User,
  ExternalLink,
  Lock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wrench,
  Paperclip
} from "lucide-react";
import Link from "next/link";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";
import { getAllUsers } from "@/services/firebase";
import { toast } from "sonner";

export default function TicketDetailsPage() {
  const { userProfile, loading } = useAuth();
  const { canView } = usePermissions();
  const router = useRouter();
  const params = useParams();
  const ticketId = params.ticketId as string;

  // Ticket & Package States
  const [ticket, setTicket] = useState<any>(null);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [packageDetails, setPackageDetails] = useState<any>(null);
  const [loadingPackage, setLoadingPackage] = useState(false);
  const [csUsers, setCsUsers] = useState<any[]>([]);

  // Subcollections States
  const [actions, setActions] = useState<any[]>([]);
  const [communications, setCommunications] = useState<any[]>([]);
  const [staffNotes, setStaffNotes] = useState<any[]>([]);

  // Modal / Input States
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [newActionType, setNewActionType] = useState("Contact depot");
  const [newActionNotes, setNewActionNotes] = useState("");
  const [newActionStatus, setNewActionStatus] = useState("Pending");

  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [escalateType, setEscalateType] = useState<"Operations" | "IT">("Operations");
  const [escalateAssignee, setEscalateAssignee] = useState("");

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailRecipient, setEmailRecipient] = useState("");

  const [newEnquiryNumber, setNewEnquiryNumber] = useState("");
  const [newStaffNote, setNewStaffNote] = useState("");

  // Load staff users
  useEffect(() => {
    async function loadUsers() {
      try {
        const users = await getAllUsers();
        setCsUsers(users || []);
      } catch (err) {
        console.error("Failed to load staff users:", err);
      }
    }
    loadUsers();
  }, []);

  // Fetch ticket details
  useEffect(() => {
    if (loading) return;

    if (!userProfile) {
      router.push("/signin");
      return;
    }

    if (!canView("tickets")) {
      router.push("/admin/dashboard");
      return;
    }

    const fetchTicket = async () => {
      try {
        const docRef = doc(db, "tickets", ticketId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const tData = docSnap.data();
          setTicket({ id: docSnap.id, ...tData });

          // Auto trigger package lookup
          if (tData.trackingIdentifier) {
            fetchPackageData(tData.trackingIdentifier);
          }
        } else {
          toast.error("Ticket not found.");
        }
      } catch (error) {
        console.error("Error fetching ticket:", error);
      } finally {
        setLoadingTicket(false);
      }
    };

    if (ticketId) {
      fetchTicket();
    }
  }, [userProfile, loading, router, ticketId]);

  // Real-time subcollection sync
  useEffect(() => {
    if (!ticketId) return;

    // Actions
    const actionsRef = collection(db, "tickets", ticketId, "actions");
    const qActions = query(actionsRef, orderBy("date", "desc"));
    const unsubActions = onSnapshot(qActions, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setActions(list);
    });

    // Communications
    const commsRef = collection(db, "tickets", ticketId, "communications");
    const qComms = query(commsRef, orderBy("timestamp", "desc"));
    const unsubComms = onSnapshot(qComms, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setCommunications(list);
    });

    // Staff Notes
    const notesRef = collection(db, "tickets", ticketId, "staffNotes");
    const qNotes = query(notesRef, orderBy("timestamp", "desc"));
    const unsubNotes = onSnapshot(qNotes, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setStaffNotes(list);
    });

    return () => {
      unsubActions();
      unsubComms();
      unsubNotes();
    };
  }, [ticketId]);

  const fetchPackageData = async (identifier: string) => {
    setLoadingPackage(true);
    try {
      const response = await fetch(`/api/packages/lookup?id=${encodeURIComponent(identifier)}`);
      if (response.ok) {
        const data = await response.json();
        setPackageDetails(data);
      }
    } catch (error) {
      console.error("Error fetching package details:", error);
    } finally {
      setLoadingPackage(false);
    }
  };

  // Update main ticket status
  const updateTicketStatus = async (newStatus: string) => {
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      await updateDoc(ticketRef, { status: newStatus });
      setTicket((prev: any) => ({ ...prev, status: newStatus }));
      toast.success(`Ticket status updated to ${newStatus}`);

      // Log action in history
      await addDoc(collection(db, "tickets", ticketId, "actions"), {
        action: "Status Update",
        user: userProfile?.displayName || userProfile?.email || "System",
        date: new Date().toISOString(),
        status: "Complete",
        notes: `Ticket status set to '${newStatus}'`
      });
    } catch (err) {
      console.error("Failed to update ticket status:", err);
      toast.error("Failed to update ticket status.");
    }
  };

  // Add Action handler
  const handleAddAction = async () => {
    if (!newActionNotes.trim()) {
      toast.error("Please add notes/outcome for this action.");
      return;
    }
    try {
      await addDoc(collection(db, "tickets", ticketId, "actions"), {
        action: newActionType,
        user: userProfile?.displayName || userProfile?.email || "Staff",
        date: new Date().toISOString(),
        status: newActionStatus,
        notes: newActionNotes
      });
      setIsActionModalOpen(false);
      setNewActionNotes("");
      toast.success("Action logged successfully.");
    } catch (err) {
      toast.error("Failed to save action.");
    }
  };

  // Escalation Handler (IT/Operations Ticket)
  const handleEscalate = async () => {
    if (!escalateAssignee) {
      toast.error("Please select a staff member to assign this escalation to.");
      return;
    }

    const selectedUserObj = csUsers.find(u => u.uid === escalateAssignee || u.displayName === escalateAssignee);
    const assigneeName = selectedUserObj?.displayName || selectedUserObj?.email || escalateAssignee;

    try {
      // Create subcollection escalation record
      await addDoc(collection(db, "tickets", ticketId, "escalations"), {
        type: escalateType,
        assignedUser: escalateAssignee,
        assignedUserName: assigneeName,
        createdAt: new Date().toISOString(),
        status: "Open"
      });

      // Update parent ticket status based on the escalation
      const newStatus = escalateType === "Operations" ? "Awaiting Operations" : "Awaiting IT";
      await updateDoc(doc(db, "tickets", ticketId), {
        status: newStatus,
        assignedUser: assigneeName
      });

      setTicket((prev: any) => ({
        ...prev,
        status: newStatus,
        assignedUser: assigneeName
      }));

      // Log in investigation actions
      await addDoc(collection(db, "tickets", ticketId, "actions"), {
        action: `Escalate to ${escalateType}`,
        user: userProfile?.displayName || userProfile?.email || "Staff",
        date: new Date().toISOString(),
        status: "Pending",
        notes: `Escalated ticket to ${escalateType} department. Assigned to ${assigneeName}.`
      });

      setIsEscalateModalOpen(false);
      toast.success(`Ticket escalated to ${escalateType} and status updated to ${newStatus}`);
    } catch (err) {
      console.error(err);
      toast.error("Escalation failed.");
    }
  };

  // Email Composer Handler
  const handleSendEmail = async () => {
    if (!emailRecipient || !emailSubject || !emailBody) {
      toast.error("All email fields are required.");
      return;
    }

    try {
      // Log in communications subcollection
      await addDoc(collection(db, "tickets", ticketId, "communications"), {
        type: "SENT",
        timestamp: new Date().toISOString(),
        from: userProfile?.email || "support@mailplus.com.au",
        to: emailRecipient,
        content: `Subject: ${emailSubject}\n\n${emailBody}`
      });

      // Attempt to invoke direct mail sender endpoint (Simulated/Actual)
      await fetch("/api/campaigns/send-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetEmail: emailRecipient,
          subjectLine: emailSubject,
          description: emailBody,
          customSenderEmail: userProfile?.email || "support@mailplus.com.au"
        })
      });

      setIsEmailModalOpen(false);
      setEmailSubject("");
      setEmailBody("");
      toast.success(`Email successfully logged and dispatched to ${emailRecipient}`);
    } catch (err) {
      toast.error("Email dispatch failed.");
    }
  };

  // Add Enquiry Number
  const handleAddEnquiry = async () => {
    if (!newEnquiryNumber.trim()) return;

    const currentEnquiries = ticket?.starTrackEnquiries || [];
    if (currentEnquiries.includes(newEnquiryNumber.trim())) {
      toast.warning("Enquiry number already exists.");
      return;
    }

    try {
      const updated = [...currentEnquiries, newEnquiryNumber.trim()];
      await updateDoc(doc(db, "tickets", ticketId), {
        starTrackEnquiries: updated
      });
      setTicket((prev: any) => ({ ...prev, starTrackEnquiries: updated }));
      setNewEnquiryNumber("");
      toast.success("StarTrack enquiry number added.");
    } catch (err) {
      toast.error("Failed to add enquiry number.");
    }
  };

  // Add Staff Note
  const handleAddStaffNote = async () => {
    if (!newStaffNote.trim()) return;
    try {
      await addDoc(collection(db, "tickets", ticketId, "staffNotes"), {
        author: userProfile?.displayName || userProfile?.email || "Staff",
        timestamp: new Date().toISOString(),
        content: newStaffNote
      });
      setNewStaffNote("");
      toast.success("Staff note added.");
    } catch (err) {
      toast.error("Failed to add staff note.");
    }
  };

  if (loading || loadingTicket) return <FullScreenLoader message="Loading ticket details..." />;

  if (!ticket) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#eef2ed] min-h-screen">
        <div className="text-center p-8 bg-white rounded-xl shadow-md max-w-md">
          <h2 className="text-2xl font-bold text-[#095c7b] mb-4">Ticket Not Found</h2>
          <Button onClick={() => router.push("/admin/tickets")} className="bg-[#095c7b] hover:bg-[#053647]">
            Back to Tickets
          </Button>
        </div>
      </div>
    );
  }

  // Calculate ticket age & SLA
  const createdDate = ticket.createdAt ? (ticket.createdAt.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt)) : new Date();
  const ticketAgeHours = Math.max(0, Math.round((Date.now() - createdDate.getTime()) / (1000 * 60 * 60)));
  const slaRemainingHours = Math.max(0, 48 - ticketAgeHours);
  const isSlaPaused = ticket.status === "Awaiting Operations" || ticket.status === "Awaiting IT" || ticket.status === "Closed";

  // Check no movement warnings
  let lastMovementTime: Date | null = null;
  let movementDiffHours = 0;
  if (packageDetails?.trackingData?.lastMovement) {
    lastMovementTime = new Date(packageDetails.trackingData.lastMovement);
    movementDiffHours = Math.round((Date.now() - lastMovementTime.getTime()) / (1000 * 60 * 60));
  }

  return (
    <div className="min-h-screen bg-[#eef2ed] text-gray-800 font-sans p-4 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link href="/admin/tickets">
              <Button variant="outline" size="icon" className="h-9 w-9 bg-white border-gray-200 hover:bg-gray-50 text-[#095c7b]">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-[#095c7b] text-white hover:bg-[#095c7b]">
                  {ticket.status}
                </Badge>
                {ticket.priority === "Urgent" && (
                  <Badge className="bg-red-500 text-white">URGENT</Badge>
                )}
                {ticket.enquiryType === "Dispute of Delivery" && (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                    Lost in transit?
                  </Badge>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-[#095c7b] mt-1">
                {ticket.enquiryType} — {ticket.notes?.slice(0, 50) || "consignment issues"}...
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Ticket #{ticketId.slice(0, 8).toUpperCase()} • Linked to Case #{ticket.caseNumber || "CASE-1182"}
              </p>
            </div>
          </div>

          {/* SLA Badge */}
          <div className="flex items-center">
            {isSlaPaused ? (
              <Badge className="bg-slate-200 text-slate-700 py-1.5 px-3 border border-slate-300 text-sm flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></span>
                SLA paused • {ticket.status}
              </Badge>
            ) : (
              <Badge className={`py-1.5 px-3 text-sm flex items-center gap-2 font-medium ${
                slaRemainingHours <= 12 
                  ? "bg-red-50 text-red-700 border border-red-200" 
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}>
                <span className={`w-2 h-2 rounded-full ${slaRemainingHours <= 12 ? "bg-red-500" : "bg-emerald-500"} animate-pulse`}></span>
                SLA Active • {slaRemainingHours}h remaining (48h limit)
              </Badge>
            )}
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 divide-y md:divide-y-0 lg:divide-x divide-gray-100">
          <div className="p-2 md:p-0 md:px-3 first:pl-0">
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">Assigned</span>
            <span className="text-sm font-semibold text-gray-800 mt-1 block truncate">
              {ticket.assignedUser || "Unassigned"}
            </span>
          </div>
          <div className="p-2 md:p-0 md:px-3 pt-4 md:pt-0">
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">Created</span>
            <span className="text-sm font-semibold text-gray-700 mt-1 block">
              {createdDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, {createdDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="p-2 md:p-0 md:px-3 pt-4 md:pt-0">
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">Ticket Age</span>
            <span className="text-sm font-semibold text-gray-700 mt-1 block">
              {ticketAgeHours}h ({Math.min(ticketAgeHours, 48)}h on SLA)
            </span>
          </div>
          <div className="p-2 md:p-0 md:px-3 pt-4 md:pt-0">
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">SLA Due</span>
            <span className="text-sm font-semibold text-gray-700 mt-1 block">
              {new Date(createdDate.getTime() + 48 * 60 * 60 * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} 5:00pm
            </span>
          </div>
          <div className="p-2 md:p-0 md:px-3 pt-4 md:pt-0">
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">Customer</span>
            <span className="text-sm font-semibold text-gray-700 mt-1 block truncate">
              {ticket.customerCompany || ticket.customerName || "Northside Trading"}
            </span>
          </div>
          <div className="p-2 md:p-0 md:px-3 pt-4 md:pt-0">
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">Open Cases</span>
            <span className="text-sm font-semibold text-gray-700 mt-1 block">
              {packageDetails?.openTickets?.length || 1}
            </span>
          </div>
          <div className="p-2 md:p-0 md:px-3 pt-4 md:pt-0">
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">Lodgement Hub</span>
            <span className="text-sm font-semibold text-gray-700 mt-1 block truncate">
              {packageDetails?.trackingData?.lodgementHub || "Surry Hills Hub"}
            </span>
          </div>
          <div className="p-2 md:p-0 md:px-3 pt-4 md:pt-0">
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">Driver / Franchisee</span>
            <span className="text-xs font-semibold text-gray-700 mt-1 block truncate">
              {packageDetails?.trackingData?.lodgingDriver || "J. Martinez"}
            </span>
          </div>
        </div>

        {/* Issue Summary Banner */}
        <div className="border-l-4 border-[#095c7b] bg-[#eef6f9] p-4 rounded-r-xl shadow-sm">
          <span className="text-[10px] uppercase tracking-wider text-[#095c7b] font-bold block mb-1">Issue Summary</span>
          <p className="text-sm text-gray-700 leading-relaxed font-medium">
            {ticket.description || ticket.notes || "Customer advises consignment issues."}
          </p>
        </div>

        {/* Warning Alerts */}
        <div className="space-y-3">
          {movementDiffHours >= 48 && (
            <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-950">No movement detected for {movementDiffHours} hours</h4>
                <p className="text-xs text-red-800 mt-1">
                  Last scan: {packageDetails?.trackingData?.lastScan || "Botany Depot"} • {lastMovementTime ? lastMovementTime.toLocaleString() : "Recently"}. Exceeds the 48-hour no-movement threshold.
                </p>
              </div>
            </div>
          )}

          {ticket.enquiryType === "Dispute of Delivery" && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-950">Delivery scan disputed by receiver</h4>
                <p className="text-xs text-amber-800 mt-1">
                  System shows a delivery event the customer says did not occur — POD / ATL evidence requested.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT 2 COLUMNS: Timeline, Investigation Actions, Communications */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Timeline */}
            <Card className="border-0 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 py-4 px-6 flex justify-between items-center">
                <CardTitle className="text-md font-bold text-[#095c7b] flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Tracking timeline
                </CardTitle>
                <span className="text-xs text-gray-400 font-medium">Shared with Create Ticket — pulled once</span>
              </CardHeader>
              <CardContent className="p-6">
                {loadingPackage ? (
                  <div className="text-center py-6 text-sm text-gray-500 animate-pulse">Querying tracking timeline...</div>
                ) : packageDetails?.enrichedScans?.length > 0 ? (
                  <div className="relative pl-6 border-l-2 border-emerald-100 space-y-6">
                    {packageDetails.enrichedScans.map((scan: any, i: number) => (
                      <div key={i} className="relative">
                        {/* Timeline Bullet */}
                        <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-white ${
                          i === 0 ? "border-emerald-500" : "border-gray-300"
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500">
                              {scan.updated_at ? new Date(scan.updated_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : "N/A"}
                            </span>
                            {i === 0 && (
                              <Badge className="bg-emerald-50 text-emerald-700 text-[10px] hover:bg-emerald-50">Latest Scan</Badge>
                            )}
                            {scan.scan_type?.toLowerCase().includes("dispute") && (
                              <Badge className="bg-red-50 text-red-700 text-[10px]">DISPUTED</Badge>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-gray-800 mt-0.5">{scan.scan_type}</h4>
                          <p className="text-xs text-gray-500">{scan.partnerLocationName || scan.depot_id} {scan.partnerLocationAddress}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-gray-500">No tracking timeline recorded.</div>
                )}
              </CardContent>
            </Card>

            {/* Investigation Actions Panel */}
            <Card className="border-0 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 py-4 px-6 flex justify-between items-center">
                <CardTitle className="text-md font-bold text-[#095c7b] flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> Investigation panel
                </CardTitle>
                <Button 
                  onClick={() => setIsActionModalOpen(true)}
                  className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-8 flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add action
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-bold uppercase">
                      <tr>
                        <th className="py-3 px-6">Action</th>
                        <th className="py-3 px-6">User</th>
                        <th className="py-3 px-6">Date / Time</th>
                        <th className="py-3 px-6">Status</th>
                        <th className="py-3 px-6">Outcome / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {actions.length > 0 ? (
                        actions.map((act) => (
                          <tr key={act.id} className="hover:bg-gray-50/40">
                            <td className="py-3.5 px-6 font-semibold text-gray-800">{act.action}</td>
                            <td className="py-3.5 px-6 text-gray-600">{act.user}</td>
                            <td className="py-3.5 px-6 text-gray-500 text-xs">
                              {act.date ? new Date(act.date).toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : "N/A"}
                            </td>
                            <td className="py-3.5 px-6">
                              <Badge className={act.status === "Complete" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
                                {act.status}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-6 text-gray-600 text-xs max-w-xs truncate" title={act.notes}>
                              {act.notes}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-sm text-gray-400">
                            No investigation actions logged yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Customer Communication Timeline */}
            <Card className="border-0 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 py-4 px-6 flex justify-between items-center">
                <CardTitle className="text-md font-bold text-[#095c7b] flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Customer communication
                </CardTitle>
                <Button 
                  onClick={() => {
                    setEmailRecipient(ticket.customerEmail || packageDetails?.customerDetails?.email || "");
                    setIsEmailModalOpen(true);
                  }}
                  className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-8 flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" /> Send update
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {communications.length > 0 ? (
                  communications.map((comm) => (
                    <div key={comm.id} className="p-3.5 bg-gray-50/60 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-center mb-1.5">
                        <Badge className={comm.type === "SENT" ? "bg-[#095c7b]" : "bg-emerald-600"}>
                          {comm.type}
                        </Badge>
                        <span className="text-[10px] text-gray-400 font-semibold">
                          {comm.timestamp ? new Date(comm.timestamp).toLocaleString() : ""}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        From: <span className="font-medium text-gray-700">{comm.from}</span> to <span className="font-medium text-gray-700">{comm.to}</span>
                      </p>
                      <p className="text-xs text-gray-700 font-medium whitespace-pre-wrap mt-2 leading-relaxed">
                        {comm.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-sm text-gray-400">
                    No customer communications logged yet.
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* RIGHT COLUMN: Quick Actions, Summaries, StarTrack Enquiry, Staff Notes */}
          <div className="space-y-6">
            
            {/* Quick Actions Card */}
            <Card className="border-0 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 py-4 px-6">
                <CardTitle className="text-md font-bold text-[#095c7b]">Quick actions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Status Options */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Status</span>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => updateTicketStatus("Open")}
                      className="border-emerald-200 hover:bg-emerald-50 text-emerald-800 text-xs font-semibold animate-transition"
                    >
                      🟢 Mark Open
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => updateTicketStatus("Closed")}
                      className="border-red-200 hover:bg-red-50 text-red-800 text-xs font-semibold animate-transition"
                    >
                      ✅ Close ticket
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => updateTicketStatus("Lost in Transit")}
                      className="border-amber-200 hover:bg-amber-50 text-amber-800 text-xs font-semibold animate-transition"
                    >
                      🔴 Lost in Transit
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => updateTicketStatus("Damaged")}
                      className="border-orange-200 hover:bg-orange-50 text-orange-800 text-xs font-semibold animate-transition"
                    >
                      🟡 Damaged
                    </Button>
                  </div>
                </div>

                {/* Actions Options */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Actions</span>
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEmailRecipient(ticket.customerEmail || packageDetails?.customerDetails?.email || "");
                        setIsEmailModalOpen(true);
                      }}
                      className="justify-start text-xs text-gray-700 h-9"
                    >
                      ✉️ Send email
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const noteInput = document.getElementById("staff-note-input");
                        noteInput?.focus();
                        noteInput?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="justify-start text-xs text-gray-700 h-9"
                    >
                      📝 Add note
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEscalateType("Operations");
                        setIsEscalateModalOpen(true);
                      }}
                      className="justify-start text-xs text-gray-700 h-9"
                    >
                      👤 Assign user
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={async () => {
                        // Quick log Contact Depot
                        await addDoc(collection(db, "tickets", ticketId, "actions"), {
                          action: "Contact depot",
                          user: userProfile?.displayName || userProfile?.email || "Staff",
                          date: new Date().toISOString(),
                          status: "Complete",
                          notes: "Contacted regional depot; awaiting package update."
                        });
                        toast.success("Logged 'Contact depot' action.");
                      }}
                      className="justify-start text-xs text-gray-700 h-9"
                    >
                      🏢 Contact depot
                    </Button>
                  </div>
                </div>

                {/* Escalate Options */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Escalate</span>
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEscalateType("Operations");
                        setIsEscalateModalOpen(true);
                      }}
                      className="w-full text-xs border-amber-300 text-amber-700 hover:bg-amber-50 h-10 font-bold"
                    >
                      ⚙️ Operations ticket
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEscalateType("IT");
                        setIsEscalateModalOpen(true);
                      }}
                      className="w-full text-xs border-slate-700 text-slate-800 hover:bg-slate-50 h-10 font-bold"
                    >
                      💻 IT ticket
                    </Button>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1.5 block leading-normal">
                    Every action opens a pop-up. Escalating creates a linked ticket in the relevant section, pre-filled with this case's details.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Consignment Summary Card */}
            <Card className="border-0 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 py-4 px-6">
                <CardTitle className="text-md font-bold text-[#095c7b]">Consignment summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-sm divide-y divide-gray-100">
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-500 font-medium">Barcode</span>
                  <span className="font-bold text-gray-800">{ticket.trackingIdentifier}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-500 font-medium">Customer ref</span>
                  <span className="font-medium text-gray-800">{ticket.customerAccountNumber || "N/A"}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-500 font-medium">Service type</span>
                  <span className="font-medium text-gray-800">{packageDetails?.trackingData?.serviceType || "MailPlus Premium"}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-500 font-medium">Lodged</span>
                  <span className="font-medium text-gray-800">{packageDetails?.trackingData?.lodged || "N/A"}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-500 font-medium">Origin → Dest.</span>
                  <span className="font-medium text-gray-800">{packageDetails?.trackingData?.originDest || "N/A"}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-500 font-medium">Receiver</span>
                  <span className="font-bold text-gray-800">{ticket.receiverName}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-500 font-medium">ETA</span>
                  <span className="font-medium text-red-600 font-semibold">{packageDetails?.trackingData?.eta || "Unknown"}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-500 font-medium">Last scan</span>
                  <span className="font-medium text-gray-800">{packageDetails?.trackingData?.lastScan || "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Customer Details Box */}
            <Card className="border-0 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 py-4 px-6 flex justify-between items-center">
                <CardTitle className="text-md font-bold text-[#095c7b] flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" /> Customer Details
                </CardTitle>
                <Badge variant="outline" className="border-amber-400 text-amber-800 bg-amber-50">
                  {ticket.customerTier || "Standard"}
                </Badge>
              </CardHeader>
              <CardContent className="p-6 text-xs space-y-3">
                <div>
                  <span className="text-gray-400 font-semibold uppercase block">Company Name</span>
                  <span className="text-sm font-bold text-gray-800">{ticket.customerCompany || ticket.customerName || "Northside Trading"}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold uppercase block">Account Number</span>
                  <span className="text-sm font-semibold text-gray-800">{ticket.customerAccountNumber || "N/A"}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold uppercase block">Contact Name</span>
                  <span className="text-sm font-semibold text-gray-850">{ticket.customerContactName || "Primary Contact"}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold uppercase block">Email (Click to Send Email)</span>
                  <button 
                    onClick={() => {
                      setEmailRecipient(ticket.customerEmail || packageDetails?.customerDetails?.email || "");
                      setIsEmailModalOpen(true);
                    }}
                    className="text-sm font-bold text-[#095c7b] hover:underline text-left block truncate w-full"
                  >
                    {ticket.customerEmail || "N/A"}
                  </button>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold uppercase block">Phone</span>
                  <span className="text-sm font-semibold text-gray-850">{ticket.customerPhone || "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            {/* StarTrack Enquiry Numbers */}
            <Card className="border-0 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 py-4 px-6">
                <CardTitle className="text-md font-bold text-[#095c7b]">StarTrack enquiry no(s)</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <span className="text-xs text-gray-400 leading-normal block">
                  Captured the first time the depot/StarTrack is contacted. Add more as needed.
                </span>
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g. ST-ENQ-44821" 
                    value={newEnquiryNumber}
                    onChange={(e) => setNewEnquiryNumber(e.target.value)}
                    className="text-xs h-9 bg-gray-50 border-gray-200"
                  />
                  <Button onClick={handleAddEnquiry} className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-9">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ticket.starTrackEnquiries?.map((enq: string, i: number) => (
                    <Badge key={i} className="bg-slate-100 text-slate-700 text-xs border border-slate-200 py-0.5 px-2 hover:bg-slate-100">
                      {enq}
                    </Badge>
                  ))}
                  {(!ticket.starTrackEnquiries || ticket.starTrackEnquiries.length === 0) && (
                    <span className="text-xs text-gray-400 italic">No enquiry numbers logged yet.</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Staff-Only Internal Notes */}
            <Card className="border-0 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 py-4 px-6 flex justify-between items-center">
                <CardTitle className="text-md font-bold text-[#095c7b]">Internal notes</CardTitle>
                <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] hover:bg-amber-100">
                  Staff only
                </Badge>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {staffNotes.map((note) => (
                    <div key={note.id} className="p-3 bg-amber-50/40 border border-amber-100 rounded-lg">
                      <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold mb-1">
                        <span>{note.author}</span>
                        <span>{note.timestamp ? new Date(note.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ""}</span>
                      </div>
                      <p className="text-xs text-gray-700 leading-normal">{note.content}</p>
                    </div>
                  ))}
                  {staffNotes.length === 0 && (
                    <span className="text-xs text-gray-400 italic block py-4 text-center">No internal notes added.</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input 
                    id="staff-note-input"
                    placeholder="Add a staff-only note..." 
                    value={newStaffNote}
                    onChange={(e) => setNewStaffNote(e.target.value)}
                    className="text-xs h-9 bg-gray-50 border-gray-200"
                  />
                  <Button onClick={handleAddStaffNote} className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-9">
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Attachments Card */}
            <Card className="border-0 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 py-4 px-6">
                <CardTitle className="text-md font-bold text-[#095c7b]">Attachments & evidence</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {ticket.attachments && ticket.attachments.length > 0 ? (
                  ticket.attachments.map((file: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg border border-gray-150">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-700 font-medium truncate" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                      <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-[#095c7b] font-bold hover:underline ml-2"
                      >
                        View
                      </a>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic block py-2 text-center">No attachments available.</span>
                )}
              </CardContent>
            </Card>

          </div>

        </div>

      </div>

      {/* MODAL: Log Action */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#095c7b] font-bold">Add Investigation Action</DialogTitle>
            <DialogDescription className="text-xs">
              Record a new touchpoint or action taken for this delivery investigation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Action Type</label>
              <select 
                value={newActionType} 
                onChange={(e) => setNewActionType(e.target.value)}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg p-2"
              >
                <option value="Contact depot">Contact depot</option>
                <option value="Request POD">Request POD</option>
                <option value="Request ATL image">Request ATL image</option>
                <option value="Request GPS">Request GPS</option>
                <option value="General Check">General Check</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
              <select 
                value={newActionStatus} 
                onChange={(e) => setNewActionStatus(e.target.value)}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg p-2"
              >
                <option value="Pending">Pending</option>
                <option value="Complete">Complete</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Outcome / Notes</label>
              <Textarea 
                placeholder="Enter details of the action outcome..." 
                value={newActionNotes}
                onChange={(e) => setNewActionNotes(e.target.value)}
                className="text-xs bg-gray-50 border-gray-200 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsActionModalOpen(false)} className="text-xs">Cancel</Button>
            <Button onClick={handleAddAction} className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs">Save Action</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Escalate Ticket (Operations / IT) */}
      <Dialog open={isEscalateModalOpen} onOpenChange={setIsEscalateModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#095c7b] font-bold">Create {escalateType} Escalation Ticket</DialogTitle>
            <DialogDescription className="text-xs">
              Assign a linked ticket to a customer service/support team member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Select Assignee</label>
              <select 
                value={escalateAssignee} 
                onChange={(e) => setEscalateAssignee(e.target.value)}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg p-2"
              >
                <option value="">-- Choose Staff Member --</option>
                {csUsers.map((u: any) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName || u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEscalateModalOpen(false)} className="text-xs">Cancel</Button>
            <Button onClick={handleEscalate} className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs">
              Assign & Create Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Send Email to Customer */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="max-w-lg bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#095c7b] font-bold flex items-center gap-2">
              <Mail className="h-5 w-5" /> Send Email to Customer
            </DialogTitle>
            <DialogDescription className="text-xs">
              Draft and dispatch an update directly to the customer. This will update the communication timeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase block">Recipient</label>
              <Input 
                value={emailRecipient} 
                onChange={(e) => setEmailRecipient(e.target.value)}
                placeholder="customer@domain.com"
                className="text-xs bg-gray-50 border-gray-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase block">Subject</label>
              <Input 
                value={emailSubject} 
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="MailPlus Delivery Investigation Update"
                className="text-xs bg-gray-50 border-gray-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase block">Body</label>
              <Textarea 
                value={emailBody} 
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Type your email response here..."
                className="text-xs bg-gray-50 border-gray-200 min-h-[180px] leading-relaxed"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEmailModalOpen(false)} className="text-xs">Cancel</Button>
            <Button onClick={handleSendEmail} className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs">
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
