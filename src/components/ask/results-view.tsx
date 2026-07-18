"use client"

import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, ExternalLink, HelpCircle, ChevronDown, ChevronRight, 
  RefreshCw, Copy, Truck, Package, Clock, PlusCircle 
} from "lucide-react";
import { getStatusColor } from "@/lib/status-colors";
import { toast } from "sonner";

interface ResultsViewProps {
  collection: "leads" | "companies" | "users" | "franchisees" | "tickets" | "packages" | "appointments" | "activity" | "tasks" | "visitnotes";
  intent: "list" | "count" | "aggregate";
  rows: any[];
  columns: string[];
  value?: any;
  humanSummary: string;
  spec?: any;
}

const getBadgeColor = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('futile')) return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
  if (t.includes('lodgement')) return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
  if (t.includes('pickup')) return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100';
  return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
}

export function ResultsView({ collection, intent, rows, columns, value, humanSummary, spec }: ResultsViewProps) {
  const [localRows, setLocalRows] = useState<any[]>(rows);
  const [statusLoading, setStatusLoading] = useState<Record<string, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);
  
  const handleExportCSV = () => {
    if (!localRows || localRows.length === 0) return;
    const dataToExport = localRows.map(({ id, ...rest }) => rest);
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${collection}_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRecordLink = (row: any) => {
    if (collection === "leads") {
      return `/leads/${row.id}`;
    }
    if (collection === "companies") {
      return `/companies/${row.id}`;
    }
    if (collection === "tickets") {
      return `/admin/tickets/${row.id}`;
    }
    return null;
  };

  const toggleRow = (code: string) => {
    const next = new Set(expandedRows);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    setExpandedRows(next);
  };

  const handleCheckStatus = async (pkg: any) => {
    const code = pkg.code || pkg.id;
    if (!code) return;
    setStatusLoading(prev => ({ ...prev, [code]: true }));
    try {
      const res = await fetch(`/api/tracking?identifier=${code}&packageId=${code}`);
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      
      setLocalRows(prev => prev.map(r => {
        const itemCode = r.code || r.id;
        return itemCode === code 
          ? { 
              ...r, 
              real_time_status: { 
                status: data.status, 
                updated_at: data.updated_at || new Date().toISOString(), 
                delivered: data.delivered,
                estimated_delivery_date: data.estimated_delivery_date,
                last_location: data.last_location
              } 
            }
          : r;
      }));
      toast.success('Real-time status updated!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    } finally {
      setStatusLoading(prev => ({ ...prev, [code]: false }));
    }
  };

  const renderBreakdown = () => {
    if (!spec) return null;
    const items: React.ReactNode[] = [];

    // Filters
    if (spec.filters && spec.filters.length > 0) {
      spec.filters.forEach((f: any, idx: number) => {
        items.push(
          <div key={`filter-${idx}`} className="inline-flex items-center gap-1 bg-[#095c7b]/5 border border-[#095c7b]/20 px-2 py-0.5 rounded text-xs font-medium text-slate-700">
            <span className="font-mono text-[#095c7b]">{f.field}</span>
            <span className="text-slate-400 font-mono text-[10px]">{f.op}</span>
            <span className="font-semibold text-slate-800">"{f.value}"</span>
          </div>
        );
      });
    }

    // Date Range
    if (spec.dateRange) {
      items.push(
        <div key="daterange" className="inline-flex items-center gap-1 bg-[#095c7b]/5 border border-[#095c7b]/20 px-2 py-0.5 rounded text-xs font-medium text-slate-700">
          <span className="font-mono text-[#095c7b]">{spec.dateRange.field}</span>
          <span className="text-slate-400 font-mono text-[10px]">range</span>
          <span className="font-semibold text-slate-800">"{spec.dateRange.from || spec.dateRange.to}"</span>
        </div>
      );
    }

    // Sort
    if (spec.sort) {
      items.push(
        <div key="sort" className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-xs font-medium text-slate-500">
          <span className="text-[10px] text-slate-400">Order by:</span>
          <span className="font-mono text-slate-700">{spec.sort.field}</span>
          <span className="text-[10px] text-slate-400 uppercase">{spec.sort.direction}</span>
        </div>
      );
    }

    if (items.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-2 bg-[#FFFDF6] border border-border/80 rounded-lg p-3 text-xs">
        <span className="text-[#1A3D33] font-semibold flex items-center gap-1">
          🔍 Query Breakdown:
        </span>
        <div className="flex flex-wrap gap-1.5">{items}</div>
      </div>
    );
  };

  // Render Count View
  if (intent === "count" && typeof value === "number") {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-sm font-medium text-muted-foreground">{humanSummary}</div>
        {renderBreakdown()}
        <Card className="max-w-xs bg-white border-border text-foreground">
          <CardHeader className="pb-2 border-b border-border/40">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Total Count</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-5xl font-bold text-[#095c7b]">{value}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render Aggregate Grouped View
  if (intent === "aggregate" && typeof value === "object" && value !== null) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-sm font-medium text-muted-foreground">{humanSummary}</div>
        {renderBreakdown()}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(value).map(([key, val]: [string, any]) => (
            <Card key={key} className="bg-white border-border text-foreground">
              <CardHeader className="pb-2 border-b border-border/40">
                <CardTitle className="text-xs text-muted-foreground truncate uppercase tracking-wider">{key}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-3xl font-semibold text-[#095c7b]">{val}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Render List View (Table)
  if (localRows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center gap-2">
        <HelpCircle className="h-10 w-10 text-muted-foreground/30" />
        <p className="font-semibold text-slate-700">No results found matching your query.</p>
        <p className="text-xs text-muted-foreground">Try rephrasing your search or using the Terminology panel.</p>
      </div>
    );
  }

  // Rich Package rendering block
  if (collection === "packages") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm font-medium text-muted-foreground">{humanSummary}</div>
          <Button
            onClick={handleExportCSV}
            size="sm"
            className="bg-[#095c7b] hover:bg-[#07475f] text-white flex items-center gap-2 self-start"
          >
            <Download className="h-4 w-4" />
            Export to CSV
          </Button>
        </div>
        {renderBreakdown()}

        <div className="border border-border rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-slate-50 border-border">
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-slate-700 font-semibold">Barcode</TableHead>
                <TableHead className="text-slate-700 font-semibold">Connote</TableHead>
                <TableHead className="text-slate-700 font-semibold">Status</TableHead>
                <TableHead className="text-slate-700 font-semibold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localRows.map((pkg, i) => {
                const code = pkg.code || pkg.id;
                const isExpanded = expandedRows.has(code);
                let latestScan = pkg.scans?.[pkg.scans.length - 1];
                if (pkg.scans && pkg.scans.length > 0) {
                  latestScan = pkg.scans.reduce((latest: any, current: any) => {
                    return new Date(latest.updated_at) > new Date(current.updated_at) ? latest : current;
                  }, pkg.scans[0]);
                }

                return (
                  <React.Fragment key={code || i}>
                    <TableRow 
                      onClick={() => toggleRow(code)} 
                      className="border-border hover:bg-slate-50/50 cursor-pointer transition-colors"
                    >
                      <TableCell className="pl-4">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-medium text-slate-800">{code}</TableCell>
                      <TableCell className="font-mono text-slate-500">
                        {pkg.connote_number || (pkg.scans && pkg.scans.length > 0 ? pkg.scans[pkg.scans.length - 1].connote_number : null) || '-'}
                      </TableCell>
                      <TableCell>
                        {pkg.real_time_status ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-[#095c7b]">{pkg.real_time_status.status}</span>
                            {pkg.real_time_status.last_location && (
                              <span className="text-[9px] text-slate-500">Loc: {pkg.real_time_status.last_location}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not Checked</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCheckStatus(pkg)}
                            disabled={statusLoading[code]}
                            className="p-1.5 rounded border border-border bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 transition"
                            title="Check Real-time Status"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${statusLoading[code] ? 'animate-spin text-[#095c7b]' : ''}`} />
                          </button>
                          <Link href={`/admin/tickets/create?identifier=${code}`} target="_blank">
                            <button className="p-1.5 rounded border border-[#095c7b]/20 bg-[#095c7b]/5 hover:bg-[#095c7b]/10 text-[#095c7b] transition" title="Create Ticket">
                              <PlusCircle className="h-3.5 w-3.5" />
                            </button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <TableRow className="bg-slate-50/50">
                        <TableCell colSpan={5} className="p-4 border-t-0">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-white p-3 rounded border border-border shadow-sm">
                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Package Information</h5>
                                <div className="space-y-1 text-xs text-slate-600">
                                  <p><span className="font-semibold">Manifested At:</span> {pkg.manifested_at ? new Date(pkg.manifested_at).toLocaleString() : '-'}</p>
                                  <p><span className="font-semibold">Weight:</span> {pkg.weight || '-'}</p>
                                  <p><span className="font-semibold">Client Company:</span> {pkg.customer_name || '-'}</p>
                                  <p><span className="font-semibold">Franchisee Owner:</span> {pkg.franchisee_name || '-'}</p>
                                </div>
                              </div>
                              <div className="bg-white p-3 rounded border border-border shadow-sm">
                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Delivery Details</h5>
                                <div className="space-y-1 text-xs text-slate-600">
                                  <p><span className="font-semibold">Speed:</span> {latestScan?.delivery_speed || '-'}</p>
                                  <p><span className="font-semibold">Zone:</span> {latestScan?.delivery_zone || '-'}</p>
                                  <p><span className="font-semibold">Depot ID:</span> {latestScan?.depot_id || '-'}</p>
                                </div>
                              </div>
                              <div className="bg-white p-3 rounded border border-border shadow-sm">
                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Recipient Details</h5>
                                <div className="space-y-1 text-xs text-slate-600 font-sans">
                                  <p className="font-semibold text-slate-800">{latestScan?.receiver_name || '-'}</p>
                                  <p>{latestScan?.email || '-'}</p>
                                  <p>{latestScan?.phone || '-'}</p>
                                  <p className="text-[10px] text-slate-500">
                                    {[latestScan?.address1, latestScan?.address2, latestScan?.receiver_suburb, latestScan?.state, latestScan?.post_code].filter(Boolean).join(', ')}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-slate-600" />
                              <h4 className="text-sm font-semibold text-slate-800">Scan Event History</h4>
                            </div>

                            {pkg.scans && pkg.scans.length > 0 ? (
                              <div className="rounded border bg-white shadow-sm overflow-hidden">
                                <Table>
                                  <TableHeader className="bg-slate-50">
                                    <TableRow>
                                      <TableHead className="h-8 text-xs font-semibold">Date</TableHead>
                                      <TableHead className="h-8 text-xs font-semibold">Type</TableHead>
                                      <TableHead className="h-8 text-xs font-semibold">Courier</TableHead>
                                      <TableHead className="h-8 text-xs font-semibold">Receiver</TableHead>
                                      <TableHead className="h-8 text-xs font-semibold">Details</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {pkg.scans.map((scan: any, idx: number) => (
                                      <TableRow key={scan.id || idx}>
                                        <TableCell className="text-xs text-slate-500">{new Date(scan.updated_at).toLocaleString()}</TableCell>
                                        <TableCell>
                                          <Badge variant="outline" className={getBadgeColor(scan.scan_type) + " text-[9px] px-1 py-0 h-4"}>
                                            {scan.scan_type}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs capitalize text-slate-500">{scan.courier?.replace('_', ' ')}</TableCell>
                                        <TableCell className="text-xs text-slate-500">{scan.receiver_name || '-'}</TableCell>
                                        <TableCell className="text-xs text-slate-400 max-w-xs truncate" title={scan.futile_reason}>{scan.futile_reason || '-'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground italic pl-6">No scan events recorded.</div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  const priorityCols = [
    "companyName", "status", "customerStatus", "bucket", "franchisee", "email", "activeRole", "displayName", "dateLeadEntered",
    "ticketNumber", "trackingIdentifier", "connoteNumber", "customerCompany", "enquiryType", "priority", "assignee"
  ];
  const displayCols = columns.filter(c => priorityCols.includes(c) || c === "name").slice(0, 7);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-sm font-medium text-muted-foreground">{humanSummary}</div>
        <Button
          onClick={handleExportCSV}
          size="sm"
          className="bg-[#095c7b] hover:bg-[#07475f] text-white flex items-center gap-2 self-start"
        >
          <Download className="h-4 w-4" />
          Export to CSV
        </Button>
      </div>
      {renderBreakdown()}

      <div className="border border-border rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50 border-border">
            <TableRow>
              {displayCols.map((col) => (
                <TableHead key={col} className="text-slate-700 font-semibold capitalize">
                  {col.replace(/([A-Z])/g, " $1")}
                </TableHead>
              ))}
              <TableHead className="text-slate-700 font-semibold text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localRows.map((row, i) => {
              const link = getRecordLink(row);
              return (
                <TableRow key={row.id || i} className="border-border hover:bg-slate-50/50">
                  {displayCols.map((col) => {
                    const val = row[col];
                    if (col === "status" || col === "customerStatus") {
                      return (
                        <TableCell key={col}>
                          <span
                            className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                            style={{ backgroundColor: getStatusColor(val) }}
                          >
                            {val}
                          </span>
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell key={col} className="text-slate-600 max-w-[200px] truncate">
                        {val === undefined || val === null ? "-" : String(val)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right">
                    {link ? (
                      <Link
                        href={link}
                        className="inline-flex items-center gap-1.5 text-xs text-[#095c7b] hover:text-[#0b7095] font-semibold transition"
                      >
                        View Profile
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-xs font-medium">Read-Only</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
