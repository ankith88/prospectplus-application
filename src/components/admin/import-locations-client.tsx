'use client';

import { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  Upload, FileSpreadsheet, HelpCircle, Download, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';

const standardFields = [
  { key: 'internalId', label: 'Internal ID', required: true, desc: 'Unique identifier for the location' },
  { key: 'name', label: 'Name', required: true, desc: 'Name of the location' },
  { key: 'address1', label: 'Address 1', required: false, desc: 'Primary address' },
  { key: 'address2', label: 'Address 2', required: false, desc: 'Secondary address' },
  { key: 'state', label: 'State', required: true, desc: 'e.g. NSW' },
  { key: 'suburb', label: 'Suburb', required: true, desc: 'e.g. Sydney' },
  { key: 'postCode', label: 'Post Code', required: true, desc: 'e.g. 2000' },
  { key: 'phone', label: 'Phone', required: false, desc: 'Contact phone number' },
  { key: 'siteAccessCode', label: 'Site Access Code', required: false, desc: 'Site access information' },
  { key: 'locationType', label: 'Non-Customer Type', required: true, desc: 'Type of location (e.g. AusPost)' }
];

export function ImportLocationsClient() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  // Navigation / Step state
  const [step, setStep] = useState<number>(1);
  
  // Step 2 (CSV & Mapping) state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  
  // Step 3 (Import Execution) state
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importStats, setImportStats] = useState<{ success: number; failed: number; total: number }>({
    success: 0,
    failed: 0,
    total: 0
  });

  const requiredFields = useMemo(() => standardFields.filter(f => f.required), []);
  const missingRequiredMappings = useMemo(() => {
    return requiredFields.filter(f => !Object.values(columnMappings).includes(f.key));
  }, [columnMappings, requiredFields]);
  const allRequiredMapped = missingRequiredMappings.length === 0;

  // Download Sample CSV
  const handleDownloadSample = () => {
    const headers = standardFields.map(f => f.label).join(',');
    const sampleRow = [
      '27852',
      'Abbotsford DC',
      '45 Grosvenor St',
      '',
      'VIC',
      'Abbotsford',
      '3067',
      '',
      '',
      'AusPost'
    ].map(val => (val.includes(',') ? `"${val}"` : val)).join(',');

    const csvContent = `${headers}\n${sampleRow}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'partner_locations_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // PapaParse CSV Upload Handling
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setCsvFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          toast({ variant: 'destructive', title: 'Empty File', description: 'The uploaded CSV file has no records.' });
          return;
        }
        
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvRows(results.data);
        
        // Auto-mapping logic
        const mappings: Record<string, string> = {};
        headers.forEach(header => {
          const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
          const match = standardFields.find(field => {
            const fieldLabelNorm = field.label.toLowerCase().replace(/[^a-z0-9]/g, '');
            const fieldKeyNorm = field.key.toLowerCase().replace(/[^a-z0-9]/g, '');
            return normalizedHeader === fieldLabelNorm || normalizedHeader === fieldKeyNorm;
          });
          if (match) {
            mappings[header] = match.key;
          }
        });
        setColumnMappings(mappings);
        
        toast({ title: 'CSV Loaded', description: `Parsed ${results.data.length} records successfully.` });
        setStep(2);
      },
      error: (err) => {
        console.error('PapaParse error:', err);
        toast({ variant: 'destructive', title: 'File Error', description: 'Failed to read the CSV file.' });
      }
    });
  };

  // Perform Final Bulk Import
  const executeImport = async () => {
    setIsImporting(true);
    setImportProgress(0);
    
    let successCount = 0;
    let failedCount = 0;
    
    const total = csvRows.length;
    const nowStr = new Date().toISOString();
    
    // Chunk size: 400 (Firestore batch limit is 500)
    const chunkSize = 400;
    
    for (let i = 0; i < total; i += chunkSize) {
      const chunk = csvRows.slice(i, i + chunkSize);
      const batch = writeBatch(firestore);
      
      for (let offset = 0; offset < chunk.length; offset++) {
        const row = chunk[offset];
        
        // Extract fields using mapping keys
        const getVal = (fieldKey: string) => {
          const header = Object.keys(columnMappings).find(k => columnMappings[k] === fieldKey);
          return header ? row[header]?.trim() : '';
        };

        const internalId = getVal('internalId');
        
        let hasMissingRequired = false;
        standardFields.forEach(field => {
          if (field.required) {
            const val = getVal(field.key);
            if (!val) {
              hasMissingRequired = true;
            }
          }
        });
        
        if (hasMissingRequired || !internalId) {
          failedCount++;
          continue;
        }

        const locationData: any = {
          internalId,
          name: getVal('name') || '',
          address1: getVal('address1') || '',
          address2: getVal('address2') || '',
          state: getVal('state') || '',
          suburb: getVal('suburb') || '',
          postCode: getVal('postCode') || '',
          phone: getVal('phone') || '',
          siteAccessCode: getVal('siteAccessCode') || '',
          locationType: getVal('locationType') || '',
          updatedAt: nowStr
        };

        const locationRef = doc(firestore, 'partner_locations', internalId);
        // Using set with merge to create or update
        batch.set(locationRef, locationData, { merge: true });
        
        successCount++;
      }

      try {
        await batch.commit();
      } catch (err) {
        console.error('Batch commit failed for chunk:', i, err);
        failedCount += chunk.length;
        successCount -= chunk.length; // rollback success counter for this chunk
      }

      const progressVal = Math.min(Math.round(((i + chunk.length) / total) * 100), 100);
      setImportProgress(progressVal);
      setImportStats({
        success: successCount,
        failed: failedCount,
        total
      });
    }

    setIsImporting(false);
    setStep(3);
    toast({ title: 'Import Complete', description: `Successfully imported/updated ${successCount} locations.` });
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto min-h-screen p-4 md:p-6">
      
      {/* Page Header */}
      <header className="flex flex-col md:flex-row justify-between gap-4 border-b pb-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="h-8 w-8 text-[#095c7b]" /> Bulk Import Partner Locations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Import or update partner locations (e.g., AusPost, Toll, Banks) using a CSV sheet.
          </p>
        </div>
        
        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-xs md:text-sm self-start md:self-center bg-slate-100 p-1 border rounded-lg">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                step === s 
                  ? 'bg-[#095c7b] text-white shadow-sm' 
                  : step > s 
                    ? 'text-[#095c7b] font-bold' 
                    : 'text-slate-400'
              }`}
            >
              Step {s}
            </div>
          ))}
        </div>
      </header>

      {/* STEP 1: GUIDE AND TEMPLATE DOWNLOAD */}
      {step === 1 && (
        <Card className="shadow-md border border-slate-200">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-[#095c7b] flex items-center gap-2">
              <HelpCircle className="h-5 w-5" /> Step 1: Format Guide & Template
            </CardTitle>
            <CardDescription>
              Understand how to structure your location import file. The Internal ID is used to update existing records or create new ones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 p-4 bg-[#095c7b]/5 border border-[#095c7b]/20 rounded-lg">
                <h4 className="font-bold text-[#095c7b] flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Formatting Rules & Mandatory Columns
                </h4>
                <div className="text-xs text-slate-700 space-y-2">
                  <p>The following columns are mandatory:</p>
                  <ul className="list-disc list-inside pl-2 space-y-1 font-semibold text-[#095c7b]">
                    <li>Internal ID</li>
                    <li>Name</li>
                    <li>State</li>
                    <li>Suburb</li>
                    <li>Post Code</li>
                    <li>Non-Customer Type (Location Type)</li>
                  </ul>
                  <p className="pt-1">
                    <strong>Optional Columns:</strong> Address 1, Address 2, Phone, Site Access Code.
                  </p>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-[#eaf143]/10 border border-[#eaf143]/40 rounded-lg flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Download className="h-4 w-4 text-slate-800" /> Need a starting template?
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Download our pre-structured template CSV file with all standard fields pre-filled as headers.
                  </p>
                </div>
                <Button variant="outline" className="w-full mt-2 font-semibold border-slate-300" onClick={handleDownloadSample}>
                  Download Starter CSV Template
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Ready? Upload your CSV file:</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/50 transition-colors cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleCsvUpload} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
                <Upload className="h-10 w-10 text-slate-400 mb-3" />
                <span className="font-semibold text-slate-700 text-sm">Drag & drop your CSV here</span>
                <span className="text-xs text-slate-400 mt-1">Supports files up to 10MB</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50/50 justify-end py-3">
            <span className="text-xs text-slate-500">Step 1 of 3</span>
          </CardFooter>
        </Card>
      )}

      {/* STEP 2: REVIEW & EXECUTE */}
      {step === 2 && (
        <Card className="shadow-md border border-slate-200">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-[#095c7b]">Step 2: Review & Execute</CardTitle>
            <CardDescription>
              Review the fields mapping and execute the import. Missing mandatory columns: {missingRequiredMappings.map(m => m.label).join(', ') || 'None'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <p className="text-sm text-slate-700">
              Ready to import <strong>{csvRows.length}</strong> records. 
              The system will create new records or update existing ones based on the <strong>Internal ID</strong>.
            </p>
            <Button 
              className="w-full bg-[#095c7b] hover:bg-[#053647] text-white" 
              onClick={executeImport} 
              disabled={!allRequiredMapped || isImporting}
            >
              {isImporting ? 'Importing...' : 'Execute Import'}
            </Button>
          </CardContent>
          <CardFooter className="bg-slate-50/50 justify-end py-3">
            <span className="text-xs text-slate-500">Step 2 of 3</span>
          </CardFooter>
        </Card>
      )}

      {/* STEP 3: RESULTS */}
      {step === 3 && (
        <Card className="shadow-md border border-slate-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm">Processed <strong>{importStats.total}</strong> total records.</p>
            <ul className="text-sm space-y-2">
              <li className="text-green-700">Successfully Imported/Updated: {importStats.success}</li>
              <li className="text-red-700">Failed (Missing mandatory fields or error): {importStats.failed}</li>
            </ul>
            <Button variant="outline" onClick={() => { setStep(1); setCsvFile(null); }}>
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
