"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter } from "next/navigation";
import { FullScreenLoader } from "@/components/ui/loader";
import { collection, query, orderBy, onSnapshot, addDoc, getDocs } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";
import { getAllUsers } from "@/services/firebase";
import Link from "next/link";
import { Search, RefreshCw, Plus, ChevronLeft, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

export default function OperationsTicketsPage() {
  const { userProfile, loading } = useAuth();
  const { canView } = usePermissions();
  const router = useRouter();

  // Data states
  const [tickets, setTickets] = useState<any[]>([]);
  const [csUsers, setCsUsers] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "Open", "Investigating", "Closed"
  const [typeFilter, setTypeFilter] = useState("all");
  const [depotFilter, setDepotFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newType, setNewType] = useState("Missed sweep");
  const [newLinkedTicket, setNewLinkedTicket] = useState("");
  const [newDepot, setNewDepot] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Load tickets and users
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

    // Subscribe to operations tickets
    const q = query(collection(db, "operations_tickets"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial mock data from screenshot
        const mockData = [
          {
            ticketId: "#OPS-0041",
            type: "Missed sweep",
            linkedTrackingTicket: "#MPS-29841",
            depot: "Botany Depot",
            status: "Investigating",
            assignee: "Greg M.",
            raised: "22 Jun - auto-escalated",
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            description: "Missed sweep escalated from tracking."
          },
          {
            ticketId: "#OPS-0039",
            type: "Banking issue",
            linkedTrackingTicket: "—",
            depot: "Westfield Depot",
            status: "Open",
            assignee: "Michael T.",
            raised: "20 Jun - manual",
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            description: "Banking reconciliation issue at Westfield Depot."
          },
          {
            ticketId: "#OPS-0037",
            type: "Operational call log",
            linkedTrackingTicket: "—",
            depot: "—",
            status: "Closed",
            assignee: "Greg M.",
            raised: "18 Jun - manual",
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            description: "Routine depot operations log check."
          }
        ];

        // Seed to Firestore
        for (const item of mockData) {
          await addDoc(collection(db, "operations_tickets"), item);
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

    // Load users
    async function loadUsers() {
      try {
        const users = await getAllUsers();
        setCsUsers(users);
      } catch (err) {
        console.error("Failed to load users:", err);
      }
    }
    loadUsers();

    return () => unsubscribe();
  }, [userProfile, loading, router]);

  // Unique types and depots for filters
  const uniqueTypes = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach(t => { if (t.type) set.add(t.type); });
    return Array.from(set).sort();
  }, [tickets]);

  const uniqueDepots = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach(t => { if (t.depot && t.depot !== "—") set.add(t.depot); });
    return Array.from(set).sort();
  }, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesSearch =
        (t.ticketId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.type || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.linkedTrackingTicket || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.depot || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.assignee || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      const matchesDepot = depotFilter === "all" || t.depot === depotFilter;
      const matchesAssignee = assigneeFilter === "all" || t.assignee === assigneeFilter;

      return matchesSearch && matchesStatus && matchesType && matchesDepot && matchesAssignee;
    });
  }, [tickets, searchQuery, statusFilter, typeFilter, depotFilter, assigneeFilter]);

  // Raise Ticket Handler
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const selectedUserObj = csUsers.find(u => u.uid === newAssignee || u.displayName === newAssignee);
      const assigneeName = selectedUserObj?.displayName || selectedUserObj?.email || newAssignee || "Unassigned";

      // Get count to generate ID
      const snap = await getDocs(collection(db, "operations_tickets"));
      const nextNum = 42 + snap.size;
      const formattedId = `#OPS-${String(nextNum).padStart(4, "0")}`;

      const todayDate = new Date();
      const raisedFormatted = todayDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short"
      }) + " - manual";

      await addDoc(collection(db, "operations_tickets"), {
        ticketId: formattedId,
        type: newType,
        linkedTrackingTicket: newLinkedTicket.trim() || "—",
        depot: newDepot.trim() || "—",
        status: "Open",
        assignee: assigneeName,
        raised: raisedFormatted,
        createdAt: new Date().toISOString(),
        description: newDescription
      });

      toast.success("Operations ticket created successfully");
      setIsModalOpen(false);
      // Reset form
      setNewType("Missed sweep");
      setNewLinkedTicket("");
      setNewDepot("");
      setNewAssignee("");
      setNewDescription("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create ticket");
    }
  };

  if (loading || !userProfile || loadingTickets) {
    return <FullScreenLoader message="Loading Operations Tickets..." />;
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
              <h1 className="text-3xl font-bold tracking-tight text-[#095c7b]">Operations Tickets</h1>
              <p className="text-sm text-[#095c7b]/80">Manage internal operational matters, sweeps, depot issues and calls.</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#095c7b] hover:bg-[#053647] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" /> Raise Operations Ticket
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#095c7b]/10 text-slate-700 text-sm leading-relaxed">
          Operations tickets cover <strong>internal operational matters</strong> — missed sweeps (escalated from tracking), banking issues, driver incidents, depot operational calls, and management log items. They can be raised directly here or escalated automatically from a tracking ticket.
        </div>

        {/* Search and Filters Bar */}
        <div className="flex flex-col md:flex-row items-center gap-4 bg-white/70 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white/50">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#095c7b]/60" />
            <input
              type="text"
              placeholder="Search ops tickets..."
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
              <option value="Closed">Closed</option>
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

          {/* Depot filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-semibold text-[#095c7b] uppercase tracking-wider whitespace-nowrap">Depot:</span>
            <select
              value={depotFilter}
              onChange={(e) => setDepotFilter(e.target.value)}
              className="p-2 text-xs rounded-lg border border-slate-200 bg-white text-[#095c7b] font-medium outline-none"
            >
              <option value="all">All Depots</option>
              {uniqueDepots.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Assignee filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-semibold text-[#095c7b] uppercase tracking-wider whitespace-nowrap">Assignee:</span>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="p-2 text-xs rounded-lg border border-slate-200 bg-white text-[#095c7b] font-medium outline-none"
            >
              <option value="all">All Assignees</option>
              {csUsers.map(u => <option key={u.uid} value={u.displayName || u.email}>{u.displayName || u.email}</option>)}
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
                  <th className="p-4 text-[10px] font-bold text-[#095c7b] uppercase tracking-wider">Depot</th>
                  <th className="p-4 text-[10px] font-bold text-[#095c7b] uppercase tracking-wider">Status</th>
                  <th className="p-4 text-[10px] font-bold text-[#095c7b] uppercase tracking-wider">Assignee</th>
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
                      <td className="p-4">{t.depot || "—"}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          t.status === "Closed" ? "bg-green-100 text-green-800" :
                          t.status === "Investigating" ? "bg-blue-100 text-blue-800" :
                          "bg-amber-100 text-amber-800"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-900">{t.assignee}</td>
                      <td className="p-4 text-xs text-slate-500">{t.raised}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No operational tickets found matching current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Dialog for raising Operations Ticket */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="p-6 bg-[#095c7b] text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Raise Operations Ticket</h2>
                <p className="text-xs text-white/80">Log internal operational matters or depot escalations.</p>
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
                  <option value="Missed sweep">Missed sweep</option>
                  <option value="Banking issue">Banking issue</option>
                  <option value="Operational call log">Operational call log</option>
                  <option value="Driver incident">Driver incident</option>
                  <option value="Management log item">Management log item</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Linked Tracking Ticket (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. #MPS-29841"
                  value={newLinkedTicket}
                  onChange={(e) => setNewLinkedTicket(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Depot / Branch</label>
                <input
                  type="text"
                  placeholder="e.g. Botany Depot"
                  value={newDepot}
                  onChange={(e) => setNewDepot(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Assignee</label>
                <select
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                  required
                >
                  <option value="">Select Assignee...</option>
                  {csUsers.map((u) => (
                    <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Description / Notes</label>
                <textarea
                  placeholder="Details of the operational issue..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#095c7b] h-24 resize-none"
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
