"use client"

import React from "react";
import Papa from "papaparse";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, HelpCircle } from "lucide-react";
import { getStatusColor } from "@/lib/status-colors";

interface ResultsViewProps {
  collection: "leads" | "companies" | "users" | "franchisees";
  intent: "list" | "count" | "aggregate";
  rows: any[];
  columns: string[];
  value?: any;
  humanSummary: string;
}

export function ResultsView({ collection, intent, rows, columns, value, humanSummary }: ResultsViewProps) {
  
  const handleExportCSV = () => {
    if (!rows || rows.length === 0) return;
    const dataToExport = rows.map(({ id, ...rest }) => rest);
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
    return null;
  };

  // Render Count View
  if (intent === "count" && typeof value === "number") {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-sm font-medium text-muted-foreground">{humanSummary}</div>
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
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center gap-2">
        <HelpCircle className="h-10 w-10 text-muted-foreground/30" />
        <p className="font-semibold text-slate-700">No results found matching your query.</p>
        <p className="text-xs text-muted-foreground">Try rephrasing your search or using the Terminology panel.</p>
      </div>
    );
  }

  const priorityCols = ["companyName", "status", "bucket", "franchisee", "email", "activeRole", "displayName", "dateLeadEntered"];
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
            {rows.map((row, i) => {
              const link = getRecordLink(row);
              return (
                <TableRow key={row.id || i} className="border-border hover:bg-slate-50/50">
                  {displayCols.map((col) => {
                    const val = row[col];
                    if (col === "status") {
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
