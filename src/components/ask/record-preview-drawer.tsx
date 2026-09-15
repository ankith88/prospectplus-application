"use client";

import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink, Phone, Mail, MapPin, Building2, User,
  Calendar, CheckCircle2, Clock, Sparkles, Loader2, ShieldCheck, DollarSign
} from "lucide-react";
import Link from "next/link";
import { getStatusColor } from "@/lib/status-colors";

interface RecordPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  record: any;
  collection: string;
  onOpenTaskModal?: (record: any) => void;
}

export function RecordPreviewDrawer({
  isOpen,
  onClose,
  record,
  collection,
  onOpenTaskModal,
}: RecordPreviewDrawerProps) {
  if (!record) return null;

  const recordName = record.companyName || record.name || record.ticketNumber || record.code || "Record Details";
  const recordId = record.id;

  const getRecordHref = () => {
    if (collection === "leads") return `/leads/${recordId}`;
    if (collection === "companies") return `/companies/${recordId}`;
    if (collection === "tickets") return `/admin/tickets/${recordId}`;
    return null;
  };

  const statusColor = record.customerStatus || record.status
    ? getStatusColor(record.customerStatus || record.status)
    : "bg-slate-100 text-slate-800";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md bg-white overflow-y-auto p-6 flex flex-col gap-5">
        <SheetHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#095c7b]/10 text-[#095c7b] uppercase tracking-wider">
              {collection.toUpperCase()} PREVIEW
            </span>
            {(record.customerStatus || record.status) && (
              <Badge className={`${statusColor} border px-2 py-0.5 text-xs font-semibold`}>
                {record.customerStatus || record.status}
              </Badge>
            )}
          </div>
          <SheetTitle className="text-xl font-bold font-serif text-slate-900 pt-1 text-left">
            {recordName}
          </SheetTitle>
          {record.franchisee && (
            <SheetDescription className="text-xs text-slate-500 text-left flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              Territory: <strong className="text-slate-700">{record.franchisee}</strong>
            </SheetDescription>
          )}
        </SheetHeader>

        {/* Action Header Links */}
        <div className="flex items-center gap-2">
          {getRecordHref() && (
            <Button asChild size="sm" className="bg-[#095c7b] hover:bg-[#07475f] text-white flex-1 text-xs gap-1.5">
              <Link href={getRecordHref()!} target="_blank">
                <ExternalLink className="h-3.5 w-3.5" />
                Open Full CRM Record
              </Link>
            </Button>
          )}
          {onOpenTaskModal && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenTaskModal(record)}
              className="text-xs border-border hover:bg-slate-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-[#095c7b]" />
              New Task
            </Button>
          )}
        </div>

        {/* Key Metrics / Score Card */}
        {(record.totalScore !== undefined || record.jobCount !== undefined || record.invoiceTotal !== undefined) && (
          <div className="grid grid-cols-2 gap-2 bg-[#FFFDF6] border border-border/80 rounded-xl p-3 text-xs">
            {record.totalScore !== undefined && (
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-500">Lead Score</span>
                <span className="text-lg font-bold text-[#095c7b]">{record.totalScore}</span>
              </div>
            )}
            {record.jobCount !== undefined && (
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-500">LocalMile Jobs</span>
                <span className="text-lg font-bold text-slate-800">{record.jobCount}</span>
              </div>
            )}
            {record.invoiceTotal !== undefined && (
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-500">Invoice Total</span>
                <span className="text-lg font-bold text-emerald-600">${record.invoiceTotal}</span>
              </div>
            )}
            {record.bucket && (
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-500">Pipeline Bucket</span>
                <span className="text-xs font-semibold text-slate-700 capitalize">{record.bucket}</span>
              </div>
            )}
          </div>
        )}

        {/* Contact & Location Info */}
        <div className="flex flex-col gap-3 text-xs">
          <div className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] border-b border-border/40 pb-1">
            Contact & Address Details
          </div>

          {record.phone && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" /> Phone
              </span>
              <a href={`tel:${record.phone}`} className="font-semibold text-[#095c7b] hover:underline">
                {record.phone}
              </a>
            </div>
          )}

          {record.email && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> Email
              </span>
              <a href={`mailto:${record.email}`} className="font-semibold text-[#095c7b] hover:underline truncate max-w-[200px]">
                {record.email}
              </a>
            </div>
          )}

          {(record.address || record.city || record.state) && (
            <div className="flex items-start justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> Address
              </span>
              <span className="font-medium text-slate-800 text-right">
                {[record.address, record.city, record.state, record.postalCode || record.postcode].filter(Boolean).join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* Timestamps & Key History */}
        <div className="flex flex-col gap-2 text-xs">
          <div className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] border-b border-border/40 pb-1">
            Timeline & Dates
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {record.dateLeadEntered && (
              <div className="p-2 rounded bg-slate-50">
                <span className="text-slate-400 block">Entered:</span>
                <span className="font-semibold text-slate-700">{String(record.dateLeadEntered).slice(0, 10)}</span>
              </div>
            )}
            {record.lastContactedDate && (
              <div className="p-2 rounded bg-slate-50">
                <span className="text-slate-400 block">Last Contact:</span>
                <span className="font-semibold text-slate-700">{String(record.lastContactedDate).slice(0, 10)}</span>
              </div>
            )}
            {record.followUpDate && (
              <div className="p-2 rounded bg-slate-50">
                <span className="text-slate-400 block">Follow Up:</span>
                <span className="font-semibold text-slate-700">{String(record.followUpDate).slice(0, 10)}</span>
              </div>
            )}
            {record.quoteSentAt && (
              <div className="p-2 rounded bg-slate-50">
                <span className="text-slate-400 block">Quote Sent:</span>
                <span className="font-semibold text-slate-700">{String(record.quoteSentAt).slice(0, 10)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Full Details Property List */}
        <div className="flex flex-col gap-2 text-xs mt-auto pt-4 border-t border-border/40">
          <span className="text-[11px] text-slate-400">Record ID: <code className="font-mono text-[10px] text-slate-600">{record.id}</code></span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
