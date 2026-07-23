'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Loader } from '../ui/loader';
import { getLeadsFromFirebase, getCompaniesFromFirebase } from '@/services/firebase';
import { firestore } from '@/lib/firebase';
import { collectionGroup, getDocs } from 'firebase/firestore';
import type { Lead } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet, Calendar, DollarSign } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export function BulkExportInvoices() {
  const [loading, setLoading] = useState(false);
  const [countLoading, setCountLoading] = useState(true);
  const [totalInvoicesCount, setTotalInvoicesCount] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minTotal, setMinTotal] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    async function fetchCount() {
      try {
        const invoicesSnapshot = await getDocs(collectionGroup(firestore, 'invoices'));
        setTotalInvoicesCount(invoicesSnapshot.size);
      } catch (error) {
        console.error('Failed to fetch invoice count:', error);
      } finally {
        setCountLoading(false);
      }
    }
    fetchCount();
  }, []);

  const handleExport = async () => {
    setLoading(true);
    try {
      // 1. Fetch all invoices
      const invoicesSnapshot = await getDocs(collectionGroup(firestore, 'invoices'));
      if (invoicesSnapshot.empty) {
        toast({ title: 'No invoices found', description: 'There are no invoices in the database.' });
        setLoading(false);
        return;
      }

      // 2. Fetch leads and companies to map parent details
      const [leads, companies] = await Promise.all([
        getLeadsFromFirebase({ summary: true }),
        getCompaniesFromFirebase({ skipCoordinateCheck: true })
      ]);

      // Create mapping maps for quick lookup
      const customerMap = new Map<string, {
        companyName: string;
        entityId: string;
        salesRecordInternalId: string;
        type: string;
      }>();

      leads.forEach(l => {
        customerMap.set(l.id, {
          companyName: l.companyName || '',
          entityId: l.entityId || '',
          salesRecordInternalId: l.salesRecordInternalId || '',
          type: 'Lead'
        });
      });

      companies.forEach(c => {
        customerMap.set(c.id, {
          companyName: c.companyName || '',
          entityId: c.entityId || '',
          salesRecordInternalId: c.salesRecordInternalId || (c as any).internalid || '',
          type: 'Company'
        });
      });

      // 3. Process invoice data & filter
      const allInvoiceRows: any[] = [];
      const invoiceKeys = new Set<string>();

      invoicesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const parentId = doc.ref.parent.parent?.id || '';
        const parentCol = doc.ref.parent.parent?.parent.id || ''; // e.g. leads or companies
        const customer = customerMap.get(parentId);

        // Apply filters
        const invoiceDateStr = data.invoiceDate || '';
        if (startDate && invoiceDateStr && invoiceDateStr < startDate) return;
        if (endDate && invoiceDateStr && invoiceDateStr > endDate) return;

        const total = Number(data.invoiceTotal || 0);
        if (minTotal && !isNaN(Number(minTotal)) && total < Number(minTotal)) return;

        // Build invoice row
        const row: any = {
          'Customer Internal ID (Firebase ID)': parentId,
          'Customer ID (Entity ID)': customer?.entityId || '',
          'NetSuite Internal ID': customer?.salesRecordInternalId || '',
          'Company Name': customer?.companyName || '',
          'Customer Type': customer?.type || (parentCol === 'companies' ? 'Company' : parentCol === 'leads' ? 'Lead' : 'Unknown'),
          'Invoice DB Document ID': doc.id,
        };

        // Add all fields from the database invoice
        Object.keys(data).forEach(key => {
          // Format value if it's an object/array, otherwise clean string
          let val = data[key];
          if (val === null || val === undefined) {
            val = '';
          } else if (typeof val === 'object') {
            val = JSON.stringify(val);
          } else {
            val = String(val);
          }
          row[key] = val;
          invoiceKeys.add(key);
        });

        allInvoiceRows.push(row);
      });

      if (allInvoiceRows.length === 0) {
        toast({ title: 'No matching invoices', description: 'No invoices matched your filter criteria.' });
        setLoading(false);
        return;
      }

      // Define static columns first
      const baseHeaders = [
        'Customer Internal ID (Firebase ID)',
        'Customer ID (Entity ID)',
        'NetSuite Internal ID',
        'Company Name',
        'Customer Type',
        'Invoice DB Document ID'
      ];

      // Add dynamic invoice headers sorted alphabetically
      const dynamicHeaders = Array.from(invoiceKeys).sort();
      const allHeaders = [...baseHeaders, ...dynamicHeaders];

      // Generate CSV content
      const escapeCsvCell = (cell: any) => {
        if (cell == null) return '';
        const stringCell = String(cell);
        if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
          return `"${stringCell.replace(/"/g, '""')}"`;
        }
        return stringCell;
      };

      const csvRows = allInvoiceRows.map(row => {
        return allHeaders.map(header => escapeCsvCell(row[header] || '')).join(',');
      });

      const csvContent = [allHeaders.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `exported_invoices_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export Successful',
        description: `${allInvoiceRows.length} invoices successfully exported to CSV.`
      });

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'An error occurred while exporting invoices. Make sure permissions are correct.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-muted/30 border rounded-xl gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-lg">Invoice Export Controls</h4>
            <p className="text-sm text-muted-foreground">
              {countLoading ? 'Loading database stats...' : `Total invoices in system: ${totalInvoicesCount}`}
            </p>
          </div>
        </div>

        <Button
          onClick={handleExport}
          disabled={loading || countLoading}
          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all"
        >
          {loading ? <Loader className="mr-2" /> : <Download className="mr-2 h-4 w-4" />}
          Export All Invoices
        </Button>
      </div>

      <div className="border rounded-xl p-5 bg-card space-y-4">
        <h5 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Filters (Optional)</h5>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="inv-start-date" className="flex items-center gap-1.5 text-sm font-medium">
              <Calendar className="w-4 h-4 text-muted-foreground" /> Start Date
            </Label>
            <Input
              id="inv-start-date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inv-end-date" className="flex items-center gap-1.5 text-sm font-medium">
              <Calendar className="w-4 h-4 text-muted-foreground" /> End Date
            </Label>
            <Input
              id="inv-end-date"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inv-min-total" className="flex items-center gap-1.5 text-sm font-medium">
              <DollarSign className="w-4 h-4 text-muted-foreground" /> Min Invoice Total ($)
            </Label>
            <Input
              id="inv-min-total"
              type="number"
              min="0"
              placeholder="E.g. 100"
              value={minTotal}
              onChange={e => setMinTotal(e.target.value)}
              className="bg-background"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
