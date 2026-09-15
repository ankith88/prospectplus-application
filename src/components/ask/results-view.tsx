"use client";

import React, { useState, useEffect, useId } from "react";
import Papa from "papaparse";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download, ExternalLink, HelpCircle, ChevronDown, ChevronRight,
  RefreshCw, Copy, Truck, Package, Clock, PlusCircle, CheckCircle2,
  FileText, Share2, Sparkles, Lightbulb, BarChart3, Table as TableIcon, Eye
} from "lucide-react";
import { getStatusColor } from "@/lib/status-colors";
import { toast } from "sonner";
import { AskChartView } from "@/components/ask/ask-chart-view";
import { generateExecutiveReportPdf } from "@/components/ask/report-pdf-generator";
import { QuickTaskDialog } from "@/components/ask/quick-task-dialog";
import { RecordPreviewDrawer } from "@/components/ask/record-preview-drawer";

interface ResultsViewProps {
  collection: string;
  intent: "list" | "count" | "aggregate";
  rows?: any[];
  columns?: string[];
  value?: any;
  chartType?: "bar" | "pie" | "line" | "table" | "none";
  humanSummary: string;
  insights?: string;
  spec?: any;
  suggestedFollowUps?: string[];
  onFollowUpClick?: (query: string) => void;
  onTeachAiClick?: (question: string) => void;
  userName?: string;
}

