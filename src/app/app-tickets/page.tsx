"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { FullScreenLoader } from "@/components/ui/loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  PlusCircle, 
  MessageSquare, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  Download, 
  MessageCircle, 
  Pencil, 
  UploadCloud, 
  File, 
  X, 
  Loader2, 
  Save,
  BarChart3,
  TrendingUp,
  LayoutGrid,
  Table as TableIcon,
  Search,
  ChevronDown,
  ChevronUp,
  PieChart as LucidePieChart,
  Paperclip
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from "recharts";
import Link from "next/link";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore as db, storage } from "@/lib/firebase";
import { toast } from "sonner";

interface AppTicket {
  id: string;
  title: string;
  type: "feature" | "bug" | "issue" | "feedback";
  platform?: "ProspectPlus" | "LocalMile.Plus" | "LPO.Plus" | "Website";
  description: string;
  status: "open" | "planned" | "in_progress" | "testing" | "completed" | "declined" | "waiting_on_user";
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  assignedToUid?: string;
  assignedToName?: string;
  assignedToEmail?: string;
  createdAt: any;
  updatedAt?: any;
  attachments?: { name: string; url: string }[];
  adminNotes?: string;
  history?: {
    status: AppTicket["status"];
    note: string;
    updatedAt: string;
    updatedByName: string;
    role?: "admin" | "user";
    emailSent?: boolean;
    attachments?: { name: string; url: string }[];
  }[];
}

