"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter } from "next/navigation";
import { FullScreenLoader } from "@/components/ui/loader";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";
import { getAllUsers } from "@/services/firebase";
import Link from "next/link";
import { Search, RefreshCw, Download } from "lucide-react";

export default function ArchivedTicketsListPage() {
  const { userProfile, loading } = useAuth();
  const { canView } = usePermissions();
  const router = useRouter();

  // Data states
  const [tickets, setTickets] = useState<any[]>([]);
  const [csUsers, setCsUsers] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Filters and views states
  const [activeOutcomeTab, setActiveOutcomeTab] = useState<string>("all"); // "all", "resolved", "lost", "damaged"
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all"); // "all", "today", "yesterday", "7days", "30days"
  const [selectedEnquiryType, setSelectedEnquiryType] = useState<string>("all");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [selectedDepot, setSelectedDepot] = useState<string>("all");

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

    // Subscribe to tickets (where status is Closed or Resolved)
    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((t: any) => t.status === "Resolved" || t.status === "Closed" || t.status === "Lost in Transit" || t.status === "Damaged");
      setTickets(ticketsData);
      setLoadingTickets(false);
    });

    // Load users
    async function loadUsers() {
      try {
        const users = await getAllUsers();
        setCsUsers(users);
      } catch (err) {
        console.error("Failed to load customer service users:", err);
      }
    }
    loadUsers();

    return () => unsubscribe();
  }, [userProfile, loading, router]);

  // Helpers for identifying outcomes
  const getTicketOutcomes = (t: any) => {
    const isDamaged =
      (t.enquiryType || "").toLowerCase().includes("damaged") ||
      (t.issueCategory || []).some((c: string) =>
        c.toLowerCase().includes("damaged")
      );
    const isLost =
      (t.enquiryType || "").toLowerCase().includes("lost") ||
      (t.notes || "").toLowerCase().includes("lost in transit");

    return { isDamaged, isLost };
  };

  // Helper: Name formatting
  const formatResolvedBy = (assignedUser: string) => {
    if (!assignedUser || assignedUser === "unassigned") return "—";
    if (assignedUser.includes("@")) {
      const parts = assignedUser.split("@")[0].split(".");
      if (parts.length >= 2) {
        const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        const last = parts[1].charAt(0).toUpperCase() + ".";
        return `${first} ${last}`;
      }
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    const parts = assignedUser.split(" ");
    if (parts.length >= 2) {
      const first = parts[0];
      const last = parts[parts.length - 1];
      return `${first} ${last.charAt(0).toUpperCase()}.`;
    }
    return assignedUser;
  };

  // Helper: Closed date formatting
  const formatClosedDate = (dateVal: any) => {
    const date = dateVal?.toDate ? dateVal.toDate() : dateVal ? new Date(dateVal) : null;
    if (!date || isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }); // "28 Jun 2026"
  };

  // Helper: Age at Close
  const formatAgeAtClose = (createdAt: any, updatedAt: any) => {
    const created = createdAt?.toDate ? createdAt.toDate() : createdAt ? new Date(createdAt) : null;
    const updated = updatedAt?.toDate ? updatedAt.toDate() : updatedAt ? new Date(updatedAt) : null;
    if (!created || !updated) return "1h";
    const diffMs = updated.getTime() - created.getTime();
    if (diffMs <= 0) return "1h";
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      return `${Math.max(1, diffHours)}h`;
    }
    const days = Math.floor(diffHours / 24);
    return `${days}d`;
  };

  // Dynamic filter values
  const uniqueEnquiryTypes = useMemo(() => {
    const types = new Set<string>();
    tickets.forEach((t) => {
      if (t.enquiryType) types.add(t.enquiryType);
    });
    return Array.from(types).sort();
  }, [tickets]);

  const uniqueAssignees = useMemo(() => {
    const assignees = new Set<string>();
    tickets.forEach((t) => {
      if (t.assignedUser && t.assignedUser !== "unassigned") {
        assignees.add(t.assignedUser);
      }
    });
    return Array.from(assignees).sort();
  }, [tickets]);

  const uniqueDepots = useMemo(() => {
    const depots = new Set<string>();
    tickets.forEach((t) => {
      const depotVal = t.currentDepot || t.franchisee || t.depot;
      if (depotVal && depotVal !== "N/A" && depotVal !== "Unknown") {
        depots.add(depotVal);
      }
    });
    return Array.from(depots).sort();
  }, [tickets]);

  // Main Filtering Logic
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const { isDamaged, isLost } = getTicketOutcomes(t);

      // 1. Outcome Tabs
      if (activeOutcomeTab === "resolved" && (isLost || isDamaged)) return false;
      if (activeOutcomeTab === "lost" && !isLost) return false;
      if (activeOutcomeTab === "damaged" && !isDamaged) return false;

      // 2. Search query matching barcode, ticket #, customer
      if (searchQuery.trim() !== "") {
        const queryLower = searchQuery.toLowerCase();
        const ticketId = (t.id || "").toLowerCase();
        const barcode = (t.trackingIdentifier || "").toLowerCase();
        const contactName = (t.customerContactName || "").toLowerCase();
        const companyName = (t.customerCompany || "").toLowerCase();

        if (
          !ticketId.includes(queryLower) &&
          !barcode.includes(queryLower) &&
          !contactName.includes(queryLower) &&
          !companyName.includes(queryLower)
        ) {
          return false;
        }
      }

      // 3. Date Range
      if (selectedDateRange !== "all") {
        const updatedTime = t.updatedAt?.toDate ? t.updatedAt.toDate().getTime() : t.updatedAt ? new Date(t.updatedAt).getTime() : 0;
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (selectedDateRange === "today") {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          if (updatedTime < startOfToday.getTime()) return false;
        } else if (selectedDateRange === "yesterday") {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const startOfYesterday = new Date(startOfToday.getTime() - oneDayMs);
          if (updatedTime < startOfYesterday.getTime() || updatedTime >= startOfToday.getTime()) return false;
        } else if (selectedDateRange === "7days") {
          if (now - updatedTime > 7 * oneDayMs) return false;
        } else if (selectedDateRange === "30days") {
          if (now - updatedTime > 30 * oneDayMs) return false;
        }
      }

      // 4. Enquiry Type Dropdown
      if (selectedEnquiryType !== "all" && t.enquiryType !== selectedEnquiryType) {
        return false;
      }

      // 5. Assignee Dropdown
      if (selectedAssignee !== "all" && t.assignedUser !== selectedAssignee) {
        return false;
      }

      // 6. Depot Dropdown
      if (selectedDepot !== "all") {
        const depotVal = t.currentDepot || t.franchisee || t.depot;
        if (depotVal !== selectedDepot) return false;
      }

      return true;
    });
  }, [
    tickets,
    activeOutcomeTab,
    searchQuery,
    selectedDateRange,
    selectedEnquiryType,
    selectedAssignee,
    selectedDepot,
  ]);

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = [
      "Ticket ID",
      "Barcode",
      "Customer Contact",
      "Customer Company",
      "Enquiry Type",
      "Outcome",
      "Closed Date",
      "Resolved By",
      "Age at Close",
    ];

    const escapeCsvCell = (val: any) => `"${String(val ?? "").replace(/"/g, '""')}"`;

    const rows = filteredTickets.map((t) => {
      const { isDamaged, isLost } = getTicketOutcomes(t);
      const outcome = isLost ? "Lost in Transit" : isDamaged ? "Damaged" : "Resolved";
      return [
        escapeCsvCell(t.id ? `#${t.id.toUpperCase()}` : ""),
        escapeCsvCell(t.trackingIdentifier || ""),
        escapeCsvCell(t.customerContactName || ""),
        escapeCsvCell(t.customerCompany || ""),
        escapeCsvCell(t.enquiryType || ""),
        escapeCsvCell(outcome),
        escapeCsvCell(formatClosedDate(t.updatedAt || t.createdAt)),
        escapeCsvCell(formatResolvedBy(t.assignedUser)),
        escapeCsvCell(formatAgeAtClose(t.createdAt, t.updatedAt)),
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `archived_tickets_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || loadingTickets) return <FullScreenLoader message="Loading archived tickets..." />;

  return (
    <div className="min-h-screen bg-[#D7E3D2] text-[#0E3D3B] font-sans p-6 md:p-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#C3D2C2] pb-6 gap-4">
        <div>
          <div className="text-[10px] font-mono tracking-wider text-[#5E706A] uppercase mb-1">
            HOME / TICKETS
          </div>
          <h1 className="text-3xl font-bold font-serif tracking-tight text-[#0E3D3B]">
            Archived tickets
          </h1>
        </div>
      </div>

      {/* OUTCOME TAB FILTERS */}
      <div className="flex flex-wrap gap-2 mt-6">
        {[
          { id: "all", label: "All closed" },
          { id: "resolved", label: "✅ Resolved / Closed" },
          { id: "lost", label: "🔴 Lost in Transit" },
          { id: "damaged", label: "🟡 Damaged" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveOutcomeTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              activeOutcomeTab === tab.id
                ? "bg-[#0E3D3B] text-white border-[#0E3D3B] shadow-sm"
                : "bg-white text-[#5E706A] border-[#D7E2D5] hover:border-[#1A5A55]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* FILTERS & SEARCH ROW */}
      <div className="flex flex-col xl:flex-row gap-3 mt-6 items-stretch xl:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-[#5E706A]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-[#D7E2D5] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0E3D3B] text-[#0E3D3B] placeholder-[#93A49B] shadow-sm"
            placeholder="Search barcode, ticket #, customer..."
          />
        </div>

        {/* Filters Select row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Date range dropdown */}
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="bg-white border border-[#D7E2D5] rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none text-[#5E706A] shadow-sm cursor-pointer"
          >
            <option value="all">Date range: All time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
          </select>

          {/* Enquiry type dropdown */}
          <select
            value={selectedEnquiryType}
            onChange={(e) => setSelectedEnquiryType(e.target.value)}
            className="bg-white border border-[#D7E2D5] rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none text-[#5E706A] shadow-sm cursor-pointer"
          >
            <option value="all">Enquiry type: All</option>
            {uniqueEnquiryTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {/* Assignee dropdown */}
          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="bg-white border border-[#D7E2D5] rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none text-[#5E706A] shadow-sm cursor-pointer"
          >
            <option value="all">Assignee: All</option>
            {uniqueAssignees.map((user) => (
              <option key={user} value={user}>
                {formatResolvedBy(user)}
              </option>
            ))}
          </select>

          {/* Depot dropdown */}
          <select
            value={selectedDepot}
            onChange={(e) => setSelectedDepot(e.target.value)}
            className="bg-white border border-[#D7E2D5] rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none text-[#5E706A] shadow-sm cursor-pointer"
          >
            <option value="all">Depot: All</option>
            {uniqueDepots.map((depot) => (
              <option key={depot} value={depot}>
                {depot}
              </option>
            ))}
          </select>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 bg-white text-[#0E3D3B] border border-[#D7E2D5] px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[#EAF1E7] transition-all shadow-sm"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>

          {/* Reset Filters button */}
          {(searchQuery ||
            selectedDateRange !== "all" ||
            selectedEnquiryType !== "all" ||
            selectedAssignee !== "all" ||
            selectedDepot !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedDateRange("all");
                setSelectedEnquiryType("all");
                setSelectedAssignee("all");
                setSelectedDepot("all");
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#1A5A55] hover:text-[#0E3D3B] ml-2"
            >
              <RefreshCw className="h-3 w-3" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* TICKETS TABLE */}
      <div className="bg-white border border-[#D7E2D5] rounded-2xl overflow-hidden mt-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#EAF1E7] border-b border-[#D7E2D5] text-[#5E706A] uppercase font-mono tracking-wider text-[10px]">
                <th className="px-5 py-3">Ticket</th>
                <th className="px-5 py-3">Barcode</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Enquiry Type</th>
                <th className="px-5 py-3">Outcome</th>
                <th className="px-5 py-3">Closed Date</th>
                <th className="px-5 py-3">Resolved By</th>
                <th className="px-5 py-3">Age at Close</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-[#93A49B] italic">
                    No archived tickets found.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => {
                  const { isDamaged, isLost } = getTicketOutcomes(t);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/admin/tickets/${t.id}`)}
                      className="border-b border-[#EAF1E7] hover:bg-[#E2EFF1]/50 cursor-pointer transition-colors"
                    >
                      {/* Ticket */}
                      <td className="px-5 py-4 font-mono font-bold text-[#14606F] hover:underline">
                        #{t.id ? t.id.toUpperCase() : "MPS-NEW"}
                      </td>

                      {/* Barcode */}
                      <td className="px-5 py-4 font-mono text-[#5E706A]">
                        {t.trackingIdentifier || "—"}
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-[#0E3D3B]">
                          {t.customerContactName || "—"}
                        </div>
                        <div className="text-[10px] text-[#5E706A]">
                          {t.customerCompany || "—"}
                        </div>
                      </td>

                      {/* Enquiry Type */}
                      <td className="px-5 py-4 font-medium">{t.enquiryType || "—"}</td>

                      {/* Outcome */}
                      <td className="px-5 py-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {isLost ? (
                            <span className="bg-[#FCEAEA] text-[#B23B3B] px-2.5 py-1 rounded-md text-[10px] font-bold">
                              Lost in transit
                            </span>
                          ) : isDamaged ? (
                            <>
                              <span className="bg-[#FBF3DA] text-[#8A6D00] px-2.5 py-1 rounded-md text-[10px] font-bold">
                                Damaged
                              </span>
                              <span className="bg-[#E2F0FB] text-[#0A6CB0] px-2.5 py-1 rounded-md text-[10px] font-bold">
                                FreightSafe
                              </span>
                            </>
                          ) : (
                            <span className="bg-[#E4F3E5] text-[#2F7A3C] px-2.5 py-1 rounded-md text-[10px] font-bold">
                              Resolved
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Closed Date */}
                      <td className="px-5 py-4 text-[#5E706A]">
                        {formatClosedDate(t.updatedAt || t.createdAt)}
                      </td>

                      {/* Resolved By */}
                      <td className="px-5 py-4 text-[#5E706A]">
                        {formatResolvedBy(t.assignedUser)}
                      </td>

                      {/* Age at Close */}
                      <td className="px-5 py-4 font-mono">
                        {formatAgeAtClose(t.createdAt, t.updatedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Summary Text */}
      <div className="mt-4 text-xs text-[#5E706A] font-medium">
        Showing {filteredTickets.length} of {tickets.length} archived tickets · Use date range filter to narrow results.
      </div>
    </div>
  );
}
