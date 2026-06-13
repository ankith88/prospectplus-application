'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { getAllFranchisees } from '@/services/firebase';
import { Franchisee } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function BulkImportOperators() {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Load franchisees to map names to internal IDs
    getAllFranchisees().then(setFranchisees).catch(console.error);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target;
    const file = target.files?.[0];
    if (!file) return;

    if (franchisees.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Franchisee data not loaded yet. Please try again in a moment.' });
      target.value = '';
      return;
    }

    // Create a map for quick lookup (case insensitive)
    const nameToIdMap = new Map<string, string>();
    franchisees.forEach(f => {
      if (f.name) nameToIdMap.set(f.name.toLowerCase().trim(), f.internalId);
    });

    setIsImporting(true);
    toast({ title: 'Importing...', description: 'Parsing CSV and importing operators...' });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: async (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            throw new Error("The CSV file is empty.");
          }

          const operators = results.data.map((row: any) => {
            const mainName = (row['Franchisee Territory'] || row['Franchise Territory'] || row['Territory'] || '').trim();
            const mainId = nameToIdMap.get(mainName.toLowerCase()) || mainName; // fallback to name if ID not found

            const multipleNamesStr = (row['Multiple Franchise Territory'] || '').trim();
            const linkedIds = multipleNamesStr
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
              .map((name: string) => nameToIdMap.get(name.toLowerCase()) || name);

            return {
              internalId: row['Internal ID'] || `OP_${Date.now()}_${Math.floor(Math.random()*1000)}`,
              mainFranchiseeId: mainId,
              linkedFranchiseeIds: Array.from(new Set([mainId, ...linkedIds])).filter(Boolean),
              title: row['Mr./Ms...'] || '',
              givenNames: row['Given Names'] || '',
              surname: row['Surname'] || '',
              contactPhone: row['Contact Phone'] || '',
              contactEmail: row['Contact Email'] || '',
              operatorStatus: row['Operator Status'] || '',
              employment: row['Employment'] || '',
            };
          }).filter((op: any) => op.mainFranchiseeId); // Ensure main franchise exists

          if (operators.length === 0) {
             const headers = Object.keys(results.data[0] || {}).join(', ');
             throw new Error(`No valid operators found. Could not find 'Franchisee Territory' column. Found headers: ${headers}`);
          }

          const response = await fetch('/api/operators/ingest', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(operators),
          });

          const data = await response.json();

          if (data.success) {
            toast({ title: 'Success', description: `Successfully processed ${data.processed} operators.` });
          } else {
            toast({ variant: 'destructive', title: 'Error', description: data.message || 'Import completed with errors.' });
          }
          
          if (data.errors && data.errors.length > 0) {
              console.error("Import Errors:", data.errors);
              toast({ variant: 'destructive', title: 'Warning', description: `Check console for ${data.errors.length} row errors.` });
          }
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error', description: error?.message || 'Failed to import CSV.' });
        } finally {
          setIsImporting(false);
          target.value = ''; // reset the input
          setIsOpen(false); // close dialog on completion
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Operators CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to create or update Operators. Please make sure your file matches the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground space-y-2">
            <h4 className="font-semibold text-foreground">Required Columns:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Internal ID</strong>: Unique identifier (leave empty to auto-generate for new operators).</li>
              <li><strong>Franchisee Territory</strong>: The exact name of the primary Franchisee.</li>
              <li><strong>Multiple Franchise Territory</strong>: Comma-separated list of other Franchisee names (optional).</li>
              <li><strong>Given Names</strong> & <strong>Surname</strong>: The operator's name.</li>
              <li><strong>Contact Phone</strong> & <strong>Contact Email</strong>: For communications.</li>
              <li><strong>Operator Status</strong> & <strong>Employment</strong>: Current status and employment type.</li>
              <li><strong>Mr./Ms...</strong>: Operator's title.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isImporting}
              className="cursor-pointer"
            />
            {isImporting && (
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Importing operators, please wait...
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
