"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FullScreenLoader } from "@/components/ui/loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Download, 
  Save, 
  Filter, 
  MessageCircle, 
  Loader2,
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  PieChart as LucidePieChart,
  Pencil,
  UploadCloud,
  File,
  X
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
  Legend, 
  AreaChart, 
  Area,
  CartesianGrid
} from "recharts";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore as db, storage } from "@/lib/firebase";
import { getAllUsers, createNotification } from "@/services/firebase";

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
  githubIssue?: string;
  commitHash?: string;
  branchName?: string;
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

export default function AdminAppTicketsPage() {
  const { userProfile, loading, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<AppTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Management states
  const [selectedTicket, setSelectedTicket] = useState<AppTicket | null>(null);
  const [statusVal, setStatusVal] = useState<AppTicket["status"]>("open");
  const [platformVal, setPlatformVal] = useState<"ProspectPlus" | "LocalMile.Plus" | "LPO.Plus" | "Website">("ProspectPlus");
  const [adminNotesVal, setAdminNotesVal] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [sendEmailVal, setSendEmailVal] = useState(false);
  const [emailNotesVal, setEmailNotesVal] = useState("");
  const [ccEmailVal, setCcEmailVal] = useState("ankith.ravindran@mailplus.com.au");
  const [users, setUsers] = useState<any[]>([]);

  // Assigned Super Admin state
  const [assignedToUidVal, setAssignedToUidVal] = useState("ncyhwLtOG1W7TZ43PkYCcObeCAf2");
  const [assignedToNameVal, setAssignedToNameVal] = useState("Ankith Ravindran");
  const [assignedToEmailVal, setAssignedToEmailVal] = useState("ankith.ravindran@mailplus.com.au");

  // Ticket detail editing states for admin
  const [editTitleVal, setEditTitleVal] = useState("");
  const [editTypeVal, setEditTypeVal] = useState<"feature" | "bug" | "issue" | "feedback">("feature");
  const [editDescriptionVal, setEditDescriptionVal] = useState("");
  const [editAttachmentsVal, setEditAttachmentsVal] = useState<{ name: string; url: string }[]>([]);
  const [isUploadingAdminFiles, setIsUploadingAdminFiles] = useState(false);

  // Developer fields
  const [githubIssueVal, setGithubIssueVal] = useState("");
  const [commitHashVal, setCommitHashVal] = useState("");
  const [branchNameVal, setBranchNameVal] = useState("");

  // CC search filter
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [userFilter, setUserFilter] = useState<string>("all");

  const [showReports, setShowReports] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getAllUsers().then(setUsers).catch(console.error);
  }, []);

  const superAdminsList = useMemo(() => {
    return users.filter((u: any) => {
      if (u.disabled === true || u.status === "disabled" || u.status === "inactive") return false;
      return (
        u.role === "admin" ||
        u.role === "superadmin" ||
        u.activeRole === "admin" ||
        u.activeRole === "superadmin" ||
        u.isSuperAdmin === true ||
        u.email?.toLowerCase() === "ankith.ravindran@mailplus.com.au" ||
        u.uid === "ncyhwLtOG1W7TZ43PkYCcObeCAf2"
      );
    });
  }, [users]);

  useEffect(() => {
    if (loading) return;

    // Enforce that ONLY the superadmin (specifically UID ncyhwLtOG1W7TZ43PkYCcObeCAf2 or general superAdmin) can access
    const isAuthorized = isSuperAdmin || userProfile?.uid === "ncyhwLtOG1W7TZ43PkYCcObeCAf2";
    if (!isAuthorized) {
      router.push("/leads");
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
      console.error("Error loading admin app tickets:", error);
      setLoadingTickets(false);
    });

    return () => unsubscribe();
  }, [userProfile, loading, isSuperAdmin, router]);

  const handleOpenEdit = (ticket: AppTicket) => {
    setSelectedTicket(ticket);
    setStatusVal(ticket.status || "open");
    setPlatformVal(ticket.platform || "ProspectPlus");
    setAdminNotesVal(ticket.adminNotes || "");
    setGithubIssueVal(ticket.githubIssue || "");
    setCommitHashVal(ticket.commitHash || "");
    setBranchNameVal(ticket.branchName || "");
    setSendEmailVal(false);
    setEmailNotesVal(ticket.adminNotes || "");
    setCcEmailVal("ankith.ravindran@mailplus.com.au");
    setUserSearchQuery("");

    setAssignedToUidVal(ticket.assignedToUid || "ncyhwLtOG1W7TZ43PkYCcObeCAf2");
    setAssignedToNameVal(ticket.assignedToName || "Ankith Ravindran");
    setAssignedToEmailVal(ticket.assignedToEmail || "ankith.ravindran@mailplus.com.au");

    setEditTitleVal(ticket.title || "");
    setEditTypeVal(ticket.type || "feature");
    setEditDescriptionVal(ticket.description || "");
    setEditAttachmentsVal(ticket.attachments ? [...ticket.attachments] : []);
    setIsUploadingAdminFiles(false);
  };

  const handleAdminFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTicket) return;
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAdminFiles(true);
    const newAttachments = [...editAttachmentsVal];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `app_tickets/attachments/${selectedTicket.id}/${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newAttachments.push({ name: file.name, url });
      }
      setEditAttachmentsVal(newAttachments);
      toast.success("Files uploaded successfully.");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error uploading files.");
    } finally {
      setIsUploadingAdminFiles(false);
      if (event.target) event.target.value = "";
    }
  };

  const removeAdminAttachment = (index: number) => {
    const newAttachments = [...editAttachmentsVal];
    newAttachments.splice(index, 1);
    setEditAttachmentsVal(newAttachments);
  };

  const handleSaveChanges = async () => {
    if (!selectedTicket) return;
    if (!editTitleVal.trim() || !editDescriptionVal.trim()) {
      toast.error("Title and description are required.");
      return;
    }

    setIsSaving(true);
    try {
      const ticketRef = doc(db, "app_tickets", selectedTicket.id);
      
      const newHistoryItem = {
        status: statusVal,
        note: adminNotesVal.trim(),
        updatedAt: new Date().toISOString(),
        updatedByName: userProfile?.displayName || userProfile?.email || "Admin",
        role: "admin" as const,
        emailSent: sendEmailVal
      };

      const updatedHistory = selectedTicket.history ? [...selectedTicket.history, newHistoryItem] : [newHistoryItem];
      const isReassigned = selectedTicket.assignedToUid !== assignedToUidVal;

      await updateDoc(ticketRef, {
        title: editTitleVal.trim(),
        type: editTypeVal,
        description: editDescriptionVal.trim(),
        attachments: editAttachmentsVal,
        status: statusVal,
        platform: platformVal,
        adminNotes: adminNotesVal.trim(),
        githubIssue: githubIssueVal.trim(),
        commitHash: commitHashVal.trim(),
        branchName: branchNameVal.trim(),
        assignedToUid: assignedToUidVal,
        assignedToName: assignedToNameVal,
        assignedToEmail: assignedToEmailVal,
        updatedAt: serverTimestamp(),
        history: updatedHistory
      });

      if (isReassigned && assignedToEmailVal) {
        try {
          const origin = typeof window !== "undefined" ? window.location.origin : "https://prospectplus.mailplus.com.au";
          const emailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #095c7b; margin-top: 0; font-size: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">📌 App Ticket Reassigned to You</h2>
  <p>Hi <strong>${assignedToNameVal}</strong>,</p>
  <p>App Ticket "<strong>${selectedTicket.title}</strong>" has been reassigned to you by <strong>${userProfile?.displayName || userProfile?.email || "Admin"}</strong>:</p>
  
  <div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border-left: 4px solid #095c7b; border-radius: 6px; border: 1px solid #e2e8f0;">
    <p style="margin: 0 0 8px 0; color: #095c7b; font-weight: bold; font-size: 16px;">${selectedTicket.title}</p>
    <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
      <strong>Type:</strong> ${selectedTicket.type} &nbsp;|&nbsp; 
      <strong>Platform:</strong> ${selectedTicket.platform || "ProspectPlus"} &nbsp;|&nbsp; 
      <strong>Submitted By:</strong> ${selectedTicket.createdByName} (${selectedTicket.createdByEmail})
    </p>
    <p style="margin: 8px 0 0 0; color: #334155; font-size: 14px; white-space: pre-wrap;">${selectedTicket.description}</p>
  </div>

  <p style="font-size: 14px; color: #475569;">Click the button below to view and manage this ticket on the App Tickets page:</p>
  
  <div style="text-align: center; margin: 25px 0;">
    <a href="${origin}/admin/app-tickets?ticketId=${selectedTicket.id}" 
       style="background-color: #095c7b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px; box-shadow: 0 2px 4px rgba(9, 92, 123, 0.1);">
       View Ticket on App Tickets Page
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
              to: assignedToEmailVal,
              subject: `[App Ticket Reassigned] ${selectedTicket.title}`,
              html: emailHtml
            })
          }).catch(err => console.error("Failed to send reassignment email:", err));
        } catch (emailErr) {
          console.error("Reassignment email error:", emailErr);
        }
      }

      if (sendEmailVal || statusVal === "waiting_on_user") {
        const statusLabelMap: Record<string, string> = {
          open: "Open",
          planned: "Planned",
          in_progress: "In Progress",
          testing: "Testing",
          completed: "Completed",
          declined: "Declined",
          waiting_on_user: "Waiting on User",
        };
        const statusColorMap: Record<string, string> = {
          open: "#3b82f6",
          planned: "#a855f7",
          in_progress: "#f59e0b",
          testing: "#0891b2",
          completed: "#10b981",
          declined: "#f43f5e",
          waiting_on_user: "#d97706",
        };
        const statusLabel = statusLabelMap[statusVal] || statusVal;
        const statusColor = statusColorMap[statusVal] || "#64748b";

        const isWaiting = statusVal === "waiting_on_user";

        // Dispatch In-App Notification to ticket creator
        if (selectedTicket.createdBy) {
          try {
            await createNotification(selectedTicket.createdBy, {
              title: isWaiting 
                ? "Action Required: Super Admin is waiting on your input" 
                : `App Ticket Update: ${statusLabel}`,
              message: (emailNotesVal.trim() || adminNotesVal.trim())
                ? (emailNotesVal.trim() || adminNotesVal.trim())
                : `Your ticket "${selectedTicket.title}" status has been updated to ${statusLabel}.`,
              type: isWaiting ? "app_ticket_waiting" : "app_ticket_update",
              ticketId: selectedTicket.id,
              link: `/app-tickets?ticketId=${selectedTicket.id}`,
            });
          } catch (notifErr) {
            console.error("Failed to dispatch in-app notification:", notifErr);
          }
        }

        if (sendEmailVal) {
          const emailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #095c7b; margin-top: 0; font-size: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">${isWaiting ? '⚠️ Action Required on Your Support Request' : 'Ticket Progress Update'}</h2>
  <p>Hi <strong>${selectedTicket.createdByName}</strong>,</p>
  <p>${isWaiting ? 'The Super Admin is currently <strong>waiting on your input or clarification</strong> regarding your request:' : 'We wanted to let you know that there is an update on your request:'} "<strong>${selectedTicket.title}</strong>".</p>
  
  <div style="margin: 20px 0; padding: 15px; background-color: ${isWaiting ? '#fffbeb' : '#f8fafc'}; border-left: 4px solid ${isWaiting ? '#d97706' : '#095c7b'}; border-radius: 4px; border-top: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
    <p style="margin: 0 0 10px 0;"><strong>Current Status:</strong> <span style="background-color: ${statusColor}20; color: ${statusColor}; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 13px; text-transform: uppercase;">${statusLabel}</span></p>
    ${emailNotesVal.trim() ? `<p style="margin: 0;"><strong>Message from Super Admin:</strong><br /><span style="color: #475569; font-size: 14px;">${emailNotesVal.trim().replace(/\n/g, '<br />')}</span></p>` : ''}
  </div>

  <p style="font-size: 14px; color: #475569;">Please view your ticket on the Feedback & Ideas Board to respond or provide additional details:</p>
  
  <div style="text-align: center; margin: 25px 0;">
    <a href="${window.location.origin}/app-tickets?ticketId=${selectedTicket.id}" 
       style="background-color: #095c7b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px; box-shadow: 0 2px 4px rgba(9, 92, 123, 0.1);">
       View Ticket & Respond
    </a>
  </div>
  
  <p style="font-size: 11px; color: #94a3b8; margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">
    This email was sent regarding your support request in MailPlus CRM.
  </p>
</div>
        `;

          const response = await fetch('/api/campaigns/send-custom-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: selectedTicket.createdByEmail,
              subject: isWaiting ? `[Action Required] Waiting on your response: ${selectedTicket.title}` : `[Progress Update] ${selectedTicket.title}`,
              html: emailHtml,
              customFrom: "ankith.ravindran@mailplus.com.au",
              cc: ccEmailVal,
            }),
          });

          const emailRes = await response.json();
          if (!emailRes.success) {
            console.error("Failed to send update email:", emailRes.message);
            toast.warning("Ticket updated, but email failed: " + emailRes.message);
          } else {
            toast.success(isWaiting ? "Action Required notification & email sent!" : "Progress update email sent successfully!");
          }
        } else {
          toast.success("Ticket updated & in-app notification sent.");
        }
      } else {
        toast.success("Ticket updated successfully.");
      }
      setSelectedTicket(null);
    } catch (error) {
      console.error("Error updating app ticket:", error);
      toast.error("Failed to update ticket.");
    } finally {
      setIsSaving(false);
    }
  };

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

  const uniqueSubmitters = useMemo(() => {
    const map = new Map<string, { name: string; email: string }>();
    tickets.forEach(ticket => {
      if (ticket.createdBy) {
        map.set(ticket.createdBy, {
          name: ticket.createdByName || "Unknown",
          email: ticket.createdByEmail || ""
        });
      }
    });
    return Array.from(map.entries()).map(([id, info]) => ({
      id,
      ...info
    }));
  }, [tickets]);

  const filteredTickets = tickets.filter(ticket => {
    const matchesType = typeFilter === "all" || ticket.type === typeFilter;
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesUser = userFilter === "all" || ticket.createdBy === userFilter;
    return matchesType && matchesStatus && matchesUser;
  });

  // 1. Status Breakdown
  const statusCounts = tickets.reduce((acc, t) => {
    acc[t.status || "open"] = (acc[t.status || "open"] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = [
    { name: "Open", value: statusCounts["open"] || 0, color: "#3b82f6" },
    { name: "Planned", value: statusCounts["planned"] || 0, color: "#a855f7" },
    { name: "In Progress", value: statusCounts["in_progress"] || 0, color: "#f59e0b" },
    { name: "Testing", value: statusCounts["testing"] || 0, color: "#0891b2" },
    { name: "Completed", value: statusCounts["completed"] || 0, color: "#10b981" },
    { name: "Declined", value: statusCounts["declined"] || 0, color: "#f43f5e" }
  ].filter(item => item.value > 0);

  // 2. Category Breakdown
  const categoryCounts = tickets.reduce((acc, t) => {
    acc[t.type || "feedback"] = (acc[t.type || "feedback"] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = [
    { name: "Feedback", value: categoryCounts["feedback"] || 0, color: "#3b82f6" },
    { name: "Feature", value: categoryCounts["feature"] || 0, color: "#0d9488" },
    { name: "Bug", value: categoryCounts["bug"] || 0, color: "#e11d48" },
    { name: "Issue", value: categoryCounts["issue"] || 0, color: "#ea580c" }
  ].filter(item => item.value > 0);

  // 3. Platform Breakdown
  const platformCounts = tickets.reduce((acc, t) => {
    const p = t.platform || "ProspectPlus";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const platformData = [
    { name: "ProspectPlus", value: platformCounts["ProspectPlus"] || 0, color: "#095c7b" },
    { name: "LocalMile.Plus", value: platformCounts["LocalMile.Plus"] || 0, color: "#0d9488" },
    { name: "LPO.Plus", value: platformCounts["LPO.Plus"] || 0, color: "#f59e0b" },
    { name: "Website", value: platformCounts["Website"] || 0, color: "#ea580c" }
  ].filter(item => item.value > 0);

  // 3. User Breakdown (Top Creators)
  const userCounts = tickets.reduce((acc, t) => {
    const key = t.createdByName || t.createdByEmail || "Anonymous";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const userData = Object.entries(userCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5

  // 4. Date Breakdown (grouped by day)
  const dateCounts = tickets.reduce((acc, t) => {
    if (t.createdAt) {
      const date = new Date(t.createdAt.seconds * 1000);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      acc[dateStr] = (acc[dateStr] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Sort dates chronologically
  const dateData = Object.entries(dateCounts)
    .map(([dateStr, count]) => {
      const ticket = tickets.find(t => {
        if (!t.createdAt) return false;
        const d = new Date(t.createdAt.seconds * 1000);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) === dateStr;
      });
      return {
        dateStr,
        timestamp: ticket?.createdAt?.seconds || 0,
        count
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(item => ({
      name: item.dateStr,
      Tickets: item.count
    }));

  // KPI calculations
  const totalTicketsCount = tickets.length;
  const openTicketsCount = tickets.filter(t => (t.status || "open") === "open").length;
  const plannedTicketsCount = tickets.filter(t => t.status === "planned").length;
  const inProgressTicketsCount = tickets.filter(t => t.status === "in_progress").length;
  const testingTicketsCount = tickets.filter(t => t.status === "testing").length;
  const activeTicketsCount = openTicketsCount + plannedTicketsCount + inProgressTicketsCount + testingTicketsCount;
  const completedTicketsCount = tickets.filter(t => t.status === "completed").length;
  const bugTicketsCount = tickets.filter(t => t.type === "bug").length;

  if (loading || loadingTickets) return <FullScreenLoader message="Loading admin board..." />;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#095c7b] flex items-center gap-2">
            App Support & Feedback Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage feature requests, bug reports, and track system status updates.
          </p>
        </div>
        <Button
          onClick={() => setShowReports(!showReports)}
          className="flex items-center gap-2 bg-[#095c7b] text-white hover:bg-[#07475d] transition-colors"
        >
          <BarChart3 className="h-4 w-4" />
          {showReports ? "Hide Analytics" : "Show Analytics"}
        </Button>
      </div>

      {/* Analytics Dashboard */}
      {showReports && mounted && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top duration-300">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <Card 
              onClick={() => { setStatusFilter("all"); setTypeFilter("all"); }}
              className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Total</p>
                  <div className="p-1.5 bg-slate-500/10 text-slate-600 rounded-lg group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-[#095c7b] mt-2">{totalTicketsCount}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">All submissions</p>
              </CardContent>
            </Card>

            <Card 
              onClick={() => setStatusFilter("open")}
              className={`bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group ${statusFilter === 'open' ? 'ring-2 ring-blue-500' : ''}`}
            >
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">Open</p>
                  <div className="p-1.5 bg-blue-500/15 text-blue-700 rounded-lg group-hover:scale-110 transition-transform">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-blue-900 mt-2">{openTicketsCount}</p>
                <p className="text-[10px] text-blue-600 mt-1 font-medium">Awaiting triage</p>
              </CardContent>
            </Card>

            <Card 
              onClick={() => setStatusFilter("planned")}
              className={`bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group ${statusFilter === 'planned' ? 'ring-2 ring-purple-500' : ''}`}
            >
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider">Planned</p>
                  <div className="p-1.5 bg-purple-500/15 text-purple-700 rounded-lg group-hover:scale-110 transition-transform">
                    <Calendar className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-purple-900 mt-2">{plannedTicketsCount}</p>
                <p className="text-[10px] text-purple-600 mt-1 font-medium">Release queue</p>
              </CardContent>
            </Card>

            <Card 
              onClick={() => setStatusFilter("in_progress")}
              className={`bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group ${statusFilter === 'in_progress' ? 'ring-2 ring-amber-500' : ''}`}
            >
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider">In Progress</p>
                  <div className="p-1.5 bg-amber-500/15 text-amber-700 rounded-lg group-hover:scale-110 transition-transform">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-amber-900 mt-2">{inProgressTicketsCount}</p>
                <p className="text-[10px] text-amber-600 mt-1 font-medium">In development</p>
              </CardContent>
            </Card>

            <Card 
              onClick={() => setStatusFilter("testing")}
              className={`bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group ${statusFilter === 'testing' ? 'ring-2 ring-cyan-500' : ''}`}
            >
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold text-cyan-700 uppercase tracking-wider">Testing</p>
                  <div className="p-1.5 bg-cyan-500/15 text-cyan-700 rounded-lg group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-cyan-900 mt-2">{testingTicketsCount}</p>
                <p className="text-[10px] text-cyan-600 mt-1 font-medium">QA & verification</p>
              </CardContent>
            </Card>

            <Card 
              onClick={() => setStatusFilter("completed")}
              className={`bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group ${statusFilter === 'completed' ? 'ring-2 ring-emerald-500' : ''}`}
            >
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">Completed</p>
                  <div className="p-1.5 bg-emerald-500/15 text-emerald-700 rounded-lg group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-emerald-900 mt-2">{completedTicketsCount}</p>
                <p className="text-[10px] text-emerald-600 mt-1 font-medium">Resolved</p>
              </CardContent>
            </Card>

            <Card 
              onClick={() => setTypeFilter("bug")}
              className={`bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group ${typeFilter === 'bug' ? 'ring-2 ring-rose-500' : ''}`}
            >
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider">Bugs</p>
                  <div className="p-1.5 bg-rose-500/15 text-rose-700 rounded-lg group-hover:scale-110 transition-transform">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-rose-900 mt-2">{bugTicketsCount}</p>
                <p className="text-[10px] text-rose-600 mt-1 font-medium">Bug reports</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status breakdown donut */}
            <Card className="shadow-sm border bg-white flex flex-col justify-between overflow-hidden">
              <CardHeader className="pb-2 bg-gray-50/50 border-b">
                <CardTitle className="text-xs font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-1.5">
                  <LucidePieChart className="h-4 w-4" /> Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col items-center justify-center min-h-[220px]">
                {statusData.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No data available</p>
                ) : (
                  <>
                    <div className="w-full h-[140px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={55}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mt-2">
                      {statusData.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-[10px] font-medium text-gray-600">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span>{item.name} ({item.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Category breakdown pie */}
            <Card className="shadow-sm border bg-white flex flex-col justify-between overflow-hidden">
              <CardHeader className="pb-2 bg-gray-50/50 border-b">
                <CardTitle className="text-xs font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col items-center justify-center min-h-[220px]">
                {categoryData.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No data available</p>
                ) : (
                  <>
                    <div className="w-full h-[140px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={0}
                            outerRadius={55}
                            paddingAngle={0}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mt-2">
                      {categoryData.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-[10px] font-medium text-gray-600">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span>{item.name} ({item.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Platform breakdown donut */}
            <Card className="shadow-sm border bg-white flex flex-col justify-between overflow-hidden">
              <CardHeader className="pb-2 bg-gray-50/50 border-b">
                <CardTitle className="text-xs font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4" /> Platform Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col items-center justify-center min-h-[220px]">
                {platformData.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No data available</p>
                ) : (
                  <>
                    <div className="w-full h-[140px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie
                            data={platformData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={55}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {platformData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mt-2">
                      {platformData.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-[10px] font-medium text-gray-600">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span>{item.name} ({item.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

            {/* Date Submission Trend */}
            <Card className="shadow-sm border bg-white overflow-hidden flex flex-col">
              <CardHeader className="pb-2 bg-gray-50/50 border-b">
                <CardTitle className="text-xs font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Submission Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 h-[220px] flex items-center justify-center">
                {dateData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    No timeline data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={dateData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#095c7b" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#095c7b" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: '9px', fill: '#64748b' }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} style={{ fontSize: '9px', fill: '#64748b' }} />
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px' }} />
                      <Area type="monotone" dataKey="Tickets" stroke="#095c7b" strokeWidth={2} fillOpacity={1} fill="url(#colorTickets)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* User Breakdown (Top Creators) */}
            <Card className="shadow-sm border bg-white overflow-hidden flex flex-col">
              <CardHeader className="pb-2 bg-gray-50/50 border-b">
                <CardTitle className="text-xs font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Top Ticket Creators (by Submissions)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 h-[200px] flex items-center justify-center">
                {userData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    No user data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={userData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} style={{ fontSize: '9px', fill: '#64748b' }} />
                      <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} style={{ fontSize: '9px', fill: '#64748b', fontWeight: 'bold' }} width={120} />
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px' }} />
                      <Bar dataKey="count" fill="#095c7b" radius={[0, 4, 4, 0]} maxBarSize={20}>
                        {userData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#095c7b' : index === 1 ? '#0d9488' : index === 2 ? '#0891b2' : '#0284c7'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Active Workload Pipeline Buckets Overview */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
          <div>
            <h3 className="text-base font-extrabold text-[#095c7b] flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#095c7b]" /> Active Development Pipeline Buckets
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live tracking of open requests, planned features, in-progress tasks, and QA testing.
            </p>
          </div>
          <Badge className="w-fit bg-[#095c7b]/10 text-[#095c7b] border-[#095c7b]/20 font-bold px-3 py-1">
            {activeTicketsCount} Active Workload Items
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Open Bucket Card */}
          <div 
            onClick={() => setStatusFilter("open")}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              statusFilter === "open"
                ? "bg-blue-50/70 border-blue-500 shadow-md"
                : "bg-gradient-to-b from-blue-50/40 to-white border-blue-100 hover:border-blue-300 hover:shadow-sm"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-bold text-xs">
                  🔵 Open Bucket
                </Badge>
                <span className="text-2xl font-black text-blue-900">{openTicketsCount}</span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                New feedback & requests awaiting triage, prioritization, and initial review.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-blue-100 flex items-center justify-between text-[11px] font-bold text-blue-700">
              <span>View Open ({openTicketsCount})</span>
              <span>→</span>
            </div>
          </div>

          {/* Planned Bucket Card */}
          <div 
            onClick={() => setStatusFilter("planned")}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              statusFilter === "planned"
                ? "bg-purple-50/70 border-purple-500 shadow-md"
                : "bg-gradient-to-b from-purple-50/40 to-white border-purple-100 hover:border-purple-300 hover:shadow-sm"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-bold text-xs">
                  🟣 Planned Bucket
                </Badge>
                <span className="text-2xl font-black text-purple-900">{plannedTicketsCount}</span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                Approved features & fixes scheduled in the roadmap for upcoming sprints.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-purple-100 flex items-center justify-between text-[11px] font-bold text-purple-700">
              <span>View Planned ({plannedTicketsCount})</span>
              <span>→</span>
            </div>
          </div>

          {/* In Progress Bucket Card */}
          <div 
            onClick={() => setStatusFilter("in_progress")}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              statusFilter === "in_progress"
                ? "bg-amber-50/70 border-amber-500 shadow-md"
                : "bg-gradient-to-b from-amber-50/40 to-white border-amber-100 hover:border-amber-300 hover:shadow-sm"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold text-xs">
                  🟡 In Progress Bucket
                </Badge>
                <span className="text-2xl font-black text-amber-900">{inProgressTicketsCount}</span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                Items actively being coded, engineered, and built by the development team.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-amber-100 flex items-center justify-between text-[11px] font-bold text-amber-700">
              <span>View In Progress ({inProgressTicketsCount})</span>
              <span>→</span>
            </div>
          </div>

          {/* Testing Bucket Card */}
          <div 
            onClick={() => setStatusFilter("testing")}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              statusFilter === "testing"
                ? "bg-cyan-50/70 border-cyan-500 shadow-md"
                : "bg-gradient-to-b from-cyan-50/40 to-white border-cyan-100 hover:border-cyan-300 hover:shadow-sm"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200 font-bold text-xs">
                  🟢 Testing Bucket
                </Badge>
                <span className="text-2xl font-black text-cyan-900">{testingTicketsCount}</span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                Completed builds undergoing QA testing and user acceptance before release.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-cyan-100 flex items-center justify-between text-[11px] font-bold text-cyan-700">
              <span>View Testing ({testingTicketsCount})</span>
              <span>→</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar scroll-smooth gap-2 pb-px">
        {[
          { value: "open", label: "Open", count: statusCounts["open"] || 0 },
          { value: "waiting_on_user", label: "Waiting on User", count: statusCounts["waiting_on_user"] || 0 },
          { value: "planned", label: "Planned", count: statusCounts["planned"] || 0 },
          { value: "in_progress", label: "In Progress", count: statusCounts["in_progress"] || 0 },
          { value: "testing", label: "Testing", count: statusCounts["testing"] || 0 },
          { value: "completed", label: "Completed", count: statusCounts["completed"] || 0 },
          { value: "declined", label: "Declined", count: statusCounts["declined"] || 0 },
          { value: "all", label: "All Statuses", count: totalTicketsCount },
        ].map((tab) => {
          const isActive = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-[#095c7b] text-[#095c7b]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isActive 
                  ? "bg-[#095c7b]/10 text-[#095c7b]" 
                  : "bg-gray-100 text-gray-600"
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border shadow-sm">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
          <Filter className="h-4 w-4" /> Filters:
        </span>
        
        <div className="flex flex-wrap gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-sm rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
          >
            <option value="all">All Categories</option>
            <option value="feedback">Feedback</option>
            <option value="feature">Features</option>
            <option value="bug">Bugs</option>
            <option value="issue">Issues</option>
          </select>

          {/* Submitter Filter */}
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="text-sm rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b] max-w-[240px] truncate"
          >
            <option value="all">All Submitters</option>
            {uniqueSubmitters.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-xs text-muted-foreground font-medium">
          Total items: {filteredTickets.length}
        </div>
      </div>

      {/* Tickets List */}
      <Card className="shadow-md bg-white">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-xl text-[#095c7b] flex items-center gap-2">
            Feedback & Bugs Listing
          </CardTitle>
          <CardDescription>Click View/Edit on any ticket to update its status, assignee, or add developer notes.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No tickets found matching the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs uppercase bg-gray-50 border-b text-gray-600 font-semibold">
                  <tr>
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Platform</th>
                    <th className="px-6 py-4">Submitted By</th>
                    <th className="px-6 py-4">Assigned To</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-[#095c7b] max-w-[220px] truncate" title={ticket.title}>
                        {ticket.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTypeBadge(ticket.type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200">
                          {ticket.platform || "ProspectPlus"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{ticket.createdByName}</span>
                          <span className="text-xs text-muted-foreground">{ticket.createdByEmail}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">
                        <Badge variant="secondary" className="bg-[#095c7b]/10 text-[#095c7b] border border-[#095c7b]/20 font-semibold">
                          {ticket.assignedToName || "Ankith Ravindran"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {ticket.createdAt ? new Date(ticket.createdAt.seconds * 1000).toLocaleDateString() : "Just now"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(ticket.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-[#095c7b] border-[#095c7b]/20 hover:bg-[#095c7b]/5"
                          onClick={() => handleOpenEdit(ticket)}
                        >
                          View & Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <Dialog open={selectedTicket !== null} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        {selectedTicket && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-center gap-2 mb-2">
                {getTypeBadge(selectedTicket.type)}
                {getStatusBadge(selectedTicket.status)}
                <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200">
                  Platform: {selectedTicket.platform || "ProspectPlus"}
                </Badge>
              </div>
              <DialogTitle className="text-2xl font-extrabold text-[#095c7b] leading-tight">
                Manage Request: {selectedTicket.title}
              </DialogTitle>
              <div className="text-xs text-muted-foreground flex flex-wrap gap-2 pt-1.5">
                <span>Submitted by: <strong>{selectedTicket.createdByName}</strong> ({selectedTicket.createdByEmail})</span>
                <span>•</span>
                <span>Assigned To: <strong>{selectedTicket.assignedToName || "Ankith Ravindran"}</strong></span>
                <span>•</span>
                <span>Date: {selectedTicket.createdAt ? new Date(selectedTicket.createdAt.seconds * 1000).toLocaleString() : "N/A"}</span>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Editable Ticket Title & Category */}
              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <h4 className="text-xs font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Ticket Details Editing
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Ticket Title</label>
                    <Input
                      value={editTitleVal}
                      onChange={(e) => setEditTitleVal(e.target.value)}
                      placeholder="Title"
                      className="bg-white text-xs border-gray-200 focus-visible:ring-[#095c7b]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Category</label>
                    <select
                      value={editTypeVal}
                      onChange={(e) => setEditTypeVal(e.target.value as any)}
                      className="w-full text-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                    >
                      <option value="feedback">Feedback</option>
                      <option value="feature">Feature Request</option>
                      <option value="bug">Bug Report</option>
                      <option value="issue">General Issue</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Detailed Description</label>
                  <Textarea
                    value={editDescriptionVal}
                    onChange={(e) => setEditDescriptionVal(e.target.value)}
                    placeholder="User description..."
                    className="min-h-[100px] text-xs bg-white border-gray-200 focus-visible:ring-[#095c7b]"
                  />
                </div>
              </div>

              {/* Attachments Section */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Attachments & Screenshots</h4>
                {editAttachmentsVal && editAttachmentsVal.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                    {editAttachmentsVal.map((file, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white shadow-sm"
                      >
                        <span className="text-xs font-medium truncate max-w-[150px]">{file.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 bg-[#095c7b]/10 text-[#095c7b] hover:bg-[#095c7b]/20 rounded-md transition-colors"
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                          <a 
                            href={file.url} 
                            download 
                            className="p-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                            title="Download"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => removeAdminAttachment(index)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Delete Attachment"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative border-2 border-dashed border-gray-200 hover:border-[#095c7b] rounded-lg p-3 text-center bg-gray-50/50 hover:bg-[#095c7b]/5 transition-colors cursor-pointer group">
                  <input
                    type="file"
                    multiple
                    onChange={handleAdminFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploadingAdminFiles}
                  />
                  <div className="flex items-center justify-center gap-2">
                    {isUploadingAdminFiles ? (
                      <Loader2 className="h-4 w-4 text-[#095c7b] animate-spin" />
                    ) : (
                      <UploadCloud className="h-4 w-4 text-gray-400 group-hover:text-[#095c7b] transition-colors" />
                    )}
                    <span className="text-xs font-semibold text-gray-600 group-hover:text-[#095c7b] transition-colors">
                      {isUploadingAdminFiles ? "Uploading attachment..." : "Add attachment file"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Developer Git Details (View only) */}
              {(selectedTicket.githubIssue || selectedTicket.commitHash || selectedTicket.branchName) && (
                <div className="space-y-2 border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Developer & Git Details</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTicket.githubIssue && (
                      <Badge className="bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200">
                        GitHub: {selectedTicket.githubIssue}
                      </Badge>
                    )}
                    {selectedTicket.branchName && (
                      <Badge className="bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200 font-mono text-[10px]">
                        Branch: {selectedTicket.branchName}
                      </Badge>
                    )}
                    {selectedTicket.commitHash && (
                      <Badge className="bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200 font-mono text-[10px]">
                        Commit: {selectedTicket.commitHash}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Ticket History & Updates */}
              {selectedTicket.history && selectedTicket.history.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#095c7b]" /> Ticket Update & Notes Log
                  </h4>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                    {selectedTicket.history.map((item, idx) => (
                      <div key={idx} className="bg-gray-50/70 border border-gray-100 rounded-lg p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between flex-wrap gap-2 text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-700">{item.updatedByName}</span>
                            {item.role === 'user' ? (
                              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 py-0">User Reply</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 py-0">Admin Update</Badge>
                            )}
                          </div>
                          <span>{new Date(item.updatedAt).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-gray-500">Status:</span>
                          {getStatusBadge(item.status)}
                          {item.emailSent && (
                            <span className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                              ✉ Email Sent
                            </span>
                          )}
                        </div>
                        {item.note && (
                          <div className="bg-white rounded border border-gray-100 p-2 text-sm text-gray-700 whitespace-pre-wrap">
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
                </div>
              )}

              {/* Super Admin Control Panel */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider">Admin Actions</h4>
                
                {/* Status, Platform & Assignee Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Update Status</label>
                    <select
                      value={statusVal}
                      onChange={(e) => setStatusVal(e.target.value as AppTicket["status"])}
                      className="w-full text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                    >
                      <option value="open">Open</option>
                      <option value="waiting_on_user">Waiting on User (Awaiting Response)</option>
                      <option value="planned">Planned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="testing">Testing</option>
                      <option value="completed">Completed</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Update Platform</label>
                    <select
                      value={platformVal}
                      onChange={(e) => setPlatformVal(e.target.value as any)}
                      className="w-full text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                    >
                      <option value="ProspectPlus">ProspectPlus</option>
                      <option value="LocalMile.Plus">LocalMile.Plus</option>
                      <option value="LPO.Plus">LPO.Plus</option>
                      <option value="Website">Website</option>
                    </select>
                  </div>
                </div>

                {/* Developer Commentary */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Developer Notes & Commentary</label>
                  <Textarea
                    placeholder="Provide updates or reasons for status change (visible to all users)..."
                    value={adminNotesVal}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdminNotesVal(val);
                      if (!emailNotesVal || emailNotesVal === adminNotesVal) {
                        setEmailNotesVal(val);
                      }
                    }}
                    className="min-h-[120px] text-sm border-gray-200 focus-visible:ring-[#095c7b]"
                  />
                </div>

                {/* Developer Git/GitHub Integration Section */}
                <div className="space-y-3 pt-3 border-t">
                  <h5 className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">Developer & Git Metadata</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">GitHub Issue #</label>
                      <input
                        type="text"
                        placeholder="e.g. #123"
                        value={githubIssueVal}
                        onChange={(e) => setGithubIssueVal(e.target.value)}
                        className="w-full text-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Git Branch Name</label>
                      <input
                        type="text"
                        placeholder="e.g. feature/app-tickets-..."
                        value={branchNameVal}
                        onChange={(e) => setBranchNameVal(e.target.value)}
                        className="w-full text-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Commit Hash / Code</label>
                      <input
                        type="text"
                        placeholder="e.g. 7fa2bc8"
                        value={commitHashVal}
                        onChange={(e) => setCommitHashVal(e.target.value)}
                        className="w-full text-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                      />
                    </div>
                  </div>
                </div>

                {/* Email Progress Checkbox */}
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sendEmail"
                      checked={sendEmailVal}
                      onChange={(e) => setSendEmailVal(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-[#095c7b] focus:ring-[#095c7b]"
                    />
                    <label htmlFor="sendEmail" className="text-sm font-semibold text-gray-700 cursor-pointer">
                      Send progress update email to requester ({selectedTicket.createdByEmail})
                    </label>
                  </div>

                  {sendEmailVal && (
                    <div className="space-y-3 pl-6 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">CC Email(s)</label>
                        <input
                          type="text"
                          placeholder="e.g. manager@mailplus.com.au, support@mailplus.com.au"
                          value={ccEmailVal}
                          onChange={(e) => setCcEmailVal(e.target.value)}
                          className="w-full text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                        />
                      </div>

                      {/* CC User Selector */}
                      <div className="space-y-2 border rounded-lg p-2.5 bg-gray-50/50">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Select CC Users</label>
                        <input
                          type="text"
                          placeholder="Search users by name or email..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="w-full text-xs rounded-md border border-gray-200 bg-white px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#095c7b] mb-2"
                        />
                        <div className="max-h-[120px] overflow-y-auto space-y-1 pr-1">
                          {users
                            .filter(u => {
                              const query = userSearchQuery.toLowerCase();
                              const name = (u.displayName || "").toLowerCase();
                              const email = (u.email || "").toLowerCase();
                              return name.includes(query) || email.includes(query);
                            })
                            .map(u => {
                              const emailSelected = ccEmailVal.toLowerCase().includes(u.email.toLowerCase());
                              return (
                                <button
                                  type="button"
                                  key={u.uid}
                                  onClick={() => {
                                    const emails = ccEmailVal
                                      ? ccEmailVal.split(",").map(e => e.trim()).filter(Boolean)
                                      : [];
                                    if (!emails.includes(u.email)) {
                                      emails.push(u.email);
                                    }
                                    setCcEmailVal(emails.join(", "));
                                  }}
                                  className={`w-full flex items-center justify-between text-left p-1.5 rounded text-xs transition-colors ${
                                    emailSelected 
                                      ? "bg-[#095c7b]/10 text-[#095c7b] font-semibold" 
                                      : "bg-white hover:bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  <div>
                                    <div>{u.displayName || u.email}</div>
                                    <div className="text-[10px] text-gray-400 font-normal">{u.email}</div>
                                  </div>
                                  <span className="text-[10px] font-bold text-[#095c7b] px-1.5 py-0.5 rounded bg-[#095c7b]/5 border border-[#095c7b]/10">
                                    {emailSelected ? "Added" : "+ Add"}
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Email Notes / Message</label>
                        <Textarea
                          placeholder="Add customized notes to be included in the email (defaults to Developer Notes)..."
                          value={emailNotesVal}
                          onChange={(e) => setEmailNotesVal(e.target.value)}
                          className="min-h-[100px] text-sm border-gray-200 focus-visible:ring-[#095c7b]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedTicket(null)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveChanges}
                className="bg-[#eaf143] text-[#095c7b] hover:bg-[#d8e032] font-semibold"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
