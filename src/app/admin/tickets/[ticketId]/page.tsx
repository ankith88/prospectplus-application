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
  Paperclip,
  RefreshCw,
  Truck,
  Info,
  Activity,
  ArrowUpRight,
  Download,
  Check,
  MapPin,
  Tag,
  Copy
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
  getDocs,
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
  const [childTickets, setChildTickets] = useState<any[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  // Load child tickets if this is a Master Case
  useEffect(() => {
    if (!ticket || !ticket.isMasterCase) return;

    setLoadingChildren(true);
    const childQuery = query(collection(db, "tickets"));
    
    const unsubChildren = onSnapshot(childQuery, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.parentTicketId === ticket.id) {
          list.push({ id: d.id, ...data });
        }
      });
      setChildTickets(list);
      setLoadingChildren(false);
    });

    return () => unsubChildren();
  }, [ticket]);

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

  const [isMissedSweepModalOpen, setIsMissedSweepModalOpen] = useState(false);
  const [isSendingMissedSweep, setIsSendingMissedSweep] = useState(false);

  const [newEnquiryNumber, setNewEnquiryNumber] = useState("");
  const [newStaffNote, setNewStaffNote] = useState("");

  // Status Change Confirmation States
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [statusConfirmNotes, setStatusConfirmNotes] = useState("");
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

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
  const updateTicketStatus = async (newStatus: string, notes?: string) => {
    setIsSubmittingStatus(true);
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      await updateDoc(ticketRef, { status: newStatus });
      setTicket((prev: any) => ({ ...prev, status: newStatus }));
      toast.success(`Ticket status updated to ${newStatus}`);

      const actionNotes = notes && notes.trim()
        ? `Ticket status set to '${newStatus}'. Notes: ${notes}`
        : `Ticket status set to '${newStatus}'`;

      // Log action in history
      await addDoc(collection(db, "tickets", ticketId, "actions"), {
        action: "Status Update",
        user: userProfile?.displayName || userProfile?.email || "System",
        date: new Date().toISOString(),
        status: "Complete",
        notes: actionNotes
      });

      // Add to internal staff notes if notes are provided
      if (notes && notes.trim()) {
        await addDoc(collection(db, "tickets", ticketId, "staffNotes"), {
          author: userProfile?.displayName || userProfile?.email || "Staff",
          timestamp: new Date().toISOString(),
          content: `[Status Change to ${newStatus}] ${notes}`
        });
      }
    } catch (err) {
      console.error("Failed to update ticket status:", err);
      toast.error("Failed to update ticket status.");
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const promptStatusChange = (status: string) => {
    setPendingStatus(status);
    setStatusConfirmNotes("");
    setIsStatusConfirmOpen(true);
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

      // Write to top-level collections operations_tickets or it_tickets
      const todayDate = new Date();
      const raisedFormatted = todayDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }) + " - auto-escalated";

      if (escalateType === "Operations") {
        const opsSnap = await getDocs(collection(db, "operations_tickets"));
        const opsNum = 42 + opsSnap.size;
        await addDoc(collection(db, "operations_tickets"), {
          ticketId: `#OPS-${String(opsNum).padStart(4, "0")}`,
          type: ticket?.enquiryType || "Missed sweep",
          linkedTrackingTicket: ticket?.trackingIdentifier || ticketId || "—",
          depot: ticket?.depot || "Botany Depot",
          status: "Investigating",
          assignee: assigneeName,
          raised: raisedFormatted,
          createdAt: new Date().toISOString(),
          description: ticket?.description || ticket?.notes || "Escalated from tracking ticket."
        });
      } else {
        const itSnap = await getDocs(collection(db, "it_tickets"));
        const itNum = 89 + itSnap.size;
        await addDoc(collection(db, "it_tickets"), {
          ticketId: `#IT-${String(itNum).padStart(4, "0")}`,
          type: "System issue",
          linkedTrackingTicket: ticket?.trackingIdentifier || ticketId || "—",
          description: ticket?.description || ticket?.notes || "Scan data missing from depot run",
          status: "Investigating",
          priority: (ticket?.priority || "STANDARD").toUpperCase(),
          raised: raisedFormatted,
          createdAt: new Date().toISOString()
        });
      }

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

  // Missed Sweep Handler
  const handleSendMissedSweep = async () => {
    setIsSendingMissedSweep(true);
    try {
      const res = await fetch("/api/tickets/missed-sweep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          userDisplayName: userProfile?.displayName || userProfile?.email || "Staff"
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Missed Sweep alert successfully sent to Operations & Fiona.");
        setTicket((prev: any) => ({ ...prev, status: "Awaiting Operations" }));
        setIsMissedSweepModalOpen(false);
      } else {
        toast.error(data.message || "Failed to dispatch Missed Sweep alert.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while sending the Missed Sweep alert.");
    } finally {
      setIsSendingMissedSweep(false);
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
    <div className="min-h-screen bg-[#f4f7f6] text-slate-800 font-sans p-4 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
        
        {ticket.parentTicketId && (
          <div className="bg-[#EAF1E7] border border-[#C3D2C2] text-[#0E3D3B] p-4 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="bg-[#095c7b] text-white text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase">
                Child Case
              </span>
              <span className="text-sm font-medium text-slate-700">
                This consignment is part of a multi-consignment investigation.
              </span>
            </div>
            <Link href={`/admin/tickets/${ticket.parentTicketId}`}>
              <Button size="sm" className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs font-semibold rounded-lg shadow-sm">
                View Master Case →
              </Button>
            </Link>
          </div>
        )}
        
        {/* Modern Header Panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-2">
          <div className="flex items-start gap-4">
            <Link href="/admin/tickets">
              <Button variant="outline" size="icon" className="h-10 w-10 bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-350 text-[#095c7b] rounded-xl shrink-0 shadow-sm">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`px-2.5 py-0.5 text-xs font-bold rounded-full border shadow-sm ${
                  ticket.status === "Closed" || ticket.status === "Resolved"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : ticket.status === "Lost in Transit"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : ticket.status === "Damaged"
                    ? "bg-orange-50 text-orange-700 border-orange-200"
                    : "bg-[#095c7b]/10 text-[#095c7b] border-[#095c7b]/20"
                }`}>
                  {ticket.status}
                </Badge>
                {ticket.priority === "Urgent" && (
                  <Badge className="bg-red-500 text-white border-none shadow-sm shadow-red-200 px-2.5 py-0.5 rounded-full text-xs font-bold">URGENT</Badge>
                )}
                {ticket.enquiryType === "Dispute of Delivery" && (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 rounded-full px-2.5 py-0.5">
                    Lost in transit?
                  </Badge>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight mt-1 flex items-center gap-2 flex-wrap">
                <span>{ticket.enquiryType} — #{ticket.ticketNumber || ticketId.slice(0, 8).toUpperCase()}</span>
                <button
                  onClick={() => {
                    const idToCopy = ticket.ticketNumber || ticketId;
                    navigator.clipboard.writeText(idToCopy);
                    toast.success("Ticket ID copied!");
                  }}
                  className="p-1 hover:bg-slate-200/50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  title="Copy Ticket ID"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                {ticket.parentTicketId ? `Linked to Master Case #${ticket.parentTicketId.slice(0, 8).toUpperCase()}` : "Primary Support Ticket"}
              </p>
            </div>
          </div>

          {/* SLA Badge Panel */}
          <div className="flex items-center shrink-0">
            {isSlaPaused ? (
              <div className="bg-slate-100 text-slate-650 py-2 px-4 rounded-xl border border-slate-200/60 text-xs flex items-center gap-2 font-semibold shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-pulse"></span>
                SLA Paused ({ticket.status})
              </div>
            ) : (
              <div className={`py-2 px-4 rounded-xl text-xs flex items-center gap-2.5 font-semibold shadow-sm border ${
                slaRemainingHours <= 12 
                  ? "bg-red-50 text-red-700 border-red-200" 
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full ${slaRemainingHours <= 12 ? "bg-red-500" : "bg-emerald-500"} animate-pulse`}></span>
                SLA Active • {slaRemainingHours}h remaining (48h SLA limit)
              </div>
            )}
          </div>
        </div>

        {/* Metadata Grid Strip */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 divide-y md:divide-y-0 lg:divide-x divide-slate-100">
          <div className="pt-2 md:pt-0 first:pt-0">
            <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">Assigned To</span>
            <span className="text-sm font-bold text-slate-750 mt-1 block truncate">
              {ticket.assignedUser || "Unassigned"}
            </span>
          </div>
          <div className="pt-3 md:pt-0 lg:pl-4">
            <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">Date Created</span>
            <span className="text-sm font-semibold text-slate-700 mt-1 block">
              {createdDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, {createdDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="pt-3 md:pt-0 lg:pl-4">
            <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">Ticket Age</span>
            <span className="text-sm font-semibold text-slate-700 mt-1 block">
              {ticketAgeHours}h ({Math.min(ticketAgeHours, 48)}h SLA)
            </span>
          </div>
          <div className="pt-3 md:pt-0 lg:pl-4">
            <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">SLA Deadline</span>
            <span className="text-sm font-semibold text-slate-700 mt-1 block">
              {new Date(createdDate.getTime() + 48 * 60 * 60 * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} 5:00pm
            </span>
          </div>
          <div className="pt-3 md:pt-0 lg:pl-4">
            <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">Open Cases</span>
            <span className="text-sm font-semibold text-slate-750 mt-1 block">
              {packageDetails?.openTickets?.length || 1}
            </span>
          </div>
        </div>

        {/* Warning Alerts */}
        <div className="space-y-3">
          {movementDiffHours >= 48 && (
            <div className="bg-red-50 border border-red-200 text-red-900 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="text-sm font-bold text-red-950">No package movement detected for {movementDiffHours} hours</h4>
                <p className="text-xs text-red-800 mt-0.5">
                  Last recorded scan was at {packageDetails?.trackingData?.lastScan || "Botany Depot"} on {lastMovementTime ? lastMovementTime.toLocaleString() : "Recently"}. This exceeds the threshold of 48 hours without scanning activity.
                </p>
              </div>
            </div>
          )}

          {ticket.enquiryType === "Dispute of Delivery" && (
            <div className="bg-amber-50/80 border border-amber-200 text-amber-900 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-950">Delivery scan is contested by the customer</h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  The delivery status shows as completed, but the receiver states they did not receive the package. Proof of Delivery (POD) and Authority to Leave (ATL) verification is required.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT 2 COLUMNS: Tracking Status, Customer Details, Issue Summary, Timeline, Communications */}
          <div className="lg:col-span-2 space-y-6">
               {/* 1. Customer Details Box (Placed directly at the top) */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-3.5 px-6 flex flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#095c7b]/10 text-[#095c7b] rounded-xl">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-[#095c7b]">Customer Details</CardTitle>
                    <p className="text-[11px] text-slate-450">Account information and primary contact channels</p>
                  </div>
                </div>
                <Badge className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wider uppercase">
                  {ticket.customerTier || "Standard"} Tier
                </Badge>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
                <div className="col-span-2 md:col-span-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Company Name</span>
                  {(ticket.companyId || packageDetails?.customerDetails?.companyId) ? (
                    <Link 
                      href={`/companies/${ticket.companyId || packageDetails.customerDetails.companyId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#095c7b] hover:text-[#053647] hover:underline text-sm block"
                    >
                      {ticket.customerCompany || ticket.customerName || "Northside Trading"}
                    </Link>
                  ) : (
                    <span className="font-bold text-slate-800 text-sm block">
                      {ticket.customerCompany || ticket.customerName || "Northside Trading"}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Account Number</span>
                  <span className="font-semibold text-slate-700 text-sm block">{ticket.customerAccountNumber || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Contact Name</span>
                  <span className="font-medium text-slate-700 text-sm block">{ticket.customerContactName || "Primary Contact"}</span>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email (Send Update)</span>
                  <button 
                    onClick={() => {
                      setEmailRecipient(ticket.customerEmail || packageDetails?.customerDetails?.email || "");
                      setIsEmailModalOpen(true);
                    }}
                    className="font-bold text-[#095c7b] hover:text-[#053647] hover:underline text-left block truncate w-full text-sm flex items-center gap-1"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {ticket.customerEmail || "N/A"}
                  </button>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone</span>
                  <span className="font-semibold text-slate-700 text-sm block">{ticket.customerPhone || "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            {/* 2. Tracking Status & Lodgement Section (Placed directly below Customer Details) */}
            <Card className="border border-[#bcf0c2] bg-[#f8fdf9] shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-[#bcf0c2]/30 bg-[#eefaf1] py-4 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#d1f5d8] text-[#1e5c32] rounded-xl">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-[#1a4a2b]">Tracking Status & Lodgement</CardTitle>
                    <p className="text-[11px] text-[#2b6d3f]">Real-time scans and depot franchisee details</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (ticket?.trackingIdentifier) {
                      fetchPackageData(ticket.trackingIdentifier);
                    }
                  }}
                  disabled={loadingPackage}
                  className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-8 px-4 flex items-center gap-1.5 shadow-sm rounded-lg"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingPackage ? "animate-spin" : ""}`} />
                  Get Real-Time Status
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                {/* Barcode details block */}
                <div className="bg-[#edf9f0] border border-[#bcf0c2] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider block">Barcode / Consignment ID</span>
                    <span className="font-mono text-base sm:text-lg font-bold text-[#1a4a2b]">{ticket.trackingIdentifier || "N/A"}</span>
                  </div>
                  
                  {packageDetails?.packageInfo ? (
                    <div className="flex flex-wrap gap-2">
                      {packageDetails.packageInfo.serviceType && (
                        <Badge variant="outline" className="bg-white border-[#bcf0c2] text-[#1a4a2b] font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                          {packageDetails.packageInfo.serviceType}
                        </Badge>
                      )}
                      {packageDetails.packageInfo.weight && (
                        <Badge variant="outline" className="bg-white border-[#bcf0c2] text-[#1a4a2b] font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                          Weight: {packageDetails.packageInfo.weight}
                        </Badge>
                      )}
                      {packageDetails.packageInfo.dimensions && (
                        <Badge variant="outline" className="bg-white border-[#bcf0c2] text-[#1a4a2b] font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                          Dimensions: {packageDetails.packageInfo.dimensions}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic flex items-center gap-1">
                      <Info className="h-4 w-4 text-emerald-600" /> Click status button to retrieve package properties.
                    </p>
                  )}
                </div>

                {packageDetails?.packageInfo && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-4 border-b border-[#bcf0c2]/30">
                    <div className="bg-white border border-[#bcf0c2]/30 p-3 rounded-xl">
                      <span className="text-[9px] font-bold text-[#2f855a] uppercase tracking-wider block">Order Number</span>
                      <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{packageDetails.packageInfo.orderNumber || "N/A"}</span>
                    </div>
                    <div className="bg-white border border-[#bcf0c2]/30 p-3 rounded-xl md:col-span-2">
                      <span className="text-[9px] font-bold text-[#2f855a] uppercase tracking-wider block">Attached Info / Description</span>
                      <span className="font-medium text-slate-800 text-sm mt-0.5 block truncate" title={packageDetails.packageInfo.description}>{packageDetails.packageInfo.description || "N/A"}</span>
                    </div>
                  </div>
                )}

                {/* Primary tracking info cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-[#bcf0c2]/30 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider block mb-1">Current Status</span>
                    <span className="text-sm font-bold text-[#1a4a2b] block">{packageDetails?.trackingData?.currentStatus || "N/A"}</span>
                  </div>
                  <div className="bg-white border border-[#bcf0c2]/30 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider block mb-1">Status Fetched At</span>
                    <span className="text-sm font-semibold text-slate-700 block">{packageDetails?.trackingData?.statusUpdatedAt || "N/A"}</span>
                  </div>
                  <div className="bg-white border border-[#bcf0c2]/30 p-4 rounded-xl shadow-sm col-span-2 md:col-span-1">
                    <span className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider block mb-1">Last Movement</span>
                    <span className="text-sm font-semibold text-slate-700 block">{packageDetails?.trackingData?.lastMovement || "N/A"}</span>
                  </div>
                  <div className="bg-white border border-[#bcf0c2]/30 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider block mb-1">Current Depot</span>
                    <span className="text-sm font-semibold text-slate-700 block truncate" title={packageDetails?.trackingData?.currentDepot}>{packageDetails?.trackingData?.currentDepot || "N/A"}</span>
                  </div>
                  <div className="bg-white border border-[#bcf0c2]/30 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider block mb-1">Sender</span>
                    <span className="text-sm font-semibold text-slate-700 block truncate" title={packageDetails?.trackingData?.sender}>{packageDetails?.trackingData?.sender || "N/A"}</span>
                  </div>
                  <div className="bg-white border border-[#bcf0c2]/30 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider block mb-1">Receiver</span>
                    <span className="text-sm font-semibold text-slate-700 block truncate" title={packageDetails?.trackingData?.receiver}>{packageDetails?.trackingData?.receiver || "N/A"}</span>
                  </div>
                </div>

                {/* Franchisee / Lodgement Hub detail list */}
                <div className="pt-5 border-t border-[#bcf0c2]/30 space-y-4">
                  <h4 className="text-[11px] font-bold text-[#1e5c32] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#2f855a]" /> Lodgement & Franchisee Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-100 p-3 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Lodgement Hub</span>
                      <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{packageDetails?.trackingData?.lodgementHub || "N/A"}</span>
                    </div>
                    <div className="bg-white border border-slate-100 p-3 rounded-xl col-span-1 sm:col-span-2 md:col-span-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Hub Address</span>
                      <span className="text-xs font-semibold text-slate-700 mt-0.5 block truncate" title={packageDetails?.trackingData?.hubAddress}>{packageDetails?.trackingData?.hubAddress || "N/A"}</span>
                    </div>
                    <div className="bg-white border border-slate-100 p-3 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Lodging Driver</span>
                      <span className="text-xs font-semibold text-slate-700 mt-0.5 block truncate" title={packageDetails?.trackingData?.lodgingDriver}>{packageDetails?.trackingData?.lodgingDriver || "N/A"}</span>
                    </div>
                    <div className="bg-white border border-slate-100 p-3 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Franchisee Contact</span>
                      <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{packageDetails?.trackingData?.franchiseeContact || "N/A"}</span>
                    </div>
                    <div className="bg-white border border-slate-100 p-3 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Last MP Scan</span>
                      <span className="text-xs font-semibold text-slate-700 mt-0.5 block truncate" title={packageDetails?.trackingData?.lastScan}>{packageDetails?.trackingData?.lastScan || "N/A"}</span>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* 3. Issue Summary Banner */}
            <div className="border-l-4 border-[#095c7b] bg-[#edf6f9] p-5 rounded-r-2xl shadow-sm flex items-start gap-3">
              <Info className="h-5 w-5 text-[#095c7b] shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#095c7b] font-bold block mb-1">Investigation Issue Summary</span>
                <p className="text-sm text-slate-700 font-medium leading-relaxed">
                  {ticket.description || ticket.notes || "Customer advises consignment issues."}
                </p>
              </div>
            </div>

            {/* 4. Tracking Timeline */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-4 px-6 flex justify-between items-center">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#095c7b]" /> Consignment Scan Log
                </CardTitle>
                <span className="text-xs text-slate-400 font-semibold bg-slate-100/60 px-2 py-0.5 rounded-full">
                  Carrier Pulled Data
                </span>
              </CardHeader>
              <CardContent className="p-6">
                {loadingPackage ? (
                  <div className="text-center py-8 text-sm text-slate-400 animate-pulse flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-[#095c7b]" />
                    <span>Synchronizing scan history...</span>
                  </div>
                ) : packageDetails?.enrichedScans?.length > 0 ? (
                  <div className="relative pl-6 border-l-2 border-emerald-100 space-y-6">
                    {packageDetails.enrichedScans.map((scan: any, i: number) => (
                      <div key={i} className="relative">
                        {/* Timeline Bullet */}
                        <div className={`absolute -left-[31px] top-1 w-4.5 h-4.5 rounded-full border-2 bg-white flex items-center justify-center ${
                          i === 0 ? "border-emerald-500 text-emerald-500 shadow-sm shadow-emerald-100" : "border-slate-350 text-slate-350"
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-emerald-500" : "bg-slate-300"}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-400">
                              {scan.updated_at ? new Date(scan.updated_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : "N/A"}
                            </span>
                            {i === 0 && (
                              <Badge className="bg-emerald-50 border border-emerald-250 text-emerald-700 text-[9px] font-bold rounded px-1.5 hover:bg-emerald-50">Latest Event</Badge>
                            )}
                            {scan.scan_type?.toLowerCase().includes("dispute") && (
                              <Badge className="bg-red-50 border border-red-200 text-red-700 text-[9px] font-bold rounded px-1.5">Disputed</Badge>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 mt-0.5">{scan.scan_type}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{scan.partnerLocationName || scan.depot_id} {scan.partnerLocationAddress}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-slate-400 italic">No timeline entries found for this tracking code.</div>
                )}
              </CardContent>
            </Card>

            {/* 5. Linked Child Tickets / Barcodes (Master Case only) */}
            {ticket.isMasterCase && (
              <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#095c7b]" /> Multi-Consignment Barcodes ({childTickets.length})
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Resolved ({childTickets.filter(t => ['Resolved', 'Closed', 'Lost in Transit', 'Damaged'].includes(t.status) && t.status !== 'Lost in Transit' && t.status !== 'Damaged').length})
                    </span>
                    <span className="bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full border border-red-200">
                      Lost/Damaged ({childTickets.filter(t => t.status === 'Lost in Transit' || t.status === 'Damaged').length})
                    </span>
                    <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Active ({childTickets.filter(t => !['Resolved', 'Closed', 'Lost in Transit', 'Damaged'].includes(t.status)).length})
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingChildren ? (
                    <div className="text-center py-8 text-sm text-slate-400 animate-pulse">Loading package list...</div>
                  ) : childTickets.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase">
                          <tr>
                            <th className="py-3 px-6">Barcode / ID</th>
                            <th className="py-3 px-6">Case Description</th>
                            <th className="py-3 px-6">Status</th>
                            <th className="py-3 px-6">Assignee</th>
                            <th className="py-3 px-6 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {childTickets.map((child) => (
                            <tr key={child.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="py-3.5 px-6 font-mono font-bold text-slate-800">{child.trackingIdentifier}</td>
                              <td className="py-3.5 px-6 text-slate-500 text-xs max-w-xs truncate" title={child.description}>
                                {child.description}
                              </td>
                              <td className="py-3.5 px-6">
                                <Badge className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  child.status === "Resolved" || child.status === "Closed"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : child.status === "Lost in Transit"
                                    ? "bg-red-50 text-red-700 border border-red-200"
                                    : child.status === "Damaged"
                                    ? "bg-orange-50 text-orange-700 border border-orange-200"
                                    : "bg-amber-50 text-amber-700"
                                }`}>
                                  {child.status}
                                </Badge>
                              </td>
                              <td className="py-3.5 px-6 text-slate-650 text-xs">{child.assignedUser || "Unassigned"}</td>
                              <td className="py-3.5 px-6 text-right">
                                <Link href={`/admin/tickets/${child.id}`}>
                                  <Button size="sm" variant="outline" className="text-xs text-[#095c7b] border-[#095c7b]/20 hover:bg-[#095c7b]/5 rounded-lg">
                                    Investigate →
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-slate-400 italic">No child tickets.</div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 6. Customer Communication Timeline */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-4 px-6 flex justify-between items-center">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-[#095c7b]" /> Customer Update Hub
                </CardTitle>
                <Button 
                  onClick={() => {
                    setEmailRecipient(ticket.customerEmail || packageDetails?.customerDetails?.email || "");
                    setIsEmailModalOpen(true);
                  }}
                  disabled={!!ticket.parentTicketId}
                  className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-8 px-4 flex items-center gap-1.5 rounded-lg shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" /> Send Email
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {ticket.parentTicketId ? (
                  <div className="bg-[#fffcf6] border border-[#ffe3b3] text-[#a06d28] p-4.5 rounded-2xl text-xs space-y-2.5">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="h-4.5 w-4.5 text-[#b7791f]" /> Customer Correspondence is Centralized
                    </p>
                    <p className="leading-relaxed">
                      All messages, threads, and history for this package are routed through the Parent Master Case. Go to the master case to communicate with the client.
                    </p>
                    <Link href={`/admin/tickets/${ticket.parentTicketId}`} className="inline-block mt-1">
                      <Button size="sm" variant="outline" className="text-xs border-[#ffe0b2] hover:bg-[#fff7ea] text-[#b7791f] font-bold rounded-lg">
                        Go to Master Case
                      </Button>
                    </Link>
                  </div>
                ) : communications.length > 0 ? (
                  <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                    {communications.map((comm) => (
                      <div key={comm.id} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                          <Badge className={`rounded-full text-[10px] font-bold px-2 py-0.5 border ${
                            comm.type === "SENT" 
                              ? "bg-slate-100 text-slate-700 border-slate-200" 
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}>
                            {comm.type === "SENT" ? "OUTBOUND EMAIL" : "INCOMING MESSAGE"}
                          </Badge>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {comm.timestamp ? new Date(comm.timestamp).toLocaleString() : ""}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-450">
                          From: <span className="font-bold text-slate-600">{comm.from}</span> to <span className="font-bold text-slate-600">{comm.to}</span>
                        </p>
                        <div className="text-xs text-slate-700 font-medium whitespace-pre-wrap mt-3 leading-relaxed bg-white border border-slate-100 p-3 rounded-xl">
                          {comm.content}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-slate-400 italic">No correspondence records logged.</div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* RIGHT COLUMN: Sidebar Quick Actions, Escalations, Investigation Actions, Internal Notes, Attachments, StarTrack */}
          <div className="space-y-6">
            
            {/* Quick Actions Panel */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-4 px-6">
                <CardTitle className="text-sm font-bold text-slate-800">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Status Toggle Grid */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Update Ticket Status</span>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => promptStatusChange("Open")}
                      className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg h-9"
                    >
                      🟢 Open
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => promptStatusChange("Closed")}
                      className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg h-9"
                    >
                      ✅ Closed
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => promptStatusChange("Lost in Transit")}
                      className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg h-9"
                    >
                      🔴 Lost
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => promptStatusChange("Damaged")}
                      className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg h-9"
                    >
                      🟡 Damaged
                    </Button>
                  </div>
                </div>

                {/* Operations Action Tools */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Investigation Tasks</span>
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEmailRecipient(ticket.customerEmail || packageDetails?.customerDetails?.email || "");
                        setIsEmailModalOpen(true);
                      }}
                      className="justify-start text-xs text-slate-700 h-9 rounded-lg border-slate-250 hover:bg-slate-50 gap-2"
                    >
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> Draft email
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const noteInput = document.getElementById("staff-note-input");
                        noteInput?.focus();
                        noteInput?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="justify-start text-xs text-slate-700 h-9 rounded-lg border-slate-250 hover:bg-slate-50 gap-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-slate-400" /> Append internal note
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEscalateType("Operations");
                        setIsEscalateModalOpen(true);
                      }}
                      className="justify-start text-xs text-slate-700 h-9 rounded-lg border-slate-250 hover:bg-slate-50 gap-2"
                    >
                      <UserPlus className="h-3.5 w-3.5 text-slate-400" /> Assign staff
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={async () => {
                        await addDoc(collection(db, "tickets", ticketId, "actions"), {
                          action: "Contact depot",
                          user: userProfile?.displayName || userProfile?.email || "Staff",
                          date: new Date().toISOString(),
                          status: "Complete",
                          notes: "Contacted regional depot; awaiting package update."
                        });
                        toast.success("Logged 'Contact depot' action.");
                      }}
                      className="justify-start text-xs text-slate-700 h-9 rounded-lg border-slate-250 hover:bg-slate-50 gap-2"
                    >
                      <Building2 className="h-3.5 w-3.5 text-slate-400" /> Log contact depot
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsMissedSweepModalOpen(true)}
                      className="justify-start text-xs text-slate-700 h-9 rounded-lg border-slate-250 hover:bg-slate-50 gap-2"
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-slate-400" /> Flag missed sweep
                    </Button>
                  </div>
                </div>

                {/* Escalation Hub */}
                <div className="pt-4 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">Escalate Case</span>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEscalateType("Operations");
                        setIsEscalateModalOpen(true);
                      }}
                      className="text-xs border-amber-250 text-amber-700 hover:bg-amber-50 h-10 font-bold rounded-xl"
                    >
                      ⚙️ Operations
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEscalateType("IT");
                        setIsEscalateModalOpen(true);
                      }}
                      className="text-xs border-slate-350 text-slate-800 hover:bg-slate-50 h-10 font-bold rounded-xl"
                    >
                      💻 IT Support
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                    Creates an linked investigation ticket inside the target department pipeline and assigns it automatically.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* StarTrack Enquiry Numbers */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-3.5 px-6">
                <CardTitle className="text-sm font-bold text-slate-800">StarTrack Enquiry Log</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <span className="text-xs text-slate-400 leading-normal block">
                  Add third-party carrier reference inquiry identifiers.
                </span>
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g. ST-ENQ-44821" 
                    value={newEnquiryNumber}
                    onChange={(e) => setNewEnquiryNumber(e.target.value)}
                    className="text-xs h-9 bg-slate-50 border-slate-200 rounded-lg"
                  />
                  <Button onClick={handleAddEnquiry} className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-9 rounded-lg">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ticket.starTrackEnquiries?.map((enq: string, i: number) => (
                    <Badge key={i} className="bg-slate-100 text-slate-700 text-xs border border-slate-200 py-0.5 px-2 hover:bg-slate-100 rounded-lg">
                      {enq}
                    </Badge>
                  ))}
                  {(!ticket.starTrackEnquiries || ticket.starTrackEnquiries.length === 0) && (
                    <span className="text-xs text-slate-400 italic block py-1">No reference codes logged yet.</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Investigation Actions Log Panel */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-3.5 px-6 flex justify-between items-center">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Wrench className="h-4.5 w-4.5 text-[#095c7b]" /> Investigation Log
                </CardTitle>
                <Button 
                  onClick={() => setIsActionModalOpen(true)}
                  className="bg-[#095c7b] hover:bg-[#053647] text-white text-[11px] h-7 px-2.5 flex items-center gap-1 rounded-lg"
                >
                  <Plus className="h-3.5 w-3.5" /> Log Action
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[300px] overflow-y-auto">
                  {actions.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {actions.map((act) => (
                        <div key={act.id} className="p-4 hover:bg-slate-50/40 transition-colors space-y-1 text-xs">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-slate-800">{act.action}</span>
                            <Badge className={`text-[9px] font-bold rounded-full ${act.status === "Complete" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              {act.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-medium mt-1">
                            {act.notes}
                          </p>
                          <div className="flex justify-between text-[10px] text-slate-400 pt-1.5 font-medium">
                            <span>By: {act.user}</span>
                            <span>{act.date ? new Date(act.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ""}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400 italic">No investigation tasks have been logged.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Staff-Only Internal Notes */}
            <Card className="border border-amber-250 bg-amber-50/20 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-amber-200/50 bg-amber-50/40 py-3.5 px-6 flex justify-between items-center">
                <CardTitle className="text-sm font-bold text-amber-900">Internal Staff Notes</CardTitle>
                <Badge className="bg-amber-100 text-amber-850 border border-amber-200 text-[9px] font-bold tracking-wider hover:bg-amber-100 uppercase rounded-full">
                  Private Log
                </Badge>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {staffNotes.map((note) => (
                    <div key={note.id} className="p-3 bg-white border border-amber-150 rounded-xl shadow-sm">
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold mb-1">
                        <span>{note.author}</span>
                        <span>{note.timestamp ? new Date(note.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ""}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{note.content}</p>
                    </div>
                  ))}
                  {staffNotes.length === 0 && (
                    <span className="text-xs text-slate-400 italic block py-4 text-center">No team notes logged.</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input 
                    id="staff-note-input"
                    placeholder="Append staff details..." 
                    value={newStaffNote}
                    onChange={(e) => setNewStaffNote(e.target.value)}
                    className="text-xs h-9 bg-white border-slate-200 rounded-lg shadow-sm"
                  />
                  <Button onClick={handleAddStaffNote} className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-9 rounded-lg px-3 shrink-0">
                    Post
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Attachments Card */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-3.5 px-6">
                <CardTitle className="text-sm font-bold text-slate-800">Linked Documentation</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {ticket.attachments && ticket.attachments.length > 0 ? (
                  ticket.attachments.map((file: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-700 font-semibold truncate" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                      <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-[#095c7b] font-bold hover:underline ml-2 flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View
                      </a>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic block py-4 text-center">No images or PDF files uploaded.</span>
                )}
              </CardContent>
            </Card>

          </div>

        </div>

      </div>

      {/* MODAL: Log Action */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#095c7b]">Log Investigation Action</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              Add details of depot updates, POD requests, or check results to the public log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Action Type</label>
              <select 
                value={newActionType} 
                onChange={(e) => setNewActionType(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-[#095c7b] outline-none rounded-xl p-2.5 transition-all text-slate-700 font-medium"
              >
                <option value="Contact depot">Contact depot</option>
                <option value="Request POD">Request POD</option>
                <option value="Request ATL image">Request ATL image</option>
                <option value="Request GPS">Request GPS</option>
                <option value="General Check">General Check</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</label>
              <select 
                value={newActionStatus} 
                onChange={(e) => setNewActionStatus(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-[#095c7b] outline-none rounded-xl p-2.5 transition-all text-slate-700 font-medium"
              >
                <option value="Pending">Pending</option>
                <option value="Complete">Complete</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notes / Summary</label>
              <Textarea 
                placeholder="Write specific outcomes or details here..." 
                value={newActionNotes}
                onChange={(e) => setNewActionNotes(e.target.value)}
                className="text-xs bg-slate-50 border-slate-200 focus:border-[#095c7b] outline-none rounded-xl min-h-[100px] leading-relaxed"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsActionModalOpen(false)} className="text-xs font-semibold rounded-lg">Cancel</Button>
            <Button onClick={handleAddAction} className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs font-bold rounded-lg px-4 shadow-sm">Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Escalate Ticket (Operations / IT) */}
      <Dialog open={isEscalateModalOpen} onOpenChange={setIsEscalateModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#095c7b]">Assign {escalateType} Escalation</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              Escalate this case to support or depot staff with an automatically generated ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Department Assignee</label>
              <select 
                value={escalateAssignee} 
                onChange={(e) => setEscalateAssignee(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-[#095c7b] outline-none rounded-xl p-2.5 transition-all text-slate-700 font-medium"
              >
                <option value="">-- Select Member --</option>
                {csUsers.map((u: any) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName || u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsEscalateModalOpen(false)} className="text-xs font-semibold rounded-lg">Cancel</Button>
            <Button onClick={handleEscalate} className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs font-bold rounded-lg px-4 shadow-sm">
              Escalate & Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Send Email to Customer */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#095c7b] flex items-center gap-2">
              <Mail className="h-5 w-5" /> Send Customer Email
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              Draft messages to send to customer contact emails. Sent history is logged under communication hub.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Recipient Address</label>
              <Input 
                value={emailRecipient} 
                onChange={(e) => setEmailRecipient(e.target.value)}
                placeholder="customer@domain.com"
                className="text-xs bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Subject Line</label>
              <Input 
                value={emailSubject} 
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="MailPlus Delivery Investigation Update"
                className="text-xs bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Email Message Body</label>
              <Textarea 
                value={emailBody} 
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Compose customer email here..."
                className="text-xs bg-slate-50 border-slate-200 focus:border-[#095c7b] outline-none rounded-xl min-h-[180px] leading-relaxed"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsEmailModalOpen(false)} className="text-xs font-semibold rounded-lg">Cancel</Button>
            <Button onClick={handleSendEmail} className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs font-bold rounded-lg px-4 shadow-sm">
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Missed Sweep Confirmation */}
      <Dialog open={isMissedSweepModalOpen} onOpenChange={setIsMissedSweepModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#095c7b]">Missed Sweep Alert</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-[#f0f9ff] border border-[#bee3f8] text-[#2b6cb0] rounded-xl p-4 text-xs font-medium leading-relaxed">
              This action dispatches an instant missed-sweep alert notification to the <strong>Operations Desk</strong> and to <strong>Fiona</strong>. It also updates the status to 'Awaiting Operations'.
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsMissedSweepModalOpen(false)} 
              className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50 h-9 px-4 rounded-lg font-semibold"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendMissedSweep} 
              disabled={isSendingMissedSweep}
              className="bg-[#eaf143] hover:bg-[#d8e03e] text-[#095c7b] text-xs h-9 px-5 rounded-lg font-bold transition-all border border-[#d8e03e]"
            >
              {isSendingMissedSweep ? "Sending Alert..." : "Send to Ops & Fiona"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Status Change Confirmation */}
      <Dialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#095c7b]">Confirm Ticket Status Change</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              You are updating the status of this ticket to <span className="font-semibold text-slate-700">{pendingStatus}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Notes / Reason (Optional)</label>
              <Textarea 
                value={statusConfirmNotes} 
                onChange={(e) => setStatusConfirmNotes(e.target.value)}
                placeholder="Enter any notes or context for this status change..."
                className="text-xs bg-slate-50 border-slate-200 focus:border-[#095c7b] outline-none rounded-xl min-h-[100px] leading-relaxed"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsStatusConfirmOpen(false)} 
              className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50 h-9 px-4 rounded-lg font-semibold"
            >
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                await updateTicketStatus(pendingStatus, statusConfirmNotes);
                setIsStatusConfirmOpen(false);
              }} 
              disabled={isSubmittingStatus}
              className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-9 px-5 rounded-lg font-bold shadow-sm"
            >
              {isSubmittingStatus ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