export function ResultsView({
  collection,
  intent,
  rows = [],
  columns = [],
  value,
  chartType = "table",
  humanSummary,
  insights,
  spec,
  suggestedFollowUps = [],
  onFollowUpClick,
  onTeachAiClick,
  userName = "Prospect+ User",
}: ResultsViewProps) {
  const [viewMode, setViewMode] = useState<"chart" | "table">(
    intent === "aggregate" && chartType !== "table" ? "chart" : "table"
  );
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskDefaultData, setTaskDefaultData] = useState<{ leadId?: string; companyName?: string; defaultTitle?: string }>({});
  const [pdfExporting, setPdfExporting] = useState(false);

  const containerUniqueId = useId().replace(/:/g, "_");
  const chartCaptureId = `chart_capture_${containerUniqueId}`;

  const handleExportCSV = () => {
    if (!rows || rows.length === 0) {
      toast.error("No data available to export");
      return;
    }
    const dataToExport = rows.map(({ id, ...rest }) => rest);
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${collection}_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded!");
  };

  const handleCopyExcelTsv = () => {
    if (!rows || rows.length === 0) return;
    const cols = columns.length > 0 ? columns : Object.keys(rows[0]).filter(k => k !== "id");
    const headerRow = cols.join("\t");
    const dataRows = rows.map(r => cols.map(c => String(r[c] ?? "")).join("\t"));
    const tsv = [headerRow, ...dataRows].join("\n");
    navigator.clipboard.writeText(tsv);
    toast.success("Copied table to clipboard for Excel / Google Sheets!");
  };

  const handleCopySlackEmail = () => {
    const lines = [
      `*${spec?.humanSummary || humanSummary}*`,
      insights ? `💡 _Takeaway:_ ${insights}` : "",
      "",
      intent === "count" ? `*Total Count:* ${value}` : "",
      intent === "aggregate" && typeof value === "object"
        ? Object.entries(value).map(([k, v]) => `• *${k}:* ${v}`).join("\n")
        : "",
      intent === "list"
        ? `*Top Records (${Math.min(rows.length, 5)} of ${rows.length}):*\n` +
          rows.slice(0, 5).map(r => `• ${r.companyName || r.name || r.id} (${r.customerStatus || r.status || "Active"})`).join("\n")
        : "",
      "",
      `_Generated via Prospect+ AI on ${new Date().toLocaleDateString("en-AU")}_`
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(lines);
    toast.success("Formatted summary copied for Slack / Email!");
  };

  const handleExportPdf = async () => {
    setPdfExporting(true);
    try {
      await generateExecutiveReportPdf({
        title: spec?.humanSummary || humanSummary,
        humanSummary,
        insights,
        spec,
        elementIdToCapture: viewMode === "chart" ? chartCaptureId : undefined,
        rows,
        columns,
        userName,
      });
      toast.success("Branded PDF Report downloaded!");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setPdfExporting(false);
    }
  };

  const openRecordPreview = (row: any) => {
    setSelectedRecord(row);
    setPreviewOpen(true);
  };

  const openTaskDialog = (row?: any) => {
    const target = row || (rows && rows.length > 0 ? rows[0] : null);
    setTaskDefaultData({
      leadId: target?.id,
      companyName: target?.companyName || target?.name,
      defaultTitle: target ? `Follow up with ${target.companyName || target.name || "contact"}` : "Follow up on query results",
    });
    setTaskModalOpen(true);
  };

  const renderBreakdown = () => {
    if (!spec) return null;
    const items: React.ReactNode[] = [];

    if (spec.filters && spec.filters.length > 0) {
      spec.filters.forEach((f: any, idx: number) => {
        items.push(
          <div key={`filter-${idx}`} className="inline-flex items-center gap-1 bg-[#095c7b]/5 border border-[#095c7b]/20 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
            <span className="font-mono text-[#095c7b]">{f.field}</span>
            <span className="text-slate-400 font-mono text-[9px]">{f.op}</span>
            <span className="font-semibold text-slate-800">"{String(f.value)}"</span>
          </div>
        );
      });
    }

    if (spec.dateRange) {
      items.push(
        <div key="daterange" className="inline-flex items-center gap-1 bg-[#095c7b]/5 border border-[#095c7b]/20 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
          <span className="font-mono text-[#095c7b]">{spec.dateRange.field}</span>
          <span className="text-slate-400 font-mono text-[9px]">range</span>
          <span className="font-semibold text-slate-800">"{spec.dateRange.from || spec.dateRange.to}"</span>
        </div>
      );
    }

    if (items.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-1.5 bg-[#FFFDF6] border border-border/80 rounded-lg p-2.5 text-xs">
        <span className="text-[#1A3D33] font-semibold flex items-center gap-1 text-[11px]">
          🔍 Query Scope:
        </span>
        <div className="flex flex-wrap gap-1">{items}</div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* 1. Executive Insight Takeaway */}
      {insights && (
        <div className="flex items-start gap-2.5 bg-gradient-to-r from-[#095c7b]/10 via-teal-500/5 to-transparent border border-[#095c7b]/20 rounded-xl p-3 text-xs text-slate-800">
          <div className="p-1 rounded-md bg-[#095c7b] text-white shrink-0 mt-0.5">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 leading-relaxed">
            <strong className="text-[#095c7b] font-semibold">AI Executive Insight:</strong> {insights}
          </div>
        </div>
      )}

      {/* 2. Query Scope Breakdown */}
      {renderBreakdown()}

      {/* 3. Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
        {/* Left: View Mode Toggle (for aggregate results) */}
        {intent === "aggregate" && (
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg shadow-2xs">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("chart")}
              className={`h-7 px-2.5 text-xs rounded-md font-medium transition ${
                viewMode === "chart"
                  ? "bg-[#095c7b] text-white font-semibold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 mr-1" />
              Chart
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("table")}
              className={`h-7 px-2.5 text-xs rounded-md font-medium transition ${
                viewMode === "table"
                  ? "bg-[#095c7b] text-white font-semibold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TableIcon className="h-3.5 w-3.5 mr-1" />
              Table
            </Button>
          </div>
        )}

        {/* Right: Export & CRM Actions */}
        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-7 px-2.5 text-xs bg-white hover:bg-slate-100 text-slate-700 border-slate-200 gap-1 font-medium shadow-2xs"
            title="Download full CSV"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            CSV
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyExcelTsv}
            className="h-7 px-2.5 text-xs bg-white hover:bg-slate-100 text-slate-700 border-slate-200 gap-1 font-medium shadow-2xs"
            title="Copy as Excel table to clipboard"
          >
            <Copy className="h-3.5 w-3.5 text-slate-500" />
            Excel Copy
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopySlackEmail}
            className="h-7 px-2.5 text-xs bg-white hover:bg-slate-100 text-slate-700 border-slate-200 gap-1 font-medium shadow-2xs"
            title="Copy formatted summary for Slack or Email"
          >
            <Share2 className="h-3.5 w-3.5 text-slate-500" />
            Email/Slack
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={pdfExporting}
            className="h-7 px-2.5 text-xs bg-white hover:bg-slate-100 text-slate-700 border-slate-200 gap-1 font-medium shadow-2xs"
            title="Generate branded executive PDF report"
          >
            <FileText className="h-3.5 w-3.5 text-[#095c7b]" />
            {pdfExporting ? "PDF..." : "PDF Report"}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => openTaskDialog()}
            className="h-7 px-2.5 text-xs bg-[#095c7b] hover:bg-[#07475f] text-white gap-1 font-medium shadow-2xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            New Task
          </Button>

          {onTeachAiClick && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onTeachAiClick(spec?.humanSummary || humanSummary)}
              className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-1 font-medium"
              title="Teach AI / Correct this interpretation"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Correct AI
            </Button>
          )}
        </div>
      </div>

      {/* 4. Main Data Rendering (Count, Chart, or Table) */}
      {intent === "count" ? (
        <Card className="max-w-xs bg-white border-border shadow-xs">
          <CardHeader className="pb-1 pt-3 px-4 border-b border-border/40">
            <CardTitle className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
              Total Count
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 px-4 pb-4">
            <div className="text-4xl font-bold text-[#095c7b] font-sans">{value}</div>
          </CardContent>
        </Card>
      ) : intent === "aggregate" && viewMode === "chart" ? (
        <div id={chartCaptureId}>
          <AskChartView
            data={rows}
            title={spec?.groupBy ? `Grouped by ${spec.groupBy}` : "Data Breakdown"}
            defaultChartType={chartType === "pie" ? "pie" : "bar"}
            onCategoryClick={(category) => {
              if (onFollowUpClick) {
                onFollowUpClick(`Show records where ${spec?.groupBy || "status"} is "${category}"`);
              }
            }}
          />
        </div>
      ) : (
        /* Data Table View */
        <div className="border border-border/80 rounded-xl overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto max-h-96">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10">
                <TableRow>
                  {columns.slice(0, 6).map((col) => (
                    <TableHead key={col} className="text-slate-700 font-semibold text-xs capitalize py-2.5">
                      {col}
                    </TableHead>
                  ))}
                  <TableHead className="text-right text-xs font-semibold text-slate-700 py-2.5">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, rIdx) => {
                  const statusVal = row.customerStatus || row.status;
                  const isHot = row.totalScore && row.totalScore >= 80;

                  return (
                    <TableRow
                      key={rIdx}
                      onClick={() => openRecordPreview(row)}
                      className="cursor-pointer hover:bg-slate-50/80 transition border-border/60 text-xs"
                    >
                      {columns.slice(0, 6).map((col) => {
                        const val = row[col];
                        const isStatusCol = col === "customerStatus" || col === "status";

                        return (
                          <TableCell key={col} className="py-2.5 font-medium text-slate-800">
                            {isStatusCol && val ? (
                              <Badge className={`${getStatusColor(val)} border px-2 py-0.2 text-[11px] font-semibold`}>
                                {val}
                              </Badge>
                            ) : typeof val === "boolean" ? (
                              val ? "Yes" : "No"
                            ) : typeof val === "number" ? (
                              <span className="font-mono">{val}</span>
                            ) : (
                              String(val ?? "-")
                            )}
                          </TableCell>
                        );
                      })}

                      <TableCell className="py-2.5 text-right font-medium" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openRecordPreview(row)}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-[#095c7b]"
                            title="Quick Preview"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openTaskDialog(row)}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-[#095c7b]"
                            title="Create Task"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 5. Suggested Follow-Up Chips */}
      {suggestedFollowUps && suggestedFollowUps.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#095c7b]" /> Next Actions:
          </span>
          {suggestedFollowUps.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onFollowUpClick && onFollowUpClick(prompt)}
              className="text-xs bg-white hover:bg-[#095c7b]/10 text-slate-700 hover:text-[#095c7b] border border-slate-200/80 px-2.5 py-1 rounded-full font-medium transition flex items-center gap-1 shadow-2xs"
            >
              {prompt} &rarr;
            </button>
          ))}
        </div>
      )}

      {/* Dialog Modals */}
      <QuickTaskDialog
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        leadId={taskDefaultData.leadId}
        companyName={taskDefaultData.companyName}
        defaultTitle={taskDefaultData.defaultTitle}
      />

      <RecordPreviewDrawer
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        record={selectedRecord}
        collection={collection}
        onOpenTaskModal={(rec) => openTaskDialog(rec)}
      />
    </div>
  );
}
