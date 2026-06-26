'use client';

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Papa from 'papaparse';
import { app } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function BulkImportProducts() {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const downloadSampleCSV = () => {
    const headers = [
      'Internal ID',
      'Name',
      'Delivery Speeds',
      'Price Plans',
      'Carrier',
      'Product Weight',
      'Product Type',
      'Sales Price inc GST',
      'Sales Price exc GST',
      'Purchase Price exc GST',
      'Partner Commission Rate'
    ];
    const sampleRows = [
      ['1001', 'Premium Product A', 'Next Day', 'Premium Plan', 'FedEx', '1.5kg', 'Parcel', '110.00', '100.00', '80.00', '0.10']
    ];

    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_products.csv');
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
    toast({ title: 'Importing...', description: 'Parsing CSV and importing products...' });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const products = results.data.map((row: any) => ({
            id: row['Internal ID'],
            name: row['Name'] || row['Display Name'],
            deliverySpeed: row['Delivery Speeds'],
            pricePlan: row['Price Plans'],
            carrier: row['Carrier'],
            productWeight: row['Product Weight'],
            productType: row['Product Type'],
            salesPriceIncGst: row['Sales Price inc GST'],
            salesPriceExcGst: row['Sales Price exc GST'],
            purchasePriceExcGst: row['Purchase Price exc GST'],
            partnerCommissionRate: row['Partner Commission Rate'],
          }));

          const functions = getFunctions(app, 'australia-southeast1');
          const importProducts = httpsCallable(functions, 'bulkImportProducts');
          
          const response = await importProducts({ products });
          const data = response.data as any;

          if (data.success) {
            toast({ title: 'Success', description: data.message || 'Successfully imported products.' });
          } else {
            toast({ variant: 'destructive', title: 'Error', description: data.message || 'Import completed with errors.' });
          }
          
          if (data.errors && data.errors.length > 0) {
              console.error("Import Errors:", data.errors);
              toast({ variant: 'destructive', title: 'Warning', description: `Check console for ${data.errors.length} row errors.` });
          }
        } catch (error: any) {
          console.error('Import failed:', error);
          toast({ variant: 'destructive', title: 'Error', description: error?.message || 'Failed to import CSV.' });
        } finally {
          setIsImporting(false);
          // reset the input
          target.value = '';
        }
      },
      error: (error) => {
        console.error("PapaParse error:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to read the CSV file.' });
        setIsImporting(false);
        target.value = '';
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={isImporting}
          className="max-w-xs cursor-pointer"
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
            <Loader2 className="h-4 w-4 animate-spin" /> Importing...
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Note: Existing products will be updated. Any active products NOT in the uploaded CSV will be soft-deleted (set to inactive).
      </p>
    </div>
  );
}
