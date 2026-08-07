'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, ExternalLink, Calendar, DollarSign, Tag, Hash, Building2 } from 'lucide-react';
import type { Invoice } from '@/lib/types';
import { safeFormatDate } from '@/lib/utils';

interface InvoiceDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  companyName?: string;
}

export function InvoiceDetailsDialog({
  isOpen,
  onOpenChange,
  invoice,
  companyName,
}: InvoiceDetailsDialogProps) {
  if (!invoice) return null;

  const invoiceId = invoice.invoiceDocumentID || invoice.documentId || invoice.id || 'N/A';
  const statusStr = invoice.invoiceStatus || invoice.status || 'Unknown';
  const lowerStatus = statusStr.toLowerCase();

  let statusBadgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
  if (lowerStatus.includes('paid')) {
    statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (lowerStatus.includes('overdue')) {
    statusBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (lowerStatus.includes('open') || lowerStatus.includes('unpaid') || lowerStatus.includes('pending')) {
    statusBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  const invoiceTotal = typeof invoice.invoiceTotal === 'number'
    ? invoice.invoiceTotal
    : parseFloat(String(invoice.invoiceTotal || '0'));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] md:w-full">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pr-6">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-primary" />
                Invoice #{invoiceId}
              </DialogTitle>
              {companyName && (
                <DialogDescription className="flex items-center gap-1.5 text-sm">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{companyName}</span>
                </DialogDescription>
              )}
            </div>
            <Badge variant="outline" className={`px-3 py-1 text-xs font-semibold ${statusBadgeClass}`}>
              {statusStr}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 p-4 rounded-xl border border-muted">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Date
              </span>
              <p className="text-sm font-semibold">
                {invoice.invoiceDate ? safeFormatDate(invoice.invoiceDate, 'PP') : 'N/A'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" /> Total Amount
              </span>
              <p className="text-sm font-bold text-primary">
                ${isNaN(invoiceTotal) ? '0.00' : invoiceTotal.toFixed(2)}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" /> Type
              </span>
              <p className="text-sm font-semibold truncate" title={invoice.invoiceType}>
                {invoice.invoiceType || 'Service Invoice'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" /> NetSuite ID
              </span>
              <p className="text-sm font-semibold">
                {invoice.invoiceInternalID || 'N/A'}
              </p>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Invoice Line Items
            </h4>
            {invoice.items && invoice.items.length > 0 ? (
              <div className="rounded-lg border border-slate-200 overflow-hidden bg-background">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Service Description</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Rate</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Qty</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map((item, idx) => {
                      const rateNum = Number(item.rate || 0);
                      const totalNum = Number(item.totalAmount || (rateNum * Number(item.qty || 1)));
                      return (
                        <TableRow key={idx} className="text-xs">
                          <TableCell className="font-medium">{item.service || 'Service'}</TableCell>
                          <TableCell className="text-right">${rateNum.toFixed(2)}</TableCell>
                          <TableCell className="text-center">{item.qty || 1}</TableCell>
                          <TableCell className="text-right font-semibold">${totalNum.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-xs text-center py-6 border border-dashed rounded-lg text-muted-foreground">
                No individual line items recorded for this invoice.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-4">
          {invoice.invoiceURL ? (
            <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
              <a href={invoice.invoiceURL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> View NetSuite Invoice
              </a>
            </Button>
          ) : (
            <div />
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
