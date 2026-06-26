"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { FullScreenLoader } from "@/components/ui/loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, AlertCircle, Sparkles, CheckCircle2, Clock, Eye, Download, Save, Filter, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";

interface AppTicket {
  id: string;
  title: string;
  type: "feature" | "bug" | "issue" | "feedback";
  description: string;
  status: "open" | "planned" | "in_progress" | "completed" | "declined";
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: any;
  updatedAt?: any;
  attachments?: { name: string; url: string }[];
  adminNotes?: string;
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

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
  };

  const handleSaveChanges = async () => {
    if (!selectedTicket) return;

    setIsSaving(true);
    try {
      const ticketRef = doc(db, "app_tickets", selectedTicket.id);
      await updateDoc(ticketRef, {
        status: statusVal,
        adminNotes: adminNotesVal.trim(),
        updatedAt: serverTimestamp()
      });

      toast.success("Ticket updated successfully.");
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
                    onChange={(e) => setAdminNotesVal(e.target.value)}
                    className="min-h-[120px] text-sm border-gray-200 focus-visible:ring-[#095c7b]"
                  />
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
