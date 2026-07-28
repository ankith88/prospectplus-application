"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { FullScreenLoader } from "@/components/ui/loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, MessageSquare, AlertCircle, Sparkles, CheckCircle2, XCircle, Clock, Eye, Download, MessageCircle, Pencil, UploadCloud, File, X, Loader2, Save } from "lucide-react";
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

export default function AppTicketsPage() {
  const { userProfile, loading, isSuperAdmin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketId = searchParams.get("ticketId");
  const [tickets, setTickets] = useState<AppTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  
  // Filtering & detail view states
  const [selectedTicket, setSelectedTicket] = useState<AppTicket | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Edit ticket state
  const [editingTicket, setEditingTicket] = useState<AppTicket | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<"feature" | "bug" | "issue" | "feedback">("feature");
  const [editPlatform, setEditPlatform] = useState<"ProspectPlus" | "LocalMile.Plus" | "LPO.Plus" | "Website">("ProspectPlus");
  const [editDescription, setEditDescription] = useState("");
  const [editAttachments, setEditAttachments] = useState<{ name: string; url: string }[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isUploadingEditFiles, setIsUploadingEditFiles] = useState(false);

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

  if (loading || loadingTickets) return <FullScreenLoader message="Loading feedback board..." />;

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
            <Sparkles className="h-3.5 w-3.5" /> Feature Request
          </Badge>
        );
      case "bug":
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50 flex items-center gap-1 font-medium">
            <AlertCircle className="h-3.5 w-3.5" /> Bug Report
          </Badge>
        );
      case "issue":
        return (
          <Badge className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50 flex items-center gap-1 font-medium">
            <MessageSquare className="h-3.5 w-3.5" /> General Issue
          </Badge>
        );
      case "feedback":
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 flex items-center gap-1 font-medium">
            <MessageCircle className="h-3.5 w-3.5" /> General Feedback
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

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#095c7b] flex items-center gap-2">
            Feedback & Ideas Board
          </h2>
          <p className="text-muted-foreground mt-1">
            Request new features, report bugs, or track current app improvements. All users can view and collaborate.
          </p>
        </div>
        <div>
          <Link href="/app-tickets/create">
            <Button className="bg-[#eaf143] text-[#095c7b] hover:bg-[#d8e032] font-semibold shadow-md">
              <PlusCircle className="mr-2 h-4 w-4" />
              Submit Feedback / Bug
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border shadow-sm">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Filters:</span>
        
        <div className="flex flex-wrap gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-sm rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
          >
            <option value="all">All Categories</option>
            <option value="feedback">General Feedback</option>
            <option value="feature">Feature Requests</option>
            <option value="bug">Bug Reports</option>
            <option value="issue">General Issues</option>
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
          Showing {filteredTickets.length} of {tickets.length} tickets
        </div>
      </div>

      {/* Grid List of Tickets */}
      {filteredTickets.length === 0 ? (
        <Card className="border-dashed border-2 py-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="bg-[#095c7b]/5 p-3 rounded-full">
              <MessageSquare className="h-8 w-8 text-[#095c7b]" />
            </div>
            <h3 className="font-semibold text-lg">No tickets found</h3>
            <p className="text-muted-foreground max-w-sm">
              There are no tickets matching your active filters. Try clearing them or submit a new idea/bug report.
            </p>
          </CardContent>
        </Card>
      ) : (
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
                    <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200">
                      {ticket.platform || "ProspectPlus"}
                    </Badge>
                  </div>
                  {getStatusBadge(ticket.status)}
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

      {/* Ticket Details Dialog */}
      <Dialog open={selectedTicket !== null} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        {selectedTicket && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {getTypeBadge(selectedTicket.type)}
                  {getStatusBadge(selectedTicket.status)}
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
                <span>Date: {selectedTicket.createdAt ? new Date(selectedTicket.createdAt.seconds * 1000).toLocaleString() : "N/A"}</span>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
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
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-100 shadow-sm bg-white hover:bg-gray-50 transition-colors"
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
                  <Clock className="h-4 w-4 text-[#095c7b]" /> Admin Responses & Timeline
                </h4>
                
                {selectedTicket.history && selectedTicket.history.length > 0 ? (
                  <div className="space-y-3 pl-2 border-l-2 border-[#095c7b]/20 ml-2">
                    {selectedTicket.history.map((item, idx) => (
                      <div key={idx} className="relative pl-4 space-y-1.5 pb-2">
                        {/* Dot indicator */}
                        <div className="absolute left-[-21px] top-1.5 bg-[#095c7b] h-2.5 w-2.5 rounded-full border-2 border-white shadow-sm" />
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                          <span className="font-semibold text-gray-700">{item.updatedByName}</span>
                          <span>{new Date(item.updatedAt).toLocaleString()}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-gray-500">Status:</span>
                          {getStatusBadge(item.status)}
                        </div>

                        {item.note && (
                          <div className="bg-amber-50/40 border border-amber-100/50 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed shadow-sm">
                            {item.note}
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
                    The superadmin has not reviewed or left commentary on this request yet.
                  </p>
                )}
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
