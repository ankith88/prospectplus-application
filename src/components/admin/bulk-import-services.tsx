'use client';

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Papa from 'papaparse';
import { app } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function BulkImportServices() {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target;
    const file = target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    toast({ title: 'Importing...', description: 'Parsing CSV and importing services...' });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const services = results.data.map((row: any) => ({
            id: row['Internal ID'],
            code: row['Name'],
            netsuiteItemName: row['NetSuite Item'],
          }));

          // Basic validation
          const invalidRows = services.filter((s: any) => !s.id || !s.code || !s.netsuiteItemName);
          if (invalidRows.length > 0) {
              toast({ variant: 'destructive', title: 'Validation Error', description: `Found ${invalidRows.length} rows missing required columns (Internal ID, Name, or NetSuite Item).`});
              setIsImporting(false);
              target.value = '';
              return;
          }

          const functions = getFunctions(app, 'australia-southeast1');
          const importServices = httpsCallable(functions, 'bulkImportServices');
          
          const response = await importServices({ services });
          const data = response.data as any;

          if (data.success) {
            toast({ title: 'Success', description: data.message || 'Successfully imported services.' });
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
    <div className="flex items-center gap-4">
      <Input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        disabled={isImporting}
        className="max-w-xs cursor-pointer"
      />
      {isImporting && (
        <span className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Importing...
        </span>
      )}
    </div>
  );
}
