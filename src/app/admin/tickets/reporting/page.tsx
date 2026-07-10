"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { FullScreenLoader } from "@/components/ui/loader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Ticket,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  HelpCircle,
  Truck,
  Building2,
  Mail,
  Phone,
  Laptop,
  ArrowRight,
  TrendingUp,
  MapPin,
  Barcode
} from "lucide-react";
import Link from "next/link";
import { collection, onSnapshot, query } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";

export default function TicketReportingPage() {
  const { userProfile, loading } = useAuth();
  const { canView } = usePermissions();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Load all tickets in real-time
  useEffect(() => {
    if (loading || !userProfile) return;

    const q = query(collection(db, "tickets"));
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setTickets(list);
      setLoadingTickets(false);
    }, (err) => {
      console.error("Failed to fetch tickets for reporting:", err);
      setLoadingTickets(false);
    });

    return () => unsub();
  }, [userProfile, loading]);

  // SLA Calculation Helper
  const getSlaState = (ticket: any) => {
    const isPaused = 
      ticket.status === "Awaiting Operations" || 
      ticket.status === "Awaiting IT" || 
      ticket.status === "Closed" || 
      ticket.status === "Resolved" || 
      ticket.status === "Lost in Transit" || 
      ticket.status === "Damaged";

    if (isPaused) {
      return "Resolved / Paused";
    }

    const lastUpdate = ticket.updatedAt || ticket.createdAt;
    const time = lastUpdate?.toDate
      ? lastUpdate.toDate()
      : lastUpdate
      ? new Date(lastUpdate)
      : null;

    if (!time || isNaN(time.getTime())) {
      return "Within SLA";
    }

    const diffMs = Date.now() - time.getTime();
    const ageHours = diffMs / (1000 * 60 * 60);

    if (ageHours > 24) {
      return "Breached";
    } else if (ageHours > 12) {
      return "Approaching SLA";
    }
    return "Within SLA";
  };

  // Compute stats
  const stats = useMemo(() => {
    let total = tickets.length;
    let open = 0;
    let resolved = 0;
    let damaged = 0;
    let lostInTransit = 0;
    let incorrectReceiver = 0;
    
    let withinSla = 0;
    let approachingSla = 0;
    let breachedSla = 0;
    let pausedSla = 0;

    const statusCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    const enquiryCounts: Record<string, number> = {};

    tickets.forEach((t) => {
      // Status categorization
      const status = t.status || "Open";
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const isClosedVal = 
        status === "Closed" || 
        status === "Resolved" || 
        status === "Lost in Transit" || 
        status === "Damaged";

      if (isClosedVal) {
        resolved++;
      } else {
        open++;
      }

      // Damaged/Lost specifics
      if (status === "Damaged" || t.enquiryType === "Damaged Item" || t.issueCategory?.includes("Damaged Item")) {
        damaged++;
      }
      if (status === "Lost in Transit" || t.enquiryType === "Lost Item" || t.issueCategory?.includes("Lost Item")) {
        lostInTransit++;
      }

      // Incorrect receiver details flag
      if (t.hasNewReceiverDetails === true) {
        incorrectReceiver++;
      }

      // SLA states
      const sla = getSlaState(t);
      if (sla === "Within SLA") withinSla++;
      else if (sla === "Approaching SLA") approachingSla++;
      else if (sla === "Breached") breachedSla++;
      else if (sla === "Resolved / Paused") pausedSla++;

      // Source counts
      const source = t.source || "CRM";
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;

      // Enquiry type
      const enquiry = t.enquiryType || "Other";
      enquiryCounts[enquiry] = (enquiryCounts[enquiry] || 0) + 1;
    });

    return {
      total,
      open,
      resolved,
      damaged,
      lostInTransit,
      incorrectReceiver,
      withinSla,
      approachingSla,
      breachedSla,
      pausedSla,
      statusCounts,
      sourceCounts,
      enquiryCounts
    };
  }, [tickets]);

  if (loading || loadingTickets) {
    return <FullScreenLoader message="Loading ticket intelligence..." />;
  }

  // Color helper for SLA badges
  const getSlaBadgeColor = (type: string) => {
    switch (type) {
      case "Within SLA": return "bg-emerald-50 text-emerald-700 border-emerald-250";
      case "Approaching SLA": return "bg-amber-50 text-amber-750 border-amber-250";
      case "Breached": return "bg-rose-50 text-rose-700 border-rose-250 animate-pulse";
      default: return "bg-slate-50 text-slate-655 border-slate-200";
    }
  };

  return (
    <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6 md:p-8 space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-[#095c7b]" /> Ticket Analytics & Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-1">Real-time resolution metrics, SLA benchmarks, and operational quality data.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-[#095c7b]/5 border-[#095c7b]/15 text-[#095c7b] px-3 py-1 text-xs font-bold rounded-lg">
            Live Monitoring Active
          </Badge>
        </div>
      </div>

      {/* OVERVIEW STATS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Total Tickets</span>
              <div className="p-1.5 bg-[#095c7b]/5 text-[#095c7b] rounded-lg">
                <Ticket className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-800 block">{stats.total}</span>
              <span className="text-[10px] text-slate-400">cumulative volume</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Resolved</span>
              <div className="p-1.5 bg-emerald-55/10 text-emerald-600 rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-emerald-600 block">{stats.resolved}</span>
              <span className="text-[10px] text-slate-400">
                {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}% success rate
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Active Backlog</span>
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-blue-600 block">{stats.open}</span>
              <span className="text-[10px] text-slate-400">in-progress / open</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">SLA Breaches</span>
              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-rose-600 block">{stats.breachedSla}</span>
              <span className="text-[10px] text-slate-400">no activity &gt; 24h</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Incorrect Address</span>
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-amber-600 block">{stats.incorrectReceiver}</span>
              <span className="text-[10px] text-slate-400">packages flagged / corrected</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DETAILED ANALYSIS BREAKDOWN GRIDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SLA & TARGET RESPONSE BENCHMARKS */}
        <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white col-span-1">
          <CardHeader className="border-b border-slate-50 py-4 px-6">
            <CardTitle className="text-sm font-bold text-slate-800">SLA Response Performance</CardTitle>
            <CardDescription className="text-[11px] text-slate-400">SLA targets based on hours elapsed since last staff updates.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              {/* SLA within progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Within SLA (&lt;12h)</span>
                  <span>{stats.withinSla} ({stats.total > 0 ? Math.round((stats.withinSla / stats.total) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${stats.total > 0 ? (stats.withinSla / stats.total) * 100 : 0}%` }} />
                </div>
              </div>

              {/* SLA approaching progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-455 bg-amber-400" /> Approaching (12h-24h)</span>
                  <span>{stats.approachingSla} ({stats.total > 0 ? Math.round((stats.approachingSla / stats.total) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: `${stats.total > 0 ? (stats.approachingSla / stats.total) * 100 : 0}%` }} />
                </div>
              </div>

              {/* SLA Breached progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> Breached SLA (&gt;24h)</span>
                  <span>{stats.breachedSla} ({stats.total > 0 ? Math.round((stats.breachedSla / stats.total) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${stats.total > 0 ? (stats.breachedSla / stats.total) * 100 : 0}%` }} />
                </div>
              </div>

              {/* SLA Paused progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" /> Resolved / Paused</span>
                  <span>{stats.pausedSla} ({stats.total > 0 ? Math.round((stats.pausedSla / stats.total) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-full rounded-full" style={{ width: `${stats.total > 0 ? (stats.pausedSla / stats.total) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-[#f0f9ff] border border-blue-100 rounded-xl text-xs text-blue-800 leading-relaxed">
              <strong>SLA Metrics Policy:</strong> Ongoing tickets require updates within 12 hours. Any ticket without action recorded for more than 24 hours breaches SLA targets.
            </div>
          </CardContent>
        </Card>

        {/* STATUS BREAKDOWN PANEL */}
        <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white col-span-1">
          <CardHeader className="border-b border-slate-50 py-4 px-6">
            <CardTitle className="text-sm font-bold text-slate-800">Status Distribution</CardTitle>
            <CardDescription className="text-[11px] text-slate-400">Proportional count of tickets in various execution states.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4 max-h-[350px] overflow-y-auto">
            {Object.keys(stats.statusCounts).length === 0 ? (
              <div className="text-center text-xs text-slate-400 italic py-8">No tickets recorded.</div>
            ) : (
              Object.entries(stats.statusCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([statusName, count]) => {
                  const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={statusName} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>{statusName}</span>
                        <span>{count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#095c7b] h-full rounded-full" 
                          style={{ width: `${percentage}%` }} 
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>

        {/* SOURCE DISTRIBUTION & CARRIER ISSUES */}
        <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white col-span-1">
          <CardHeader className="border-b border-slate-50 py-4 px-6">
            <CardTitle className="text-sm font-bold text-slate-800">Source Channels & Carrier Scenarios</CardTitle>
            <CardDescription className="text-[11px] text-slate-400">Volumes categorized by channel origin and major freight issues.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Source channel icons */}
            <div className="space-y-3.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b pb-1">Origin Channel</span>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100/10 text-blue-605 text-blue-600 rounded-lg">
                    <Laptop className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Website API</span>
                    <span className="text-sm font-black text-slate-700">{stats.sourceCounts["Website"] || stats.sourceCounts["Portal (StarTrack)"] || 0}</span>
                  </div>
                </div>
                
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-2.5">
                  <div className="p-2 bg-[#095c7b]/10 text-[#095c7b] rounded-lg">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">CRM Direct</span>
                    <span className="text-sm font-black text-slate-700">{stats.sourceCounts["CRM"] || 0}</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100/10 text-emerald-600 rounded-lg">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Email</span>
                    <span className="text-sm font-black text-slate-700">{stats.sourceCounts["Email"] || 0}</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-2.5">
                  <div className="p-2 bg-amber-100/10 text-amber-600 rounded-lg">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Phone Call</span>
                    <span className="text-sm font-black text-slate-700">{stats.sourceCounts["Phone"] || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Carrier scenarios */}
            <div className="space-y-3.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b pb-1">Major Package Issues</span>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs p-2.5 bg-rose-50/50 hover:bg-rose-50 border border-rose-100 rounded-xl transition-colors">
                  <span className="font-semibold text-rose-805 text-rose-800 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" /> Damaged Packages
                  </span>
                  <Badge className="bg-rose-600 text-white font-bold">{stats.damaged}</Badge>
                </div>
                <div className="flex justify-between items-center text-xs p-2.5 bg-orange-50/50 hover:bg-orange-50 border border-orange-100 rounded-xl transition-colors">
                  <span className="font-semibold text-orange-805 text-orange-850 text-orange-805 text-orange-800 flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5" /> Lost In Transit
                  </span>
                  <Badge className="bg-orange-500 text-white font-bold">{stats.lostInTransit}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* QUICK TABLE: FLAGGED INCORRECT RECEIVER PACKAGES */}
      <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-slate-50/30 py-4 px-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-800">Incorrect Barcode & Receiver Flag History</CardTitle>
            <CardDescription className="text-[11px] text-slate-400">List of barcode tickets flagged with incorrect details and updated receiver profiles.</CardDescription>
          </div>
          <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 py-1 px-2 text-[10px]">
            {stats.incorrectReceiver} Flagged Packages
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="px-6 py-3.5">Ticket No</th>
                  <th className="px-6 py-3.5">Barcode / ID</th>
                  <th className="px-6 py-3.5">Original Recipient</th>
                  <th className="px-6 py-3.5">Corrected Recipient</th>
                  <th className="px-6 py-3.5">Corrected Address</th>
                  <th className="px-6 py-3.5">SLA</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {tickets.filter(t => t.hasNewReceiverDetails === true).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-450 italic">
                      No packages are currently flagged with incorrect receiver details.
                    </td>
                  </tr>
                ) : (
                  tickets
                    .filter(t => t.hasNewReceiverDetails === true)
                    .map((t) => {
                      const sla = getSlaState(t);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-[#095c7b]">
                            {t.ticketNumber}
                          </td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-1.5">
                              <Barcode className="h-3.5 w-3.5 text-slate-400" />
                              {t.trackingIdentifier}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {t.receiverName || "N/A"}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">
                            {t.newReceiverName || "N/A"}
                          </td>
                          <td className="px-6 py-4 max-w-[200px] truncate" title={t.newReceiverAddress}>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-amber-500 shrink-0" />
                              {t.newReceiverAddress || "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={`border text-[10px] font-bold ${getSlaBadgeColor(sla)}`}>
                              {sla}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link 
                              href={`/admin/tickets/${t.id}`}
                              className="inline-flex items-center gap-1 font-bold text-[#095c7b] hover:text-[#053647] hover:underline"
                            >
                              Details <ArrowRight className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
