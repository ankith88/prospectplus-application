"use client";

import React, { useState } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, CheckCircle2, RefreshCw, ArrowRight, Link as LinkIcon } from 'lucide-react';

interface ParsedLpoRow {
  lpoName: string;
  lpoOwnerName?: string;
  email?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  notes?: string;
  status?: string;
  lpoInternalId?: string;
  inactive?: any;
  secondaryInternalId?: string;
  lpoCreatedDate?: string;
  lpoLastModifiedDate?: string;
  linkedNcl?: string;
  linkedPartnerLocationName?: string;
  rawCustomerName?: string;
  linkedCustomerId?: string; // Column I ID
  companyNameFranchise?: string;
  linkedFranchiseeName?: string;
  lpoTier?: string;
  poLevelTier?: string;
  pageURL?: string;
  salesRep?: string;
  validationProvided?: string;
  leadGenerator?: string;
  faceToFace?: string;
  confAndCall?: string;
  acceptedTerms?: string;
  dynamicScf?: string;
  adhocBooking?: string;
  defaultPassword?: string;
  [key: string]: any;
}

export function ImportLposClient() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedLpoRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  // Auto Header & Column Letter/Index Mapper
  const mapRowToLpo = (row: Record<string, any>, rowArray?: any[]): ParsedLpoRow => {
    const keys = Object.keys(row);

    const getVal = (possibleHeaders: string[], colIdx?: number) => {
      for (const h of possibleHeaders) {
        const foundKey = keys.find((k) => k.trim().toLowerCase() === h.toLowerCase());
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
          return String(row[foundKey]).trim();
        }
      }
      if (colIdx !== undefined && rowArray && rowArray[colIdx] !== undefined && rowArray[colIdx] !== null) {
        return String(rowArray[colIdx]).trim();
      }
      if (colIdx !== undefined && keys[colIdx] && row[keys[colIdx]] !== undefined && row[keys[colIdx]] !== null) {
        return String(row[keys[colIdx]]).trim();
      }
      return '';
    };

    // User Column Letters:
    // Col G (Index 6): Linked Partner Location
    // Col I (Index 8): ID (Customer Entity ID)
    // Col K (Index 10): Name of the Linked Franchisee
    // Col N (Index 13): Address line 1
    // Col O (Index 14): Address line 2
    // Col T (Index 19): Contact Name
    // Col U (Index 20): Contact Email
    // Col V (Index 21): Contact Phone
    const linkedPartnerLocationName = getVal(['Linked NCL', 'Linked Partner Location', 'Col G'], 6);
    const linkedCustomerId = getVal(['ID', 'Customer ID', 'customerEntityId', 'Col I'], 8);
    const linkedFranchiseeName = getVal(['LPO Tier', 'Company Name / Franchise', 'Linked Franchisee', 'Col K'], 10);
    const address1 = getVal(['Street No & Name', 'Address Line 1', 'Col N'], 13);
    const address2 = getVal(['LPO Suburb', 'Address Line 2', 'Col O'], 14);
    const lpoOwnerName = getVal(['Contact Name', 'Col T'], 19);
    const email = getVal(['Email Address', 'Contact Email', 'Col U'], 20);
    const phone = getVal(['Contact Number', 'Contact Phone', 'Col V'], 21);

    return {
      lpoInternalId: getVal(['Internal ID', 'lpoInternalId'], 0),
      inactive: getVal(['Inactive', 'inactive'], 1),
      secondaryInternalId: getVal(['Internal ID_1', 'secondaryInternalId'], 2),
      lpoCreatedDate: getVal(['Date Created', 'createdDate'], 3),
      lpoLastModifiedDate: getVal(['Last Modified', 'lastModified'], 4),
      lpoName: getVal(['LPO Name', 'lpoName', 'Name'], 5) || 'Unnamed LPO',
      linkedNcl: linkedPartnerLocationName,
      linkedPartnerLocationName,
      rawCustomerName: getVal(['Customer', 'customerName'], 7),
      linkedCustomerId,
      companyNameFranchise: linkedFranchiseeName,
      linkedFranchiseeName,
      lpoTier: getVal(['LPO Tier'], 10),
      status: getVal(['Status*', 'Status', 'status'], 11) || 'New',
      poLevelTier: getVal(['PO Level / Tier'], 12),
      address1,
      address2,
      city: getVal(['LPO Suburb', 'City', 'city'], 14),
      state: getVal(['LPO State', 'State', 'state'], 15),
      postcode: getVal(['LPO Postcode', 'Postcode', 'postcode'], 16),
      notes: getVal(['Notes', 'notes'], 17),
      lpoOwnerName,
      phone,
      email,
      pageURL: getVal(['Page URL - S/O', 'pageURL'], 22),
      salesRep: getVal(['Sales Rep', 'salesRep'], 23),
      validationProvided: getVal(['Validation Provided', 'validationProvided'], 24),
      leadGenerator: getVal(['Lead Generator', 'leadGenerator'], 25),
      faceToFace: getVal(['Face-to-face', 'faceToFace'], 26),
      confAndCall: getVal(['Conf & Call', 'confAndCall'], 27),
      acceptedTerms: getVal(['Accepted T&C', 'acceptedTerms'], 28),
      dynamicScf: getVal(['Dynamic SCF', 'dynamicScf'], 29),
      adhocBooking: getVal(['Adhoc Booking', 'adhocBooking'], 30),
      defaultPassword: getVal(['Default Password', 'defaultPassword'], 31),
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);
    setImportResult(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsParsing(false);
        if (!results.data || results.data.length === 0) {
          toast({
            variant: 'destructive',
            title: 'Empty File',
            description: 'No valid data rows found in uploaded CSV file.',
          });
          return;
        }

        const rawHeaders = results.meta.fields || [];
        setHeaders(rawHeaders);

        const mapped = (results.data as Record<string, any>[]).map((row) => mapRowToLpo(row));
        setParsedRows(mapped);

        toast({
          title: 'CSV File Loaded',
          description: `Successfully parsed ${mapped.length} Participating LPO records.`,
        });
      },
      error: (err) => {
        setIsParsing(false);
        console.error('CSV Parsing Error:', err);
        toast({
          variant: 'destructive',
          title: 'File Error',
          description: 'Failed to parse CSV file. Ensure it is valid formatting.',
        });
      },
    });
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;

    setIsImporting(true);
    try {
      const response = await fetch('/api/lpo-leads/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsedRows }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bulk import failed.');
      }

      setImportResult(data);
      toast({
        title: 'Import Completed',
        description: data.message,
      });
    } catch (err: any) {
      console.error('Import execution error:', err);
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: err.message || 'An error occurred during import execution.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-[#095c7b]" />
            Import Participating LPOs
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Upload CSV file of Participating LPOs to import into <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">lpo_leads</code> and link with existing Customers via Column "I" (<code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">customerEntityId</code>).
          </p>
        </div>
      </div>

      {/* Step 1: Upload Card */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#095c7b]" />
            1. Select CSV File
          </CardTitle>
          <CardDescription>
            Column G: Partner Location | Col K: Franchisee Name | Col N: Addr 1 | Col O: Addr 2 | Col T: Contact Name | Col U: Email | Col V: Phone | Col I: Customer ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-[#095c7b] transition-colors bg-slate-50/50">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="lpo-csv-input"
            />
            <label htmlFor="lpo-csv-input" className="cursor-pointer flex flex-col items-center gap-2">
              <Upload className="h-10 w-10 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">
                {file ? file.name : 'Click to select or drop CSV file'}
              </span>
              <span className="text-xs text-slate-500">Supports standard Participating LPO CSV formats</span>
            </label>
          </div>

          {isParsing && (
            <div className="flex items-center gap-2 text-sm text-[#095c7b] font-medium">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Parsing CSV file contents...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Dry Run / Match Preview Table */}
      {parsedRows.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-[#095c7b]" />
                2. Preview Parsed LPOs ({parsedRows.length} records)
              </CardTitle>
              <CardDescription>
                Review mapped fields below before executing Firestore batch import.
              </CardDescription>
            </div>

            <Button
              onClick={handleExecuteImport}
              disabled={isImporting}
              className="bg-[#095c7b] hover:bg-[#053647] text-white font-semibold"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Importing to Firestore...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Execute Bulk Import
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-96">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold">#</TableHead>
                    <TableHead className="font-bold">LPO Internal ID</TableHead>
                    <TableHead className="font-bold">LPO Name</TableHead>
                    <TableHead className="font-bold">Contact (Col T/U/V)</TableHead>
                    <TableHead className="font-bold">Col I Customer ID</TableHead>
                    <TableHead className="font-bold">Address (Col N / O)</TableHead>
                    <TableHead className="font-bold">Col G Partner</TableHead>
                    <TableHead className="font-bold">Col K Franchisee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.slice(0, 50).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs text-slate-500 font-mono">{idx + 1}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700">{row.lpoInternalId || '—'}</TableCell>
                      <TableCell className="text-sm font-bold text-slate-900">{row.lpoName}</TableCell>
                      <TableCell className="text-xs text-slate-700">
                        <div className="font-semibold">{row.lpoOwnerName || '—'}</div>
                        <div className="text-slate-500">{row.email}</div>
                        <div className="text-slate-400">{row.phone}</div>
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold text-[#095c7b]">
                        {row.linkedCustomerId ? (
                          <Badge variant="outline" className="border-[#095c7b]/30 text-[#095c7b] bg-teal-50/50">
                            {row.linkedCustomerId}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 font-normal italic">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        <div>{row.address1}</div>
                        <div className="text-slate-400">{row.address2}</div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">{row.linkedPartnerLocationName || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-700">{row.linkedFranchiseeName || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedRows.length > 50 && (
              <p className="text-xs text-slate-500 text-center italic">
                Showing first 50 of {parsedRows.length} parsed records.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Import Results Card */}
      {importResult && (
        <Card className="border-emerald-200 bg-emerald-50/10 shadow-sm border-2">
          <CardHeader className="bg-emerald-50/30 border-b border-emerald-100 flex flex-row items-center justify-between py-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Import Complete
              </CardTitle>
              <CardDescription className="text-emerald-700 text-xs">
                {importResult.message}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-white rounded-lg border border-slate-200 text-center">
                <p className="text-xs font-semibold text-slate-500">Total Processed</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{importResult.summary?.total}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-slate-200 text-center">
                <p className="text-xs font-semibold text-slate-500">New Created</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{importResult.summary?.created}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-slate-200 text-center">
                <p className="text-xs font-semibold text-slate-500">Updated</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{importResult.summary?.updated}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-emerald-200 bg-emerald-50/20 text-center">
                <p className="text-xs font-semibold text-emerald-700">Customers Linked</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{importResult.summary?.linked}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-slate-200 text-center">
                <p className="text-xs font-semibold text-slate-500">Unlinked (No Match)</p>
                <p className="text-2xl font-bold text-slate-600 mt-1">{importResult.summary?.unlinked}</p>
              </div>
            </div>

            {/* Results detail list */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Processed LPOs Summary (Sample)
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-60 bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>LPO Name</TableHead>
                      <TableHead>Col I Customer ID</TableHead>
                      <TableHead>Link Status</TableHead>
                      <TableHead>Matched Customer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResult.results?.slice(0, 30).map((r: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs font-semibold text-slate-800">{r.lpoName}</TableCell>
                        <TableCell className="text-xs font-mono text-[#095c7b]">{r.linkedCustomerId || '—'}</TableCell>
                        <TableCell>
                          {r.linkStatus === 'Linked' ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                              <LinkIcon className="h-3 w-3 mr-1" /> Linked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500 border-slate-300">
                              Unlinked
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {r.linkedLeadCompanyName ? (
                            <span className="font-medium text-slate-800">{r.linkedLeadCompanyName} ({r.linkedLeadId})</span>
                          ) : (
                            <span className="text-slate-400 italic">customerEntityId not found</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
