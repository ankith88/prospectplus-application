'use client';

import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, ExternalLink, Download, FileText, Building2 } from 'lucide-react';
import type { Invoice } from '@/lib/types';
import { safeFormatDate, getInvoiceLineItems } from '@/lib/utils';
import { format, addDays } from 'date-fns';

interface InvoiceDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  companyName?: string;
  companyAbn?: string;
  companyAddress?: {
    poBox?: string;
    street?: string;
    street1?: string;
    street2?: string;
    city?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    postalCode?: string;
    [key: string]: any;
  };
}

export function InvoiceDetailsDialog({
  isOpen,
  onOpenChange,
  invoice,
  companyName,
  companyAbn,
  companyAddress,
}: InvoiceDetailsDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const invoiceId = invoice.invoiceDocumentID || invoice.documentId || invoice.id || 'N/A';
  const statusStr = invoice.invoiceStatus || invoice.status || 'Open';
  const lowerStatus = statusStr.toLowerCase();

  let statusBadgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
  if (lowerStatus.includes('paid')) {
    statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (lowerStatus.includes('overdue')) {
    statusBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (lowerStatus.includes('open') || lowerStatus.includes('unpaid') || lowerStatus.includes('pending')) {
    statusBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  const rawInvoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date();
  const formattedInvoiceDate = invoice.invoiceDate ? safeFormatDate(invoice.invoiceDate, 'd/M/yyyy') : format(new Date(), 'd/M/yyyy');
  const formattedDueDate = safeFormatDate(addDays(rawInvoiceDate, 15), 'd/M/yyyy');

  const periodFrom = (invoice as any).periodStartDate || (invoice as any).startDate || formattedInvoiceDate;
  const periodTo = (invoice as any).periodEndDate || (invoice as any).endDate || formattedInvoiceDate;
  const poNumber = invoice.customerPO || (invoice as any).poNumber || (invoice as any).customerPo || '';

  const rawTotal = typeof invoice.invoiceTotal === 'number'
    ? invoice.invoiceTotal
    : parseFloat(String(invoice.invoiceTotal || '0'));
  const invoiceTotal = isNaN(rawTotal) ? 0 : rawTotal;

  // Calculate Subtotal and GST
  const subtotal = Number((invoiceTotal / 1.1).toFixed(2));
  const gstAmount = Number((invoiceTotal - subtotal).toFixed(2));

  const lineItems = getInvoiceLineItems(invoice);

  // Address and ABN resolution
  const resolvedAbn = companyAbn || (invoice as any)?.companyAbn || (invoice as any)?.abn || (companyAddress as any)?.abn || '';
  const poBoxLine = (companyAddress as any)?.poBox || (companyAddress as any)?.box || '';
  const streetLine = companyAddress?.street || companyAddress?.street1 || '';
  const street2Line = (companyAddress as any)?.street2 || '';
  const cityStatePostcode = [
    companyAddress?.city || companyAddress?.suburb || '',
    companyAddress?.state || '',
    companyAddress?.postcode || companyAddress?.postalCode || ''
  ].filter(Boolean).join(' ');

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-slate-100">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#095c7b]" />
            <DialogTitle className="text-lg font-bold text-slate-900">
              Tax Invoice Preview — #{invoiceId}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass}`}>
              {statusStr}
            </Badge>
          </div>
        </DialogHeader>

        {/* Realistic Tax Invoice Document matching NetSuite Print Layout */}
        <div 
          ref={printRef} 
          className="bg-white text-slate-900 p-8 sm:p-10 rounded-lg shadow-sm border border-slate-200 space-y-6 font-sans text-xs print:m-0 print:p-0 print:border-none print:shadow-none"
        >
          {/* Top Header: Brand Logo & Title */}
          <div className="flex items-start justify-between">
            <div>
              {/* MailPlus Logo */}
              <div className="inline-flex items-center bg-[#4a4f54] text-[#fcd34d] px-3.5 py-1.5 rounded-lg">
                <span className="font-black text-xl tracking-tight text-[#fcd34d]">mail</span>
                <span className="font-bold text-xl tracking-tight text-white ml-0.5">plus</span>
              </div>
            </div>

            <div className="text-right">
              <h1 className="text-3xl font-light text-slate-800 tracking-tight">Tax Invoice</h1>
            </div>
          </div>

          {/* Bill To & Invoice Info Block */}
          <div className="grid grid-cols-2 gap-6 pt-2">
            {/* Bill To */}
            <div>
              <div className="text-[11px] font-bold text-slate-900 mb-1 uppercase tracking-wider text-slate-500">Bill To</div>
              <div className="text-slate-900 font-bold text-xs">
                {companyName || (invoice as any).customerName || 'Valued Customer'}
              </div>
              {poBoxLine && <div className="text-slate-700 text-[11px] font-medium">{poBoxLine}</div>}
              {streetLine && <div className="text-slate-600 text-[11px]">{streetLine}</div>}
              {street2Line && <div className="text-slate-600 text-[11px]">{street2Line}</div>}
              {cityStatePostcode && <div className="text-slate-600 text-[11px]">{cityStatePostcode}</div>}
            </div>

            {/* Invoice Details */}
            <div className="text-right space-y-1">
              <div className="text-sm font-bold text-slate-900">
                Invoice #: <span className="font-black text-slate-950">{invoiceId}</span>
              </div>
              <div className="text-slate-700 text-xs font-medium">
                Date: <strong className="text-slate-900">{formattedInvoiceDate}</strong>
              </div>
              <div className="text-slate-700 text-xs font-medium">
                Due Date: <strong className="text-slate-900">{formattedDueDate}</strong>
              </div>
              {resolvedAbn ? (
                <div className="text-slate-700 text-xs font-medium">
                  ABN: <strong className="text-slate-900">{resolvedAbn}</strong>
                </div>
              ) : null}
            </div>
          </div>

          {/* Terms Strip */}
          <div className="grid grid-cols-4 bg-[#e9ecef] border border-slate-300 rounded px-3 py-2 text-center text-xs">
            <div>
              <div className="text-[10px] font-bold text-slate-700">Terms</div>
              <div className="font-medium text-slate-900 mt-0.5">Net 15 Days</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-700">Services From</div>
              <div className="font-medium text-slate-900 mt-0.5">{periodFrom}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-700">Service To</div>
              <div className="font-medium text-slate-900 mt-0.5">{periodTo}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-700">PO #</div>
              <div className="font-medium text-slate-900 mt-0.5">{poNumber || '-'}</div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[#e9ecef] text-slate-800 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2 px-3 text-center w-14">Qty</th>
                  <th className="py-2 px-3 text-left">Item</th>
                  <th className="py-2 px-3 text-left">Details</th>
                  <th className="py-2 px-3 text-right w-24">Rate</th>
                  <th className="py-2 px-3 text-right w-24">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {lineItems.length > 0 ? (
                  lineItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-800">{item.qty}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{item.service}</td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">{(item as any).itemDetails || ''}</td>
                      <td className="py-2.5 px-3 text-right text-slate-800 font-mono">${item.rate.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-900 font-semibold font-mono">${item.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-800">1</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{invoice.invoiceType || 'Standard Service'}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">-</td>
                    <td className="py-2.5 px-3 text-right text-slate-800 font-mono">${invoiceTotal.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-900 font-semibold font-mono">${invoiceTotal.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Totals (Right Aligned) */}
          <div className="flex justify-end pt-1">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between py-1 text-slate-700">
                <span className="font-semibold">Subtotal</span>
                <span className="font-mono font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700">
                <span className="font-semibold">GST</span>
                <span className="font-mono font-medium">${gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 px-2.5 bg-[#e9ecef] rounded font-bold text-slate-950 text-sm border-t border-slate-300">
                <span>Total</span>
                <span className="font-mono">${invoiceTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Remittance & Direct Deposit Information */}
          <div className="border-t border-slate-200 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-[11px] text-slate-700 leading-relaxed">
            <div>
              <div className="font-bold text-slate-900 underline mb-1">Mail Plus Remittance</div>
              <div>GPO Box 586</div>
              <div>Sydney NSW 2001</div>
              <div>Ph: 1300 65 65 95</div>
              <div>Fax: 1300 65 65 94</div>
              <div>Email: remittance@mailplus.com.au</div>
            </div>

            <div>
              <div className="font-bold text-slate-900 underline mb-1">Direct Deposit Information</div>
              <div className="font-medium text-slate-800">Commonwealth Bank of Australia</div>
              <div>Mail Plus Pty Ltd</div>
              <div>BSB: <strong className="font-mono text-slate-900">067-965</strong></div>
              <div>Account: <strong className="font-mono text-slate-900">100223896</strong></div>
              <div className="pt-1 text-slate-600">
                Pay with credit card online at <br />
                <a 
                  href="https://www.bpoint.com.au/pay/mailplus" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[#095c7b] underline font-medium"
                >
                  https://www.bpoint.com.au/pay/mailplus
                </a>
              </div>
            </div>
          </div>

          <div className="text-right text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            1 of 1
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-4 no-print">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={handlePrint}
              className="gap-1.5 text-xs font-medium"
            >
              <Printer className="h-4 w-4 text-slate-600" /> Print / Save PDF
            </Button>

            {invoice.invoiceURL && (
              <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs font-medium">
                <a href={invoice.invoiceURL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> NetSuite Link
                </a>
              </Button>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="w-full sm:w-auto text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

