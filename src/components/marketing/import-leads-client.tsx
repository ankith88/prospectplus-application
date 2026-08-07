'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { 
  Briefcase, Inbox, Archive, PlusCircle, ArrowLeft, ArrowRight, Upload, 
  CheckCircle2, AlertTriangle, Play, HelpCircle, Download, FileSpreadsheet, Loader2, Check, FileText, Clock, Timer, Zap 
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
import type { LeadBucket, UserProfile, Franchisee, Contact, LeadStatus, TaggedAddress } from '@/lib/types';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, getDoc, doc, writeBatch, serverTimestamp, query, where, limit, addDoc, increment } from 'firebase/firestore';
import { canAssignToAm } from '@/lib/leave-utils';
import { evaluateDuplicateScore, extractCoreBrandName, normalizeCompanyName, cleanAbn } from '@/lib/duplicate-detector';
import { getLeadCampaigns, LeadCampaign } from '@/services/lead-campaigns';
import { MULTISITE_ACCOUNT_MANAGER_UID, isMultisiteCampaign } from '@/lib/constants';
import { rekeyLeadToNetSuite } from '@/services/rekey-lead';
import { cn } from '@/lib/utils';

const standardFields = [
  { key: 'companyName', label: 'Company Name', required: true, desc: 'Name of the business' },
  { key: 'campaign', label: 'Campaign / Source', required: false, desc: 'Lead campaign tag' },
  { key: 'websiteUrl', label: 'Website URL', required: false, desc: 'e.g. https://example.com' },
  { key: 'customerPhone', label: 'Company Phone', required: false, desc: 'Main business phone' },
  { key: 'customerServiceEmail', label: 'Company Email', required: false, desc: 'Main business email' },
  { key: 'abn', label: 'ABN (11 digits)', required: false, desc: 'Australian Business Number' },
  { key: 'street', label: 'Street Address', required: true, desc: 'e.g. 123 Main St' },
  { key: 'city', label: 'Suburb / City', required: true, desc: 'e.g. Sydney' },
  { key: 'state', label: 'State', required: true, desc: 'e.g. NSW' },
  { key: 'zip', label: 'Postcode', required: true, desc: 'e.g. 2000' },
  // Postal Address
  { key: 'postalStreet', label: 'Postal Street Address', required: false, desc: 'e.g. PO Box 123' },
  { key: 'postalCity', label: 'Postal Suburb / City', required: false, desc: 'e.g. Sydney' },
  { key: 'postalState', label: 'Postal State', required: false, desc: 'e.g. NSW' },
  { key: 'postalZip', label: 'Postal Postcode', required: false, desc: 'e.g. 2000' },
  // Additional Address 2 (Tagged)
  { key: 'address2Tag', label: 'Address 2 Tag', required: false, desc: 'e.g. Warehouse, Billing, Shipping' },
  { key: 'address2Street', label: 'Address 2 Street', required: false, desc: 'Street address' },
  { key: 'address2City', label: 'Address 2 Suburb / City', required: false, desc: 'Suburb / City' },
  { key: 'address2State', label: 'Address 2 State', required: false, desc: 'State' },
  { key: 'address2Zip', label: 'Address 2 Postcode', required: false, desc: 'Postcode' },
  // Additional Address 3 (Tagged)
  { key: 'address3Tag', label: 'Address 3 Tag', required: false, desc: 'e.g. Office, Secondary' },
  { key: 'address3Street', label: 'Address 3 Street', required: false, desc: 'Street address' },
  { key: 'address3City', label: 'Address 3 Suburb / City', required: false, desc: 'Suburb / City' },
  { key: 'address3State', label: 'Address 3 State', required: false, desc: 'State' },
  { key: 'address3Zip', label: 'Address 3 Postcode', required: false, desc: 'Postcode' },
  { key: 'prospectPlusId', label: 'Prospect+ ID / Internal ID', required: false, desc: 'Prospect+ ID (e.g. PP-1024) or NetSuite Internal ID' },
// Additional Parent Lead / Customer Linkage (Multi-Site Parent)
  { key: 'parentProspectPlusId', label: 'Parent Prospect+ ID / Lead ID', required: false, desc: 'Prospect+ ID (e.g. PP-1024) or Record ID of parent lead or company' },
  { key: 'parentCompanyName', label: 'Parent Company Name', required: false, desc: 'Name of parent business to match and link' },
  { key: 'parentAbn', label: 'Parent ABN', required: false, desc: 'ABN of parent company to match and link' },
  // Contact 1 (Primary Contact)
  { key: 'contactFirstName', label: 'Contact 1 First Name', required: false, desc: 'First name of primary contact' },
  { key: 'contactLastName', label: 'Contact 1 Last Name', required: false, desc: 'Last name of primary contact' },
  { key: 'contactTitle', label: 'Contact 1 Title', required: false, desc: 'Job title of primary contact' },
  { key: 'contactEmail', label: 'Contact 1 Email', required: false, desc: 'Direct email of primary contact' },
  { key: 'contactPhone', label: 'Contact 1 Phone', required: false, desc: 'Direct phone of primary contact' },
  // Contact 2 (Secondary Contact)
  { key: 'contact2FirstName', label: 'Contact 2 First Name', required: false, desc: 'First name of secondary contact' },
  { key: 'contact2LastName', label: 'Contact 2 Last Name', required: false, desc: 'Last name of secondary contact' },
  { key: 'contact2Title', label: 'Contact 2 Title', required: false, desc: 'Job title of secondary contact' },
  { key: 'contact2Email', label: 'Contact 2 Email', required: false, desc: 'Direct email of secondary contact' },
  { key: 'contact2Phone', label: 'Contact 2 Phone', required: false, desc: 'Direct phone of secondary contact' },
  // Contact 3 (Accounts / Additional Contact)
  { key: 'contact3FirstName', label: 'Contact 3 First Name', required: false, desc: 'First name of 3rd contact' },
  { key: 'contact3LastName', label: 'Contact 3 Last Name', required: false, desc: 'Last name of 3rd contact' },
  { key: 'contact3Title', label: 'Contact 3 Title', required: false, desc: 'Job title of 3rd contact' },
  { key: 'contact3Email', label: 'Contact 3 Email', required: false, desc: 'Direct email of 3rd contact' },
  { key: 'contact3Phone', label: 'Contact 3 Phone', required: false, desc: 'Direct phone of 3rd contact' }
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
  const [availableCampaigns, setAvailableCampaigns] = useState<LeadCampaign[]>([]);
  
  // Parent Account Linkage state
  const [globalParentId, setGlobalParentId] = useState<string>('none');
  const [parentAccounts, setParentAccounts] = useState<Array<{ id: string; companyName: string; prospectPlusId?: string; abn?: string; type: 'company' | 'lead' }>>([]);
  const [parentAccountsMap, setParentAccountsMap] = useState<Map<string, { id: string; companyName: string; prospectPlusId?: string }>>(new Map());
  const [parentMatches, setParentMatches] = useState<Record<number, { id: string; companyName: string; prospectPlusId?: string; source: 'row' | 'global' | 'auto' } | null>>({});

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
  const [duplicateLeads, setDuplicateLeads] = useState<Record<number, { id: string; confidence: 'High' | 'Medium' | 'Low' | 'None'; reasons: string[] } | null>>({}); // rowIdx -> duplicate match info or null
  const [existingCompanyMatches, setExistingCompanyMatches] = useState<Record<number, { id: string; name: string } | null>>({});
  const [existingCompaniesCache, setExistingCompaniesCache] = useState<Map<string, { id: string; name: string }>>(new Map());
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'import' | 'update'>('skip');
  const [matchFieldKey, setMatchFieldKey] = useState<'auto' | 'internalId' | 'prospectPlusId' | 'customerEntityId' | 'abn' | 'companyName'>('auto');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  
  // Step 5 (Import Execution & Live Performance Timer) state
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importStartTime, setImportStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [processedRowsCount, setProcessedRowsCount] = useState<number>(0);
  const [importStats, setImportStats] = useState<{ success: number; updated: number; skipped: number; failed: number; total: number }>({
    success: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    total: 0
  });
  const [importLogRecords, setImportLogRecords] = useState<Array<{
    rowNum: number;
    companyName: string;
    internalId?: string;
    status: 'Created' | 'Updated' | 'Skipped' | 'Failed';
    details: string;
  }>>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'Created' | 'Updated' | 'Skipped' | 'Failed'>('all');
  const [logSearch, setLogSearch] = useState('');

  // NetSuite Bulk Sync state
  const [createdLeadIds, setCreatedLeadIds] = useState<string[]>([]);
  const [isSyncingNetSuite, setIsSyncingNetSuite] = useState<boolean>(false);
  const [netSuiteSyncProgress, setNetSuiteSyncProgress] = useState<number>(0);

  const executeNetSuiteSync = async (targetId?: string) => {
    const idsToSync = targetId ? [targetId] : createdLeadIds;
    if (idsToSync.length === 0) return;

    setIsSyncingNetSuite(true);
    setNetSuiteSyncProgress(0);

    let syncedCount = 0;
    const updatedLogs = [...importLogRecords];

    for (let i = 0; i < idsToSync.length; i++) {
      const leadId = idsToSync[i];
      try {
        const res = await rekeyLeadToNetSuite(leadId);
        if (res.success && res.newDocId) {
          syncedCount++;
          const logIndex = updatedLogs.findIndex((l) => l.internalId === leadId);
          if (logIndex !== -1) {
            updatedLogs[logIndex] = {
              ...updatedLogs[logIndex],
              internalId: res.newDocId,
              status: 'Created',
              details: `Synced & Re-keyed to NetSuite Numeric ID ${res.newDocId}`,
            };
          }
        } else {
          const logIndex = updatedLogs.findIndex((l) => l.internalId === leadId);
          if (logIndex !== -1) {
            updatedLogs[logIndex] = {
              ...updatedLogs[logIndex],
              status: 'Failed',
              details: `Failed NetSuite Sync: ${res.error || 'NetSuite API error'}`,
            };
          }
        }
      } catch (err: any) {
        console.error(`NetSuite sync error for ${leadId}:`, err);
      }
      setNetSuiteSyncProgress(Math.round(((i + 1) / idsToSync.length) * 100));
    }

    setImportLogRecords(updatedLogs);
    setIsSyncingNetSuite(false);
    toast({
      title: 'NetSuite Sync Complete',
      description: `Successfully created and re-keyed ${syncedCount} of ${idsToSync.length} leads in NetSuite.`,
    });
  };

  // Live import timer effect
  useEffect(() => {
    let interval: any = null;
    if (isImporting && importStartTime) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - importStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isImporting, importStartTime]);

  const requiredFields = useMemo(() => standardFields.filter(f => f.required), []);
  const missingRequiredMappings = useMemo(() => {
    return requiredFields.filter(f => !Object.values(columnMappings).includes(f.key));
  }, [columnMappings, requiredFields]);
  const allRequiredMapped = missingRequiredMappings.length === 0;

  // Fetch users, franchisees, journeys, existing lists and parent accounts on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [users, frs, camps] = await Promise.all([getAllUsers(), getAllFranchisees(), getLeadCampaigns()]);
        setAllUsers(users);
        setFranchisees(frs);
        setAvailableCampaigns(camps.filter(c => c.isActive));
        
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

        // Pre-fetch parent account candidates (companies and leads) for parent-child linking
        const [compSnap, leadsParentSnap] = await Promise.all([
          getDocs(query(collection(firestore, 'companies'), limit(1000))),
          getDocs(query(collection(firestore, 'leads'), limit(1000)))
        ]);

        const compMap = new Map<string, { id: string; name: string }>();
        const parentAccMap = new Map<string, { id: string; companyName: string; prospectPlusId?: string }>();
        const pAccounts: Array<{ id: string; companyName: string; prospectPlusId?: string; abn?: string; type: 'company' | 'lead' }> = [];

        const registerParentItem = (item: { id: string; companyName: string; prospectPlusId?: string; abn?: string }, data: any) => {
          const addKey = (k?: string | number | null) => {
            if (k === undefined || k === null) return;
            const str = String(k).trim().toLowerCase();
            if (!str) return;
            if (!parentAccMap.has(str)) parentAccMap.set(str, item);
            const numPart = str.replace(/^[a-zA-Z\-_]+/, '');
            if (numPart && numPart !== str && !parentAccMap.has(numPart)) {
              parentAccMap.set(numPart, item);
            }
          };

          addKey(item.id);
          addKey(item.prospectPlusId);
          addKey(item.abn);
          addKey(data.internalid);
          addKey(data.internalId);
          addKey(data.entityId);
          addKey(data.customerEntityId);
          addKey(data.netsuiteId);
          addKey(data.customLeadId);

          const normName = normalizeCompanyName(item.companyName);
          if (normName && !parentAccMap.has(normName)) {
            parentAccMap.set(normName, item);
          }
        };

        compSnap.docs.forEach(docSnap => {
          const data = docSnap.data();
          const name = data.companyName || docSnap.id;
          const ppId = data.prospectPlusId || data.entityId || data.internalid || '';
          const abn = cleanAbn(data.abn);
          const normName = normalizeCompanyName(data.companyName);

          const item = { id: docSnap.id, companyName: name, prospectPlusId: ppId, abn, type: 'company' as const };
          pAccounts.push(item);

          registerParentItem(item, data);

          if (normName) compMap.set(normName, { id: docSnap.id, name });
          if (abn) compMap.set(abn, { id: docSnap.id, name });
        });

        leadsParentSnap.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (!data.parentLeadId) {
            const name = data.companyName || docSnap.id;
            const ppId = data.prospectPlusId || data.internalid || data.id || '';
            const abn = cleanAbn(data.abn);

            const item = { id: docSnap.id, companyName: name, prospectPlusId: ppId, abn, type: 'lead' as const };
            if (!parentAccMap.has(docSnap.id.toLowerCase().trim())) {
              pAccounts.push(item);
            }

            registerParentItem(item, data);
          }
        });

        setParentAccounts(pAccounts);
        setParentAccountsMap(parentAccMap);
        setExistingCompaniesCache(compMap);
      } catch (err) {
        console.error('Failed to load import setup data:', err);
        toast({ variant: 'destructive', title: 'Setup Error', description: 'Could not load required users or franchisee configuration.' });
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (userProfile?.activeRole === 'Outbound Admin') {
      setSelectedBucket('outbound');
      setCampaignName('Outbound');
    }
  }, [userProfile]);

  // Filtered users for assignments
  const activeDialers = useMemo(() => 
    allUsers.filter(u => (u.assignedRoles?.includes('user') || u.assignedRoles?.includes('Lead Gen') || u.assignedRoles?.includes('Dialer') || u.assignedRoles?.includes('dialers') || u.role === 'user' || u.role === 'Dialer' || u.role === 'dialers') && !u.disabled), 
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
      'Bulk Import',
      'https://exampleenterprise.com.au',
      '02 9876 5432',
      'info@exampleenterprise.com.au',
      '12345678901',
      'Suite 4.02 Level 4 100 George St',
      'Sydney',
      'NSW',
      '2000',
      // Postal Address
      'PO Box 999',
      'Sydney',
      'NSW',
      '2001',
      // Address 2 (Warehouse)
      'Warehouse',
      '50 Logistics Way',
      'Botany',
      'NSW',
      '2019',
      // Address 3 (Office)
      'Office',
      'Level 12 50 Bridge St',
      'Sydney',
      'NSW',
      '2000',
      // Parent linkage
      'PP-10042',
      'Parent Enterprise HQ',
      '98765432109',
      // Contact 1
      'John',
      'Smith',
      'Operations Director',
      'john.smith@exampleenterprise.com.au',
      '0400 123 456',
      // Contact 2
      'Jane',
      'Doe',
      'Accounts Manager',
      'accounts@exampleenterprise.com.au',
      '0400 654 321',
      // Contact 3
      'Alex',
      'Taylor',
      'Procurement Lead',
      'alex.taylor@exampleenterprise.com.au',
      '0400 999 888'
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
        
        // Smart Auto-mapping logic
        const mappings: Record<string, string> = {};
        headers.forEach(header => {
          const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
          const match = standardFields.find(field => {
            const fieldLabelNorm = field.label.toLowerCase().replace(/[^a-z0-9]/g, '');
            const fieldKeyNorm = field.key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalizedHeader === fieldLabelNorm || normalizedHeader === fieldKeyNorm) return true;

            // Secondary aliases for primary contact (Contact 1)
            if (field.key === 'contactFirstName' && (normalizedHeader === 'contactfirstname' || normalizedHeader === 'firstname' || normalizedHeader === 'primarycontactfirstname' || normalizedHeader === 'contact1firstname')) return true;
            if (field.key === 'contactLastName' && (normalizedHeader === 'contactlastname' || normalizedHeader === 'lastname' || normalizedHeader === 'primarycontactlastname' || normalizedHeader === 'contact1lastname')) return true;
            if (field.key === 'contactTitle' && (normalizedHeader === 'contacttitle' || normalizedHeader === 'title' || normalizedHeader === 'jobtitle' || normalizedHeader === 'primarycontacttitle' || normalizedHeader === 'contact1title')) return true;
            if (field.key === 'contactEmail' && (normalizedHeader === 'contactemail' || normalizedHeader === 'email' || normalizedHeader === 'primarycontactemail' || normalizedHeader === 'contact1email')) return true;
            if (field.key === 'contactPhone' && (normalizedHeader === 'contactphone' || normalizedHeader === 'phone' || normalizedHeader === 'primarycontactphone' || normalizedHeader === 'contact1phone')) return true;

            // Aliases for Contact 2
            if (field.key === 'contact2FirstName' && (normalizedHeader === 'secondarycontactfirstname' || normalizedHeader === 'contact2name' || normalizedHeader === 'contact2firstname')) return true;
            if (field.key === 'contact2LastName' && (normalizedHeader === 'secondarycontactlastname' || normalizedHeader === 'contact2lastname')) return true;
            if (field.key === 'contact2Title' && (normalizedHeader === 'secondarycontacttitle' || normalizedHeader === 'contact2title')) return true;
            if (field.key === 'contact2Email' && (normalizedHeader === 'secondarycontactemail' || normalizedHeader === 'contact2email')) return true;
            if (field.key === 'contact2Phone' && (normalizedHeader === 'secondarycontactphone' || normalizedHeader === 'contact2phone')) return true;

            // Aliases for Contact 3
            if (field.key === 'contact3FirstName' && (normalizedHeader === 'accountscontactfirstname' || normalizedHeader === 'contact3name' || normalizedHeader === 'contact3firstname')) return true;
            if (field.key === 'contact3LastName' && (normalizedHeader === 'accountscontactlastname' || normalizedHeader === 'contact3lastname')) return true;
            if (field.key === 'contact3Title' && (normalizedHeader === 'accountscontacttitle' || normalizedHeader === 'contact3title')) return true;
            if (field.key === 'contact3Email' && (normalizedHeader === 'accountscontactemail' || normalizedHeader === 'contact3email')) return true;
            if (field.key === 'contact3Phone' && (normalizedHeader === 'accountscontactphone' || normalizedHeader === 'contact3phone')) return true;

            // Aliases for Lead ID / Prospect+ ID / Internal ID
            if (field.key === 'prospectPlusId' && (normalizedHeader === 'internalid' || normalizedHeader === 'prospectplusid' || normalizedHeader === 'prospectid' || normalizedHeader === 'leadid' || normalizedHeader === 'entityid' || normalizedHeader === 'netsuiteid' || normalizedHeader === 'netsuiteinternalid')) return true;

            // Aliases for Parent Linkage
            if (field.key === 'parentProspectPlusId' && (normalizedHeader === 'parentprospectplusid' || normalizedHeader === 'parentprospectid' || normalizedHeader === 'parentid' || normalizedHeader === 'parentleadid' || normalizedHeader === 'parententityid' || normalizedHeader === 'parentaccountid' || normalizedHeader === 'parentprospectidleadid' || normalizedHeader === 'parentprospectplusidleadid')) return true;
            if (field.key === 'parentCompanyName' && (normalizedHeader === 'parentcompanyname' || normalizedHeader === 'parentcompany' || normalizedHeader === 'parentbusinessname' || normalizedHeader === 'parentaccount')) return true;
            if (field.key === 'parentAbn' && (normalizedHeader === 'parentabn' || normalizedHeader === 'parentabnnumber')) return true;

            return false;
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

    const mailPlusObj = franchisees.find(f => f.internalId === '435' || f.name?.toLowerCase().includes('mailplus')) || { internalId: '435', name: 'MailPlus Pty Ltd' };

    if (cleanCity && cleanState && cleanZip) {
      const matches: Franchisee[] = [];
      for (const f of franchisees) {
        const match = f.territoryJson?.some((t: any) => 
          t.suburbs?.toUpperCase() === cleanCity && 
          t.state?.toUpperCase() === cleanState && 
          String(t.post_code) === String(cleanZip)
        );
        if (match) {
          matches.push(f);
        }
      }

      // If exactly 1 franchisee covers the area, assign that franchisee.
      // If multiple franchisees can service or none match, default to MailPlus Pty Ltd (ID 435).
      if (matches.length === 1) {
        return { internalId: matches[0].internalId || matches[0].id || '435', name: matches[0].name || 'MailPlus Pty Ltd' };
      }
    }
    return { internalId: mailPlusObj.internalId || '435', name: mailPlusObj.name || 'MailPlus Pty Ltd' };
  };

  // Helper to query matching leads based on user-selected matchFieldKey
  const findMatchingLead = async (
    row: any, 
    getVal: (key: string) => string, 
    compName: string, 
    activeMatchKey: string
  ) => {
    const rawIdVal = (getVal('prospectPlusId') || row['Internal ID'] || row['internalid'] || row['Prospect+ ID'] || row['prospectplusid'] || row['Customer ID'] || row['customerEntityId'] || '')?.toString().trim();
    const abnVal = cleanAbn(getVal('abn') || row['ABN'] || row['abn'] || '');

    // 1. NetSuite Internal ID / Document ID Mode
    if (activeMatchKey === 'internalId') {
      if (!rawIdVal) return null;
      try {
        const idSnap = await getDoc(doc(firestore, 'leads', rawIdVal));
        if (idSnap.exists()) return { id: idSnap.id, confidence: 'High' as const, reasons: ['NetSuite Internal ID (Doc ID)'] };

        const numVal = parseInt(rawIdVal, 10);
        const qStr = query(collection(firestore, 'leads'), where('internalid', '==', rawIdVal), limit(1));
        const sStr = await getDocs(qStr);
        if (!sStr.empty) return { id: sStr.docs[0].id, confidence: 'High' as const, reasons: ['internalid Field Match'] };

        if (!isNaN(numVal)) {
          const qNum = query(collection(firestore, 'leads'), where('internalid', '==', numVal), limit(1));
          const sNum = await getDocs(qNum);
          if (!sNum.empty) return { id: sNum.docs[0].id, confidence: 'High' as const, reasons: ['internalid Field Match'] };
        }
      } catch (e) {}
      return null;
    }

    // 2. Prospect+ ID Mode
    if (activeMatchKey === 'prospectPlusId') {
      if (!rawIdVal) return null;
      try {
        const qPp = query(collection(firestore, 'leads'), where('prospectPlusId', '==', rawIdVal), limit(1));
        const sPp = await getDocs(qPp);
        if (!sPp.empty) return { id: sPp.docs[0].id, confidence: 'High' as const, reasons: ['Prospect+ ID Match'] };
      } catch (e) {}
      return null;
    }

    // 3. Customer Entity ID Mode
    if (activeMatchKey === 'customerEntityId') {
      if (!rawIdVal) return null;
      try {
        const numVal = parseInt(rawIdVal, 10);
        const qEntStr = query(collection(firestore, 'leads'), where('customerEntityId', '==', rawIdVal), limit(1));
        const sEntStr = await getDocs(qEntStr);
        if (!sEntStr.empty) return { id: sEntStr.docs[0].id, confidence: 'High' as const, reasons: ['Customer Entity ID Match'] };
        if (!isNaN(numVal)) {
          const qEntNum = query(collection(firestore, 'leads'), where('customerEntityId', '==', numVal), limit(1));
          const sEntNum = await getDocs(qEntNum);
          if (!sEntNum.empty) return { id: sEntNum.docs[0].id, confidence: 'High' as const, reasons: ['Customer Entity ID Match'] };
        }
      } catch (e) {}
      return null;
    }

    // 4. ABN Mode
    if (activeMatchKey === 'abn') {
      if (!abnVal) return null;
      try {
        const qAbn = query(collection(firestore, 'leads'), where('abn', '==', abnVal), limit(1));
        const sAbn = await getDocs(qAbn);
        if (!sAbn.empty) return { id: sAbn.docs[0].id, confidence: 'High' as const, reasons: ['ABN Match'] };
      } catch (e) {}
      return null;
    }

    // 5. Company Name Only Mode
    if (activeMatchKey === 'companyName') {
      if (!compName) return null;
      try {
        const qComp = query(collection(firestore, 'leads'), where('companyName', '==', compName), limit(1));
        const sComp = await getDocs(qComp);
        if (!sComp.empty) return { id: sComp.docs[0].id, confidence: 'High' as const, reasons: ['Company Name Match'] };
      } catch (e) {}
      return null;
    }

    // 6. Auto-Detect Mode (Default: Document ID + internalid + prospectPlusId + customerEntityId + ABN + Brand Prefix)
    if (rawIdVal) {
      try {
        const idSnap = await getDoc(doc(firestore, 'leads', rawIdVal));
        if (idSnap.exists()) return { id: idSnap.id, confidence: 'High' as const, reasons: ['Internal ID Match'] };

        const numVal = parseInt(rawIdVal, 10);
        const queries = [
          query(collection(firestore, 'leads'), where('internalid', '==', rawIdVal), limit(1)),
          query(collection(firestore, 'leads'), where('prospectPlusId', '==', rawIdVal), limit(1)),
          query(collection(firestore, 'leads'), where('customerEntityId', '==', rawIdVal), limit(1))
        ];
        if (!isNaN(numVal)) {
          queries.push(query(collection(firestore, 'leads'), where('internalid', '==', numVal), limit(1)));
          queries.push(query(collection(firestore, 'leads'), where('customerEntityId', '==', numVal), limit(1)));
        }

        const querySnaps = await Promise.all(queries.map(q => getDocs(q)));
        for (const qSnap of querySnaps) {
          if (!qSnap.empty) return { id: qSnap.docs[0].id, confidence: 'High' as const, reasons: ['Internal ID Field Match'] };
        }
      } catch (e) {}
    }

    if (compName) {
      try {
        let coreBrand = extractCoreBrandName(compName);
        if (coreBrand && coreBrand.length < 3) {
          const norm = normalizeCompanyName(compName);
          const words = norm.split(/\s+/);
          coreBrand = words.slice(0, Math.min(words.length, 2)).join(' ');
        }

        const qExact = query(collection(firestore, 'leads'), where('companyName', '==', compName), limit(5));
        let qPrefix = null;
        if (coreBrand && coreBrand.length >= 2) {
          const coreUpper = coreBrand.charAt(0).toUpperCase() + coreBrand.slice(1);
          qPrefix = query(
            collection(firestore, 'leads'),
            where('companyName', '>=', coreUpper),
            where('companyName', '<=', coreUpper + '\uf8ff'),
            limit(10)
          );
        }

        const [exactSnap, prefixSnap] = await Promise.all([
          getDocs(qExact),
          qPrefix ? getDocs(qPrefix) : Promise.resolve({ docs: [] } as any)
        ]);

        const incomingLead = {
          companyName: compName,
          customerServiceEmail: getVal('customerServiceEmail'),
          customerPhone: getVal('customerPhone'),
          abn: getVal('abn'),
          address: {
            street: getVal('street'),
            city: getVal('city'),
            state: getVal('state'),
            zip: getVal('zip'),
            country: 'Australia'
          }
        };

        let bestMatch: { id: string; confidence: 'High' | 'Medium' | 'Low' | 'None'; reasons: string[] } | null = null;
        let topScore = 0;
        const checkedIds = new Set<string>();

        const docs = [...exactSnap.docs, ...prefixSnap.docs];
        docs.forEach(docSnap => {
          if (checkedIds.has(docSnap.id)) return;
          checkedIds.add(docSnap.id);
          const candidateLead = { id: docSnap.id, ...docSnap.data() };
          const res = evaluateDuplicateScore(incomingLead, candidateLead);
          if (res.isMatch && res.score > topScore) {
            topScore = res.score;
            bestMatch = { id: docSnap.id, confidence: res.confidence, reasons: res.matchedCriteria };
          }
        });

        return bestMatch;
      } catch (e) {}
    }

    return null;
  };

  // Helper for async parent lookup with Firestore query fallback
  const resolveParentAccountByAnyId = async (
    rawPpId?: string,
    rawAbn?: string,
    rawName?: string
  ): Promise<{ id: string; companyName: string; prospectPlusId?: string; source: 'row' | 'global' | 'auto' } | null> => {
    const cleanPpId = rawPpId?.trim();
    const cleanAbnVal = cleanAbn(rawAbn);
    const cleanNameNorm = normalizeCompanyName(rawName);

    // 1. In-memory lookup
    if (cleanPpId) {
      const k = cleanPpId.toLowerCase();
      if (parentAccountsMap.has(k)) {
        const found = parentAccountsMap.get(k)!;
        return { id: found.id, companyName: found.companyName, prospectPlusId: found.prospectPlusId, source: 'row' };
      }
      const numPart = cleanPpId.replace(/^[a-zA-Z\-_]+/, '').toLowerCase();
      if (numPart && parentAccountsMap.has(numPart)) {
        const found = parentAccountsMap.get(numPart)!;
        return { id: found.id, companyName: found.companyName, prospectPlusId: found.prospectPlusId, source: 'row' };
      }
    }
    if (cleanAbnVal && parentAccountsMap.has(cleanAbnVal)) {
      const found = parentAccountsMap.get(cleanAbnVal)!;
      return { id: found.id, companyName: found.companyName, prospectPlusId: found.prospectPlusId, source: 'row' };
    }
    if (cleanNameNorm && parentAccountsMap.has(cleanNameNorm)) {
      const found = parentAccountsMap.get(cleanNameNorm)!;
      return { id: found.id, companyName: found.companyName, prospectPlusId: found.prospectPlusId, source: 'row' };
    }

    // 2. Direct Firestore search fallback
    if (cleanPpId) {
      const searchTerms: (string | number)[] = [cleanPpId];
      const numPart = cleanPpId.replace(/^[a-zA-Z\-_]+/, '');
      if (numPart && numPart !== cleanPpId) searchTerms.push(numPart);
      if (numPart && !isNaN(Number(numPart))) searchTerms.push(Number(numPart));

      const collections = ['companies', 'leads'];
      const fields = ['prospectPlusId', 'internalid', 'internalId', 'customerEntityId', 'entityId', 'netsuiteId', 'prospect_plus_id'];

      for (const col of collections) {
        for (const term of searchTerms) {
          try {
            const docSnap = await getDoc(doc(firestore, col, String(term)));
            if (docSnap.exists()) {
              const dData = docSnap.data();
              const item = {
                id: docSnap.id,
                companyName: dData.companyName || docSnap.id,
                prospectPlusId: dData.prospectPlusId || dData.internalid || docSnap.id
              };
              parentAccountsMap.set(cleanPpId.toLowerCase(), item);
              return { ...item, source: 'row' };
            }
          } catch (e) {}
        }
      }

      for (const col of collections) {
        for (const f of fields) {
          for (const val of searchTerms) {
            try {
              const qSnap = await getDocs(query(collection(firestore, col), where(f, '==', val), limit(1)));
              if (!qSnap.empty) {
                const docItem = qSnap.docs[0];
                const dData = docItem.data();
                const item = {
                  id: docItem.id,
                  companyName: dData.companyName || docItem.id,
                  prospectPlusId: dData.prospectPlusId || dData.internalid || docItem.id
                };
                parentAccountsMap.set(cleanPpId.toLowerCase(), item);
                return { ...item, source: 'row' };
              }
            } catch (e) {}
          }
        }
      }
    }

    if (rawName && rawName.trim()) {
      for (const col of ['companies', 'leads']) {
        try {
          const qSnap = await getDocs(query(collection(firestore, col), where('companyName', '==', rawName.trim()), limit(1)));
          if (!qSnap.empty) {
            const docItem = qSnap.docs[0];
            const dData = docItem.data();
            const item = {
              id: docItem.id,
              companyName: dData.companyName || docItem.id,
              prospectPlusId: dData.prospectPlusId || dData.internalid || docItem.id
            };
            if (cleanNameNorm) parentAccountsMap.set(cleanNameNorm, item);
            return { ...item, source: 'row' };
          }
        } catch (e) {}
      }
    }

    // 3. Global fallback
    if (globalParentId && globalParentId !== 'none') {
      const found = parentAccounts.find(p => p.id === globalParentId);
      if (found) {
        return { id: found.id, companyName: found.companyName, prospectPlusId: found.prospectPlusId, source: 'global' };
      }
    }

    return null;
  };

  // Run Preview Validation and Duplication checks
  const runValidationAndDuplicates = async (overrideMatchKey?: string) => {
    const activeMatchKey = overrideMatchKey || matchFieldKey;
    setIsValidating(true);
    setStep(4);
    
    const errors: Record<number, string[]> = {};
    const duplicates: Record<number, { id: string; confidence: 'High' | 'Medium' | 'Low' | 'None'; reasons: string[] } | null> = {};
    const compMatches: Record<number, { id: string; name: string } | null> = {};
    const pMatches: Record<number, { id: string; companyName: string; prospectPlusId?: string; source: 'row' | 'global' | 'auto' } | null> = {};
    const previewData: any[] = [];
    
    // Take up to 20 rows for validation list and preview
    const limitRows = csvRows.slice(0, 20);

    for (let idx = 0; idx < limitRows.length; idx++) {
      const row = limitRows[idx];
      const rowErrors: string[] = [];
      
      const getVal = (key: string) => {
        const colHeader = Object.keys(columnMappings).find(k => columnMappings[k] === key);
        return colHeader ? row[colHeader]?.trim() : '';
      };

      // Construct mapped lead data
      const companyName = getVal('companyName');
      const email = getVal('customerServiceEmail');
      const phone = getVal('customerPhone');
      const abnVal = cleanAbn(getVal('abn'));
      const normName = normalizeCompanyName(companyName);
      
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

      // 1. Parent Account Resolution (Prospect+ ID, ABN, Company Name, or Global Default)
      pMatches[idx] = await resolveParentAccountByAnyId(
        getVal('parentProspectPlusId'),
        getVal('parentAbn'),
        getVal('parentCompanyName')
      );

      // 2. Existing Active Customer Check (Instant Cache Lookup)
      if (abnVal && existingCompaniesCache.has(abnVal)) {
        compMatches[idx] = existingCompaniesCache.get(abnVal)!;
      } else if (normName && existingCompaniesCache.has(normName)) {
        compMatches[idx] = existingCompaniesCache.get(normName)!;
      } else {
        compMatches[idx] = null;
      }
      
      // 3. Duplicate Lead Check
      duplicates[idx] = await findMatchingLead(row, getVal, companyName, activeMatchKey);
      
      // Extract contacts info for preview
      const c1First = getVal('contactFirstName');
      const c1Last = getVal('contactLastName');
      const c1Name = `${c1First} ${c1Last}`.trim();
      const c2First = getVal('contact2FirstName');
      const c2Last = getVal('contact2LastName');
      const c2Name = `${c2First} ${c2Last}`.trim();
      const c3First = getVal('contact3FirstName');
      const c3Last = getVal('contact3LastName');
      const c3Name = `${c3First} ${c3Last}`.trim();

      let contactCount = 0;
      if (c1Name || getVal('contactEmail') || getVal('contactPhone')) contactCount++;
      if (c2Name || getVal('contact2Email') || getVal('contact2Phone')) contactCount++;
      if (c3Name || getVal('contact3Email') || getVal('contact3Phone')) contactCount++;

      previewData.push({
        index: idx,
        companyName: companyName || 'N/A',
        email: email || '-',
        phone: phone || '-',
        city: row[Object.keys(columnMappings).find(k => columnMappings[k] === 'city') || ''] || '-',
        zip: row[Object.keys(columnMappings).find(k => columnMappings[k] === 'zip') || ''] || '-',
        primaryContact: c1Name || getVal('contactEmail') || 'None',
        contactCount
      });
    }

    // Run duplicate & parent check stats on next 80 entries concurrently
    const remainingRows = csvRows.slice(20, 100);
    const checks = remainingRows.map(async (row, offsetIdx) => {
      const actualIdx = offsetIdx + 20;
      const getVal = (key: string) => {
        const colHeader = Object.keys(columnMappings).find(k => columnMappings[k] === key);
        return colHeader ? row[colHeader]?.trim() : '';
      };

      const compName = getVal('companyName');
      const abnVal = cleanAbn(getVal('abn'));
      const normName = normalizeCompanyName(compName);

      // Parent Account resolution logic
      pMatches[actualIdx] = await resolveParentAccountByAnyId(
        getVal('parentProspectPlusId'),
        getVal('parentAbn'),
        getVal('parentCompanyName')
      );

      if (abnVal && existingCompaniesCache.has(abnVal)) {
        compMatches[actualIdx] = existingCompaniesCache.get(abnVal)!;
      } else if (normName && existingCompaniesCache.has(normName)) {
        compMatches[actualIdx] = existingCompaniesCache.get(normName)!;
      } else {
        compMatches[actualIdx] = null;
      }

      duplicates[actualIdx] = await findMatchingLead(row, getVal, compName, activeMatchKey);
    });
    
    await Promise.all(checks);
    
    setPreviewRows(previewData);
    setValidationErrors(errors);
    setDuplicateLeads(duplicates);
    setExistingCompanyMatches(compMatches);
    setParentMatches(pMatches);
    setIsValidating(false);
  };

  // Perform Final Bulk Import
  const executeImport = async () => {
    setIsImporting(true);
    setImportProgress(0);
    setImportStartTime(Date.now());
    setElapsedSeconds(0);
    setProcessedRowsCount(0);
    
    let successCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const newCreatedLeadIds: string[] = [];
    
    const importLogs: Array<{
      rowNum: number;
      companyName: string;
      internalId?: string;
      status: 'Created' | 'Updated' | 'Skipped' | 'Failed';
      details: string;
    }> = [];
    
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
          importLogs.push({
            rowNum: rowIdx + 1,
            companyName: companyName || `Row ${rowIdx + 1}`,
            status: 'Failed',
            details: 'Missing required company name or required fields'
          });
          continue;
        }

        // Duplicate & Existing Customer handling
        let isDuplicateMatch = duplicateLeads[rowIdx];
        if (isDuplicateMatch === undefined) {
          isDuplicateMatch = await findMatchingLead(row, getVal, companyName, matchFieldKey);
        }
        const isExistingCustomerMatch = existingCompanyMatches[rowIdx];

        if ((isDuplicateMatch || isExistingCustomerMatch) && duplicateStrategy === 'skip') {
          skippedCount++;
          importLogs.push({
            rowNum: rowIdx + 1,
            companyName: companyName || `Row ${rowIdx + 1}`,
            internalId: isDuplicateMatch?.id || isExistingCustomerMatch?.id,
            status: 'Skipped',
            details: isExistingCustomerMatch
              ? `Existing active customer (${isExistingCustomerMatch.name}) skipped`
              : `Duplicate lead record (${isDuplicateMatch?.id}) skipped`
          });
          continue;
        }

        if (duplicateStrategy === 'update' && !isDuplicateMatch) {
          skippedCount++;
          importLogs.push({
            rowNum: rowIdx + 1,
            companyName: companyName || `Row ${rowIdx + 1}`,
            status: 'Skipped',
            details: 'No matching lead record found in database to update'
          });
          continue;
        }

        const isUpdatingExistingLead = (duplicateStrategy === 'update' && !!isDuplicateMatch);

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
        let assignedFranchiseeId = '435';
        if (defaultFranchiseeId === 'Auto-resolve') {
          const resolved = resolveLeadFranchisee(address.city, address.state, address.zip);
          assignedFranchisee = resolved.name || 'MailPlus Pty Ltd';
          assignedFranchiseeId = resolved.internalId || '435';
        } else if (defaultFranchiseeId) {
          const fObj = franchisees.find(f => f.internalId === defaultFranchiseeId || f.name === defaultFranchiseeId);
          assignedFranchisee = fObj?.name || defaultFranchiseeId;
          assignedFranchiseeId = fObj?.internalId || defaultFranchiseeId;
        }

        // Postal Address resolution
        const postalStreet = getVal('postalStreet');
        const postalCity = getVal('postalCity');
        const postalState = getVal('postalState');
        const postalZip = getVal('postalZip');
        const postalAddress = (postalStreet || postalCity || postalState || postalZip) ? {
          street: postalStreet || '',
          city: postalCity || '',
          state: postalState || '',
          zip: postalZip || '',
          country: 'Australia'
        } : undefined;

        // Additional Tagged Addresses resolution
        const additionalAddresses: TaggedAddress[] = [];
        const a2Tag = getVal('address2Tag');
        const a2Street = getVal('address2Street');
        const a2City = getVal('address2City');
        const a2State = getVal('address2State');
        const a2Zip = getVal('address2Zip');
        if (a2Street || a2City || a2State || a2Zip) {
          additionalAddresses.push({
            tag: a2Tag || 'Secondary Address',
            street: a2Street || '',
            city: a2City || '',
            state: a2State || '',
            zip: a2Zip || '',
            country: 'Australia'
          });
        }

        const a3Tag = getVal('address3Tag');
        const a3Street = getVal('address3Street');
        const a3City = getVal('address3City');
        const a3State = getVal('address3State');
        const a3Zip = getVal('address3Zip');
        if (a3Street || a3City || a3State || a3Zip) {
          additionalAddresses.push({
            tag: a3Tag || 'Warehouse Address',
            street: a3Street || '',
            city: a3City || '',
            state: a3State || '',
            zip: a3Zip || '',
            country: 'Australia'
          });
        }

        // Bucket & Assignments config
        const leadData: any = {
          companyName,
          ...(getVal('prospectPlusId') && { prospectPlusId: getVal('prospectPlusId') }),
          ...(getVal('websiteUrl') && { websiteUrl: getVal('websiteUrl') }),
          ...(getVal('customerPhone') && { customerPhone: getVal('customerPhone') }),
          ...(getVal('customerServiceEmail') && { customerServiceEmail: getVal('customerServiceEmail') }),
          ...(getVal('abn') && { abn: getVal('abn') }),
          address,
          ...(postalAddress && { postalAddress }),
          ...(additionalAddresses.length > 0 && { additionalAddresses }),
          bucket: selectedBucket,
          fieldSales: selectedBucket === 'field_sales',
          leadSource: leadSource || 'Bulk Import Wizard',
        };

        if (!isUpdatingExistingLead) {
          leadData.status = 'New' as LeadStatus;
          leadData.customerStatus = 'New';
          leadData.dateLeadEntered = nowStr;
          leadData.createdAt = serverTimestamp();
          leadData.isDuplicate = !!isDuplicateMatch;
          leadData.similarLeads = isDuplicateMatch ? [isDuplicateMatch.id] : [];
          if (isDuplicateMatch) {
            leadData.duplicateConfidence = isDuplicateMatch.confidence;
            leadData.duplicateMatchReasons = isDuplicateMatch.reasons;
          }
        } else {
          leadData.updatedAt = serverTimestamp();
        }

        // Parent Linkage resolution for row
        let effectiveParent: { id: string; companyName: string; prospectPlusId?: string } | null = parentMatches[rowIdx] || null;

        if (!effectiveParent) {
          effectiveParent = await resolveParentAccountByAnyId(
            getVal('parentProspectPlusId'),
            getVal('parentAbn'),
            getVal('parentCompanyName')
          );
        }

        if (effectiveParent) {
          leadData.parentLeadId = effectiveParent.id;
        }

        const effectiveCampaign = getVal('campaign') || campaignName;
        const isMultisite = isMultisiteCampaign(effectiveCampaign) || Boolean(effectiveParent);

        if (isMultisite || selectedBucket === 'multisite') {
          leadData.bucket = 'multisite';
          leadData.accountManagerUid = MULTISITE_ACCOUNT_MANAGER_UID;
          leadData.assignedTo = MULTISITE_ACCOUNT_MANAGER_UID;
          const foundAm = allUsers.find(u => (u as any).id === MULTISITE_ACCOUNT_MANAGER_UID || u.uid === MULTISITE_ACCOUNT_MANAGER_UID);
          const targetAmName = foundAm ? (foundAm.displayName || `${foundAm.firstName || ''} ${foundAm.lastName || ''}`.trim() || MULTISITE_ACCOUNT_MANAGER_UID) : MULTISITE_ACCOUNT_MANAGER_UID;
          leadData.accountManagerAssigned = targetAmName;
          leadData.salesRepAssigned = targetAmName;
          leadData.campaign = effectiveCampaign || 'MultiSite';
          // Multisite child leads matching their parent ABN should not be flagged as duplicates
          if (effectiveParent || isDuplicateMatch?.id === effectiveParent?.id) {
            leadData.isDuplicate = false;
            leadData.similarLeads = [];
            leadData.duplicateConfidence = undefined;
            leadData.duplicateMatchReasons = undefined;
          }
        } else if (selectedBucket === 'outbound') {
          leadData.campaign = effectiveCampaign || 'Bulk Import';
          if (dialerAssigned) leadData.dialerAssigned = dialerAssigned;
          if (salesRepAssigned) leadData.salesRepAssigned = salesRepAssigned;
        } else if (selectedBucket === 'field_sales') {
          leadData.campaign = effectiveCampaign || 'Door-to-Door';
          if (fieldRepAssigned) leadData.fieldRepAssigned = fieldRepAssigned;
          if (salesRepAssigned) leadData.salesRepAssigned = salesRepAssigned;
        } else if (selectedBucket === 'inbound') {
          leadData.campaign = effectiveCampaign || 'Inbound';
          if (salesRepAssigned) leadData.salesRepAssigned = salesRepAssigned;
        } else if (selectedBucket === 'account_manager') {
          leadData.campaign = effectiveCampaign || 'Account Manager Generated';
          if (accountManagerAssigned) leadData.accountManagerAssigned = accountManagerAssigned;
        } else if (selectedBucket === 'customer_success') {
          leadData.campaign = effectiveCampaign || 'Customer Success Generated';
          if (customerSuccessAssigned) leadData.customerSuccessAssigned = customerSuccessAssigned;
        } else if (selectedBucket === 'nurture') {
          leadData.campaign = effectiveCampaign || 'Nurture Campaign';
          if (targetJourneyId) {
            leadData.activeJourneys = [targetJourneyId];
          }
        } else if (selectedBucket === 'marketing') {
          leadData.campaign = effectiveCampaign || 'Marketing Campaign';
          if (marketingListName) {
            leadData.marketingLists = [marketingListName];
          }
        }

        if (assignedFranchisee) {
          leadData.franchisee = assignedFranchisee;
          leadData.franchisee_id = assignedFranchiseeId;
          leadData.franchiseeInternalId = assignedFranchiseeId;
          leadData.franchiseeName = assignedFranchisee;
        }

        // 1. Generate or reference document for Lead
        const leadRef = isUpdatingExistingLead && isDuplicateMatch
          ? doc(firestore, 'leads', isDuplicateMatch.id)
          : doc(collection(firestore, 'leads'));

        // 2. Multi-Contact subcollection creation
        const contactsToCreate = [
          {
            firstNameKey: 'contactFirstName',
            lastNameKey: 'contactLastName',
            titleKey: 'contactTitle',
            emailKey: 'contactEmail',
            phoneKey: 'contactPhone',
            defaultTitle: 'Primary Contact',
            isPrimary: true
          },
          {
            firstNameKey: 'contact2FirstName',
            lastNameKey: 'contact2LastName',
            titleKey: 'contact2Title',
            emailKey: 'contact2Email',
            phoneKey: 'contact2Phone',
            defaultTitle: 'Secondary Contact',
            isPrimary: false
          },
          {
            firstNameKey: 'contact3FirstName',
            lastNameKey: 'contact3LastName',
            titleKey: 'contact3Title',
            emailKey: 'contact3Email',
            phoneKey: 'contact3Phone',
            defaultTitle: 'Accounts / Additional Contact',
            isPrimary: false,
            isAccountsPayable: true
          }
        ];

        let addedContactsCount = 0;
        for (const cConfig of contactsToCreate) {
          const cFirst = getVal(cConfig.firstNameKey);
          const cLast = getVal(cConfig.lastNameKey);
          const cEmail = getVal(cConfig.emailKey);
          const cPhone = getVal(cConfig.phoneKey);
          const cTitle = getVal(cConfig.titleKey);

          if (cFirst || cLast || cEmail || cPhone) {
            addedContactsCount++;
            const contactRef = doc(collection(firestore, 'leads', leadRef.id, 'contacts'));
            const contactData: Contact = {
              id: contactRef.id,
              name: `${cFirst} ${cLast}`.trim() || cConfig.defaultTitle,
              firstName: cFirst || undefined,
              title: cTitle || cConfig.defaultTitle,
              email: cEmail || '',
              phone: cPhone || '',
              sendEmail: 'yes',
              isPrimary: cConfig.isPrimary,
              ...(cConfig.isAccountsPayable ? { isAccountsPayable: true } : {})
            };
            batch.set(contactRef, contactData, { merge: true });
          }
        }

        if (addedContactsCount > 0) {
          leadData.contactCount = increment(addedContactsCount);
        }

        batch.set(leadRef, leadData, { merge: true });

        // 3. Create Activity entry
        const activityRef = doc(collection(firestore, 'leads', leadRef.id, 'activity'));
        batch.set(activityRef, {
          type: 'Update',
          date: nowStr,
          notes: isUpdatingExistingLead
            ? `Lead record updated with CSV data via Bulk Import Wizard. Source: ${campaignName}`
            : effectiveParent
              ? `Lead imported as child location under parent "${effectiveParent.companyName}" (${effectiveParent.prospectPlusId ? `Prospect+ ID: ${effectiveParent.prospectPlusId}` : `ID: ${effectiveParent.id}`}). Bucket: ${selectedBucket.replace('_', ' ')}. Source: ${campaignName}`
              : `Lead imported via Bulk Import in ${selectedBucket.replace('_', ' ')} bucket. Source: ${campaignName}`,
          author: authorName,
          source: 'csv_upload',
          isCsvUpload: true,
          isAutomated: true
        });

        // 4. Create Bucket History entry for new leads
        if (!isUpdatingExistingLead) {
          const historyRef = doc(collection(firestore, 'leads', leadRef.id, 'bucket_history'));
          batch.set(historyRef, {
            oldBucket: 'unassigned',
            newBucket: selectedBucket,
            date: nowStr,
            author: authorName
          });
        }

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
          }, { merge: true });
        }

        if (isUpdatingExistingLead) {
          updatedCount++;
          importLogs.push({
            rowNum: rowIdx + 1,
            companyName: companyName || `Row ${rowIdx + 1}`,
            internalId: leadRef.id,
            status: 'Updated',
            details: `Updated existing lead record (${leadRef.id})`
          });
        } else {
          successCount++;
          newCreatedLeadIds.push(leadRef.id);
          importLogs.push({
            rowNum: rowIdx + 1,
            companyName: companyName || `Row ${rowIdx + 1}`,
            internalId: leadRef.id,
            status: 'Created',
            details: `Created new lead record (${leadRef.id})`
          });
        }
      }

      try {
        await batch.commit();
      } catch (err) {
        console.error('Batch commit failed for chunk:', i, err);
        failedCount += chunk.length;
      }

      const currentProcessed = Math.min(i + chunk.length, total);
      setProcessedRowsCount(currentProcessed);
      const progressVal = Math.min(Math.round((currentProcessed / total) * 100), 100);
      setImportProgress(progressVal);
      setImportStats({
        success: successCount,
        updated: updatedCount,
        skipped: skippedCount,
        failed: failedCount,
        total
      });
    }

    setCreatedLeadIds(newCreatedLeadIds);
    setImportLogRecords(importLogs);
    setIsImporting(false);
    setStep(5);
    toast({ 
      title: 'Import Complete', 
      description: `Processed ${total} rows (${successCount} created, ${updatedCount} updated, ${skippedCount} skipped).` 
    });
  };

  // Get total duplicate and existing customer matches counted in our check
  const duplicateCount = useMemo(() => 
    Object.values(duplicateLeads).filter(val => val !== null).length, 
    [duplicateLeads]
  );
  const customerMatchCount = useMemo(() =>
    Object.values(existingCompanyMatches).filter(val => val !== null).length,
    [existingCompanyMatches]
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
                    ? 'text-[#095c7b]' 
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
                    <strong>Optional Lead & Contact Columns:</strong> Website URL, ABN.
                  </p>
                  <p className="pt-1 text-[#095c7b] font-medium">
                    <strong>Multi-Contact Support:</strong> You can include up to 3 contacts per company in the same row:
                  </p>
                  <ul className="list-disc list-inside pl-2 space-y-1 mt-1 text-slate-600">
                    <li><strong>Contact 1 (Primary):</strong> First Name, Last Name, Title, Email, Phone</li>
                    <li><strong>Contact 2 (Secondary):</strong> Contact 2 First Name, Contact 2 Last Name, Title, Email, Phone</li>
                    <li><strong>Contact 3 (Accounts):</strong> Contact 3 First Name, Contact 3 Last Name, Title, Email, Phone</li>
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
                    <SelectItem value="in_review">In Review (Review & Verification Queue)</SelectItem>
                    <SelectItem value="multisite">MultiSite (MultiSite Leads & Accounts)</SelectItem>
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
                    {franchisees.filter(f => f.internalId && f.internalId.trim()).map((f) => (
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
                {availableCampaigns.length > 0 ? (
                  <div className="space-y-2">
                    <Select value={campaignName} onValueChange={(val) => setCampaignName(val)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select or type campaign name" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCampaigns.filter(c => c.name && c.name.trim()).map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.name} {c.isBuiltIn ? '(Built-In)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                      id="campaign-input" 
                      value={campaignName} 
                      onChange={(e) => setCampaignName(e.target.value)} 
                      placeholder="Or enter custom campaign name" 
                      className="bg-white text-xs"
                    />
                  </div>
                ) : (
                  <Input 
                    id="campaign-input" 
                    value={campaignName} 
                    onChange={(e) => setCampaignName(e.target.value)} 
                    placeholder="e.g. June Cold Campaign" 
                    className="bg-white"
                  />
                )}
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

              {/* Parent Account Selection */}
              <div className="space-y-2 col-span-full border-t pt-4">
                <Label htmlFor="global-parent-select" className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-[#095c7b]" /> Link as Child of Parent Account / Customer (Optional)
                </Label>
                <Select value={globalParentId} onValueChange={setGlobalParentId}>
                  <SelectTrigger id="global-parent-select" className="bg-white">
                    <SelectValue placeholder="Select Parent Account (or leave as None)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="none">None (Import as standalone leads)</SelectItem>
                    {parentAccounts.filter(p => p.id && p.id.trim()).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        [{p.type === 'company' ? 'Customer' : 'Parent Lead'}{p.prospectPlusId ? ` · ${p.prospectPlusId}` : ''}] {p.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Links all leads imported in this batch as child locations under the selected Parent Account (unless overridden by row-level Parent Prospect+ ID or Parent Company mapping in your CSV).
                </p>
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
                            {activeDialers.filter(d => (d.displayName || d.email) && (d.displayName || d.email)?.trim()).map((d) => (
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
                            {activeFieldReps.filter(r => (r.displayName || r.email) && (r.displayName || r.email)?.trim()).map((r) => (
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

                  {(selectedBucket === 'account_manager' || selectedBucket === 'multisite') && (
                    <div className="space-y-2">
                      <Label htmlFor="am-assigned" className="font-semibold text-slate-700">Account Manager Assigned</Label>
                      <Select value={accountManagerAssigned || "none"} onValueChange={(val) => setAccountManagerAssigned(val === 'none' ? '' : val)}>
                        <SelectTrigger id="am-assigned" className="bg-white">
                          <SelectValue placeholder="Select AM" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select AM</SelectItem>
                          {activeAMs.filter(am => (am.displayName || am.email) && (am.displayName || am.email)?.trim()).map((am) => (
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
                          {activeCS.filter(cs => (cs.displayName || cs.email) && (cs.displayName || cs.email)?.trim()).map((cs) => (
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
                          {journeys.filter(j => j.id && j.id.trim()).map((j) => (
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
                              {csvHeaders.filter(header => header && header.trim().length > 0).map((header) => (
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
              onClick={() => runValidationAndDuplicates()}
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
                <p className="text-sm font-semibold text-slate-600">Validating phone and email formats, querying duplicates and active customer records...</p>
              </div>
            ) : (
              <>
                {/* Duplicate strategy & matching criteria selectors */}
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-lg flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="space-y-1.5 text-left max-w-xl">
                    <h4 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" /> 
                      Lead Matching Summary: <span className="text-blue-900">{duplicateCount} Matched</span> ({Math.round((duplicateCount / (csvRows.length || 1)) * 100)}%), <span className="text-amber-900">{csvRows.length - duplicateCount} Unmatched</span> out of {csvRows.length} Total Rows
                    </h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      {duplicateStrategy === 'update' ? (
                        <>
                          <strong className="font-bold text-blue-900">{duplicateCount} leads</strong> matched database records and <strong className="font-bold text-blue-900">will be updated</strong>. 
                          <strong className="font-bold text-amber-900"> {csvRows.length - duplicateCount} unmatched leads</strong> have no database match and <strong className="font-bold text-amber-900">will be skipped</strong> (0 new leads created).
                        </>
                      ) : duplicateStrategy === 'skip' ? (
                        <>
                          <strong className="font-bold text-amber-900">{duplicateCount} duplicate leads</strong> matched and <strong className="font-bold text-amber-900">will be skipped</strong>. 
                          <strong className="font-bold text-green-800"> {csvRows.length - duplicateCount} new leads</strong> will be <strong className="font-bold text-green-800">created</strong>.
                        </>
                      ) : (
                        <>
                          <strong className="font-bold text-purple-900">{duplicateCount} duplicate leads</strong> matched (flagged for review). 
                          All <strong className="font-bold text-purple-900">{csvRows.length} records</strong> will be imported as new leads.
                        </>
                      )}
                    </p>
                    <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline" className="bg-amber-100/90 text-amber-900 border-amber-300 font-semibold text-[11px] py-0.5 px-2">
                        Matched CSV Column: &quot;{(() => {
                          if (matchFieldKey === 'internalId') {
                            const colHeader = Object.keys(columnMappings).find(k => columnMappings[k] === 'prospectPlusId');
                            if (colHeader) return colHeader;
                            const fallback = csvHeaders.find(h => /internal\s*id|netsuite|lead\s*id/i.test(h));
                            return fallback || 'Internal ID / Document ID';
                          }
                          if (matchFieldKey === 'prospectPlusId') {
                            const colHeader = Object.keys(columnMappings).find(k => columnMappings[k] === 'prospectPlusId');
                            if (colHeader) return colHeader;
                            const fallback = csvHeaders.find(h => /prospect\+?\s*id/i.test(h));
                            return fallback || 'Prospect+ ID';
                          }
                          if (matchFieldKey === 'customerEntityId') {
                            const colHeader = Object.keys(columnMappings).find(k => columnMappings[k] === 'prospectPlusId');
                            if (colHeader) return colHeader;
                            const fallback = csvHeaders.find(h => /customer\s*id|entity\s*id/i.test(h));
                            return fallback || 'Customer Entity ID';
                          }
                          if (matchFieldKey === 'abn') {
                            const colHeader = Object.keys(columnMappings).find(k => columnMappings[k] === 'abn');
                            if (colHeader) return colHeader;
                            const fallback = csvHeaders.find(h => /abn/i.test(h));
                            return fallback || 'ABN';
                          }
                          if (matchFieldKey === 'companyName') {
                            const colHeader = Object.keys(columnMappings).find(k => columnMappings[k] === 'companyName');
                            if (colHeader) return colHeader;
                            const fallback = csvHeaders.find(h => /company/i.test(h));
                            return fallback || 'Company Name';
                          }
                          return 'Auto-Detect (Internal ID, Prospect+ ID, ABN, Company Name)';
                        })()}&quot;
                      </Badge>
                      {customerMatchCount > 0 && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-900 border-blue-300 font-semibold text-[11px] py-0.5 px-2">
                          {customerMatchCount} Active Customers Detected
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
                    {/* Match Criteria Selection */}
                    <div className="flex flex-col gap-1 w-full sm:w-auto text-left">
                      <span className="text-[10px] uppercase font-bold text-amber-900">Match Lead Record By:</span>
                      <Select 
                        value={matchFieldKey} 
                        onValueChange={(val) => {
                          const keyVal = val as any;
                          setMatchFieldKey(keyVal);
                          runValidationAndDuplicates(keyVal);
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-[220px] bg-white border-amber-300 font-medium text-xs h-9">
                          <SelectValue placeholder="Match Criteria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto-Detect All Fields (Recommended)</SelectItem>
                          <SelectItem value="internalId">NetSuite Internal ID (internalid)</SelectItem>
                          <SelectItem value="prospectPlusId">Prospect+ ID (prospectPlusId)</SelectItem>
                          <SelectItem value="customerEntityId">Customer Entity ID (customerEntityId)</SelectItem>
                          <SelectItem value="abn">ABN (abn)</SelectItem>
                          <SelectItem value="companyName">Company Name Only (companyName)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Duplicate Action Strategy */}
                    <div className="flex flex-col gap-1 w-full sm:w-auto text-left">
                      <span className="text-[10px] uppercase font-bold text-amber-900">Handling Strategy:</span>
                      <Select value={duplicateStrategy} onValueChange={(val) => setDuplicateStrategy(val as 'skip' | 'import' | 'update')}>
                        <SelectTrigger className="w-full sm:w-[260px] bg-white border-amber-300 font-medium text-xs h-9">
                          <SelectValue placeholder="Strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">Skip duplicates & customers (Recommended)</SelectItem>
                          <SelectItem value="update">Update existing lead records only (Do not create new leads)</SelectItem>
                          <SelectItem value="import">Import all as new leads anyway (Flag matches)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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
                        <TableHead className="font-bold text-slate-700">Contacts Mapped</TableHead>
                        <TableHead className="font-bold text-slate-700">Checks & Alerts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row) => {
                        const rowErrors = validationErrors[row.index] || [];
                        const existingId = duplicateLeads[row.index];
                        const customerMatch = existingCompanyMatches[row.index];
                        const isDup = existingId !== undefined && existingId !== null;
                        const isCust = customerMatch !== undefined && customerMatch !== null;

                        return (
                          <TableRow key={row.index} className={rowErrors.length > 0 ? 'bg-red-50/30' : isCust ? 'bg-blue-50/30' : isDup ? 'bg-amber-50/20' : ''}>
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
                            <TableCell className="text-xs">
                              {row.contactCount > 0 ? (
                                <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-700 font-medium">
                                  {row.contactCount} {row.contactCount === 1 ? 'Contact' : 'Contacts'} ({row.primaryContact})
                                </Badge>
                              ) : (
                                <span className="text-slate-400 font-normal">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {rowErrors.map((err, i) => (
                                  <Badge key={i} variant="destructive" className="text-[9px] px-1.5 py-0">
                                    {err}
                                  </Badge>
                                ))}

                                {parentMatches[row.index] && (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-purple-100 text-purple-900 border-purple-300 font-semibold">
                                    Child of {parentMatches[row.index]?.companyName} {parentMatches[row.index]?.prospectPlusId ? `(${parentMatches[row.index]?.prospectPlusId})` : ''}
                                  </Badge>
                                )}
                                
                                {isCust && (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-100 text-blue-800 border-blue-200 font-semibold">
                                    Existing Customer ({customerMatch.name})
                                  </Badge>
                                )}

                                {isDup && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[9px] px-1.5 py-0 font-semibold ${
                                      duplicateStrategy === 'update'
                                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                                        : 'bg-amber-100 text-amber-900 border-amber-300'
                                    }`}
                                  >
                                    {duplicateStrategy === 'update' ? 'Matched for Update' : 'Duplicate Lead'}: ID {existingId?.id} ({existingId?.reasons.join(', ') || 'Match'})
                                  </Badge>
                                )}

                                {!isDup && duplicateStrategy === 'update' && (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[9px] px-1.5 py-0 font-semibold">
                                    Unmatched (Will be skipped)
                                  </Badge>
                                )}

                                {rowErrors.length === 0 && !isDup && !isCust && !parentMatches[row.index] && duplicateStrategy !== 'update' && (
                                  <Badge className="bg-green-100 text-green-800 border-green-200 text-[9px] px-1.5 py-0 font-semibold" variant="outline">
                                    New Lead (Passed)
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
              <div className="space-y-6 text-left">
                {/* Progress Bar & Row Counter */}
                <div className="bg-slate-50 border rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Loader2 className="h-6 w-6 animate-spin text-[#095c7b] shrink-0" />
                      <div>
                        <span className="font-bold text-slate-800 text-base">Writing Lead Records to Database...</span>
                        <p className="text-xs text-slate-500">Processing in optimized parallel batches</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-[#095c7b]">{importProgress}%</span>
                      <div className="text-[11px] font-semibold text-slate-500">
                        Processed <strong className="text-slate-900 font-bold">{processedRowsCount}</strong> of <strong className="text-slate-900 font-bold">{csvRows.length}</strong> Rows
                      </div>
                    </div>
                  </div>

                  <Progress value={importProgress} className="h-3.5 bg-slate-200" />

                  {/* Live Timer & Performance Speed Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="bg-white p-3 rounded-lg border text-center shadow-xs">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3 text-slate-600" /> Elapsed Time
                      </div>
                      <div className="text-lg font-mono font-bold text-slate-800 mt-1">
                        {(() => {
                          const m = Math.floor(elapsedSeconds / 60);
                          const s = elapsedSeconds % 60;
                          return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                        })()}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border text-center shadow-xs">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                        <Timer className="h-3 w-3 text-blue-600" /> Est. Remaining
                      </div>
                      <div className="text-lg font-mono font-bold text-blue-700 mt-1">
                        {(() => {
                          const rPerSec = elapsedSeconds > 0 ? (processedRowsCount / elapsedSeconds) : 0;
                          const remRows = (csvRows.length || 0) - processedRowsCount;
                          if (processedRowsCount > 0 && rPerSec > 0 && remRows > 0) {
                            const remSecs = Math.ceil(remRows / rPerSec);
                            const m = Math.floor(remSecs / 60);
                            const s = remSecs % 60;
                            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                          }
                          return remRows <= 0 ? '00:00' : 'Calculating...';
                        })()}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border text-center shadow-xs">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                        <Zap className="h-3 w-3 text-amber-600" /> Processing Speed
                      </div>
                      <div className="text-lg font-mono font-bold text-amber-700 mt-1">
                        {elapsedSeconds > 0 ? (processedRowsCount / elapsedSeconds).toFixed(1) : '0.0'}{' '}
                        <span className="text-xs font-sans font-normal text-slate-500">rows/s</span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border text-center shadow-xs">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Rows Remaining</div>
                      <div className="text-lg font-mono font-bold text-slate-800 mt-1">
                        {Math.max(0, (csvRows.length || 0) - processedRowsCount)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <div className="text-2xl font-bold text-slate-800">{importStats.total}</div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Rows</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="text-2xl font-bold text-green-700">{importStats.success}</div>
                    <div className="text-[10px] text-green-600 font-semibold uppercase">Created</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-2xl font-bold text-blue-700">{importStats.updated}</div>
                    <div className="text-[10px] text-blue-600 font-semibold uppercase">Updated</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="text-2xl font-bold text-amber-700">{importStats.skipped}</div>
                    <div className="text-[10px] text-amber-600 font-semibold uppercase">Skipped</div>
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
                    Your lead records have been processed and updated in the system successfully.
                  </p>
                </div>

                {/* Final stats summary */}
                <div className="max-w-md mx-auto grid grid-cols-4 gap-2 border rounded-lg p-4 bg-slate-50">
                  <div>
                    <div className="text-xl font-bold text-green-700">{importStats.success}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Created</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-blue-700">{importStats.updated}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Updated</div>
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

                {/* NetSuite Bulk Sync Banner */}
                {createdLeadIds.length > 0 && (
                  <div className="mt-6 border border-amber-300 bg-amber-50/90 rounded-xl p-5 text-left flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                        <Zap className="h-6 w-6 text-amber-700" />
                      </div>
                      <div>
                        <h4 className="font-bold text-amber-950 text-base flex items-center gap-2">
                          NetSuite Creation & Doc ID Re-Keying Queue ({createdLeadIds.length} Alphanumeric Leads)
                        </h4>
                        <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                          Newly created leads currently have temporary alphanumeric document IDs. Click below to push all created leads to NetSuite, receive official numeric NetSuite Internal IDs, and automatically re-key their Firestore document IDs.
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => executeNetSuiteSync()}
                      disabled={isSyncingNetSuite}
                      className="bg-[#095c7b] hover:bg-[#084c66] text-white font-semibold shrink-0 px-5 py-2.5 shadow-sm flex items-center gap-2"
                    >
                      {isSyncingNetSuite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      {isSyncingNetSuite ? `Syncing (${netSuiteSyncProgress}%)...` : `⚡ Push All (${createdLeadIds.length}) to NetSuite`}
                    </Button>
                  </div>
                )}

                {/* Detailed Import Results Summary Log Table */}
                {importLogRecords.length > 0 && (
                  <div className="mt-6 border rounded-lg overflow-hidden text-left bg-white shadow-sm">
                    <div className="p-4 bg-slate-50 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#095c7b]" /> Import Action Audit Log ({importLogRecords.length} Rows)
                        </h4>
                        <p className="text-[11px] text-slate-500">Detailed list of every CSV row processed, showing whether it was created, updated, skipped, or failed.</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Input 
                          placeholder="Search company or ID..." 
                          value={logSearch}
                          onChange={(e) => setLogSearch(e.target.value)}
                          className="h-8 text-xs w-44 bg-white"
                        />

                        <div className="flex bg-slate-200/80 p-0.5 rounded-md text-[11px] font-semibold text-slate-600">
                          <button 
                            type="button"
                            onClick={() => setLogFilter('all')} 
                            className={`px-2 py-0.5 rounded ${logFilter === 'all' ? 'bg-white shadow text-slate-900 font-bold' : 'hover:text-slate-900'}`}
                          >
                            All ({importLogRecords.length})
                          </button>
                          {importStats.success > 0 && (
                            <button 
                              type="button"
                              onClick={() => setLogFilter('Created')} 
                              className={`px-2 py-0.5 rounded ${logFilter === 'Created' ? 'bg-green-600 text-white font-bold' : 'hover:text-slate-900'}`}
                            >
                              Created ({importStats.success})
                            </button>
                          )}
                          {importStats.updated > 0 && (
                            <button 
                              type="button"
                              onClick={() => setLogFilter('Updated')} 
                              className={`px-2 py-0.5 rounded ${logFilter === 'Updated' ? 'bg-blue-600 text-white font-bold' : 'hover:text-slate-900'}`}
                            >
                              Updated ({importStats.updated})
                            </button>
                          )}
                          {importStats.skipped > 0 && (
                            <button 
                              type="button"
                              onClick={() => setLogFilter('Skipped')} 
                              className={`px-2 py-0.5 rounded ${logFilter === 'Skipped' ? 'bg-amber-600 text-white font-bold' : 'hover:text-slate-900'}`}
                            >
                              Skipped ({importStats.skipped})
                            </button>
                          )}
                          {importStats.failed > 0 && (
                            <button 
                              type="button"
                              onClick={() => setLogFilter('Failed')} 
                              className={`px-2 py-0.5 rounded ${logFilter === 'Failed' ? 'bg-red-600 text-white font-bold' : 'hover:text-slate-900'}`}
                            >
                              Failed ({importStats.failed})
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="max-h-[350px] overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-slate-100/80 sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="w-14 font-bold text-slate-700 text-xs">Row #</TableHead>
                            <TableHead className="font-bold text-slate-700 text-xs">Company Name</TableHead>
                            <TableHead className="font-bold text-slate-700 text-xs">Status</TableHead>
                            <TableHead className="font-bold text-slate-700 text-xs">Lead / Internal ID</TableHead>
                            <TableHead className="font-bold text-slate-700 text-xs">Action Details</TableHead>
                            <TableHead className="font-bold text-slate-700 text-xs text-right">NetSuite Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importLogRecords
                            .filter(r => logFilter === 'all' || r.status === logFilter)
                            .filter(r => !logSearch || r.companyName.toLowerCase().includes(logSearch.toLowerCase()) || (r.internalId && r.internalId.toLowerCase().includes(logSearch.toLowerCase())))
                            .map((rec, i) => {
                              const isAlphanumeric = rec.internalId && !/^\d+$/.test(rec.internalId);
                              return (
                                <TableRow key={i} className="hover:bg-slate-50">
                                  <TableCell className="font-semibold text-slate-500 text-xs">{rec.rowNum}</TableCell>
                                  <TableCell className="font-semibold text-slate-800 text-xs">{rec.companyName}</TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-[10px] font-bold px-2 py-0.5 ${
                                        rec.status === 'Created' ? 'bg-green-100 text-green-800 border-green-300' :
                                        rec.status === 'Updated' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                        rec.status === 'Skipped' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                        'bg-red-100 text-red-800 border-red-300'
                                      }`}
                                    >
                                      {rec.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs text-slate-600">
                                    <span className={cn(isAlphanumeric && "text-amber-800 font-bold")}>{rec.internalId || '-'}</span>
                                  </TableCell>
                                  <TableCell className="text-xs text-slate-600">{rec.details}</TableCell>
                                  <TableCell className="text-right">
                                    {rec.internalId && isAlphanumeric ? (
                                      <Button
                                        size="xs"
                                        variant="outline"
                                        onClick={() => executeNetSuiteSync(rec.internalId)}
                                        disabled={isSyncingNetSuite}
                                        className="h-6 text-[10px] bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 font-bold px-2"
                                      >
                                        Push to NetSuite
                                      </Button>
                                    ) : rec.internalId && /^\d+$/.test(rec.internalId) ? (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-[10px]">
                                        Numeric NetSuite ID
                                      </Badge>
                                    ) : null}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

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