export default function AppTicketsPage() {
  const { userProfile, loading, isSuperAdmin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketId = searchParams.get("ticketId");
  const [tickets, setTickets] = useState<AppTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  
  // Filtering & View states
  const [selectedTicket, setSelectedTicket] = useState<AppTicket | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showAnalytics, setShowAnalytics] = useState<boolean>(true);

  // Edit ticket state
  const [editingTicket, setEditingTicket] = useState<AppTicket | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<"feature" | "bug" | "issue" | "feedback">("feature");
  const [editPlatform, setEditPlatform] = useState<"ProspectPlus" | "LocalMile.Plus" | "LPO.Plus" | "Website">("ProspectPlus");
  const [editDescription, setEditDescription] = useState("");
  const [editAttachments, setEditAttachments] = useState<{ name: string; url: string }[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isUploadingEditFiles, setIsUploadingEditFiles] = useState(false);

  // User In-Ticket Reply states
  const [replyText, setReplyText] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<{ name: string; url: string }[]>([]);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isUploadingReplyFiles, setIsUploadingReplyFiles] = useState(false);

  const handleReplyFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const targetTicket = selectedTicket || editingTicket;
    if (!targetTicket) return;
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingReplyFiles(true);
    const newAttachments = [...replyAttachments];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `app_tickets/reply_attachments/${targetTicket.id}/${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newAttachments.push({ name: file.name, url });
      }
      setReplyAttachments(newAttachments);
      toast.success("Attachment uploaded.");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error uploading attachment.");
    } finally {
      setIsUploadingReplyFiles(false);
      if (event.target) event.target.value = "";
    }
  };

  const removeReplyAttachment = (index: number) => {
    const updated = [...replyAttachments];
    updated.splice(index, 1);
    setReplyAttachments(updated);
  };

  const handleSendReply = async () => {
    const targetTicket = selectedTicket || editingTicket;
    if (!targetTicket || !replyText.trim()) {
      toast.error("Please enter a reply message.");
      return;
    }

    setIsSubmittingReply(true);
    try {
      const ticketRef = doc(db, "app_tickets", targetTicket.id);

      // Auto-transition 'waiting_on_user' back to 'open'
      const newStatus: AppTicket["status"] = targetTicket.status === "waiting_on_user" ? "open" : targetTicket.status;

      const newHistoryItem = {
        status: newStatus,
        note: replyText.trim(),
        updatedAt: new Date().toISOString(),
        updatedByName: userProfile?.displayName || userProfile?.email || "User",
        role: "user" as const,
        emailSent: true,
        attachments: replyAttachments
      };

      const updatedHistory = targetTicket.history ? [...targetTicket.history, newHistoryItem] : [newHistoryItem];

      await updateDoc(ticketRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        history: updatedHistory
      });

      // Send email to assigned super admin
      const adminEmail = targetTicket.assignedToEmail || "ankith.ravindran@mailplus.com.au";
      const origin = typeof window !== "undefined" ? window.location.origin : "https://prospectplus.mailplus.com.au";
      
      const emailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #095c7b; margin-top: 0; font-size: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">💬 New User Reply on App Ticket</h2>
  <p>Hi <strong>${targetTicket.assignedToName || "Admin"}</strong>,</p>
  <p><strong>${userProfile?.displayName || "User"}</strong> has posted a response on ticket "<strong>${targetTicket.title}</strong>":</p>

  <div style="margin: 20px 0; padding: 15px; background-color: #f8fafc; border-left: 4px solid #095c7b; border-radius: 4px; border: 1px solid #e2e8f0;">
    <p style="margin: 0; color: #334155; font-size: 14px; white-space: pre-wrap;">${replyText.trim()}</p>
  </div>

  <p style="font-size: 14px; color: #475569;">Click the button below to view the ticket and response timeline:</p>

  <div style="text-align: center; margin: 25px 0;">
    <a href="${origin}/admin/app-tickets?ticketId=${targetTicket.id}" 
       style="background-color: #095c7b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px; box-shadow: 0 2px 4px rgba(9, 92, 123, 0.1);">
       View Ticket & Respond
    </a>
  </div>

  <p style="font-size: 11px; color: #94a3b8; margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">
    MailPlus Outbound Leads CRM &bull; App Tickets System
  </p>
</div>
      `;

      fetch("/api/campaigns/send-custom-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: adminEmail,
          subject: `[App Ticket Reply] ${targetTicket.title}`,
          html: emailHtml
        })
      }).catch(err => console.error("Failed to notify admin of reply:", err));

      toast.success("Reply posted successfully!");
      setReplyText("");
      setReplyAttachments([]);

      if (selectedTicket && selectedTicket.id === targetTicket.id) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus, history: updatedHistory } : null);
      }
      if (editingTicket && editingTicket.id === targetTicket.id) {
        setEditingTicket(prev => prev ? { ...prev, status: newStatus, history: updatedHistory } : null);
      }
    } catch (error) {
      console.error("Error posting reply:", error);
      toast.error("Failed to post reply.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const canEditTicket = (ticket: AppTicket) => {
    if (!userProfile) return false;
    return (
      ticket.createdBy === userProfile.uid ||
      isSuperAdmin ||
      (userProfile as any).role === "admin" ||
      userProfile.uid === "ncyhwLtOG1W7TZ43PkYCcObeCAf2"
    );
  };

  const handleOpenEdit = (ticket: AppTicket) => {
    setEditingTicket(ticket);
    setEditTitle(ticket.title || "");
    setEditType(ticket.type || "feature");
    setEditPlatform(ticket.platform || "ProspectPlus");
    setEditDescription(ticket.description || "");
    setEditAttachments(ticket.attachments ? [...ticket.attachments] : []);
  };

  const handleEditFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingTicket) return;
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingEditFiles(true);
    const newAttachments = [...editAttachments];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `app_tickets/attachments/${editingTicket.id}/${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newAttachments.push({ name: file.name, url });
      }
      setEditAttachments(newAttachments);
      toast.success("Files uploaded successfully.");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error uploading files.");
    } finally {
      setIsUploadingEditFiles(false);
      if (event.target) event.target.value = "";
    }
  };

  const removeEditAttachment = (index: number) => {
    const newAttachments = [...editAttachments];
    newAttachments.splice(index, 1);
    setEditAttachments(newAttachments);
  };

  const handleSaveEdit = async () => {
    if (!editingTicket) return;
    if (!editTitle.trim() || !editDescription.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSavingEdit(true);
    try {
      const ticketRef = doc(db, "app_tickets", editingTicket.id);
      await updateDoc(ticketRef, {
        title: editTitle.trim(),
        type: editType,
        platform: editPlatform,
        description: editDescription.trim(),
        attachments: editAttachments,
        updatedAt: serverTimestamp(),
      });

      toast.success("Ticket updated successfully!");
      setEditingTicket(null);
      if (selectedTicket && selectedTicket.id === editingTicket.id) {
        setSelectedTicket((prev) =>
          prev
            ? {
                ...prev,
                title: editTitle.trim(),
                type: editType,
                platform: editPlatform,
                description: editDescription.trim(),
                attachments: editAttachments,
              }
            : null
        );
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error("Failed to update ticket. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!userProfile) {
      router.push("/signin");
      return;
    }

    const q = query(collection(db, "app_tickets"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppTicket[];
      setTickets(ticketsData);
      setLoadingTickets(false);
    }, (error) => {
      console.error("Error loading app tickets:", error);
      setLoadingTickets(false);
    });

    return () => unsubscribe();
  }, [userProfile, loading, router]);

  useEffect(() => {
    if (ticketId && tickets.length > 0) {
      const found = tickets.find(t => t.id === ticketId);
      if (found) {
        setSelectedTicket(found);
      }
    }
  }, [ticketId, tickets]);

  const getStatusBadge = (status: AppTicket["status"]) => {
    switch (status) {
      case "open":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200">Open</Badge>;
      case "planned":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200">Planned</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200">In Progress</Badge>;
      case "testing":
        return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200">Testing</Badge>;
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200">Completed</Badge>;
      case "declined":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200">Declined</Badge>;
      case "waiting_on_user":
        return <Badge className="bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 font-bold">Waiting on User</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTypeBadge = (type: AppTicket["type"]) => {
    switch (type) {
      case "feature":
        return (
          <Badge className="bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-50 flex items-center gap-1 font-medium">
            <Sparkles className="h-3.5 w-3.5" /> Feature
          </Badge>
        );
      case "bug":
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50 flex items-center gap-1 font-medium">
            <AlertCircle className="h-3.5 w-3.5" /> Bug
          </Badge>
        );
      case "issue":
        return (
          <Badge className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50 flex items-center gap-1 font-medium">
            <MessageSquare className="h-3.5 w-3.5" /> Issue
          </Badge>
        );
      case "feedback":
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 flex items-center gap-1 font-medium">
            <MessageCircle className="h-3.5 w-3.5" /> Feedback
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Metrics computation for reporting
  const openTicketsCount = useMemo(() => tickets.filter(t => (t.status || "open") === "open").length, [tickets]);
  const waitingTicketsCount = useMemo(() => tickets.filter(t => t.status === "waiting_on_user").length, [tickets]);
  const plannedTicketsCount = useMemo(() => tickets.filter(t => t.status === "planned").length, [tickets]);
  const inProgressTicketsCount = useMemo(() => tickets.filter(t => t.status === "in_progress").length, [tickets]);
  const testingTicketsCount = useMemo(() => tickets.filter(t => t.status === "testing").length, [tickets]);
  const completedTicketsCount = useMemo(() => tickets.filter(t => t.status === "completed").length, [tickets]);
  const declinedTicketsCount = useMemo(() => tickets.filter(t => t.status === "declined").length, [tickets]);

  const activeTicketsCount = openTicketsCount + waitingTicketsCount + plannedTicketsCount + inProgressTicketsCount + testingTicketsCount;
  const resolutionRate = tickets.length > 0 ? Math.round((completedTicketsCount / tickets.length) * 100) : 0;

  // Chart dataset calculations
  const statusData = useMemo(() => [
    { name: "Open", value: openTicketsCount, color: "#3b82f6" },
    { name: "Waiting on User", value: waitingTicketsCount, color: "#d97706" },
    { name: "Planned", value: plannedTicketsCount, color: "#a855f7" },
    { name: "In Progress", value: inProgressTicketsCount, color: "#f59e0b" },
    { name: "Testing", value: testingTicketsCount, color: "#0891b2" },
    { name: "Completed", value: completedTicketsCount, color: "#10b981" },
    { name: "Declined", value: declinedTicketsCount, color: "#f43f5e" }
  ].filter(item => item.value > 0), [openTicketsCount, waitingTicketsCount, plannedTicketsCount, inProgressTicketsCount, testingTicketsCount, completedTicketsCount, declinedTicketsCount]);

  const categoryCounts = useMemo(() => tickets.reduce((acc, t) => {
    const key = t.type || "feedback";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>), [tickets]);

  const categoryData = useMemo(() => [
    { name: "Feature Requests", value: categoryCounts["feature"] || 0, color: "#0d9488" },
    { name: "Bug Reports", value: categoryCounts["bug"] || 0, color: "#e11d48" },
    { name: "General Feedback", value: categoryCounts["feedback"] || 0, color: "#3b82f6" },
    { name: "General Issues", value: categoryCounts["issue"] || 0, color: "#ea580c" }
  ].filter(item => item.value > 0), [categoryCounts]);

  const platformCounts = useMemo(() => tickets.reduce((acc, t) => {
    const p = t.platform || "ProspectPlus";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {} as Record<string, number>), [tickets]);

  const platformData = useMemo(() => [
    { name: "ProspectPlus", count: platformCounts["ProspectPlus"] || 0 },
    { name: "LocalMile.Plus", count: platformCounts["LocalMile.Plus"] || 0 },
    { name: "LPO.Plus", count: platformCounts["LPO.Plus"] || 0 },
    { name: "Website", count: platformCounts["Website"] || 0 }
  ], [platformCounts]);

  // Filtering tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesType = typeFilter === "all" || ticket.type === typeFilter;
      const matchesStatus = statusFilter === "all" || (ticket.status || "open") === statusFilter;
      const matchesPlatform = platformFilter === "all" || (ticket.platform || "ProspectPlus") === platformFilter;
      const queryLower = searchQuery.toLowerCase().trim();
      const matchesSearch = !queryLower || 
        ticket.title?.toLowerCase().includes(queryLower) ||
        ticket.description?.toLowerCase().includes(queryLower) ||
        ticket.createdByName?.toLowerCase().includes(queryLower) ||
        ticket.createdByEmail?.toLowerCase().includes(queryLower);

      return matchesType && matchesStatus && matchesPlatform && matchesSearch;
    });
  }, [tickets, typeFilter, statusFilter, platformFilter, searchQuery]);

  // CSV Export handler
  const handleExportCSV = () => {
    if (filteredTickets.length === 0) {
      toast.error("No tickets to export.");
      return;
    }

    const headers = ["ID", "Title", "Type", "Platform", "Status", "Submitted By", "Submitted Email", "Created Date", "Description"];
    const rows = filteredTickets.map(t => [
      t.id,
      `"${(t.title || "").replace(/"/g, '""')}"`,
      t.type,
      t.platform || "ProspectPlus",
      t.status || "open",
      `"${(t.createdByName || "").replace(/"/g, '""')}"`,
      t.createdByEmail || "",
      t.createdAt ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : "",
      `"${(t.description || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `feedback_tickets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredTickets.length} tickets to CSV.`);
  };

  if (loading || loadingTickets) return <FullScreenLoader message="Loading feedback board & reporting..." />;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      {/* Top Title & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#095c7b] flex items-center gap-2">
            Feedback & Ideas Board
          </h2>
          <p className="text-muted-foreground mt-1">
            Request new features, report bugs, or track current app improvements. All users can view and collaborate.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button
            variant="outline"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="border-[#095c7b]/30 text-[#095c7b] hover:bg-[#095c7b]/5 font-semibold flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            {showAnalytics ? "Hide Reporting" : "Show Reporting"}
            {showAnalytics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          <Link href="/app-tickets/create">
            <Button className="bg-[#eaf143] text-[#095c7b] hover:bg-[#d8e032] font-semibold shadow-md flex items-center gap-1.5">
              <PlusCircle className="h-4 w-4" />
              Submit Feedback / Bug
            </Button>
          </Link>
        </div>
      </div>

      {/* Embedded Reporting & Analytics Dashboard */}
      {showAnalytics && (
        <div className="space-y-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200 shadow-xs animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#095c7b] flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#095c7b]" />
              System Analytics & Overview
            </h3>
            <span className="text-xs text-muted-foreground font-medium">
              Based on {tickets.length} total submissions
            </span>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border border-slate-200 shadow-xs">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Submissions</p>
                <div className="flex items-baseline justify-between mt-1">
                  <h4 className="text-2xl font-black text-slate-900">{tickets.length}</h4>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                    All Time
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 shadow-xs">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolution Rate</p>
                <div className="flex items-baseline justify-between mt-1">
                  <h4 className="text-2xl font-black text-emerald-600">{resolutionRate}%</h4>
                  <span className="text-xs text-slate-500 font-medium">{completedTicketsCount} completed</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 shadow-xs">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Pipeline</p>
                <div className="flex items-baseline justify-between mt-1">
                  <h4 className="text-2xl font-black text-amber-600">{activeTicketsCount}</h4>
                  <span className="text-xs text-slate-500 font-medium">In triage / dev</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 shadow-xs">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Feature Requests</p>
                <div className="flex items-baseline justify-between mt-1">
                  <h4 className="text-2xl font-black text-teal-600">{categoryCounts["feature"] || 0}</h4>
                  <span className="text-xs text-slate-500 font-medium">
                    {tickets.length > 0 ? Math.round(((categoryCounts["feature"] || 0) / tickets.length) * 100) : 0}% of total
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Chart 1: Status Breakdown */}
            <Card className="bg-white border border-slate-200">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <LucidePieChart className="h-4 w-4 text-[#095c7b]" /> Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-[170px] w-full">
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={55}
                          innerRadius={32}
                          paddingAngle={3}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: any) => [`${val} tickets`, 'Count']} />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">No status data available</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chart 2: Category Breakdown */}
            <Card className="bg-white border border-slate-200">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-teal-600" /> Feedback Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-[170px] w-full">
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={55}
                          paddingAngle={3}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-cat-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: any) => [`${val} tickets`, 'Count']} />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">No category data available</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chart 3: Platform Breakdown */}
            <Card className="bg-white border border-slate-200">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-purple-600" /> Platform Volume
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-[170px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={platformData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip formatter={(val: any) => [`${val} tickets`, 'Count']} />
                      <Bar dataKey="count" fill="#095c7b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Status-Based Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 no-scrollbar border-b border-gray-200">
        <button
          onClick={() => setStatusFilter("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            statusFilter === "all"
              ? "bg-[#095c7b] text-white shadow-xs"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          All Tickets
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
            statusFilter === "all" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
          }`}>
            {tickets.length}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("open")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            statusFilter === "open"
              ? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-300"
              : "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200"
          }`}
        >
          🔵 Open
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
            statusFilter === "open" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
          }`}>
            {openTicketsCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("waiting_on_user")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            statusFilter === "waiting_on_user"
              ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-300"
              : "bg-white text-amber-900 hover:bg-amber-50 border border-amber-300"
          }`}
        >
          ⚠️ Waiting on User
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
            statusFilter === "waiting_on_user" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-900"
          }`}>
            {waitingTicketsCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("planned")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            statusFilter === "planned"
              ? "bg-purple-600 text-white shadow-xs ring-2 ring-purple-300"
              : "bg-white text-purple-700 hover:bg-purple-50 border border-purple-200"
          }`}
        >
          🟣 Planned
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
            statusFilter === "planned" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800"
          }`}>
            {plannedTicketsCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("in_progress")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            statusFilter === "in_progress"
              ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-300"
              : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200"
          }`}
        >
          🟡 In Progress
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
            statusFilter === "in_progress" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
          }`}>
            {inProgressTicketsCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("testing")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            statusFilter === "testing"
              ? "bg-cyan-600 text-white shadow-xs ring-2 ring-cyan-300"
              : "bg-white text-cyan-700 hover:bg-cyan-50 border border-cyan-200"
          }`}
        >
          🟢 Testing
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
            statusFilter === "testing" ? "bg-white/20 text-white" : "bg-cyan-100 text-cyan-800"
          }`}>
            {testingTicketsCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("completed")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            statusFilter === "completed"
              ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300"
              : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
          }`}
        >
          ✅ Completed
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
            statusFilter === "completed" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
          }`}>
            {completedTicketsCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("declined")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            statusFilter === "declined"
              ? "bg-rose-600 text-white shadow-xs ring-2 ring-rose-300"
              : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
          }`}
        >
          🔴 Declined
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
            statusFilter === "declined" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-800"
          }`}>
            {declinedTicketsCount}
          </span>
        </button>
      </div>

      {/* Toolbar & Filters Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        {/* Left: Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by title, description, author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 text-sm h-9 border-gray-200 focus-visible:ring-[#095c7b]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs h-9 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b] font-medium"
          >
            <option value="all">All Categories</option>
            <option value="feedback">General Feedback</option>
            <option value="feature">Feature Requests</option>
            <option value="bug">Bug Reports</option>
            <option value="issue">General Issues</option>
          </select>

          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="text-xs h-9 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b] font-medium"
          >
            <option value="all">All Platforms</option>
            <option value="ProspectPlus">ProspectPlus</option>
            <option value="LocalMile.Plus">LocalMile.Plus</option>
            <option value="LPO.Plus">LPO.Plus</option>
            <option value="Website">Website</option>
          </select>
        </div>

        {/* Right: View Mode Toggle & CSV Export */}
        <div className="flex items-center gap-2 justify-between lg:justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs h-9 border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
            title="Export filtered list to CSV"
          >
            <Download className="h-3.5 w-3.5 text-gray-500" /> Export CSV
          </Button>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center p-1 bg-gray-100 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === "table"
                  ? "bg-white text-[#095c7b] shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === "grid"
                  ? "bg-white text-[#095c7b] shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Cards
            </button>
          </div>

          <span className="text-xs text-muted-foreground font-medium pl-1 hidden sm:inline">
            Showing {filteredTickets.length} of {tickets.length}
          </span>
        </div>
      </div>

      {/* Main Content Area: Table View vs Grid View */}
      {filteredTickets.length === 0 ? (
        <Card className="border-dashed border-2 py-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="bg-[#095c7b]/5 p-3 rounded-full">
              <MessageSquare className="h-8 w-8 text-[#095c7b]" />
            </div>
            <h3 className="font-semibold text-lg">No tickets found</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              There are no tickets matching your active filters or search terms. Try adjusting your parameters.
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-gray-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[140px]">Type & Platform</th>
                  <th className="py-3 px-4 min-w-[280px]">Title & Context</th>
                  <th className="py-3 px-4 w-[130px]">Status</th>
                  <th className="py-3 px-4 min-w-[180px]">Submitted By & Date</th>
                  <th className="py-3 px-4 w-[110px]">Media</th>
                  <th className="py-3 px-4 text-right min-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredTickets.map((ticket) => (
                  <tr 
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Category & Platform */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex flex-col items-start gap-1.5">
                        {getTypeBadge(ticket.type)}
                        <Badge variant="outline" className="text-[10px] text-slate-600 bg-slate-50 border-slate-200">
                          {ticket.platform || "ProspectPlus"}
                        </Badge>
                      </div>
                    </td>

                    {/* Title & Context */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-slate-900 group-hover:text-[#095c7b] transition-colors leading-snug line-clamp-1">
                        {ticket.title}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {ticket.description}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 align-top">
                      {getStatusBadge(ticket.status || "open")}
                    </td>

                    {/* Submitted By */}
                    <td className="py-3.5 px-4 align-top text-xs">
                      <div className="font-semibold text-slate-800">{ticket.createdByName || "Anonymous"}</div>
                      <div className="text-slate-400 truncate max-w-[160px]">{ticket.createdByEmail}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {ticket.createdAt ? new Date(ticket.createdAt.seconds * 1000).toLocaleDateString() : "N/A"}
                      </div>
                    </td>

                    {/* Media Attachments */}
                    <td className="py-3.5 px-4 align-top text-xs">
                      {ticket.attachments && ticket.attachments.length > 0 ? (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1 font-medium text-[11px] w-fit">
                          <Paperclip className="h-3 w-3" /> {ticket.attachments.length} file{ticket.attachments.length > 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 align-top text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {canEditTicket(ticket) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs text-[#095c7b] border-[#095c7b]/30 hover:bg-[#095c7b]/10 flex items-center gap-1 font-medium"
                            onClick={() => handleOpenEdit(ticket)}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2.5 text-xs text-[#095c7b] hover:text-[#053647] hover:bg-[#095c7b]/5 flex items-center gap-1 font-medium"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map((ticket) => (
            <Card 
              key={ticket.id} 
              className="group hover:shadow-lg transition-all duration-300 flex flex-col justify-between border-t-4 border-t-[#095c7b]/80 relative overflow-hidden"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-1.5">
                    {getTypeBadge(ticket.type)}
                    <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200 text-xs">
                      {ticket.platform || "ProspectPlus"}
                    </Badge>
                  </div>
                  {getStatusBadge(ticket.status || "open")}
                </div>
                <CardTitle className="line-clamp-2 text-lg font-bold group-hover:text-[#095c7b] transition-colors leading-tight">
                  {ticket.title}
                </CardTitle>
                <CardDescription className="text-xs flex items-center gap-1.5 pt-1.5">
                  <span className="font-medium text-gray-700">{ticket.createdByName}</span>
                  <span className="text-gray-300">•</span>
                  <span>
                    {ticket.createdAt ? new Date(ticket.createdAt.seconds * 1000).toLocaleDateString() : "Just now"}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0 flex-grow flex flex-col justify-between">
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {ticket.description}
                </p>

                <div className="pt-3 border-t border-gray-50 flex items-center justify-between mt-auto">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {ticket.attachments && ticket.attachments.length > 0 && (
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">
                        {ticket.attachments.length} attachment{ticket.attachments.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {canEditTicket(ticket) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[#095c7b] border-[#095c7b]/30 hover:bg-[#095c7b]/10 flex items-center gap-1 font-medium transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(ticket);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[#095c7b] hover:text-[#053647] hover:bg-[#095c7b]/5 flex items-center gap-1 font-medium transition-colors"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <Eye className="h-4 w-4" /> View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ticket Details Dialog Modal */}
      <Dialog open={selectedTicket !== null} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        {selectedTicket && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {getTypeBadge(selectedTicket.type)}
                  {getStatusBadge(selectedTicket.status || "open")}
                  <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200">
                    Platform: {selectedTicket.platform || "ProspectPlus"}
                  </Badge>
                </div>
                {canEditTicket(selectedTicket) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[#095c7b] border-[#095c7b]/30 hover:bg-[#095c7b]/10 flex items-center gap-1 font-medium transition-colors"
                    onClick={() => {
                      const t = selectedTicket;
                      setSelectedTicket(null);
                      handleOpenEdit(t);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit Ticket
                  </Button>
                )}
              </div>
              <DialogTitle className="text-2xl font-extrabold text-[#095c7b] leading-tight">
                {selectedTicket.title}
              </DialogTitle>
              <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 pt-1">
                <span>Submitted by: <strong>{selectedTicket.createdByName}</strong> ({selectedTicket.createdByEmail})</span>
                <span>•</span>
                <span>Assigned To: <strong>{selectedTicket.assignedToName || "Ankith Ravindran"}</strong></span>
                <span>•</span>
                <span>Date: {selectedTicket.createdAt ? new Date(selectedTicket.createdAt.seconds * 1000).toLocaleString() : "N/A"}</span>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Action Required Banner */}
              {selectedTicket.status === 'waiting_on_user' && (
                <div className="bg-amber-50 border-2 border-amber-300 text-amber-900 p-4 rounded-xl shadow-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                    Action Required: Super Admin is waiting on your response
                  </div>
                  <p className="text-xs text-amber-800/90 leading-relaxed pl-7">
                    The admin team has requested additional details or clarification on this request before proceeding. Please reply below or update the ticket details.
                  </p>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Notes & Details</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border border-gray-100">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Attachments */}
              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Screenshots & Media</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedTicket.attachments.map((file, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-100 shadow-xs bg-white hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-xs font-medium truncate max-w-[180px]">{file.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 bg-[#095c7b]/10 text-[#095c7b] hover:bg-[#095c7b]/20 rounded-md transition-colors"
                            title="Open in new tab"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                          <a 
                            href={file.url} 
                            download 
                            className="p-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                            title="Download file"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Superadmin Response Timeline & History */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#095c7b]" /> Conversation Timeline & Updates
                </h4>
                
                {selectedTicket.history && selectedTicket.history.length > 0 ? (
                  <div className="space-y-3 pl-2 border-l-2 border-[#095c7b]/20 ml-2">
                    {selectedTicket.history.map((item, idx) => (
                      <div key={idx} className="relative pl-4 space-y-1.5 pb-2">
                        {/* Dot indicator */}
                        <div className={`absolute left-[-21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white shadow-xs ${
                          item.role === 'user' ? 'bg-blue-600' : 'bg-[#095c7b]'
                        }`} />
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-800">{item.updatedByName}</span>
                            {item.role === 'user' ? (
                              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 py-0">User Reply</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 py-0">Admin Response</Badge>
                            )}
                          </div>
                          <span>{new Date(item.updatedAt).toLocaleString()}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-gray-500">Status:</span>
                          {getStatusBadge(item.status)}
                        </div>

                        {item.note && (
                          <div className={`rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed shadow-xs border ${
                            item.role === 'user' ? 'bg-blue-50/50 border-blue-100' : 'bg-amber-50/40 border-amber-100/50'
                          }`}>
                            {item.note}
                          </div>
                        )}

                        {item.attachments && item.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {item.attachments.map((file, fileIdx) => (
                              <a
                                key={fileIdx}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[#095c7b] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-medium transition-colors"
                              >
                                <Paperclip className="h-3 w-3" /> {file.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : selectedTicket.adminNotes ? (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.adminNotes}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No comments or updates recorded yet.
                  </p>
                )}
              </div>

              {/* In-Ticket Reply Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mt-4">
                <h4 className="text-xs font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" /> Reply to Ticket
                </h4>
                
                <Textarea
                  placeholder="Type your response, clarification, or test results here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="bg-white border-slate-200 text-sm min-h-[90px] focus-visible:ring-[#095c7b]"
                />

                {replyAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {replyAttachments.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-md text-xs">
                        <File className="h-3.5 w-3.5 text-[#095c7b]" />
                        <span className="truncate max-w-[140px]">{f.name}</span>
                        <button type="button" onClick={() => removeReplyAttachment(i)} className="text-rose-500 hover:text-rose-700">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-[#095c7b] hover:text-[#053647] font-semibold bg-white border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">
                    {isUploadingReplyFiles ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Paperclip className="h-3.5 w-3.5" />
                    )}
                    {isUploadingReplyFiles ? "Uploading..." : "Attach File/Screenshot"}
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleReplyFileUpload}
                      disabled={isUploadingReplyFiles || isSubmittingReply}
                    />
                  </label>

                  <Button
                    onClick={handleSendReply}
                    disabled={isSubmittingReply || isUploadingReplyFiles || !replyText.trim()}
                    className="bg-[#095c7b] text-white hover:bg-[#053647] text-xs font-bold px-4 h-9 shadow-xs"
                  >
                    {isSubmittingReply ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Posting Reply...
                      </>
                    ) : (
                      "Post Reply"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Edit Ticket Dialog Modal */}
      <Dialog open={editingTicket !== null} onOpenChange={(open) => !open && setEditingTicket(null)}>
        {editingTicket && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b pb-4">
              <DialogTitle className="text-2xl font-extrabold text-[#095c7b] flex items-center gap-2">
                <Pencil className="h-5 w-5 text-[#095c7b]" /> Edit Feedback / Bug Ticket
              </DialogTitle>
              <DialogDescription>
                Update ticket information, category, platform, or description.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-3">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Short Title *</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Add export to PDF button on reports"
                  maxLength={100}
                  className="border-gray-200 focus-visible:ring-[#095c7b]"
                />
              </div>

              {/* Platform */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Platform *</label>
                <select
                  value={editPlatform}
                  onChange={(e) => setEditPlatform(e.target.value as any)}
                  className="w-full text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                >
                  <option value="ProspectPlus">ProspectPlus</option>
                  <option value="LocalMile.Plus">LocalMile.Plus</option>
                  <option value="LPO.Plus">LPO.Plus</option>
                  <option value="Website">Website</option>
                </select>
              </div>

              {/* Category / Type Selection */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Category *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditType("feedback")}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border-2 text-center transition-all ${
                      editType === "feedback"
                        ? "border-[#095c7b] bg-[#095c7b]/5 text-[#095c7b] font-semibold"
                        : "border-gray-100 hover:border-gray-200 text-gray-600 bg-white"
                    }`}
                  >
                    <MessageCircle className={`h-4 w-4 mb-1 ${editType === "feedback" ? "text-[#095c7b]" : "text-gray-400"}`} />
                    <span className="text-xs">Feedback</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditType("feature")}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border-2 text-center transition-all ${
                      editType === "feature"
                        ? "border-teal-600 bg-teal-50 text-teal-700 font-semibold"
                        : "border-gray-100 hover:border-gray-200 text-gray-600 bg-white"
                    }`}
                  >
                    <Sparkles className={`h-4 w-4 mb-1 ${editType === "feature" ? "text-teal-600" : "text-gray-400"}`} />
                    <span className="text-xs">Feature Request</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditType("bug")}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border-2 text-center transition-all ${
                      editType === "bug"
                        ? "border-rose-600 bg-rose-50 text-rose-700 font-semibold"
                        : "border-gray-100 hover:border-gray-200 text-gray-600 bg-white"
                    }`}
                  >
                    <AlertCircle className={`h-4 w-4 mb-1 ${editType === "bug" ? "text-rose-600" : "text-gray-400"}`} />
                    <span className="text-xs">Bug Report</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditType("issue")}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border-2 text-center transition-all ${
                      editType === "issue"
                        ? "border-orange-600 bg-orange-50 text-orange-700 font-semibold"
                        : "border-gray-100 hover:border-gray-200 text-gray-600 bg-white"
                    }`}
                  >
                    <MessageSquare className={`h-4 w-4 mb-1 ${editType === "issue" ? "text-orange-600" : "text-gray-400"}`} />
                    <span className="text-xs">General Issue</span>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Detailed Description *</label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Provide context, details, or steps to reproduce..."
                  className="min-h-[140px] text-sm border-gray-200 focus-visible:ring-[#095c7b]"
                />
              </div>

              {/* Attachments Management */}
              <div className="space-y-2 pt-2 border-t">
                <label className="text-sm font-semibold text-gray-700 block">Screenshots & Media Attachments</label>
                {editAttachments.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {editAttachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 bg-gray-50 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <File className="h-4 w-4 text-[#095c7b] shrink-0" />
                          <span className="truncate font-medium text-gray-700">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#095c7b] hover:underline flex items-center gap-1 font-medium"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </a>
                          <button
                            type="button"
                            onClick={() => removeEditAttachment(idx)}
                            className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition-colors"
                            title="Remove file"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative border-2 border-dashed border-gray-200 hover:border-[#095c7b] rounded-lg p-4 text-center bg-gray-50/50 hover:bg-[#095c7b]/5 transition-colors cursor-pointer group">
                  <input
                    type="file"
                    multiple
                    onChange={handleEditFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploadingEditFiles}
                  />
                  <div className="flex flex-col items-center justify-center space-y-1">
                    {isUploadingEditFiles ? (
                      <Loader2 className="h-6 w-6 text-[#095c7b] animate-spin" />
                    ) : (
                      <UploadCloud className="h-6 w-6 text-gray-400 group-hover:text-[#095c7b] transition-colors" />
                    )}
                    <span className="text-xs font-semibold text-gray-600 group-hover:text-[#095c7b] transition-colors">
                      {isUploadingEditFiles ? "Uploading attachment..." : "Click or drag to upload additional files"}
                    </span>
                    <span className="text-[10px] text-gray-400">PNG, JPG, PDF, GIF up to 10MB</span>
                  </div>
                </div>
              </div>

              {/* Conversation Timeline & History */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#095c7b]" /> Conversation Timeline & Updates
                </h4>
                
                {editingTicket.history && editingTicket.history.length > 0 ? (
                  <div className="space-y-3 pl-2 border-l-2 border-[#095c7b]/20 ml-2">
                    {editingTicket.history.map((item, idx) => (
                      <div key={idx} className="relative pl-4 space-y-1.5 pb-2">
                        <div className={`absolute left-[-21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white shadow-xs ${
                          item.role === 'user' ? 'bg-blue-600' : 'bg-[#095c7b]'
                        }`} />
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-800">{item.updatedByName}</span>
                            {item.role === 'user' ? (
                              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 py-0">User Reply</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 py-0">Admin Response</Badge>
                            )}
                          </div>
                          <span>{new Date(item.updatedAt).toLocaleString()}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-gray-500">Status:</span>
                          {getStatusBadge(item.status)}
                        </div>

                        {item.note && (
                          <div className={`rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed shadow-xs border ${
                            item.role === 'user' ? 'bg-blue-50/50 border-blue-100' : 'bg-amber-50/40 border-amber-100/50'
                          }`}>
                            {item.note}
                          </div>
                        )}

                        {item.attachments && item.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {item.attachments.map((file, fileIdx) => (
                              <a
                                key={fileIdx}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[#095c7b] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-medium transition-colors"
                              >
                                <Paperclip className="h-3 w-3" /> {file.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : editingTicket.adminNotes ? (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {editingTicket.adminNotes}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No comments or updates recorded yet.
                  </p>
                )}
              </div>

              {/* In-Ticket Reply Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mt-4">
                <h4 className="text-xs font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" /> Reply to Ticket
                </h4>
                
                <Textarea
                  placeholder="Type your response, clarification, or test results here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="bg-white border-slate-200 text-sm min-h-[90px] focus-visible:ring-[#095c7b]"
                />

                {replyAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {replyAttachments.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-md text-xs">
                        <File className="h-3.5 w-3.5 text-[#095c7b]" />
                        <span className="truncate max-w-[140px]">{f.name}</span>
                        <button type="button" onClick={() => removeReplyAttachment(i)} className="text-rose-500 hover:text-rose-700">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-[#095c7b] hover:text-[#053647] font-semibold bg-white border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">
                    {isUploadingReplyFiles ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Paperclip className="h-3.5 w-3.5" />
                    )}
                    {isUploadingReplyFiles ? "Uploading..." : "Attach File/Screenshot"}
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleReplyFileUpload}
                      disabled={isUploadingReplyFiles || isSubmittingReply}
                    />
                  </label>

                  <Button
                    type="button"
                    onClick={handleSendReply}
                    disabled={isSubmittingReply || isUploadingReplyFiles || !replyText.trim()}
                    className="bg-[#095c7b] text-white hover:bg-[#053647] text-xs font-bold px-4 h-9 shadow-xs"
                  >
                    {isSubmittingReply ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Posting Reply...
                      </>
                    ) : (
                      "Post Reply"
                    )}
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTicket(null)}
                  disabled={isSavingEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || isUploadingEditFiles}
                  className="bg-[#095c7b] text-white hover:bg-[#07475d] font-semibold"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
