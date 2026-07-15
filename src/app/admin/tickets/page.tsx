"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter } from "next/navigation";
import { FullScreenLoader } from "@/components/ui/loader";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";
import { getAllUsers } from "@/services/firebase";
import { BulkUploadDialog } from "./components/bulk-upload-dialog";
import Link from "next/link";
import { PlusCircle, FileSpreadsheet, Search, RefreshCw } from "lucide-react";

export default function TicketsListPage() {
  const { userProfile, loading } = useAuth();
  const { canView } = usePermissions();
  const router = useRouter();
  
  // Data states
  const [tickets, setTickets] = useState<any[]>([]);
  const [csUsers, setCsUsers] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // Filters and views states
  const [activeStatusTab, setActiveStatusTab] = useState<string>("All active"); // "All active", "Open", "Investigating", "Awaiting Ops", "Awaiting Customer", "Archive"
  const [savedView, setSavedView] = useState<string>("None"); // "My open tickets", "Unassigned", "Breached SLA", "FreightSafe eligible", "None"
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [showStatusFilterChip, setShowStatusFilterChip] = useState<boolean>(false); // For "Status: New + Investigating" chip in mockup

  // Fetch tickets and users
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

    // Subscribe to tickets
    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTickets(ticketsData);
      setLoadingTickets(false);
    });

    // Load users
    async function loadUsers() {
      try {
        const users = await getAllUsers();
        const cs = users.filter((u) => {
          const hasCsInAssigned = u.assignedRoles?.some(
            (r: string) =>
              r.toLowerCase() === "customer service" ||
              r.toLowerCase() === "customer success"
          );
          const isCsDefault =
            u.defaultRole?.toLowerCase() === "customer service" ||
            u.defaultRole?.toLowerCase() === "customer success";
          const isCsRole =
            u.role?.toLowerCase() === "customer service" ||
            u.role?.toLowerCase() === "customer success";
          return hasCsInAssigned || isCsDefault || isCsRole;
        });
        setCsUsers(cs);
      } catch (err) {
        console.error("Failed to load customer service users:", err);
      }
    }
    loadUsers();

    return () => unsubscribe();
  }, [userProfile, loading, router]);

  // SLA State Helper
  const getSlaState = (ticket: any) => {
    const isPaused = ticket.status === "Awaiting Operations" || ticket.status === "Awaiting IT" || ticket.status === "Closed" || ticket.status === "Resolved" || ticket.status === "Lost in Transit" || ticket.status === "Damaged";
    if (isPaused) {
      return { color: "green", label: "Resolved / Paused" };
    }

    const lastUpdate = ticket.updatedAt || ticket.createdAt;
    const time = lastUpdate?.toDate
      ? lastUpdate.toDate()
      : lastUpdate
      ? new Date(lastUpdate)
      : null;

    if (!time || isNaN(time.getTime())) {
      return { color: "green", label: "Within SLA" };
    }

    const diffMs = Date.now() - time.getTime();
    const ageHours = diffMs / (1000 * 60 * 60);

    if (ageHours > 24) {
      return { color: "red", label: "Breached (no activity > 24h)" };
    } else if (ageHours > 12) {
      return { color: "amber", label: "Approaching SLA (>12h)" };
    }
    return { color: "green", label: "Within SLA" };
  };

  // Age Formatting Helper
  const formatAge = (createdAt: any) => {
    const created = createdAt?.toDate
      ? createdAt.toDate()
      : createdAt
      ? new Date(createdAt)
      : null;
    if (!created || isNaN(created.getTime())) return "1h";
    const diffMs = Date.now() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      return `${Math.max(1, diffHours)}h`;
    }
    const days = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  // Last Update Formatting Helper
  const formatLastUpdate = (updatedAt: any, createdAt: any) => {
    const time = updatedAt || createdAt;
    const date = time?.toDate
      ? time.toDate()
      : time
      ? new Date(time)
      : null;
    if (!date || isNaN(date.getTime())) return "1h ago";
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 60) {
      return `${Math.max(1, diffMinutes)}m ago`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Dynamic Statistics Calculations
  const stats = useMemo(() => {
    let openCount = 0;
    let breachedCount = 0;
    let dueSoonCount = 0;
    let resolvedTodayCount = 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    tickets.forEach((t) => {
      const isClosed = t.status === "Resolved" || t.status === "Closed" || t.status === "Lost in Transit" || t.status === "Damaged";
      
      // Open tickets count
      if (!isClosed) {
        openCount++;
        
        // SLA Statuses
        const sla = getSlaState(t);
        if (sla.color === "red") {
          breachedCount++;
        } else if (sla.color === "amber") {
          dueSoonCount++;
        }
      }

      // Resolved today calculation
      if (isClosed) {
        const updatedDate = t.updatedAt?.toDate
          ? t.updatedAt.toDate()
          : t.updatedAt
          ? new Date(t.updatedAt)
          : t.createdAt?.toDate
          ? t.createdAt.toDate()
          : null;
        if (updatedDate && updatedDate >= startOfToday) {
          resolvedTodayCount++;
        }
      }
    });

    return {
      open: openCount,
      breached: breachedCount,
      dueSoon: dueSoonCount,
      resolvedToday: resolvedTodayCount,
    };
  }, [tickets]);

  // Main Filtering Logic
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // 0. Hide child tickets from the dashboard list unless we are performing a text search
      if (!searchQuery.trim() && t.parentTicketId) {
        return false;
      }

      const isClosed = t.status === "Resolved" || t.status === "Closed" || t.status === "Lost in Transit" || t.status === "Damaged";

      // 1. Active vs Archive / Status Tabs
      if (activeStatusTab === "Archive") {
        if (!isClosed) return false;
      } else {
        // Active views should omit Resolved/Closed
        if (isClosed) return false;

        if (activeStatusTab === "Open" && t.status !== "Open") return false;
        if (activeStatusTab === "Investigating" && t.status !== "Investigating") return false;
        if (
          activeStatusTab === "Awaiting Ops" &&
          t.status !== "Awaiting Operations"
        )
          return false;
        if (
          activeStatusTab === "Awaiting Customer" &&
          t.status !== "Awaiting Customer"
        )
          return false;
      }

      // 2. Saved Views Filter
      if (savedView === "My open tickets" && userProfile) {
        const assignedLower = (t.assignedUser || "").toLowerCase();
        const userEmailLower = (userProfile.email || "").toLowerCase();
        const userNameLower = (userProfile.displayName || "").toLowerCase();
        if (
          assignedLower !== userEmailLower &&
          assignedLower !== userNameLower &&
          t.assignedUser !== userProfile.uid
        ) {
          return false;
        }
      }
      if (savedView === "Unassigned") {
        if (t.assignedUser && t.assignedUser.toLowerCase() !== "unassigned") {
          return false;
        }
      }
      if (savedView === "Breached SLA") {
        if (getSlaState(t).color !== "red") return false;
      }
      if (savedView === "FreightSafe eligible") {
        if (t.freightSafeEligible !== true) return false;
      }

      // 3. Search Barcode, ticket #, customer, reference, connote number
      if (searchQuery.trim() !== "") {
        const queryLower = searchQuery.toLowerCase();
        const cleanQuery = queryLower.startsWith("#") ? queryLower.slice(1) : queryLower;
        const ticketId = (t.id || "").toLowerCase();
        const ticketNum = (t.ticketNumber || "").toLowerCase();
        const barcode = (t.trackingIdentifier || "").toLowerCase();
        const connote = (t.connoteNumber || "").toLowerCase();
        const customer = (t.customerName || t.customerCompany || "").toLowerCase();
        const reference = (t.description || "").toLowerCase();
        
        if (
          !ticketId.includes(queryLower) &&
          !ticketId.includes(cleanQuery) &&
          !ticketNum.includes(queryLower) &&
          !ticketNum.includes(cleanQuery) &&
          !barcode.includes(queryLower) &&
          !connote.includes(queryLower) &&
          !customer.includes(queryLower) &&
          !reference.includes(queryLower)
        ) {
          return false;
        }
      }

      // 4. Status Filter Chip (Status: New + Investigating)
      if (showStatusFilterChip && activeStatusTab === "All active") {
        const isNewOrInv = t.status === "New" || t.status === "Investigating";
        if (!isNewOrInv) return false;
      }

      // 5. Select dropdowns
      if (selectedPriority !== "all" && (t.priority || "Standard") !== selectedPriority) {
        return false;
      }
      if (selectedAssignee !== "all" && t.assignedUser !== selectedAssignee) {
        return false;
      }

      return true;
    });
  }, [tickets, activeStatusTab, savedView, searchQuery, showStatusFilterChip, selectedPriority, selectedAssignee, userProfile]);

  if (loading || loadingTickets) return <FullScreenLoader message="Loading CRM tickets..." />;

  return (
    <div className="min-h-screen bg-[#D7E3D2] text-[#0E3D3B] font-sans p-6 md:p-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#C3D2C2] pb-6 gap-4">
        <div>
          <div className="text-[10px] font-mono tracking-wider text-[#5E706A] uppercase mb-1">
            HOME / TICKETS
          </div>
          <h1 className="text-3xl font-bold font-serif tracking-tight text-[#0E3D3B]">
            {activeStatusTab === "Archive" ? "Archived tickets" : "Active tickets"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBulkUpload(true)}
            className="inline-flex items-center gap-2 bg-white text-[#0E3D3B] border border-[#C3D2C2] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#EAF1E7] transition-all shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-[#1A5A55]" /> Bulk upload
          </button>
          <Link href="/admin/tickets/create">
            <button className="inline-flex items-center gap-2 bg-[#E6F30B] hover:bg-[#D6E309] text-[#0E3D3B] px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm">
              <PlusCircle className="h-4 w-4" /> New ticket
            </button>
          </Link>
        </div>
      </div>

      {/* ACTIVE STATUS TABS */}
      <div className="flex flex-wrap gap-2 mt-6">
        {[
          { id: "All active", label: "All Tickets" },
          { id: "Open", label: "🔵 Open" },
          { id: "Investigating", label: "🔍 Investigating" },
          { id: "Awaiting Ops", label: "⏳ Awaiting Ops" },
          { id: "Awaiting Customer", label: "💬 Awaiting Customer" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveStatusTab(tab.id);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              activeStatusTab === tab.id
                ? "bg-[#0E3D3B] text-white border-[#0E3D3B]"
                : "bg-white text-[#5E706A] border-[#D7E2D5] hover:border-[#1A5A55]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-2xl p-5 border border-[#D7E2D5] shadow-sm">
          <div className="text-3xl font-extrabold text-[#0E3D3B] font-serif">
            {stats.open}
          </div>
          <div className="text-xs text-[#5E706A] mt-1 font-medium">Open tickets</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#D7E2D5] shadow-sm">
          <div className="text-3xl font-extrabold text-[#E5484D] font-serif">
            {stats.breached}
          </div>
          <div className="text-xs text-[#5E706A] mt-1 font-medium">
            SLA breached (Red)
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#D7E2D5] shadow-sm">
          <div className="text-3xl font-extrabold text-[#E0A100] font-serif">
            {stats.dueSoon}
          </div>
          <div className="text-xs text-[#5E706A] mt-1 font-medium">
            Due soon (Amber)
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#D7E2D5] shadow-sm">
          <div className="text-3xl font-extrabold text-[#3DA14B] font-serif">
            {stats.resolvedToday}
          </div>
          <div className="text-xs text-[#5E706A] mt-1 font-medium">
            Resolved today
          </div>
        </div>
      </div>



      {/* SAVED VIEWS */}
      {activeStatusTab !== "Archive" && (
        <div className="flex flex-wrap gap-2 mt-6">
          {[
            { id: "My open tickets", label: "My open tickets" },
            { id: "Unassigned", label: "Unassigned" },
            { id: "Breached SLA", label: "Breached SLA" },
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setSavedView(savedView === view.id ? "None" : view.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
                savedView === view.id
                  ? "bg-[#0E3D3B] text-white border-[#0E3D3B]"
                  : "bg-white text-[#5E706A] border-[#D7E2D5] hover:bg-[#EAF1E7]"
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      )}

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col md:flex-row gap-3 mt-4 items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#5E706A]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#D7E2D5] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0E3D3B] text-[#0E3D3B] placeholder-[#93A49B]"
            placeholder="Search barcode, connote #, ticket #, customer, reference…"
          />
        </div>

        {/* Dynamic Status Chip */}
        {showStatusFilterChip && activeStatusTab === "All active" && (
          <span className="inline-flex items-center gap-1.5 bg-[#E2EFF1] border border-[#B7D6E2] text-[#0E4D5B] text-xs font-semibold px-3 py-2 rounded-xl shrink-0 shadow-sm">
            Status: New + Investigating
            <button
              onClick={() => setShowStatusFilterChip(false)}
              className="text-[#5E706A] hover:text-[#0E3D3B] font-bold text-[10px]"
            >
              ✕
            </button>
          </span>
        )}

        {/* Priority Select */}
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="bg-white border border-[#D7E2D5] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none text-[#5E706A]"
        >
          <option value="all">Priority: All</option>
          <option value="Standard">Standard</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>

        {/* Assignee Select */}
        <select
          value={selectedAssignee}
          onChange={(e) => setSelectedAssignee(e.target.value)}
          className="bg-white border border-[#D7E2D5] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none text-[#5E706A]"
        >
          <option value="all">Assignee: All</option>
          {csUsers.map((u) => (
            <option key={u.uid} value={u.displayName || u.email}>
              {u.displayName || u.email}
            </option>
          ))}
        </select>

        {/* Reset Filters button */}
        {(searchQuery ||
          selectedPriority !== "all" ||
          selectedAssignee !== "all" ||
          !showStatusFilterChip) && (
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedPriority("all");
              setSelectedAssignee("all");
              setShowStatusFilterChip(true);
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#1A5A55] hover:text-[#0E3D3B]"
          >
            <RefreshCw className="h-3 w-3" /> Reset Filters
          </button>
        )}
      </div>

      {/* TICKETS GRID TABLE */}
      <div className="bg-white border border-[#D7E2D5] rounded-2xl overflow-hidden mt-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#EAF1E7] border-b border-[#D7E2D5] text-[#5E706A] uppercase font-mono tracking-wider text-[10px]">
                <th className="px-5 py-3">SLA</th>
                <th className="px-5 py-3">Ticket</th>
                <th className="px-5 py-3">Barcode</th>
                <th className="px-5 py-3">Connote</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Enquiry Type</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Assignee</th>
                <th className="px-5 py-3">Age</th>
                <th className="px-5 py-3">Last Update</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-16 text-center text-[#93A49B] italic">
                    No tickets found. Add or upload tickets to get started.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => {
                  const sla = getSlaState(t);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/admin/tickets/${t.id}`)}
                      className="border-b border-[#EAF1E7] hover:bg-[#E2EFF1]/50 cursor-pointer transition-colors"
                    >
                      {/* SLA */}
                      <td className="px-5 py-4">
                        <span
                          className={`w-2.5 h-2.5 rounded-full block ${
                            sla.color === "red"
                              ? "bg-[#E5484D] animate-pulse"
                              : sla.color === "amber"
                              ? "bg-[#E0A100]"
                              : "bg-[#3DA14B]"
                          }`}
                        />
                      </td>

                      {/* Ticket Identifier */}
                      <td className="px-5 py-4 font-mono font-bold text-[#14606F] hover:underline">
                        <div className="flex flex-col gap-1">
                          <span>{t.ticketNumber || (t.id ? `#${t.id.slice(0, 8).toUpperCase()}` : "MPS-NEW")}</span>
                          {t.isMasterCase && (
                            <span className="bg-[#0E4D5B] text-white text-[9px] font-bold px-1.5 py-0.5 rounded w-max">
                              MASTER CASE
                            </span>
                          )}
                          {t.parentTicketId && (
                            <span className="bg-[#93A49B] text-white text-[9px] font-bold px-1.5 py-0.5 rounded w-max">
                              CHILD TICKET
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Barcode */}
                      <td className="px-5 py-4 font-mono text-[#5E706A]">
                        {t.trackingIdentifier || "—"}
                      </td>

                      {/* Connote */}
                      <td className="px-5 py-4 font-mono text-[#5E706A]">
                        {t.connoteNumber || "—"}
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-[#0E3D3B]">
                          {t.customerContactName || "Unknown Contact"}
                        </div>
                        <div className="text-[10px] text-[#5E706A]">
                          {t.customerCompany || "No Company"}
                        </div>
                      </td>

                      {/* Enquiry Type */}
                      <td className="px-5 py-4 font-medium">{t.enquiryType}</td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold ${
                            t.status === "Investigating"
                              ? "bg-[#E2EFF1] text-[#0E4D5B]"
                              : t.status === "Awaiting Operations"
                              ? "bg-[#FBEEDF] text-[#A85A12]"
                              : t.status === "Awaiting Assignment"
                              ? "bg-[#FBF3DA] text-[#8A6D00]"
                              : t.status === "Resolved" || t.status === "Closed" || t.status === "Lost in Transit" || t.status === "Damaged"
                              ? "bg-[#E4F3E5] text-[#2F7A3C]"
                              : "bg-[#E7EEF1] text-[#1A5A55]" // New or default
                          }`}
                        >
                          {t.status || "New"}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="px-5 py-4 font-mono font-bold">
                        <span
                          className={
                            t.priority === "Urgent"
                              ? "text-[#E5484D]"
                              : t.priority === "High"
                              ? "text-[#E8852B]"
                              : "text-[#5E706A]"
                          }
                        >
                          {t.priority || "Standard"}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td className="px-5 py-4 text-[#5E706A]">
                        {t.assignedUser && t.assignedUser !== "unassigned"
                          ? t.assignedUser
                          : "Unassigned"}
                      </td>

                      {/* Age */}
                      <td className="px-5 py-4 font-mono">{formatAge(t.createdAt)}</td>

                      {/* Last Update */}
                      <td className="px-5 py-4 text-[#5E706A]">
                        {formatLastUpdate(t.updatedAt, t.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROW COUNT INFO */}
      <p className="text-xs text-[#5E706A] mt-4 font-medium">
        Showing {filteredTickets.length} of {tickets.length} tickets · Click any
        row to open the Case Viewer.
      </p>

      {/* BULK UPLOAD DIALOG */}
      <BulkUploadDialog
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        csUsers={csUsers}
        onImportComplete={() => {
          // Trigger any required refreshes or notifications
        }}
      />
    </div>
  );
}
