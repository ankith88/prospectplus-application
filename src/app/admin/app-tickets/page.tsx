"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FullScreenLoader } from "@/components/ui/loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  PieChart as LucidePieChart
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
import { firestore as db } from "@/lib/firebase";

interface AppTicket {
  id: string;
  title: string;
  type: "feature" | "bug" | "issue" | "feedback";
  description: string;
  status: "open" | "planned" | "in_progress" | "testing" | "completed" | "declined";
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: any;
  updatedAt?: any;
  attachments?: { name: string; url: string }[];
  adminNotes?: string;
  history?: {
    status: AppTicket["status"];
    note: string;
    updatedAt: string;
    updatedByName: string;
    emailSent?: boolean;
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
  const [adminNotesVal, setAdminNotesVal] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [sendEmailVal, setSendEmailVal] = useState(false);
  const [emailNotesVal, setEmailNotesVal] = useState("");
  const [ccEmailVal, setCcEmailVal] = useState("ankith.ravindran@mailplus.com.au");

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [showReports, setShowReports] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    setAdminNotesVal(ticket.adminNotes || "");
    setSendEmailVal(false);
    setEmailNotesVal(ticket.adminNotes || "");
    setCcEmailVal("ankith.ravindran@mailplus.com.au");
  };

  const handleSaveChanges = async () => {
    if (!selectedTicket) return;

    setIsSaving(true);
    try {
      const ticketRef = doc(db, "app_tickets", selectedTicket.id);
      
      const newHistoryItem = {
        status: statusVal,
        note: adminNotesVal.trim(),
        updatedAt: new Date().toISOString(),
        updatedByName: userProfile?.displayName || userProfile?.email || "Admin",
        emailSent: sendEmailVal
      };

      const updatedHistory = selectedTicket.history ? [...selectedTicket.history, newHistoryItem] : [newHistoryItem];

      await updateDoc(ticketRef, {
        status: statusVal,
        adminNotes: adminNotesVal.trim(),
        updatedAt: serverTimestamp(),
        history: updatedHistory
      });

      if (sendEmailVal) {
        const statusLabelMap: Record<string, string> = {
          open: "Open",
          planned: "Planned",
          in_progress: "In Progress",
          testing: "Testing",
          completed: "Completed",
          declined: "Declined"
        };
        const statusColorMap: Record<string, string> = {
          open: "#3b82f6",
          planned: "#a855f7",
          in_progress: "#f59e0b",
          testing: "#0891b2",
          completed: "#10b981",
          declined: "#f43f5e"
        };
        const statusLabel = statusLabelMap[statusVal] || statusVal;
        const statusColor = statusColorMap[statusVal] || "#64748b";

        const emailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #095c7b; margin-top: 0; font-size: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">Ticket Progress Update</h2>
  <p>Hi <strong>${selectedTicket.createdByName}</strong>,</p>
  <p>We wanted to let you know that there is an update on your request "<strong>${selectedTicket.title}</strong>".</p>
  
  <div style="margin: 20px 0; padding: 15px; background-color: #f8fafc; border-left: 4px solid #095c7b; border-radius: 4px; border-top: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
    <p style="margin: 0 0 10px 0;"><strong>Current Status:</strong> <span style="background-color: ${statusColor}15; color: ${statusColor}; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 13px; text-transform: uppercase;">${statusLabel}</span></p>
    ${emailNotesVal.trim() ? `<p style="margin: 0;"><strong>Notes / Progress details:</strong><br /><span style="color: #475569; font-size: 14px;">${emailNotesVal.trim().replace(/\n/g, '<br />')}</span></p>` : ''}
  </div>

  <p style="font-size: 14px; color: #475569;">You can view the full history and details on the Feedback & Ideas Board by clicking the button below:</p>
  
  <div style="text-align: center; margin: 25px 0;">
    <a href="${window.location.origin}/app-tickets?ticketId=${selectedTicket.id}" 
       style="background-color: #095c7b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px; box-shadow: 0 2px 4px rgba(9, 92, 123, 0.1);">
       View on Feedback & Ideas Board
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
            subject: `[Progress Update] ${selectedTicket.title}`,
            html: emailHtml,
            customFrom: "ankith.ravindran@mailplus.com.au",
            cc: ccEmailVal,
          }),
        });

        const emailRes = await response.json();
        if (!emailRes.success) {
          console.error("Failed to send update email:", emailRes.message);
          toast.warning("Ticket updated, but progress email failed: " + emailRes.message);
        } else {
          toast.success("Progress update email sent successfully!");
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

  if (loading || loadingTickets) return <FullScreenLoader message="Loading admin board..." />;

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

  const filteredTickets = tickets.filter(ticket => {
    const matchesType = typeFilter === "all" || ticket.type === typeFilter;
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    return matchesType && matchesStatus;
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
  const openTicketsCount = tickets.filter(t => t.status === "open").length;
  const activeTicketsCount = tickets.filter(t => ["open", "planned", "in_progress", "testing"].includes(t.status)).length;
  const completedTicketsCount = tickets.filter(t => t.status === "completed").length;
  const bugTicketsCount = tickets.filter(t => t.type === "bug").length;

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
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200/60 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Total Tickets</p>
                  <p className="text-3xl font-extrabold text-[#095c7b] mt-1">{totalTicketsCount}</p>
                </div>
                <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200/60 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Active Tickets</p>
                  <p className="text-3xl font-extrabold text-[#095c7b] mt-1">{activeTicketsCount}</p>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200/60 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Bug Reports</p>
                  <p className="text-3xl font-extrabold text-[#095c7b] mt-1">{bugTicketsCount}</p>
                </div>
                <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200/60 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Completed</p>
                  <p className="text-3xl font-extrabold text-[#095c7b] mt-1">{completedTicketsCount}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200/60 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Open Status</p>
                  <p className="text-3xl font-extrabold text-[#095c7b] mt-1">{openTicketsCount}</p>
                </div>
                <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl">
                  <Sparkles className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown & Category Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
            </div>

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
            <Card className="shadow-sm border bg-white overflow-hidden flex flex-col lg:col-span-2">
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

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="testing">Testing</option>
            <option value="completed">Completed</option>
            <option value="declined">Declined</option>
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
          <CardDescription>Click View/Edit on any ticket to update its status or add developer notes.</CardDescription>
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
                    <th className="px-6 py-4">Submitted By</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 max-w-[280px] truncate" title={ticket.title}>
                        {ticket.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTypeBadge(ticket.type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{ticket.createdByName}</span>
                          <span className="text-xs text-muted-foreground">{ticket.createdByEmail}</span>
                        </div>
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
              </div>
              <DialogTitle className="text-2xl font-extrabold text-[#095c7b] leading-tight">
                Manage Request: {selectedTicket.title}
              </DialogTitle>
              <div className="text-xs text-muted-foreground flex flex-wrap gap-2 pt-1.5">
                <span>Submitted by: <strong>{selectedTicket.createdByName}</strong> ({selectedTicket.createdByEmail})</span>
                <span>•</span>
                <span>Date: {selectedTicket.createdAt ? new Date(selectedTicket.createdAt.seconds * 1000).toLocaleString() : "N/A"}</span>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* User Description */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">User Details / Commentary</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border border-gray-100">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Attachments */}
              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">User Attachments</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedTicket.attachments.map((file, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white"
                      >
                        <span className="text-xs font-medium truncate max-w-[180px]">{file.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 bg-[#095c7b]/10 text-[#095c7b] hover:bg-[#095c7b]/20 rounded-md transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                          <a 
                            href={file.url} 
                            download 
                            className="p-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
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
                          <span className="font-semibold text-gray-700">{item.updatedByName}</span>
                          <span>{new Date(item.updatedAt).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-gray-500">Status changed to:</span>
                          {getStatusBadge(item.status)}
                          {item.emailSent && (
                            <span className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                              ✉ Email Update Sent
                            </span>
                          )}
                        </div>
                        {item.note && (
                          <div className="bg-white rounded border border-gray-100 p-2 text-sm text-gray-700 whitespace-pre-wrap">
                            {item.note}
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
                
                {/* Status Dropdown */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Update Status</label>
                  <select
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value as AppTicket["status"])}
                    className="w-full text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                  >
                    <option value="open">Open</option>
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="testing">Testing</option>
                    <option value="completed">Completed</option>
                    <option value="declined">Declined</option>
                  </select>
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
