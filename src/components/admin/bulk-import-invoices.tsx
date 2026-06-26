'use client';

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Papa from 'papaparse';
import { app } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

interface ImportSummary {
  success: boolean;
  totalProcessed: number;
  totalImported: number;
  totalUpdated: number;
  skippedCompanies: { customerInternalId: string; reason: string; documentNumber?: string }[];
}

export function BulkImportInvoices() {
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const { toast } = useToast();

  const downloadSampleCSV = () => {
    const headers = [
      'Internal ID',
      'Type',
      'Date',
      'Document Number',
      'Item',
      'Quantity',
      'Amount',
      'Invoice Status',
      'Customer Internal ID',
      'Date Range: From',
      'Date Range: To',
      'Period',
      'Tax Period',
      'Amount (Transaction Tax Total)',
      'Days Open',
      'Days Overdue',
      'Date Closed'
    ];
    const sampleRows = [
      ['3001', 'Invoice', '2026-06-27', 'INV-001', 'Premium Service', '2', '150.00', 'Paid', 'CUST-999', '2026-06-01', '2026-06-15', 'June 2026', 'June 2026', '15.00', '0', '0', '2026-06-20']
    ];

    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_invoices.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target;
    const file = target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setSummary(null);
    toast({ title: 'Importing...', description: 'Parsing CSV and importing invoices...' });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const functions = getFunctions(app, 'australia-southeast1');
          const importInvoices = httpsCallable(functions, 'bulkImportInvoices');

          const response = await importInvoices({ invoices: results.data });
          const data = response.data as ImportSummary;

          setSummary(data);

          if (data.success) {
            toast({
              title: 'Import Completed',
              description: `Successfully imported ${data.totalImported} and updated ${data.totalUpdated} invoices.`,
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Error',
              description: 'Import completed with errors.',
            });
          }
        } catch (error: any) {
          console.error('Import failed:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error?.message || 'Failed to import CSV.',
          });
        } finally {
          setIsImporting(false);
          // reset the input
          target.value = '';
        }
      },
      error: (error) => {
        console.error('PapaParse error:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to read the CSV file.' });
        setIsImporting(false);
        target.value = '';
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isImporting}
            className="max-w-xs cursor-pointer file:text-foreground"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={downloadSampleCSV}
            type="button"
          >
            Download Sample CSV
          </Button>
          {isImporting && (
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Importing...
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
          <HelpCircle className="h-3.5 w-3.5" />
          CSV must contain: Internal ID, Type, Date, Document Number, Item, Quantity, Amount, Invoice Status, Customer Internal ID. Note: existing invoices will have new items appended.
        </p>
      </div>

      {summary && (
        <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h3 className="font-semibold text-lg">Import Results Summary</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Processed Rows</div>
              <div className="text-2xl font-bold mt-1">{summary.totalProcessed}</div>
            </div>
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
              <div className="text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-semibold">New Invoices</div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{summary.totalImported}</div>
            </div>
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
              <div className="text-xs text-blue-700 dark:text-blue-400 uppercase tracking-wider font-semibold">Updated Invoices</div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">{summary.totalUpdated}</div>
            </div>
            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
              <div className="text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider font-semibold">Skipped Invoices</div>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{summary.skippedCompanies.length}</div>
            </div>
          </div>

          {summary.skippedCompanies.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Skipped Records due to Missing Company ({summary.skippedCompanies.length})</span>
              </div>
              <div className="max-h-60 overflow-y-auto rounded-lg border bg-muted/30 divide-y text-sm">
                {summary.skippedCompanies.map((skipped, idx) => (
                  <div key={idx} className="p-3 flex justify-between items-center gap-4">
                    <div>
                      <span className="font-medium text-foreground">Company Internal ID:</span>{' '}
                      <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-foreground/80">{skipped.customerInternalId}</code>
                      {skipped.documentNumber && (
                        <span className="ml-3 text-muted-foreground">
                          Doc Ref: <span className="font-semibold text-foreground/75">{skipped.documentNumber}</span>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {skipped.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
