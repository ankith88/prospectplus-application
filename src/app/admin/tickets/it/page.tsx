"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter } from "next/navigation";
import { FullScreenLoader } from "@/components/ui/loader";
import { collection, query, orderBy, onSnapshot, addDoc, getDocs } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";
import Link from "next/link";
import { Search, RefreshCw, Plus, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export default function ITTicketsPage() {
  const { userProfile, loading } = useAuth();
  const { canView } = usePermissions();
  const router = useRouter();

  // Data states
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "Open", "Investigating", "Resolved"
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newType, setNewType] = useState("System issue");
  const [newLinkedTicket, setNewLinkedTicket] = useState("");
  const [newPriority, setNewPriority] = useState("STANDARD");
  const [newDescription, setNewDescription] = useState("");

  // Load tickets
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

    // Subscribe to IT tickets
    const q = query(collection(db, "it_tickets"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial mock data from screenshot
        const mockData = [
          {
            ticketId: "#IT-0088",
            type: "System issue",
            linkedTrackingTicket: "#MPS-29840",
            description: "Scan data missing from depot run",
            status: "Investigating",
            priority: "HIGH",
            raised: "21 Jun - auto-escalated",
            createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            ticketId: "#IT-0085",
            type: "Access request",
            linkedTrackingTicket: "—",
            description: "New agent onboarding — portal access",
            status: "Resolved",
            priority: "STANDARD",
            raised: "19 Jun - manual",
            createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];

        // Seed to Firestore
        for (const item of mockData) {
          await addDoc(collection(db, "it_tickets"), item);
        }
      } else {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTickets(data);
        setLoadingTickets(false);
      }
    });

    return () => unsubscribe();
  }, [userProfile, loading, router]);

  // Unique types for filters
  const uniqueTypes = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach(t => { if (t.type) set.add(t.type); });
    return Array.from(set).sort();
  }, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesSearch =
        (t.ticketId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.type || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.linkedTrackingTicket || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.priority || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesType && matchesPriority;
    });
  }, [tickets, searchQuery, statusFilter, typeFilter, priorityFilter]);

  // Raise IT Ticket Handler
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Get count to generate ID
      const snap = await getDocs(collection(db, "it_tickets"));
      const nextNum = 89 + snap.size;
      const formattedId = `#IT-${String(nextNum).padStart(4, "0")}`;

      const todayDate = new Date();
      const raisedFormatted = todayDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short"
      }) + " - manual";

      await addDoc(collection(db, "it_tickets"), {
        ticketId: formattedId,
        type: newType,
        linkedTrackingTicket: newLinkedTicket.trim() || "—",
        description: newDescription.trim(),
        status: "Open",
        priority: newPriority,
        raised: raisedFormatted,
        createdAt: new Date().toISOString()
      });

      toast.success("IT ticket created successfully");
      setIsModalOpen(false);
      // Reset form
      setNewType("System issue");
      setNewLinkedTicket("");
      setNewPriority("STANDARD");
      setNewDescription("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create IT ticket");
    }
  };

  if (loading || !userProfile || loadingTickets) {
    return <FullScreenLoader message="Loading IT Tickets..." />;
  }

  return (
    <div className="min-h-screen bg-[#d0dfcd] flex-1 flex flex-col p-4 md:p-8 font-['Inter']">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        
        {/* Navigation back and header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin/tickets">
              <button className="p-2 hover:bg-black/5 rounded-full text-[#095c7b] transition-colors">
                <ChevronLeft className="h-6 w-6" />
              </button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#095c7b]">IT Tickets</h1>
              <p className="text-sm text-[#095c7b]/80">Manage system issues, hardware, software access, and technical escalations.</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#095c7b] hover:bg-[#053647] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" /> Raise IT Ticket
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#095c7b]/10 text-slate-700 text-sm leading-relaxed">
          IT tickets cover <strong>system issues, hardware requests, software access, and technical escalations</strong>. They can be raised directly here or escalated automatically from a tracking ticket (e.g. a scanning or system error discovered during investigation).
        </div>

        {/* Search and Filters Bar */}
        <div className="flex flex-col md:flex-row items-center gap-4 bg-white/70 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white/50">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#095c7b]/60" />
            <input
              type="text"
              placeholder="Search IT tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c7b] bg-white text-slate-800 text-sm placeholder-slate-400"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-semibold text-[#095c7b] uppercase tracking-wider whitespace-nowrap">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 text-xs rounded-lg border border-slate-200 bg-white text-[#095c7b] font-medium outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Investigating">Investigating</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-semibold text-[#095c7b] uppercase tracking-wider whitespace-nowrap">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="p-2 text-xs rounded-lg border border-slate-200 bg-white text-[#095c7b] font-medium outline-none"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-semibold text-[#095c7b] uppercase tracking-wider whitespace-nowrap">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="p-2 text-xs rounded-lg border border-slate-200 bg-white text-[#095c7b] font-medium outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="STANDARD">STANDARD</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#095c7b]/5 border-b border-[#095c7b]/10">
                  <th className="p-4 text-[10px] font-bold text-[#095c7b] uppercase tracking-wider">Ticket</th>
                  <th className="p-4 text-[10px] font-bold text-[#095c7b] uppercase tracking-wider">Type</th>
                  <th className="p-4 text-[10px] font-bold text-[#095c7b] uppercase tracking-wider">Linked Tracking Ticket</th>
                  <th className="p-4 text-[10px] font-bold text-[#095c7b] uppercase tracking-wider">Description</th>
                  <th className="p-4 text-[10px] font-bold text-[#095c7b] uppercase tracking-wider">Status</th>
                  <th className="p-4 text-[10px] font-bold text-[#095c7b] uppercase tracking-wider">Priority</th>
                  <th className="p-4 text-[10px] font-bold text-[#095c7b] uppercase tracking-wider">Raised</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-[#095c7b]">{t.ticketId}</td>
                      <td className="p-4 font-medium">{t.type}</td>
                      <td className="p-4 font-mono text-slate-600">
                        {t.linkedTrackingTicket && t.linkedTrackingTicket !== "—" ? (
                          <Link href={`/admin/tickets/${t.linkedTrackingTicket.replace("#", "")}`} className="text-[#095c7b] hover:underline">
                            {t.linkedTrackingTicket}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-4 max-w-xs truncate">{t.description || "—"}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          t.status === "Resolved" ? "bg-green-100 text-green-800" :
                          t.status === "Investigating" ? "bg-blue-100 text-blue-800" :
                          "bg-amber-100 text-amber-800"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-4 font-bold">
                        <span className={`${
                          t.priority === "URGENT" ? "text-red-600" :
                          t.priority === "HIGH" ? "text-orange-600" :
                          "text-slate-500"
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500">{t.raised}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No IT tickets found matching current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Dialog for raising IT Ticket */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="p-6 bg-[#095c7b] text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Raise IT Ticket</h2>
                <p className="text-xs text-white/80">Log systems, hardware, or access requests.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-white/85 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Ticket Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                >
                  <option value="System issue">System issue</option>
                  <option value="Access request">Access request</option>
                  <option value="Hardware request">Hardware request</option>
                  <option value="Software access">Software access</option>
                  <option value="Technical escalation">Technical escalation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Linked Tracking Ticket (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. #MPS-29840"
                  value={newLinkedTicket}
                  onChange={(e) => setNewLinkedTicket(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                >
                  <option value="STANDARD">STANDARD</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Description / Notes</label>
                <textarea
                  placeholder="Details of the IT / system issue..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#095c7b] h-28 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-[#095c7b] hover:bg-[#053647] rounded-lg font-semibold shadow-sm transition-colors"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
