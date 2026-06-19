'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { 
  Briefcase, Inbox, Map, Archive, PlusCircle, ArrowLeft, ArrowRight, Upload, 
  CheckCircle2, AlertTriangle, Play, HelpCircle, Download, FileSpreadsheet, Loader2, Check 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getAllUsers, getAllFranchisees, logActivity } from '@/services/firebase';
import type { LeadBucket, UserProfile, Franchisee, Contact, LeadStatus } from '@/lib/types';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch, serverTimestamp, query, where, limit, addDoc } from 'firebase/firestore';
import { canAssignToAm } from '@/lib/leave-utils';

const standardFields = [
  { key: 'companyName', label: 'Company Name', required: true, desc: 'Name of the business' },
  { key: 'websiteUrl', label: 'Website URL', required: false, desc: 'e.g. https://example.com' },
  { key: 'customerPhone', label: 'Company Phone', required: true, desc: 'Main business phone' },
  { key: 'customerServiceEmail', label: 'Company Email', required: true, desc: 'Main business email' },
  { key: 'abn', label: 'ABN (11 digits)', required: false, desc: 'Australian Business Number' },
  { key: 'street', label: 'Street Address', required: true, desc: 'e.g. 123 Main St' },
  { key: 'city', label: 'Suburb / City', required: true, desc: 'e.g. Sydney' },
  { key: 'state', label: 'State', required: true, desc: 'e.g. NSW' },
  { key: 'zip', label: 'Postcode', required: true, desc: 'e.g. 2000' },
  { key: 'contactFirstName', label: 'Contact First Name', required: false, desc: 'First name of key contact' },
  { key: 'contactLastName', label: 'Contact Last Name', required: false, desc: 'Last name of key contact' },
  { key: 'contactTitle', label: 'Contact Title', required: false, desc: 'Job title of key contact' },
  { key: 'contactEmail', label: 'Contact Email', required: false, desc: 'Direct email of key contact' },
  { key: 'contactPhone', label: 'Contact Phone', required: false, desc: 'Direct phone of key contact' }
];

export function ImportLeadsClient() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  // Navigation / Step state
  const [step, setStep] = useState<number>(1);
  
  // Data State
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [journeys, setJourneys] = useState<{ id: string; name: string }[]>([]);
  const [existingLists, setExistingLists] = useState<string[]>([]);
  
  // Step 2 configurations
  const [selectedBucket, setSelectedBucket] = useState<LeadBucket>('outbound');
  const [campaignName, setCampaignName] = useState<string>('Bulk Import');
  const [dialerAssigned, setDialerAssigned] = useState<string>('');
  const [salesRepAssigned, setSalesRepAssigned] = useState<string>('Lee Russell');
  const [fieldRepAssigned, setFieldRepAssigned] = useState<string>('');
  const [accountManagerAssigned, setAccountManagerAssigned] = useState<string>('');
  const [customerSuccessAssigned, setCustomerSuccessAssigned] = useState<string>('');
  const [targetJourneyId, setTargetJourneyId] = useState<string>('');
  const [marketingListName, setMarketingListName] = useState<string>('');
  const [defaultFranchiseeId, setDefaultFranchiseeId] = useState<string>('Auto-resolve');
  const [leadSource, setLeadSource] = useState<string>('Bulk Import Wizard');
  
  // Step 3 (CSV & Mapping) state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  
  // Step 4 (Preview & Validate) state
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({});
  const [duplicateLeads, setDuplicateLeads] = useState<Record<number, string | null>>({}); // rowIdx -> existingLeadId or null
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'import'>('skip');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  
  // Step 5 (Import Execution) state
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importStats, setImportStats] = useState<{ success: number; skipped: number; failed: number; total: number }>({
    success: 0,
    skipped: 0,
    failed: 0,
    total: 0
  });

  const requiredFields = useMemo(() => standardFields.filter(f => f.required), []);
  const missingRequiredMappings = useMemo(() => {
    return requiredFields.filter(f => !Object.values(columnMappings).includes(f.key));
  }, [columnMappings, requiredFields]);
  const allRequiredMapped = missingRequiredMappings.length === 0;

  // Fetch users, franchisees, journeys and existing lists on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [users, frs] = await Promise.all([getAllUsers(), getAllFranchisees()]);
        setAllUsers(users);
        setFranchisees(frs);
        
        // Fetch journeys
        const journeysSnap = await getDocs(collection(firestore, 'Journeys'));
        const journeysData = journeysSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name || doc.id }));
        setJourneys(journeysData);
        if (journeysData.length > 0) {
          setTargetJourneyId(journeysData[0].id);
        }
        
        // Fetch existing marketing lists from leads
        const leadsSnap = await getDocs(query(collection(firestore, 'leads'), limit(500)));
        const lists = new Set<string>();
        leadsSnap.docs.forEach(doc => {
          const ml = doc.data().marketingLists;
          if (Array.isArray(ml)) {
            ml.forEach(l => lists.add(l));
          }
        });
        setExistingLists(Array.from(lists));
      } catch (err) {
        console.error('Failed to load import setup data:', err);
        toast({ variant: 'destructive', title: 'Setup Error', description: 'Could not load required users or franchisee configuration.' });
      }
    }
    loadData();
  }, []);

  // Filtered users for assignments
  const activeDialers = useMemo(() => 
    allUsers.filter(u => (u.assignedRoles?.includes('user') || u.assignedRoles?.includes('Lead Gen') || u.assignedRoles?.includes('Dialer')) && !u.disabled), 
    [allUsers]
  );
  
  const activeFieldReps = useMemo(() => 
    allUsers.filter(u => (u.assignedRoles?.includes('Field Sales') || u.assignedRoles?.includes('Field Sales Admin')) && !u.disabled), 
    [allUsers]
  );
  
  const activeAMs = useMemo(() => 
    allUsers.filter(u => (u.assignedRoles?.includes('Account Manager') || u.assignedRoles?.includes('Account Managers') || u.role === 'Account Manager') && !u.disabled && canAssignToAm(u)), 
    [allUsers]
  );

  const activeCS = useMemo(() => 
    allUsers.filter(u => (u.assignedRoles?.includes('Customer Success') || u.role === 'Customer Success') && !u.disabled), 
    [allUsers]
  );

  // Download Sample CSV
  const handleDownloadSample = () => {
    const headers = standardFields.map(f => f.label).join(',');
    const sampleRow = [
      'Example Enterprise Pty Ltd',
      'https://exampleenterprise.com.au',
      '02 9876 5432',
      'info@exampleenterprise.com.au',
      '12345678901',
      'Suite 4.02 Level 4 100 George St',
      'Sydney',
      'NSW',
      '2000',
      'John',
      'Smith',
      'Operations Director',
      'john.smith@exampleenterprise.com.au',
      '0400 123 456'
    ].map(val => (val.includes(',') ? `"${val}"` : val)).join(',');

    const csvContent = `${headers}\n${sampleRow}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'prospectplus_lead_import_template.csv');
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
        setStep(3);
      },
      error: (err) => {
        console.error('PapaParse error:', err);
        toast({ variant: 'destructive', title: 'File Error', description: 'Failed to read the CSV file.' });
      }
    });
  };

  // Resolve Franchisee automatically from Address details
  const resolveLeadFranchisee = (city: string, state: string, zip: string) => {
    const cleanCity = city?.trim().toUpperCase();
    const cleanState = state?.trim().toUpperCase();
    const cleanZip = zip?.trim();

    if (cleanCity && cleanState && cleanZip) {
      for (const f of franchisees) {
        const match = f.territoryJson?.find((t: any) => 
          t.suburbs?.toUpperCase() === cleanCity && 
          t.state?.toUpperCase() === cleanState && 
          String(t.post_code) === String(cleanZip)
        );
        if (match) {
          return { internalId: f.internalId, name: f.name };
        }
      }
    }
    return { internalId: 'MailPlus Pty Ltd', name: 'MailPlus Pty Ltd' };
  };

  // Run Preview Validation and Duplication checks
  const runValidationAndDuplicates = async () => {
    setIsValidating(true);
    setStep(4);
    
    const errors: Record<number, string[]> = {};
    const duplicates: Record<number, string | null> = {};
    const previewData: any[] = [];
    
    // Take up to 20 rows for validation list and preview
    const limitRows = csvRows.slice(0, 20);

    for (let idx = 0; idx < limitRows.length; idx++) {
      const row = limitRows[idx];
      const rowErrors: string[] = [];
      
      // Construct mapped lead data
      const companyName = row[Object.keys(columnMappings).find(k => columnMappings[k] === 'companyName') || '']?.trim();
      const email = row[Object.keys(columnMappings).find(k => columnMappings[k] === 'customerServiceEmail') || '']?.trim();
      const phone = row[Object.keys(columnMappings).find(k => columnMappings[k] === 'customerPhone') || '']?.trim();
      
      standardFields.forEach(field => {
        if (field.required) {
          const header = Object.keys(columnMappings).find(k => columnMappings[k] === field.key);
          const val = header ? row[header]?.trim() : '';
          if (!val) {
            rowErrors.push(`Missing ${field.label}.`);
          }
        }
      });
      
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.push(`Invalid email format: ${email}`);
      }

      errors[idx] = rowErrors;
      
      // Duplication Check
      if (companyName) {
        try {
          const q = query(collection(firestore, 'leads'), where('companyName', '==', companyName), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            duplicates[idx] = snap.docs[0].id;
          } else {
            duplicates[idx] = null;
          }
        } catch (e) {
          console.error('Duplication query error', e);
        }
      }
      
      previewData.push({
        index: idx,
        companyName: companyName || 'N/A',
        email: email || '-',
        phone: phone || '-',
        city: row[Object.keys(columnMappings).find(k => columnMappings[k] === 'city') || ''] || '-',
        zip: row[Object.keys(columnMappings).find(k => columnMappings[k] === 'zip') || ''] || '-'
      });
    }

    // Also run quick summary duplicate check stats on the rest of the file (concurrently)
    // To avoid hitting firestore too hard, we check first 100 entries for duplicate checks
    const remainingRows = csvRows.slice(20, 100);
    const checks = remainingRows.map(async (row, offsetIdx) => {
      const actualIdx = offsetIdx + 20;
      const compName = row[Object.keys(columnMappings).find(k => columnMappings[k] === 'companyName') || '']?.trim();
      if (compName) {
        try {
          const q = query(collection(firestore, 'leads'), where('companyName', '==', compName), limit(1));
          const snap = await getDocs(q);
          duplicates[actualIdx] = !snap.empty ? snap.docs[0].id : null;
        } catch (e) {}
      }
    });
    
    await Promise.all(checks);
    
    setPreviewRows(previewData);
    setValidationErrors(errors);
    setDuplicateLeads(duplicates);
    setIsValidating(false);
  };

  // Perform Final Bulk Import
  const executeImport = async () => {
    setIsImporting(true);
    setImportProgress(0);
    
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    
    const total = csvRows.length;
    const authorName = userProfile?.displayName || 'System Bulk Importer';
    const nowStr = new Date().toISOString();
    
    // Chunk size: 25 rows at a time
    const chunkSize = 25;
    
    for (let i = 0; i < total; i += chunkSize) {
      const chunk = csvRows.slice(i, i + chunkSize);
      const batch = writeBatch(firestore);
      
      for (let offset = 0; offset < chunk.length; offset++) {
        const rowIdx = i + offset;
        const row = chunk[offset];
        
        // Extract fields using mapping keys
        const getVal = (fieldKey: string) => {
          const header = Object.keys(columnMappings).find(k => columnMappings[k] === fieldKey);
          return header ? row[header]?.trim() : '';
        };

        const companyName = getVal('companyName');
        
        let hasMissingRequired = false;
        standardFields.forEach(field => {
          if (field.required) {
            const val = getVal(field.key);
            if (!val) {
              hasMissingRequired = true;
            }
          }
        });
        
        if (hasMissingRequired) {
          failedCount++;
          continue;
        }

        // Duplicate handling
        const isDuplicateMatch = duplicateLeads[rowIdx];
        if (isDuplicateMatch && duplicateStrategy === 'skip') {
          skippedCount++;
          continue;
        }

        // Address resolution
        const address = {
          street: getVal('street') || '',
          city: getVal('city') || '',
          state: getVal('state') || '',
          zip: getVal('zip') || '',
          country: 'Australia'
        };

        // Franchisee Assignment
        let assignedFranchisee = 'MailPlus Pty Ltd';
        if (defaultFranchiseeId === 'Auto-resolve') {
          const resolved = resolveLeadFranchisee(address.city, address.state, address.zip);
          assignedFranchisee = resolved.internalId;
        } else if (defaultFranchiseeId) {
          assignedFranchisee = defaultFranchiseeId;
        }

        // Bucket & Assignments config
        const leadData: any = {
          companyName,
          websiteUrl: getVal('websiteUrl') || '',
          customerPhone: getVal('customerPhone') || '',
          customerServiceEmail: getVal('customerServiceEmail') || '',
          abn: getVal('abn') || '',
          address,
          status: 'New' as LeadStatus,
          customerStatus: 'New',
          bucket: selectedBucket,
          fieldSales: selectedBucket === 'field_sales',
          leadSource: leadSource || 'Bulk Import Wizard',
          dateLeadEntered: nowStr,
          createdAt: serverTimestamp(),
          isDuplicate: !!isDuplicateMatch,
          similarLeads: isDuplicateMatch ? [isDuplicateMatch] : []
        };

        // Bucket specific fields
        if (selectedBucket === 'outbound') {
          leadData.campaign = campaignName || 'Bulk Import';
          if (dialerAssigned) leadData.dialerAssigned = dialerAssigned;
          if (salesRepAssigned) leadData.salesRepAssigned = salesRepAssigned;
        } else if (selectedBucket === 'field_sales') {
          leadData.campaign = campaignName || 'Door-to-Door';
          if (fieldRepAssigned) leadData.fieldRepAssigned = fieldRepAssigned;
          if (salesRepAssigned) leadData.salesRepAssigned = salesRepAssigned;
        } else if (selectedBucket === 'inbound') {
          leadData.campaign = campaignName || 'Inbound';
          if (salesRepAssigned) leadData.salesRepAssigned = salesRepAssigned;
        } else if (selectedBucket === 'account_manager') {
          leadData.campaign = campaignName || 'Account Manager Generated';
          if (accountManagerAssigned) leadData.accountManagerAssigned = accountManagerAssigned;
        } else if (selectedBucket === 'customer_success') {
          leadData.campaign = campaignName || 'Customer Success Generated';
          if (customerSuccessAssigned) leadData.customerSuccessAssigned = customerSuccessAssigned;
        } else if (selectedBucket === 'nurture') {
          leadData.campaign = campaignName || 'Nurture Campaign';
          if (targetJourneyId) {
            leadData.activeJourneys = [targetJourneyId];
          }
        } else if (selectedBucket === 'marketing') {
          leadData.campaign = campaignName || 'Marketing Campaign';
          if (marketingListName) {
            leadData.marketingLists = [marketingListName];
          }
        }

        if (assignedFranchisee) {
          leadData.franchisee = assignedFranchisee;
        }

        // 1. Generate document reference for new Lead
        const leadRef = doc(collection(firestore, 'leads'));
        batch.set(leadRef, leadData);

        // 2. Primary Contact subcollection (if exists)
        const contactEmail = getVal('contactEmail');
        const contactFirstName = getVal('contactFirstName');
        if (contactFirstName || contactEmail) {
          const contactRef = doc(collection(firestore, 'leads', leadRef.id, 'contacts'));
          const contactData: Contact = {
            id: contactRef.id,
            name: `${contactFirstName} ${getVal('contactLastName')}`.trim() || 'Primary Contact',
            title: getVal('contactTitle') || 'Contact',
            email: contactEmail || '',
            phone: getVal('contactPhone') || '',
            sendEmail: 'yes'
          };
          batch.set(contactRef, contactData);
        }

        // 3. Create initial Activity entry
        const activityRef = doc(collection(firestore, 'leads', leadRef.id, 'activity'));
        batch.set(activityRef, {
          type: 'Update',
          date: nowStr,
          notes: `Lead imported via Bulk Import in ${selectedBucket.replace('_', ' ')} bucket. Source: ${campaignName}`,
          author: authorName
        });

        // 4. Create initial Bucket History entry
        const historyRef = doc(collection(firestore, 'leads', leadRef.id, 'bucket_history'));
        batch.set(historyRef, {
          oldBucket: 'unassigned',
          newBucket: selectedBucket,
          date: nowStr,
          author: authorName
        });

        // Nurture Journey enrollment setup
        if (selectedBucket === 'nurture' && targetJourneyId) {
          const stateRef = doc(firestore, 'leads', leadRef.id, 'journey_states', targetJourneyId);
          batch.set(stateRef, {
            leadId: leadRef.id,
            journeyId: targetJourneyId,
            status: 'active',
            currentNodeId: 'trigger_1',
            entryTime: nowStr,
            lastExecutionTime: nowStr,
            executionHistory: [
              {
                nodeId: 'trigger_1',
                nodeType: 'trigger',
                executedAt: nowStr,
                actionResult: `Enrolled via bulk import by ${authorName}.`
              }
            ]
          });
        }

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
        skipped: skippedCount,
        failed: failedCount,
        total
      });
    }

    setIsImporting(false);
    setStep(5);
    toast({ title: 'Import Complete', description: `Successfully imported ${successCount} leads.` });
  };

  // Get total duplicate matches counted in our check
  const duplicateCount = useMemo(() => 
    Object.values(duplicateLeads).filter(val => val !== null).length, 
    [duplicateLeads]
  );

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto min-h-screen p-4 md:p-6">
      
      {/* Page Header */}
      <header className="flex flex-col md:flex-row justify-between gap-4 border-b pb-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="h-8 w-8 text-[#095c7b]" /> Bulk Import Leads
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Import new leads in bulk into your targeted pipeline buckets using a CSV sheet.
          </p>
        </div>
        
        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-xs md:text-sm self-start md:self-center bg-slate-100 p-1 border rounded-lg">
          {[1, 2, 3, 4, 5].map((s) => (
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
              Understand how to structure your lead import file so the database maps it correctly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 p-4 bg-[#095c7b]/5 border border-[#095c7b]/20 rounded-lg">
                <h4 className="font-bold text-[#095c7b] flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Formatting Rules & Mandatory Columns
                </h4>
                <div className="text-xs text-slate-700 space-y-2">
                  <p>To match the requirements of the <strong>Create Lead form</strong>, the following columns are mandatory and must be mapped:</p>
                  <ul className="list-disc list-inside pl-2 space-y-1 font-semibold text-[#095c7b]">
                    <li>Company Name</li>
                    <li>Company Phone</li>
                    <li>Company Email</li>
                    <li>Street Address</li>
                    <li>Suburb / City</li>
                    <li>State</li>
                    <li>Postcode</li>
                  </ul>
                  <p className="pt-1">
                    <strong>Optional Columns:</strong> Website URL, ABN, Contact First Name, Contact Last Name, Contact Title, Contact Email, Contact Phone.
                  </p>
                  <ul className="list-disc list-inside pl-2 space-y-1 mt-1 text-slate-600">
                    <li>Emails must use a valid format (e.g. name@domain.com).</li>
                    <li>Postcodes should be 4 digits.</li>
                    <li>Columns can be in any order; you will map headers in Step 3.</li>
                  </ul>
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
              <Label className="text-slate-700 font-semibold">Ready? Upload your Lead CSV file:</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/50 transition-colors cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleCsvUpload} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
                <Upload className="h-10 w-10 text-slate-400 mb-3" />
                <span className="font-semibold text-slate-700 text-sm">Drag & drop your lead CSV here</span>
                <span className="text-xs text-slate-400 mt-1">Supports files up to 10MB</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50/50 justify-end py-3">
            <span className="text-xs text-slate-500">Step 1 of 5</span>
          </CardFooter>
        </Card>
      )}

      {/* STEP 2: BUCKETS & METADATA CONFIGURATION */}
      {step === 2 && (
        <Card className="shadow-md border border-slate-200">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-[#095c7b]">Step 2: Assign Pipeline Bucket & Metadata</CardTitle>
            <CardDescription>
              Assign the target CRM bucket and default values for the imported list.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Bucket Selection */}
              <div className="space-y-2">
                <Label htmlFor="bucket-select" className="font-semibold text-slate-700">Target Pipeline Bucket *</Label>
                <Select value={selectedBucket} onValueChange={(val) => setSelectedBucket(val as LeadBucket)}>
                  <SelectTrigger id="bucket-select" className="bg-white">
                    <SelectValue placeholder="Select target bucket" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">Outbound (Default Dialer Queue)</SelectItem>
                    <SelectItem value="field_sales">Field Sales (Door-to-door reps)</SelectItem>
                    <SelectItem value="inbound">Inbound (Forms/API)</SelectItem>
                    <SelectItem value="account_manager">Account Manager Pipeline</SelectItem>
                    <SelectItem value="customer_success">Customer Success Pipeline</SelectItem>
                    <SelectItem value="nurture">Nurture (Email journey campaigns)</SelectItem>
                    <SelectItem value="marketing">Marketing (Adhoc Campaign Lists)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Specifies which pipeline view or sequence these leads should initially enter.
                </p>
              </div>

              {/* Franchisee Assignment */}
              <div className="space-y-2">
                <Label htmlFor="franchisee-select" className="font-semibold text-slate-700">Franchisee Assignment</Label>
                <Select value={defaultFranchiseeId} onValueChange={setDefaultFranchiseeId}>
                  <SelectTrigger id="franchisee-select" className="bg-white">
                    <SelectValue placeholder="Select Franchisee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Auto-resolve">Auto-resolve from Address Postcode</SelectItem>
                    <SelectItem value="MailPlus Pty Ltd">MailPlus Pty Ltd (Corporate/Fallback)</SelectItem>
                    {franchisees.map((f) => (
                      <SelectItem key={f.internalId} value={f.internalId}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Auto-resolve matches suburb/state/postcode against Franchisee territories.
                </p>
              </div>

              {/* Campaign Name */}
              <div className="space-y-2">
                <Label htmlFor="campaign-input" className="font-semibold text-slate-700">Campaign / Source Name</Label>
                <Input 
                  id="campaign-input" 
                  value={campaignName} 
                  onChange={(e) => setCampaignName(e.target.value)} 
                  placeholder="e.g. June Cold Campaign" 
                  className="bg-white"
                />
              </div>

              {/* Lead Source */}
              <div className="space-y-2">
                <Label htmlFor="lead-source" className="font-semibold text-slate-700">Lead Source</Label>
                <Input 
                  id="lead-source" 
                  value={leadSource} 
                  onChange={(e) => setLeadSource(e.target.value)} 
                  placeholder="e.g. ZoomInfo, Purchased List" 
                  className="bg-white"
                />
              </div>

              {/* BUCKET SPECIFIC DYNAMIC FIELDS */}
              <div className="col-span-full border-t pt-4 mt-2">
                <h4 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-1.5">
                  <Play className="h-4 w-4 text-[#095c7b]" /> Additional Fields for {selectedBucket.replace('_', ' ').toUpperCase()} bucket
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedBucket === 'outbound' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="dialer-assigned" className="font-semibold text-slate-700">Dialer Assigned</Label>
                        <Select value={dialerAssigned || "unassigned"} onValueChange={(val) => setDialerAssigned(val === 'unassigned' ? '' : val)}>
                          <SelectTrigger id="dialer-assigned" className="bg-white">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {activeDialers.map((d) => (
                              <SelectItem key={d.uid} value={d.displayName || d.email}>{d.displayName || d.email}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sales-rep" className="font-semibold text-slate-700">Sales Representative Assigned</Label>
                        <Select value={salesRepAssigned} onValueChange={setSalesRepAssigned}>
                          <SelectTrigger id="sales-rep" className="bg-white">
                            <SelectValue placeholder="Select Sales Rep" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Lee Russell">Lee Russell</SelectItem>
                            <SelectItem value="Kerina Helliwell">Kerina Helliwell</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {selectedBucket === 'field_sales' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="field-rep" className="font-semibold text-slate-700">Field Sales Representative</Label>
                        <Select value={fieldRepAssigned || "none"} onValueChange={(val) => setFieldRepAssigned(val === 'none' ? '' : val)}>
                          <SelectTrigger id="field-rep" className="bg-white">
                            <SelectValue placeholder="Select Field Rep" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select Field Rep</SelectItem>
                            {activeFieldReps.map((r) => (
                              <SelectItem key={r.uid} value={r.displayName || r.email}>{r.displayName || r.email}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sales-rep-field" className="font-semibold text-slate-700">Sales Representative Assigned</Label>
                        <Select value={salesRepAssigned} onValueChange={setSalesRepAssigned}>
                          <SelectTrigger id="sales-rep-field" className="bg-white">
                            <SelectValue placeholder="Select Sales Rep" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Lee Russell">Lee Russell</SelectItem>
                            <SelectItem value="Kerina Helliwell">Kerina Helliwell</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {selectedBucket === 'inbound' && (
                    <div className="space-y-2">
                      <Label htmlFor="sales-rep-inbound" className="font-semibold text-slate-700">Sales Representative Assigned</Label>
                      <Select value={salesRepAssigned} onValueChange={setSalesRepAssigned}>
                        <SelectTrigger id="sales-rep-inbound" className="bg-white">
                          <SelectValue placeholder="Select Sales Rep" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Lee Russell">Lee Russell</SelectItem>
                          <SelectItem value="Kerina Helliwell">Kerina Helliwell</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedBucket === 'account_manager' && (
                    <div className="space-y-2">
                      <Label htmlFor="am-assigned" className="font-semibold text-slate-700">Account Manager Assigned</Label>
                      <Select value={accountManagerAssigned || "none"} onValueChange={(val) => setAccountManagerAssigned(val === 'none' ? '' : val)}>
                        <SelectTrigger id="am-assigned" className="bg-white">
                          <SelectValue placeholder="Select AM" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select AM</SelectItem>
                          {activeAMs.map((am) => (
                            <SelectItem key={am.uid} value={am.displayName || am.email}>{am.displayName || am.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedBucket === 'customer_success' && (
                    <div className="space-y-2">
                      <Label htmlFor="cs-assigned" className="font-semibold text-slate-700">Customer Success Rep Assigned</Label>
                      <Select value={customerSuccessAssigned || "none"} onValueChange={(val) => setCustomerSuccessAssigned(val === 'none' ? '' : val)}>
                        <SelectTrigger id="cs-assigned" className="bg-white">
                          <SelectValue placeholder="Select CS Rep" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select CS Rep</SelectItem>
                          {activeCS.map((cs) => (
                            <SelectItem key={cs.uid} value={cs.displayName || cs.email}>{cs.displayName || cs.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedBucket === 'nurture' && (
                    <div className="space-y-2">
                      <Label htmlFor="nurture-journey" className="font-semibold text-slate-700">Nurture Journey Sequence *</Label>
                      <Select value={targetJourneyId || "none"} onValueChange={(val) => setTargetJourneyId(val === 'none' ? '' : val)}>
                        <SelectTrigger id="nurture-journey" className="bg-white">
                          <SelectValue placeholder="Select Nurture Campaign" />
                        </SelectTrigger>
                        <SelectContent>
                          {journeys.map((j) => (
                            <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>
                          ))}
                          {journeys.length === 0 && (
                            <SelectItem value="none" disabled>No active nurture journeys found</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedBucket === 'marketing' && (
                    <div className="space-y-2">
                      <Label htmlFor="marketing-list" className="font-semibold text-slate-700">Marketing List Name *</Label>
                      <Input
                        id="marketing-list"
                        value={marketingListName}
                        onChange={(e) => setMarketingListName(e.target.value)}
                        placeholder="e.g. October Outreach or select below"
                        className="bg-white"
                      />
                      {existingLists.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-[10px] text-muted-foreground uppercase self-center mr-1">Existing:</span>
                          {existingLists.slice(0, 5).map(list => (
                            <Badge 
                              key={list} 
                              variant="outline" 
                              className="cursor-pointer hover:bg-[#095c7b] hover:text-white"
                              onClick={() => setMarketingListName(list)}
                            >
                              {list}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </CardContent>
          <CardFooter className="bg-slate-50/50 justify-between py-3">
            <Button variant="outline" className="font-semibold" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button className="bg-[#095c7b] hover:bg-[#084c66] text-white font-semibold" onClick={() => setStep(3)}>
              Continue to Columns Mapping <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 3: COLUMN MAPPING */}
      {step === 3 && (
        <Card className="shadow-md border border-slate-200">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-[#095c7b]">Step 3: Map CSV Headers to Lead Fields</CardTitle>
            <CardDescription>
              Match the column headers from your uploaded CSV to the CRM lead database fields.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Lead Database Field</TableHead>
                    <TableHead className="font-bold text-slate-700">Description</TableHead>
                    <TableHead className="font-bold text-slate-700 w-[280px]">CSV Column Header</TableHead>
                    <TableHead className="font-bold text-slate-700 w-[60px] text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standardFields.map((field) => {
                    // Find mapped value
                    const mappedHeader = Object.keys(columnMappings).find(k => columnMappings[k] === field.key) || '';
                    
                    return (
                      <TableRow key={field.key}>
                        <TableCell className="font-medium text-slate-800">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {field.desc}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={mappedHeader || "__none__"} 
                            onValueChange={(val) => {
                              const newMappings = { ...columnMappings };
                              if (val === '__none__') {
                                // Find and remove mapping
                                Object.keys(newMappings).forEach(k => {
                                  if (newMappings[k] === field.key) delete newMappings[k];
                                });
                              } else {
                                // Clear existing mapping for this key first
                                Object.keys(newMappings).forEach(k => {
                                  if (newMappings[k] === field.key) delete newMappings[k];
                                });
                                newMappings[val] = field.key;
                              }
                              setColumnMappings(newMappings);
                            }}
                          >
                            <SelectTrigger className="bg-white text-xs h-9">
                              <SelectValue placeholder="[ Do not import ]" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">[ Do not import ]</SelectItem>
                              {csvHeaders.map((header) => (
                                <SelectItem key={header} value={header}>{header}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          {mappedHeader ? (
                            <div className="flex justify-center"><Check className="h-5 w-5 text-green-600 bg-green-50 rounded-full p-0.5" /></div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold">Skipped</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50/50 justify-between py-3">
            <Button variant="outline" className="font-semibold" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button 
              className="bg-[#095c7b] hover:bg-[#084c66] text-white font-semibold" 
              onClick={runValidationAndDuplicates}
              disabled={!allRequiredMapped}
            >
              {!allRequiredMapped 
                ? `Map ${missingRequiredMappings[0]?.label || 'All Required Fields'} to Continue` 
                : 'Preview & Validate Leads'} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 4: PREVIEW & DUPLICATES WARNING */}
      {step === 4 && (
        <Card className="shadow-md border border-slate-200">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-[#095c7b] flex items-center gap-2">
              Preview Mapped Leads & Verify Data
            </CardTitle>
            <CardDescription>
              We parsed {csvRows.length} records. Showing the first 20 records for validation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            
            {isValidating ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-4 min-h-[200px]">
                <Loader2 className="h-8 w-8 text-[#095c7b] animate-spin" />
                <p className="text-sm font-semibold text-slate-600">Validating phone and email formats, querying duplicates...</p>
              </div>
            ) : (
              <>
                {/* Duplicate strategy select */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-amber-800 text-sm flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Duplicate Records Strategy ({duplicateCount} detected)
                    </h4>
                    <p className="text-xs text-amber-700">
                      We found matching company names in the database. How would you like to handle duplicates?
                    </p>
                  </div>
                  
                  <Select value={duplicateStrategy} onValueChange={(val) => setDuplicateStrategy(val as 'skip' | 'import')}>
                    <SelectTrigger className="w-[200px] bg-white border-amber-300">
                      <SelectValue placeholder="Strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip duplicates (Recommended)</SelectItem>
                      <SelectItem value="import">Import anyway (Flag duplicates)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Table Preview */}
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-slate-700 w-[60px] text-center">Row</TableHead>
                        <TableHead className="font-bold text-slate-700">Company Name</TableHead>
                        <TableHead className="font-bold text-slate-700">Company Email</TableHead>
                        <TableHead className="font-bold text-slate-700">Company Phone</TableHead>
                        <TableHead className="font-bold text-slate-700">City / Suburb</TableHead>
                        <TableHead className="font-bold text-slate-700">Checks & Alerts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row) => {
                        const rowErrors = validationErrors[row.index] || [];
                        const existingId = duplicateLeads[row.index];
                        const isDup = existingId !== undefined && existingId !== null;

                        return (
                          <TableRow key={row.index} className={rowErrors.length > 0 ? 'bg-red-50/30' : isDup ? 'bg-amber-50/20' : ''}>
                            <TableCell className="text-center font-semibold text-slate-500 text-xs">
                              {row.index + 1}
                            </TableCell>
                            <TableCell className="font-semibold text-slate-800 text-sm">
                              {row.companyName}
                            </TableCell>
                            <TableCell className="text-xs">
                              {row.email}
                            </TableCell>
                            <TableCell className="text-xs">
                              {row.phone}
                            </TableCell>
                            <TableCell className="text-xs">
                              {row.city}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {rowErrors.map((err, i) => (
                                  <Badge key={i} variant="destructive" className="text-[9px] px-1.5 py-0">
                                    {err}
                                  </Badge>
                                ))}
                                
                                {isDup && (
                                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] px-1.5 py-0">
                                    Duplicate Detected
                                  </Badge>
                                )}

                                {rowErrors.length === 0 && !isDup && (
                                  <Badge className="bg-green-100 text-green-800 border-green-200 text-[9px] px-1.5 py-0" variant="outline">
                                    Passed
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

          </CardContent>
          <CardFooter className="bg-slate-50/50 justify-between py-3">
            <Button variant="outline" className="font-semibold" onClick={() => setStep(3)} disabled={isImporting}>
              Back
            </Button>
            <Button 
              className="bg-[#095c7b] hover:bg-[#084c66] text-white font-semibold" 
              onClick={executeImport}
              disabled={isImporting || isValidating}
            >
              {isImporting ? (
                <>Importing...</>
              ) : (
                <>Confirm & Import {csvRows.length} Leads</>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 5: BULK IMPORT EXECUTION PROGRESS */}
      {step === 5 && (
        <Card className="shadow-md border border-slate-200">
          <CardHeader className="bg-slate-50/50 text-center">
            <CardTitle className="text-[#095c7b]">Bulk Import Process</CardTitle>
            <CardDescription>
              Writing lead records to the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 py-10 px-6">
            
            {isImporting ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-5 w-5 animate-spin text-[#095c7b]" /> Importing leads to Firestore...
                  </span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="h-3 bg-slate-100" />
                
                {/* Real-time stats */}
                <div className="grid grid-cols-4 gap-4 text-center mt-4">
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <div className="text-2xl font-bold text-slate-800">{importStats.total}</div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Rows</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="text-2xl font-bold text-green-700">{importStats.success}</div>
                    <div className="text-[10px] text-green-600 font-semibold uppercase">Imported</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="text-2xl font-bold text-amber-700">{importStats.skipped}</div>
                    <div className="text-[10px] text-amber-600 font-semibold uppercase">Skipped Duplicates</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="text-2xl font-bold text-red-700">{importStats.failed}</div>
                    <div className="text-[10px] text-red-600 font-semibold uppercase">Failed</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center border border-green-200">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Bulk Import Complete!</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Your leads have been added to the system successfully.
                  </p>
                </div>

                {/* Final stats summary */}
                <div className="max-w-md mx-auto grid grid-cols-3 gap-3 border rounded-lg p-4 bg-slate-50">
                  <div>
                    <div className="text-xl font-bold text-green-700">{importStats.success}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Success</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-amber-700">{importStats.skipped}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Skipped</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-red-700">{importStats.failed}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Failed</div>
                  </div>
                </div>

                <div className="flex justify-center gap-3 pt-4">
                  <Button 
                    className="bg-[#095c7b] hover:bg-[#084c66] text-white font-semibold" 
                    onClick={() => window.open(selectedBucket === 'marketing' ? '/admin/marketing/lists' : '/leads', '_self')}
                  >
                    View Leads Dashboard
                  </Button>
                  <Button 
                    variant="outline" 
                    className="font-semibold border-slate-300"
                    onClick={() => {
                      setStep(1);
                      setCsvFile(null);
                      setCsvHeaders([]);
                      setCsvRows([]);
                      setColumnMappings({});
                      setPreviewRows([]);
                      setValidationErrors({});
                      setDuplicateLeads({});
                      setImportProgress(0);
                    }}
                  >
                    Import Another File
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      )}

    </div>
  );
}
